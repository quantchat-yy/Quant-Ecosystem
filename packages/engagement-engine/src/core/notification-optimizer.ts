// ============================================================================
// Engagement Engine - Notification Optimizer
// ============================================================================

import {
  NotificationOptimization,
  NotificationChannel,
  NotificationEngagement,
  FrequencyCap,
} from '../types';

interface NotificationOptimizerConfig {
  fatigueDecayRate: number;
  fatigueThreshold: number;
  activityBuckets: number;
  channelWeightLearningRate: number;
  maxNotificationsPerDay: number;
  cooldownMs: number;
  personalizedScheduling: boolean;
}

interface UserActivityProfile {
  hourlyActivity: number[];
  dailyActivity: number[];
  channelPreferences: Record<NotificationChannel, number>;
  avgResponseTime: number;
  totalEngagements: number;
}

interface ChannelModel {
  weights: number[];
  bias: number;
  features: string[];
}

interface SendTimeScore {
  hour: number;
  day: number;
  score: number;
  confidence: number;
}

export class NotificationOptimizer {
  private config: NotificationOptimizerConfig;
  private userProfiles: Map<string, UserActivityProfile> = new Map();
  private engagementHistory: Map<string, NotificationEngagement[]> = new Map();
  private frequencyCaps: Map<string, FrequencyCap[]> = new Map();
  private channelModels: Map<NotificationChannel, ChannelModel> = new Map();
  private fatigueScores: Map<string, number> = new Map();
  private sendTimeScores: Map<string, SendTimeScore[]> = new Map();

  constructor(config: Partial<NotificationOptimizerConfig> = {}) {
    this.config = {
      fatigueDecayRate: config.fatigueDecayRate ?? 0.05,
      fatigueThreshold: config.fatigueThreshold ?? 0.8,
      activityBuckets: config.activityBuckets ?? 24,
      channelWeightLearningRate: config.channelWeightLearningRate ?? 0.01,
      maxNotificationsPerDay: config.maxNotificationsPerDay ?? 5,
      cooldownMs: config.cooldownMs ?? 3600000,
      personalizedScheduling: config.personalizedScheduling ?? true,
    };

    this.initializeChannelModels();
  }

  private initializeChannelModels(): void {
    const channels: NotificationChannel[] = ['push', 'email', 'in_app', 'sms'];
    const features = [
      'hour_of_day',
      'day_of_week',
      'fatigue_score',
      'days_since_last',
      'historical_ctr',
    ];

    for (const channel of channels) {
      this.channelModels.set(channel, {
        weights: features.map(() => (Math.random() - 0.5) * 0.1),
        bias: 0,
        features,
      });
    }
  }

  recordEngagement(userId: string, engagement: NotificationEngagement): void {
    const history = this.engagementHistory.get(userId) ?? [];
    history.push(engagement);

    // Keep last 1000 engagements per user
    if (history.length > 1000) {
      history.shift();
    }
    this.engagementHistory.set(userId, history);

    // Update user activity profile
    this.updateActivityProfile(userId, engagement);

    // Update channel model with online learning
    this.updateChannelModel(engagement);

    // Update fatigue score
    this.updateFatigueScore(userId, engagement);
  }

  private updateActivityProfile(userId: string, engagement: NotificationEngagement): void {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        hourlyActivity: new Array(24).fill(0),
        dailyActivity: new Array(7).fill(0),
        channelPreferences: { push: 0.25, email: 0.25, in_app: 0.25, sms: 0.25 },
        avgResponseTime: 0,
        totalEngagements: 0,
      };
    }

    // Update hourly activity histogram
    const hourIdx = engagement.hourOfDay;
    profile.hourlyActivity[hourIdx] = (profile.hourlyActivity[hourIdx] ?? 0) + 1;

    // Update daily activity histogram
    const dayIdx = engagement.dayOfWeek;
    profile.dailyActivity[dayIdx] = (profile.dailyActivity[dayIdx] ?? 0) + 1;

    // Update channel preference using EMA
    const opened = engagement.openedAt !== undefined;
    const clicked = engagement.clickedAt !== undefined;
    const engagementValue = clicked ? 1.0 : opened ? 0.5 : 0;

    const alpha = 0.1;
    profile.channelPreferences[engagement.channel] =
      (1 - alpha) * profile.channelPreferences[engagement.channel] + alpha * engagementValue;

    // Normalize preferences
    const total = Object.values(profile.channelPreferences).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const channel of Object.keys(profile.channelPreferences) as NotificationChannel[]) {
        profile.channelPreferences[channel] /= total;
      }
    }

    // Update average response time
    if (engagement.openedAt && engagement.sentAt) {
      const responseTime = engagement.openedAt - engagement.sentAt;
      profile.totalEngagements += 1;
      profile.avgResponseTime =
        profile.avgResponseTime +
        (responseTime - profile.avgResponseTime) / profile.totalEngagements;
    }

    this.userProfiles.set(userId, profile);
  }

  private updateChannelModel(engagement: NotificationEngagement): void {
    const model = this.channelModels.get(engagement.channel);
    if (!model) return;

    // Feature extraction
    const features = this.extractFeatures(engagement);

    // Binary label: 1 if clicked, 0 otherwise
    const label = engagement.clickedAt !== undefined ? 1 : 0;

    // Logistic regression online update using SGD
    const prediction = this.sigmoid(this.dotProduct(model.weights, features) + model.bias);
    const error = label - prediction;

    // Gradient descent update
    const lr = this.config.channelWeightLearningRate;
    for (let i = 0; i < model.weights.length; i++) {
      model.weights[i] = (model.weights[i] ?? 0) + lr * error * (features[i] ?? 0);
    }
    model.bias += lr * error;
  }

  private extractFeatures(engagement: NotificationEngagement): number[] {
    const userId = 'unknown'; // Simplified - in production would look up user
    const fatigue = this.fatigueScores.get(userId) ?? 0;
    const daysSinceLast = 1; // Simplified
    const historicalCtr = 0.1; // Default

    return [
      engagement.hourOfDay / 24, // Normalized hour
      engagement.dayOfWeek / 7, // Normalized day
      fatigue,
      daysSinceLast / 30, // Normalized days
      historicalCtr,
    ];
  }

  private sigmoid(x: number): number {
    if (x > 500) return 1;
    if (x < -500) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += (a[i] ?? 0) * (b[i] ?? 0);
    }
    return sum;
  }

  private updateFatigueScore(userId: string, engagement: NotificationEngagement): void {
    let fatigue = this.fatigueScores.get(userId) ?? 0;

    // Increase fatigue when notification is sent
    fatigue += 0.1;

    // Decrease fatigue when user engages (clicked or opened)
    if (engagement.clickedAt !== undefined) {
      fatigue -= 0.15;
    } else if (engagement.openedAt !== undefined) {
      fatigue -= 0.05;
    }

    // Apply exponential decay over time
    const timeSinceLast = Date.now() - engagement.sentAt;
    const decayFactor = Math.exp((-this.config.fatigueDecayRate * timeSinceLast) / 3600000);
    fatigue *= decayFactor;

    // Clamp to [0, 1]
    fatigue = Math.max(0, Math.min(1, fatigue));

    this.fatigueScores.set(userId, fatigue);
  }

  getFatigueScore(userId: string): number {
    return this.fatigueScores.get(userId) ?? 0;
  }

  selectBestChannel(userId: string): NotificationChannel {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 'push'; // Default

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const fatigue = this.fatigueScores.get(userId) ?? 0;

    const channels: NotificationChannel[] = ['push', 'email', 'in_app', 'sms'];
    let bestChannel: NotificationChannel = 'push';
    let bestScore = -Infinity;

    for (const channel of channels) {
      // Check frequency cap
      if (this.isChannelCapped(userId, channel)) continue;

      const model = this.channelModels.get(channel);
      if (!model) continue;

      const features = [
        hour / 24,
        day / 7,
        fatigue,
        1 / 30, // Default days since last
        profile.channelPreferences[channel],
      ];

      const score = this.sigmoid(this.dotProduct(model.weights, features) + model.bias);

      // Weight by user preference
      const adjustedScore = score * (0.7 + 0.3 * profile.channelPreferences[channel]);

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestChannel = channel;
      }
    }

    return bestChannel;
  }

  private isChannelCapped(userId: string, channel: NotificationChannel): boolean {
    const caps = this.frequencyCaps.get(userId);
    if (!caps) return false;

    const cap = caps.find((c) => c.channel === channel);
    if (!cap) return false;

    const now = Date.now();

    // Reset daily count if needed
    if (now - cap.lastResetAt > 86400000) {
      cap.currentCount = 0;
      cap.lastResetAt = now;
    }

    return cap.currentCount >= cap.maxPerDay;
  }

  getOptimalSendTime(userId: string): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 9; // Default 9am

    // Find the hour with highest activity
    let bestHour = 0;
    let bestActivity = 0;

    for (let hour = 0; hour < 24; hour++) {
      // Weighted score: activity * (1 - fatigue at that hour)
      const activity = profile.hourlyActivity[hour] ?? 0;
      if (activity > bestActivity) {
        bestActivity = activity;
        bestHour = hour;
      }
    }

    // Apply Gaussian smoothing around best hour
    const scores = this.sendTimeScores.get(userId) ?? [];
    if (scores.length > 0) {
      let smoothedBest = 0;
      let smoothedScore = -Infinity;

      for (const score of scores) {
        const gaussian = Math.exp(-0.5 * Math.pow((score.hour - bestHour) / 2, 2));
        const combined = score.score * gaussian;
        if (combined > smoothedScore) {
          smoothedScore = combined;
          smoothedBest = score.hour;
        }
      }
      return smoothedBest;
    }

    return bestHour;
  }

  setFrequencyCap(
    userId: string,
    channel: NotificationChannel,
    maxPerDay: number,
    maxPerWeek: number,
  ): void {
    const caps = this.frequencyCaps.get(userId) ?? [];
    const existing = caps.find((c) => c.channel === channel);

    if (existing) {
      existing.maxPerDay = maxPerDay;
      existing.maxPerWeek = maxPerWeek;
    } else {
      caps.push({
        channel,
        maxPerDay,
        maxPerWeek,
        cooldownMs: this.config.cooldownMs,
        currentCount: 0,
        lastResetAt: Date.now(),
      });
    }

    this.frequencyCaps.set(userId, caps);
  }

  recordSend(userId: string, channel: NotificationChannel): void {
    const caps = this.frequencyCaps.get(userId) ?? [];
    const cap = caps.find((c) => c.channel === channel);
    if (cap) {
      cap.currentCount += 1;
    }

    // Increase fatigue on send
    const fatigue = this.fatigueScores.get(userId) ?? 0;
    this.fatigueScores.set(userId, Math.min(1, fatigue + 0.1));
  }

  getOptimization(userId: string): NotificationOptimization {
    const profile = this.userProfiles.get(userId);
    const history = this.engagementHistory.get(userId) ?? [];
    const fatigue = this.fatigueScores.get(userId) ?? 0;

    const channelScores: Record<NotificationChannel, number> = {
      push: profile?.channelPreferences.push ?? 0.25,
      email: profile?.channelPreferences.email ?? 0.25,
      in_app: profile?.channelPreferences.in_app ?? 0.25,
      sms: profile?.channelPreferences.sms ?? 0.25,
    };

    const lastSentAt: Record<NotificationChannel, number> = {
      push: 0,
      email: 0,
      in_app: 0,
      sms: 0,
    };

    for (const engagement of history) {
      if (engagement.sentAt > lastSentAt[engagement.channel]) {
        lastSentAt[engagement.channel] = engagement.sentAt;
      }
    }

    return {
      userId,
      bestChannel: this.selectBestChannel(userId),
      bestTimeSlot: this.getOptimalSendTime(userId),
      fatigue,
      channelScores,
      lastSentAt,
      engagementHistory: history.slice(-20),
    };
  }

  shouldSendNotification(userId: string): boolean {
    const fatigue = this.fatigueScores.get(userId) ?? 0;
    return fatigue < this.config.fatigueThreshold;
  }

  computePersonalizationScore(userId: string, _messageType: string): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 0.5;

    // Base score from engagement history
    const history = this.engagementHistory.get(userId) ?? [];
    const recentHistory = history.slice(-50);

    if (recentHistory.length === 0) return 0.5;

    // Click-through rate as base score
    const clicks = recentHistory.filter((e) => e.clickedAt !== undefined).length;
    const ctr = clicks / recentHistory.length;

    // Adjust by fatigue (inverse relationship)
    const fatigue = this.fatigueScores.get(userId) ?? 0;
    const fatigueAdjustment = 1 - fatigue * 0.5;

    // Recency boost: more recent engagement = higher score
    const lastEngagement = recentHistory[recentHistory.length - 1];
    const hoursSinceEngagement = (Date.now() - (lastEngagement?.sentAt ?? 0)) / 3600000;
    const recencyBoost = Math.exp(-hoursSinceEngagement / 48);

    return Math.min(1, ctr * fatigueAdjustment * (0.5 + 0.5 * recencyBoost));
  }

  getChannelCTR(channel: NotificationChannel): number {
    let totalSent = 0;
    let totalClicked = 0;

    for (const [, history] of this.engagementHistory) {
      for (const engagement of history) {
        if (engagement.channel === channel) {
          totalSent += 1;
          if (engagement.clickedAt !== undefined) {
            totalClicked += 1;
          }
        }
      }
    }

    return totalSent > 0 ? totalClicked / totalSent : 0;
  }

  getUserCount(): number {
    return this.userProfiles.size;
  }
}
