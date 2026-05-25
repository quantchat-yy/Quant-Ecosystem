// ============================================================================
// Gaming Package - Achievement System
// ============================================================================

import {
  Achievement,
  AchievementCondition,
  AchievementProgress,
  AchievementReward,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AchievementNotification {
  achievementId: string;
  playerId: string;
  timestamp: number;
  achievement: Achievement;
}

interface PlayerAchievementData {
  progress: Map<string, AchievementProgress>;
  unlockedIds: Set<string>;
  totalPoints: number;
  metrics: Map<string, number>;
  streaks: Map<string, { current: number; best: number; lastUpdate: number }>;
}

// ---------------------------------------------------------------------------
// Achievement System
// ---------------------------------------------------------------------------

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private playerData: Map<string, PlayerAchievementData> = new Map();
  private notificationQueue: AchievementNotification[] = [];
  private categories: Map<string, string[]> = new Map();
  private rewardCallbacks: Array<(playerId: string, reward: AchievementReward) => void> = [];
  private unlockCallbacks: Array<(playerId: string, achievement: Achievement) => void> = [];
  private maxNotifications: number = 100;

  constructor(config?: { maxNotifications?: number }) {
    if (config?.maxNotifications) this.maxNotifications = config.maxNotifications;
  }

  /** Register an achievement definition */
  registerAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);

    // Add to category
    if (!this.categories.has(achievement.category)) {
      this.categories.set(achievement.category, []);
    }
    this.categories.get(achievement.category)!.push(achievement.id);
  }

  /** Register multiple achievements at once */
  registerBatch(achievements: Achievement[]): void {
    for (const achievement of achievements) {
      this.registerAchievement(achievement);
    }
  }

  /** Remove an achievement */
  removeAchievement(achievementId: string): void {
    const achievement = this.achievements.get(achievementId);
    if (achievement) {
      const categoryList = this.categories.get(achievement.category);
      if (categoryList) {
        const idx = categoryList.indexOf(achievementId);
        if (idx >= 0) categoryList.splice(idx, 1);
      }
    }
    this.achievements.delete(achievementId);
  }

  /** Initialize a player's achievement data */
  initPlayer(playerId: string): void {
    if (this.playerData.has(playerId)) return;

    const data: PlayerAchievementData = {
      progress: new Map(),
      unlockedIds: new Set(),
      totalPoints: 0,
      metrics: new Map(),
      streaks: new Map(),
    };

    // Create progress for each achievement
    for (const [id, achievement] of this.achievements.entries()) {
      const targetValue = this.getTargetValue(achievement);
      data.progress.set(id, {
        achievementId: id,
        playerId,
        currentValue: 0,
        targetValue,
        unlocked: false,
        unlockedAt: null,
        streakCurrent: 0,
        streakBest: 0,
      });
    }

    this.playerData.set(playerId, data);
  }

  /** Update a metric for a player (triggers achievement checks) */
  updateMetric(playerId: string, metric: string, value: number, mode: 'set' | 'increment' = 'increment'): Achievement[] {
    const data = this.getOrCreatePlayerData(playerId);
    const currentValue = data.metrics.get(metric) || 0;
    const newValue = mode === 'set' ? value : currentValue + value;
    data.metrics.set(metric, newValue);

    // Check all achievements that use this metric
    const unlocked: Achievement[] = [];
    for (const [achievementId, achievement] of this.achievements.entries()) {
      if (data.unlockedIds.has(achievementId)) continue;

      const progress = data.progress.get(achievementId);
      if (!progress) continue;

      let shouldCheck = false;
      for (const condition of achievement.conditions) {
        if (condition.metric === metric) {
          shouldCheck = true;
          break;
        }
      }

      if (shouldCheck) {
        const wasUnlocked = this.evaluateAchievement(data, achievement, progress);
        if (wasUnlocked) {
          unlocked.push(achievement);
        }
      }
    }

    return unlocked;
  }

  /** Update a streak for a player */
  updateStreak(playerId: string, streakId: string, completed: boolean): void {
    const data = this.getOrCreatePlayerData(playerId);
    const streak = data.streaks.get(streakId) || { current: 0, best: 0, lastUpdate: 0 };
    const now = Date.now();

    if (completed) {
      streak.current++;
      if (streak.current > streak.best) {
        streak.best = streak.current;
      }
    } else {
      streak.current = 0;
    }
    streak.lastUpdate = now;
    data.streaks.set(streakId, streak);

    // Update streak-based metrics
    this.updateMetric(playerId, `streak:${streakId}:current`, streak.current, 'set');
    this.updateMetric(playerId, `streak:${streakId}:best`, streak.best, 'set');
  }

  /** Get achievement progress for a player */
  getProgress(playerId: string, achievementId: string): AchievementProgress | null {
    const data = this.playerData.get(playerId);
    if (!data) return null;
    return data.progress.get(achievementId) || null;
  }

  /** Get all progress for a player */
  getAllProgress(playerId: string): AchievementProgress[] {
    const data = this.playerData.get(playerId);
    if (!data) return [];
    return [...data.progress.values()];
  }

  /** Get unlocked achievements for a player */
  getUnlocked(playerId: string): Achievement[] {
    const data = this.playerData.get(playerId);
    if (!data) return [];

    const unlocked: Achievement[] = [];
    for (const id of data.unlockedIds) {
      const achievement = this.achievements.get(id);
      if (achievement) unlocked.push(achievement);
    }
    return unlocked;
  }

  /** Get achievements by category */
  getByCategory(category: string): Achievement[] {
    const ids = this.categories.get(category) || [];
    return ids.map((id) => this.achievements.get(id)!).filter(Boolean);
  }

  /** Get achievements by tier */
  getByTier(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): Achievement[] {
    const result: Achievement[] = [];
    for (const achievement of this.achievements.values()) {
      if (achievement.tier === tier) result.push(achievement);
    }
    return result;
  }

  /** Get visible achievements (excludes locked secrets) */
  getVisible(playerId: string): Achievement[] {
    const data = this.playerData.get(playerId);
    const visible: Achievement[] = [];

    for (const achievement of this.achievements.values()) {
      if (!achievement.secret || (data && data.unlockedIds.has(achievement.id))) {
        visible.push(achievement);
      }
    }
    return visible;
  }

  /** Get total points for a player */
  getTotalPoints(playerId: string): number {
    const data = this.playerData.get(playerId);
    return data ? data.totalPoints : 0;
  }

  /** Get completion percentage for a player */
  getCompletionPercentage(playerId: string): number {
    const data = this.playerData.get(playerId);
    if (!data || this.achievements.size === 0) return 0;
    return (data.unlockedIds.size / this.achievements.size) * 100;
  }

  /** Dequeue notification */
  popNotification(): AchievementNotification | null {
    return this.notificationQueue.shift() || null;
  }

  /** Get all pending notifications */
  getNotifications(): AchievementNotification[] {
    return [...this.notificationQueue];
  }

  /** Clear notifications */
  clearNotifications(): void {
    this.notificationQueue = [];
  }

  /** Register unlock callback */
  onUnlock(callback: (playerId: string, achievement: Achievement) => void): void {
    this.unlockCallbacks.push(callback);
  }

  /** Register reward callback */
  onReward(callback: (playerId: string, reward: AchievementReward) => void): void {
    this.rewardCallbacks.push(callback);
  }

  /** Force unlock an achievement (admin/debug) */
  forceUnlock(playerId: string, achievementId: string): boolean {
    const data = this.getOrCreatePlayerData(playerId);
    const achievement = this.achievements.get(achievementId);
    if (!achievement || data.unlockedIds.has(achievementId)) return false;

    data.unlockedIds.add(achievementId);
    data.totalPoints += achievement.points;

    const progress = data.progress.get(achievementId);
    if (progress) {
      progress.unlocked = true;
      progress.unlockedAt = Date.now();
      progress.currentValue = progress.targetValue;
    }

    this.grantRewards(playerId, achievement);
    this.queueNotification(playerId, achievement);
    return true;
  }

  /** Get achievement count */
  getAchievementCount(): number {
    return this.achievements.size;
  }

  /** Get all categories */
  getCategories(): string[] {
    return [...this.categories.keys()];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getOrCreatePlayerData(playerId: string): PlayerAchievementData {
    if (!this.playerData.has(playerId)) {
      this.initPlayer(playerId);
    }
    return this.playerData.get(playerId)!;
  }

  private getTargetValue(achievement: Achievement): number {
    if (achievement.conditions.length === 0) return 1;
    // Use the first condition's threshold as the target
    return achievement.conditions[0].threshold;
  }

  private evaluateAchievement(
    data: PlayerAchievementData,
    achievement: Achievement,
    progress: AchievementProgress
  ): boolean {
    let allConditionsMet = true;

    for (const condition of achievement.conditions) {
      const metricValue = data.metrics.get(condition.metric) || 0;
      let conditionMet = false;

      switch (condition.type) {
        case 'count':
          conditionMet = this.evaluateOperator(metricValue, condition.threshold, condition.operator);
          break;

        case 'streak': {
          const streakData = data.streaks.get(condition.metric);
          const streakValue = streakData ? streakData.current : 0;
          conditionMet = this.evaluateOperator(streakValue, condition.threshold, condition.operator);
          break;
        }

        case 'combo':
          conditionMet = this.evaluateOperator(metricValue, condition.threshold, condition.operator);
          break;

        case 'time':
          if (condition.timeWindow) {
            // Check if metric was reached within time window
            conditionMet = this.evaluateOperator(metricValue, condition.threshold, condition.operator);
          }
          break;

        case 'value':
          conditionMet = this.evaluateOperator(metricValue, condition.threshold, condition.operator);
          break;

        case 'compound':
          conditionMet = this.evaluateOperator(metricValue, condition.threshold, condition.operator);
          break;
      }

      if (!conditionMet) {
        allConditionsMet = false;
      }

      // Update progress with the first condition's metric
      if (condition === achievement.conditions[0]) {
        progress.currentValue = metricValue;
      }
    }

    if (allConditionsMet && !progress.unlocked) {
      // Achievement unlocked
      progress.unlocked = true;
      progress.unlockedAt = Date.now();
      data.unlockedIds.add(achievement.id);
      data.totalPoints += achievement.points;

      // Grant rewards
      this.grantRewards(progress.playerId, achievement);

      // Queue notification
      this.queueNotification(progress.playerId, achievement);

      // Trigger callbacks
      for (const callback of this.unlockCallbacks) {
        callback(progress.playerId, achievement);
      }

      return true;
    }

    return false;
  }

  private evaluateOperator(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      default: return false;
    }
  }

  private grantRewards(playerId: string, achievement: Achievement): void {
    for (const reward of achievement.rewards) {
      for (const callback of this.rewardCallbacks) {
        callback(playerId, reward);
      }
    }
  }

  private queueNotification(playerId: string, achievement: Achievement): void {
    this.notificationQueue.push({
      achievementId: achievement.id,
      playerId,
      timestamp: Date.now(),
      achievement,
    });

    if (this.notificationQueue.length > this.maxNotifications) {
      this.notificationQueue.shift();
    }
  }
}
