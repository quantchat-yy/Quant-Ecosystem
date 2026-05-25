// ============================================================================
// Trust & Safety - Behavior Analysis
// User behavior profiling, coordinated inauthentic behavior detection,
// bot detection via behavioral entropy, sockpuppet detection, brigading
// ============================================================================

import type {
  BehaviorProfile,
  BehaviorAnomaly,
  CoordinatedBehavior,
  BotScore,
  RiskLevel,
} from '../types';

/** Action event for behavior tracking */
interface ActionEvent {
  userId: string;
  action: string;
  timestamp: number;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/** Temporal action sequence for correlation */
interface ActionSequence {
  userId: string;
  timestamps: number[];
  actions: string[];
  windowStart: number;
  windowEnd: number;
}

/** Network cluster for inauthentic behavior */
interface NetworkCluster {
  id: string;
  members: string[];
  density: number;
  averageCorrelation: number;
  detectedAt: number;
}

/**
 * BehaviorAnalysis provides user behavior profiling, coordinated inauthentic
 * behavior detection via temporal correlation, bot detection using behavioral
 * entropy, sockpuppet detection via fingerprint similarity, and brigading
 * detection through engagement spike analysis.
 */
export class BehaviorAnalysis {
  private readonly profiles: Map<string, BehaviorProfile>;
  private readonly actionHistory: Map<string, ActionEvent[]>;
  private readonly anomalies: BehaviorAnomaly[];
  private readonly clusters: NetworkCluster[];
  private readonly windowSizeMs: number;
  private readonly maxHistoryPerUser: number;

  constructor(config?: { windowSizeMs?: number; maxHistoryPerUser?: number }) {
    this.profiles = new Map();
    this.actionHistory = new Map();
    this.anomalies = [];
    this.clusters = [];
    this.windowSizeMs = config?.windowSizeMs ?? 3600000; // 1 hour default
    this.maxHistoryPerUser = config?.maxHistoryPerUser ?? 10000;
  }

  /**
   * Record a user action for behavior tracking
   */
  recordAction(event: ActionEvent): void {
    const history = this.actionHistory.get(event.userId) ?? [];
    history.push(event);

    // Trim history if too large
    if (history.length > this.maxHistoryPerUser) {
      history.splice(0, history.length - this.maxHistoryPerUser);
    }

    this.actionHistory.set(event.userId, history);
    this.updateProfile(event.userId);
  }

  /**
   * Build or update a user's behavior profile from action history
   */
  private updateProfile(userId: string): void {
    const history = this.actionHistory.get(userId);
    if (!history || history.length === 0) return;

    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    const recentActions = history.filter((a) => a.timestamp >= windowStart);

    // Calculate action distribution
    const actionCounts: Record<string, number> = {};
    for (const action of recentActions) {
      actionCounts[action.action] = (actionCounts[action.action] ?? 0) + 1;
    }

    // Normalize to probabilities
    const total = recentActions.length;
    const distribution: Record<string, number> = {};
    for (const [action, count] of Object.entries(actionCounts)) {
      distribution[action] = count / total;
    }

    // Calculate behavioral entropy: H = -sum(p_action * log(p_action))
    const entropy = this.calculateEntropy(distribution);

    // Calculate average actions per hour
    const durationHours = Math.max(1, this.windowSizeMs / 3600000);
    const averageActionsPerHour = total / durationHours;

    // Determine peak hours
    const hourCounts = new Array(24).fill(0) as number[];
    for (const action of recentActions) {
      const hour = new Date(action.timestamp).getHours();
      const current = hourCounts[hour];
      if (current !== undefined) hourCounts[hour] = current + 1;
    }
    const maxHourCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count >= maxHourCount * 0.8)
      .map((h) => h.hour);

    const profile: BehaviorProfile = {
      userId,
      actionDistribution: distribution,
      averageActionsPerHour,
      peakHours,
      entropy,
      lastUpdatedAt: now,
      windowSizeMs: this.windowSizeMs,
    };

    this.profiles.set(userId, profile);
  }

  /**
   * Calculate Shannon entropy: H = -sum(p_i * log2(p_i))
   * Higher entropy indicates more diverse/unpredictable behavior (human-like).
   * Lower entropy indicates repetitive/predictable behavior (bot-like).
   */
  calculateEntropy(distribution: Record<string, number>): number {
    let entropy = 0;
    for (const probability of Object.values(distribution)) {
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }
    return entropy;
  }

  /**
   * Detect bots using behavioral entropy analysis.
   * Bots tend to have lower entropy (more repetitive action patterns).
   */
  detectBot(userId: string): BotScore {
    const profile = this.profiles.get(userId);
    const now = Date.now();

    if (!profile) {
      return {
        userId,
        score: 0,
        entropy: 0,
        indicators: ['insufficient_data'],
        isLikelyBot: false,
        confidence: 0,
        assessedAt: now,
      };
    }

    const indicators: string[] = [];
    let botScore = 0;

    // Low entropy indicates bot-like behavior
    // Humans typically have entropy > 2.5 for diverse action sets
    const entropyThreshold = 2.0;
    if (profile.entropy < entropyThreshold) {
      botScore += 0.3;
      indicators.push('low_behavioral_entropy');
    }
    if (profile.entropy < 1.0) {
      botScore += 0.2;
      indicators.push('very_low_entropy');
    }

    // Extremely high activity rate
    if (profile.averageActionsPerHour > 200) {
      botScore += 0.25;
      indicators.push('superhuman_activity_rate');
    } else if (profile.averageActionsPerHour > 100) {
      botScore += 0.15;
      indicators.push('high_activity_rate');
    }

    // Uniform time distribution (no sleep pattern) suggests bot
    if (profile.peakHours.length > 18) {
      botScore += 0.15;
      indicators.push('no_sleep_pattern');
    }

    // Check action regularity (low variance in intervals)
    const history = this.actionHistory.get(userId) ?? [];
    if (history.length > 10) {
      const intervals: number[] = [];
      for (let i = 1; i < Math.min(history.length, 100); i++) {
        const current = history[i];
        const previous = history[i - 1];
        if (current && previous) {
          intervals.push(current.timestamp - previous.timestamp);
        }
      }
      const intervalVariance = this.calculateVariance(intervals);
      const meanInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;

      // Very low coefficient of variation suggests automated timing
      if (meanInterval > 0) {
        const cv = Math.sqrt(intervalVariance) / meanInterval;
        if (cv < 0.1) {
          botScore += 0.2;
          indicators.push('regular_timing_pattern');
        }
      }
    }

    const confidence = Math.min(1, history.length / 50); // More data = more confidence

    return {
      userId,
      score: Math.min(1, botScore),
      entropy: profile.entropy,
      indicators,
      isLikelyBot: botScore >= 0.5,
      confidence,
      assessedAt: now,
    };
  }

  /**
   * Detect coordinated inauthentic behavior by computing temporal correlation
   * (Pearson coefficient) between account action sequences.
   */
  detectCoordinatedBehavior(userIds: string[], timeWindowMs?: number): CoordinatedBehavior[] {
    const window = timeWindowMs ?? this.windowSizeMs;
    const results: CoordinatedBehavior[] = [];
    const now = Date.now();

    // Build temporal action sequences for each user
    const sequences: ActionSequence[] = userIds.map((userId) => {
      const history = this.actionHistory.get(userId) ?? [];
      const recent = history.filter((a) => now - a.timestamp < window);
      return {
        userId,
        timestamps: recent.map((a) => a.timestamp),
        actions: recent.map((a) => a.action),
        windowStart: now - window,
        windowEnd: now,
      };
    });

    // Compare pairs for temporal correlation
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        const seq1 = sequences[i];
        const seq2 = sequences[j];
        if (!seq1 || !seq2) continue;

        if (seq1.timestamps.length < 5 || seq2.timestamps.length < 5) continue;

        // Compute Pearson correlation of time-binned activity
        const correlation = this.computeTemporalCorrelation(seq1, seq2, window);

        // Compute behavioral similarity (Jaccard of action patterns)
        const similarity = this.computeBehaviorSimilarity(seq1, seq2);

        // High correlation + high similarity = coordinated
        if (correlation > 0.7 && similarity > 0.5) {
          results.push({
            groupId: `coord_${i}_${j}_${now}`,
            accountIds: [seq1.userId, seq2.userId],
            correlationScore: correlation,
            temporalOverlap: correlation,
            behaviorSimilarity: similarity,
            detectedAt: now,
            evidenceType: 'temporal',
          });
        }
      }
    }

    return results;
  }

  /**
   * Compute Pearson correlation coefficient between two time-binned sequences.
   * Bins activity counts into time slots and computes correlation.
   */
  private computeTemporalCorrelation(
    seq1: ActionSequence,
    seq2: ActionSequence,
    windowMs: number,
  ): number {
    const binCount = 20;
    const binSize = windowMs / binCount;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Bin each sequence
    const bins1 = new Array(binCount).fill(0) as number[];
    const bins2 = new Array(binCount).fill(0) as number[];

    for (const t of seq1.timestamps) {
      const bin = Math.min(binCount - 1, Math.floor((t - windowStart) / binSize));
      if (bin >= 0 && bins1[bin] !== undefined) bins1[bin]++;
    }
    for (const t of seq2.timestamps) {
      const bin = Math.min(binCount - 1, Math.floor((t - windowStart) / binSize));
      if (bin >= 0 && bins2[bin] !== undefined) bins2[bin]++;
    }

    return this.pearsonCorrelation(bins1, bins2);
  }

  /**
   * Pearson correlation coefficient between two arrays
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const xi = x[i] ?? 0;
      const yi = y[i] ?? 0;
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Compute behavioral similarity between two sequences using Jaccard index
   * of action patterns.
   */
  private computeBehaviorSimilarity(seq1: ActionSequence, seq2: ActionSequence): number {
    const actions1 = new Set(seq1.actions);
    const actions2 = new Set(seq2.actions);

    let intersection = 0;
    for (const action of actions1) {
      if (actions2.has(action)) intersection++;
    }

    const union = actions1.size + actions2.size - intersection;
    if (union === 0) return 0;

    return intersection / union;
  }

  /**
   * Detect sockpuppets using behavioral fingerprint similarity.
   * Compares action distributions using Jaccard similarity.
   */
  detectSockpuppets(
    userId1: string,
    userId2: string,
  ): { similarity: number; isSockpuppet: boolean; indicators: string[] } {
    const profile1 = this.profiles.get(userId1);
    const profile2 = this.profiles.get(userId2);

    if (!profile1 || !profile2) {
      return { similarity: 0, isSockpuppet: false, indicators: ['insufficient_data'] };
    }

    const indicators: string[] = [];
    let totalSimilarity = 0;
    let factors = 0;

    // Compare action distributions
    const dist1Keys = new Set(Object.keys(profile1.actionDistribution));
    const dist2Keys = new Set(Object.keys(profile2.actionDistribution));
    let distIntersection = 0;
    for (const key of dist1Keys) {
      if (dist2Keys.has(key)) distIntersection++;
    }
    const distUnion = dist1Keys.size + dist2Keys.size - distIntersection;
    const actionJaccard = distUnion > 0 ? distIntersection / distUnion : 0;
    totalSimilarity += actionJaccard;
    factors++;

    if (actionJaccard > 0.8) {
      indicators.push('very_similar_action_patterns');
    }

    // Compare peak hours
    const hours1 = new Set(profile1.peakHours);
    const hours2 = new Set(profile2.peakHours);
    let hourIntersection = 0;
    for (const h of hours1) {
      if (hours2.has(h)) hourIntersection++;
    }
    const hourUnion = hours1.size + hours2.size - hourIntersection;
    const hourSimilarity = hourUnion > 0 ? hourIntersection / hourUnion : 0;
    totalSimilarity += hourSimilarity;
    factors++;

    if (hourSimilarity > 0.8) {
      indicators.push('matching_activity_hours');
    }

    // Compare entropy values
    const entropyDiff = Math.abs(profile1.entropy - profile2.entropy);
    const maxEntropy = Math.max(profile1.entropy, profile2.entropy, 1);
    const entropySimilarity = 1 - entropyDiff / maxEntropy;
    totalSimilarity += entropySimilarity;
    factors++;

    if (entropySimilarity > 0.9) {
      indicators.push('similar_entropy');
    }

    // Compare activity rates
    const rateDiff = Math.abs(profile1.averageActionsPerHour - profile2.averageActionsPerHour);
    const maxRate = Math.max(profile1.averageActionsPerHour, profile2.averageActionsPerHour, 1);
    const rateSimilarity = 1 - rateDiff / maxRate;
    totalSimilarity += rateSimilarity;
    factors++;

    if (rateSimilarity > 0.9) {
      indicators.push('similar_activity_rate');
    }

    const overallSimilarity = factors > 0 ? totalSimilarity / factors : 0;
    const isSockpuppet = overallSimilarity > 0.75 && indicators.length >= 3;

    return { similarity: overallSimilarity, isSockpuppet, indicators };
  }

  /**
   * Detect brigading: sudden engagement spike from accounts with high mutual correlation.
   * A brigade is detected when many correlated accounts suddenly engage with the same target.
   */
  detectBrigading(
    targetId: string,
    timeWindowMs: number = 300000, // 5 minutes default
  ): { detected: boolean; severity: RiskLevel; participants: string[]; spikeRatio: number } {
    const now = Date.now();
    const windowStart = now - timeWindowMs;

    // Find all users who acted on the target in the window
    const participants: string[] = [];
    const participantTimestamps: Map<string, number[]> = new Map();

    for (const [userId, history] of this.actionHistory) {
      const targetActions = history.filter(
        (a) => a.targetId === targetId && a.timestamp >= windowStart,
      );
      if (targetActions.length > 0) {
        participants.push(userId);
        participantTimestamps.set(
          userId,
          targetActions.map((a) => a.timestamp),
        );
      }
    }

    if (participants.length < 3) {
      return { detected: false, severity: 'low', participants: [], spikeRatio: 0 };
    }

    // Calculate the engagement rate compared to normal baseline
    // Check the same target's engagement in the previous period
    const prevWindowStart = windowStart - timeWindowMs;
    let prevEngagement = 0;
    for (const [_userId, history] of this.actionHistory) {
      const prevActions = history.filter(
        (a) =>
          a.targetId === targetId && a.timestamp >= prevWindowStart && a.timestamp < windowStart,
      );
      prevEngagement += prevActions.length;
    }

    const currentEngagement = participants.length;
    const baselineEngagement = Math.max(1, prevEngagement);
    const spikeRatio = currentEngagement / baselineEngagement;

    // Determine severity based on spike ratio
    let severity: RiskLevel;
    if (spikeRatio > 10) severity = 'critical';
    else if (spikeRatio > 5) severity = 'high';
    else if (spikeRatio > 3) severity = 'medium';
    else severity = 'low';

    const detected = spikeRatio > 3 && participants.length >= 5;

    if (detected) {
      this.anomalies.push({
        userId: targetId,
        type: 'coordination',
        severity,
        confidence: Math.min(1, spikeRatio / 10),
        detectedAt: now,
        details: `Brigading detected: ${participants.length} participants, ${spikeRatio.toFixed(1)}x spike`,
      });
    }

    return { detected, severity, participants, spikeRatio };
  }

  /**
   * Detect account age vs activity mismatch.
   * New accounts with high activity are suspicious.
   */
  detectAgeMismatch(
    userId: string,
    accountAgeDays: number,
  ): { suspicious: boolean; reason: string; riskLevel: RiskLevel } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return { suspicious: false, reason: 'No profile data', riskLevel: 'low' };
    }

    // Expected activity rate based on age
    // New accounts (< 7 days) should have lower activity
    const expectedMaxRate =
      accountAgeDays < 1 ? 10 : accountAgeDays < 7 ? 30 : accountAgeDays < 30 ? 60 : 200;

    if (profile.averageActionsPerHour > expectedMaxRate) {
      const ratio = profile.averageActionsPerHour / expectedMaxRate;
      let riskLevel: RiskLevel;
      if (ratio > 5) riskLevel = 'critical';
      else if (ratio > 3) riskLevel = 'high';
      else if (ratio > 2) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        suspicious: ratio > 2,
        reason: `Account age ${accountAgeDays}d with ${profile.averageActionsPerHour.toFixed(0)} actions/hr exceeds expected max of ${expectedMaxRate}`,
        riskLevel,
      };
    }

    return {
      suspicious: false,
      reason: 'Activity within normal range for account age',
      riskLevel: 'low',
    };
  }

  /**
   * Get a user's behavior profile
   */
  getProfile(userId: string): BehaviorProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  /**
   * Get all detected anomalies
   */
  getAnomalies(): BehaviorAnomaly[] {
    return [...this.anomalies];
  }

  /**
   * Get detected network clusters
   */
  getClusters(): NetworkCluster[] {
    return [...this.clusters];
  }

  /**
   * Calculate variance of a number array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) * (v - mean));
    return squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
  }
}
