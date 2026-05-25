// ============================================================================
// Engagement Engine - Social Proof Engine
// ============================================================================

import { SocialProofSignal, SocialProofType, TrendingSignal, FomoTrigger } from '../types';

interface SocialProofConfig {
  trendingWindowMs: number;
  velocityDecayRate: number;
  emaAlpha: number;
  fomoIntensityCap: number;
  ethicalScoreThreshold: number;
  herdingDampeningFactor: number;
  maxSignalsPerItem: number;
  recencyHalfLifeMs: number;
}

interface ItemActivity {
  itemId: string;
  events: ActivityEvent[];
  emaScore: number;
  lastUpdated: number;
  category: string;
}

interface ActivityEvent {
  userId: string;
  type: string;
  timestamp: number;
  weight: number;
}

interface FriendGraph {
  userId: string;
  friends: Set<string>;
}

export class SocialProofEngine {
  private config: SocialProofConfig;
  private itemActivities: Map<string, ItemActivity> = new Map();
  private trendingSignals: Map<string, TrendingSignal> = new Map();
  private friendGraphs: Map<string, FriendGraph> = new Map();
  private fomoTriggers: Map<string, FomoTrigger[]> = new Map();
  private globalVelocityBaseline: number = 0;
  private globalActivityCount: number = 0;
  private herdingScores: Map<string, number> = new Map();

  constructor(config: Partial<SocialProofConfig> = {}) {
    this.config = {
      trendingWindowMs: config.trendingWindowMs ?? 3600000, // 1 hour
      velocityDecayRate: config.velocityDecayRate ?? 0.1,
      emaAlpha: config.emaAlpha ?? 0.3,
      fomoIntensityCap: config.fomoIntensityCap ?? 0.8,
      ethicalScoreThreshold: config.ethicalScoreThreshold ?? 0.5,
      herdingDampeningFactor: config.herdingDampeningFactor ?? 0.7,
      maxSignalsPerItem: config.maxSignalsPerItem ?? 1000,
      recencyHalfLifeMs: config.recencyHalfLifeMs ?? 1800000, // 30 minutes
    };
  }

  recordActivity(itemId: string, userId: string, type: string, category: string = 'general'): void {
    let item = this.itemActivities.get(itemId);
    if (!item) {
      item = {
        itemId,
        events: [],
        emaScore: 0,
        lastUpdated: Date.now(),
        category,
      };
      this.itemActivities.set(itemId, item);
    }

    const weight = this.getActivityWeight(type);
    const event: ActivityEvent = {
      userId,
      type,
      timestamp: Date.now(),
      weight,
    };

    item.events.push(event);
    if (item.events.length > this.config.maxSignalsPerItem) {
      item.events.shift();
    }

    // Update EMA score (Exponential Moving Average)
    const alpha = this.config.emaAlpha;
    item.emaScore = alpha * weight + (1 - alpha) * item.emaScore;
    item.lastUpdated = Date.now();

    // Update global baseline
    this.globalActivityCount += 1;
    this.globalVelocityBaseline =
      this.globalVelocityBaseline +
      (weight - this.globalVelocityBaseline) / this.globalActivityCount;

    // Update trending signal
    this.updateTrendingSignal(itemId, category);

    // Check for herding effect
    this.updateHerdingScore(itemId);
  }

  private getActivityWeight(type: string): number {
    const weights: Record<string, number> = {
      view: 0.1,
      click: 0.3,
      like: 0.5,
      comment: 0.8,
      share: 1.0,
      purchase: 2.0,
      save: 0.6,
    };
    return weights[type] ?? 0.2;
  }

  private updateTrendingSignal(itemId: string, category: string): void {
    const item = this.itemActivities.get(itemId);
    if (!item) return;

    const now = Date.now();
    const window = this.config.trendingWindowMs;

    // Calculate velocity: weighted events in time window
    const recentEvents = item.events.filter((e) => now - e.timestamp < window);
    const velocity = recentEvents.reduce((sum, e) => {
      // Apply recency weighting with exponential decay
      const recency = Math.exp((-Math.LN2 * (now - e.timestamp)) / this.config.recencyHalfLifeMs);
      return sum + e.weight * recency;
    }, 0);

    // Calculate acceleration: rate of change of velocity
    const halfWindowEvents = item.events.filter((e) => now - e.timestamp < window / 2);
    const halfVelocity = halfWindowEvents.reduce((sum, e) => {
      const recency = Math.exp((-Math.LN2 * (now - e.timestamp)) / this.config.recencyHalfLifeMs);
      return sum + e.weight * recency;
    }, 0);

    const olderEvents = recentEvents.filter((e) => now - e.timestamp >= window / 2);
    const olderVelocity = olderEvents.reduce((sum, e) => {
      const recency = Math.exp((-Math.LN2 * (now - e.timestamp)) / this.config.recencyHalfLifeMs);
      return sum + e.weight * recency;
    }, 0);

    const acceleration = halfVelocity - olderVelocity;

    // Combined trending score
    const score = velocity * (1 + Math.max(0, acceleration));

    // Apply herding dampening if detected
    const herdingScore = this.herdingScores.get(itemId) ?? 0;
    const dampenedScore = score * (1 - herdingScore * this.config.herdingDampeningFactor);

    this.trendingSignals.set(itemId, {
      itemId,
      score: dampenedScore,
      velocity,
      acceleration,
      peakTime: acceleration < 0 ? now : undefined,
      category,
    });
  }

  private updateHerdingScore(itemId: string): void {
    const item = this.itemActivities.get(itemId);
    if (!item) return;

    const now = Date.now();
    const recentEvents = item.events.filter(
      (e) => now - e.timestamp < this.config.trendingWindowMs,
    );

    if (recentEvents.length < 10) {
      this.herdingScores.set(itemId, 0);
      return;
    }

    // Detect herding: rapid burst of same-type actions from independent users
    const uniqueUsers = new Set(recentEvents.map((e) => e.userId));
    const typeDistribution = new Map<string, number>();

    for (const event of recentEvents) {
      const count = typeDistribution.get(event.type) ?? 0;
      typeDistribution.set(event.type, count + 1);
    }

    // Herding indicator: high concentration of single action type + rapid timing
    let maxTypeRatio = 0;
    for (const [, count] of typeDistribution) {
      maxTypeRatio = Math.max(maxTypeRatio, count / recentEvents.length);
    }

    // Time clustering: Gini coefficient of inter-event times
    const times = recentEvents.map((e) => e.timestamp).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push((times[i] ?? 0) - (times[i - 1] ?? 0));
    }

    const gini = this.calculateGiniCoefficient(intervals);

    // Herding score: combination of type concentration and timing clustering
    const herdingScore =
      maxTypeRatio * 0.5 + gini * 0.3 + (1 - uniqueUsers.size / recentEvents.length) * 0.2;

    this.herdingScores.set(itemId, Math.min(1, Math.max(0, herdingScore)));
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;

    if (mean === 0) return 0;

    let sumDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumDiff += Math.abs((sorted[i] ?? 0) - (sorted[j] ?? 0));
      }
    }

    return sumDiff / (2 * n * n * mean);
  }

  getTrendingItems(category?: string, limit: number = 20): TrendingSignal[] {
    let signals = Array.from(this.trendingSignals.values());

    if (category) {
      signals = signals.filter((s) => s.category === category);
    }

    // Sort by score descending
    signals.sort((a, b) => b.score - a.score);

    return signals.slice(0, limit);
  }

  // Social validation: amplify signals from friends
  registerFriendship(userId: string, friendId: string): void {
    let graph = this.friendGraphs.get(userId);
    if (!graph) {
      graph = { userId, friends: new Set() };
      this.friendGraphs.set(userId, graph);
    }
    graph.friends.add(friendId);

    // Bidirectional
    let friendGraph = this.friendGraphs.get(friendId);
    if (!friendGraph) {
      friendGraph = { userId: friendId, friends: new Set() };
      this.friendGraphs.set(friendId, friendGraph);
    }
    friendGraph.friends.add(userId);
  }

  getSocialValidationScore(itemId: string, forUserId: string): number {
    const item = this.itemActivities.get(itemId);
    if (!item) return 0;

    const userGraph = this.friendGraphs.get(forUserId);
    if (!userGraph || userGraph.friends.size === 0) return 0;

    const now = Date.now();
    const recentEvents = item.events.filter(
      (e) => now - e.timestamp < this.config.trendingWindowMs,
    );

    // Count friend activity on this item
    let friendActivityScore = 0;
    const friendsWhoEngaged = new Set<string>();

    for (const event of recentEvents) {
      if (userGraph.friends.has(event.userId)) {
        friendsWhoEngaged.add(event.userId);
        const recency = Math.exp(
          (-Math.LN2 * (now - event.timestamp)) / this.config.recencyHalfLifeMs,
        );
        friendActivityScore += event.weight * recency;
      }
    }

    // Normalize by number of friends (proportion of friends who engaged)
    const friendEngagementRate = friendsWhoEngaged.size / userGraph.friends.size;

    // Combined score: friend activity intensity * proportion of friends
    return friendActivityScore * (0.5 + 0.5 * friendEngagementRate);
  }

  // FOMO triggers with ethical limits
  generateFomoTrigger(itemId: string, forUserId: string): FomoTrigger | null {
    const item = this.itemActivities.get(itemId);
    if (!item) return null;

    const now = Date.now();
    const recentEvents = item.events.filter(
      (e) => now - e.timestamp < this.config.trendingWindowMs,
    );

    const trending = this.trendingSignals.get(itemId);
    const velocity = trending?.velocity ?? 0;
    const socialScore = this.getSocialValidationScore(itemId, forUserId);

    // Determine FOMO type based on signals
    let trigger: FomoTrigger;

    if (socialScore > 0.5) {
      trigger = {
        type: 'social_validation',
        message: `Friends are engaging with this`,
        intensity: Math.min(this.config.fomoIntensityCap, socialScore),
        ethicalScore: 0.8, // Social validation is relatively ethical
        showToUser: true,
      };
    } else if (velocity > this.globalVelocityBaseline * 3) {
      trigger = {
        type: 'urgency',
        message: `Trending now`,
        intensity: Math.min(
          this.config.fomoIntensityCap,
          velocity / (this.globalVelocityBaseline * 10),
        ),
        ethicalScore: 0.6,
        showToUser: true,
      };
    } else if (recentEvents.length > 50) {
      trigger = {
        type: 'scarcity',
        message: `High demand`,
        intensity: Math.min(this.config.fomoIntensityCap, recentEvents.length / 200),
        ethicalScore: 0.5,
        showToUser: true,
      };
    } else {
      return null;
    }

    // Apply ethical filter
    if (trigger.ethicalScore < this.config.ethicalScoreThreshold) {
      trigger.showToUser = false;
    }

    // Cap intensity
    trigger.intensity = Math.min(trigger.intensity, this.config.fomoIntensityCap);

    // Store trigger
    const triggers = this.fomoTriggers.get(itemId) ?? [];
    triggers.push(trigger);
    if (triggers.length > 10) triggers.shift();
    this.fomoTriggers.set(itemId, triggers);

    return trigger;
  }

  getSignalForItem(itemId: string, forUserId: string): SocialProofSignal | null {
    const item = this.itemActivities.get(itemId);
    if (!item) return null;

    const trending = this.trendingSignals.get(itemId);
    const socialWeight = this.getSocialValidationScore(itemId, forUserId);
    const now = Date.now();

    const recency = Math.exp(
      (-Math.LN2 * (now - item.lastUpdated)) / this.config.recencyHalfLifeMs,
    );

    const type: SocialProofType =
      socialWeight > 0.3
        ? 'friend_activity'
        : (trending?.score ?? 0) > this.globalVelocityBaseline * 2
          ? 'trending'
          : 'popular';

    return {
      id: `signal_${itemId}_${forUserId}`,
      type,
      content: itemId,
      score: item.emaScore,
      velocity: trending?.velocity ?? 0,
      recency,
      socialWeight,
      timestamp: now,
      metadata: {
        category: item.category,
        eventCount: item.events.length,
      },
    };
  }

  getMomentumScore(itemId: string): number {
    const item = this.itemActivities.get(itemId);
    if (!item) return 0;

    return item.emaScore;
  }

  getHerdingScore(itemId: string): number {
    return this.herdingScores.get(itemId) ?? 0;
  }

  getItemCount(): number {
    return this.itemActivities.size;
  }

  getGlobalVelocity(): number {
    return this.globalVelocityBaseline;
  }

  pruneStaleItems(maxAgeMs: number): number {
    const now = Date.now();
    let pruned = 0;

    for (const [itemId, item] of this.itemActivities) {
      if (now - item.lastUpdated > maxAgeMs) {
        this.itemActivities.delete(itemId);
        this.trendingSignals.delete(itemId);
        this.herdingScores.delete(itemId);
        this.fomoTriggers.delete(itemId);
        pruned += 1;
      }
    }

    return pruned;
  }
}
