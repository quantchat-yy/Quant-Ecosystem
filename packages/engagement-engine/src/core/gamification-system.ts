// ============================================================================
// Engagement Engine - Gamification System
// ============================================================================

import {
  GamificationConfig,
  StreakData,
  BadgeDefinition,
  BadgeCondition,
  LevelProgression,
  ChallengeConfig,
  LeaderboardEntry,
} from '../types';

interface UserGamificationState {
  progression: LevelProgression;
  streak: StreakData;
  badges: Set<string>;
  challengeProgress: Map<string, number>;
  comboState: ComboState;
  lastActions: ActionRecord[];
}

interface ComboState {
  currentCombo: number;
  multiplier: number;
  lastActionAt: number;
  comboActions: string[];
}

interface ActionRecord {
  action: string;
  timestamp: number;
  xpEarned: number;
}

export class GamificationSystem {
  private config: GamificationConfig;
  private users: Map<string, UserGamificationState> = new Map();
  private badges: Map<string, BadgeDefinition> = new Map();
  private challenges: Map<string, ChallengeConfig> = new Map();
  private leaderboard: LeaderboardEntry[] = [];
  private globalMetrics: Map<string, number> = new Map();

  constructor(config: Partial<GamificationConfig> = {}) {
    this.config = {
      baseXpPerAction: config.baseXpPerAction ?? {
        view: 1,
        click: 2,
        like: 3,
        comment: 5,
        share: 10,
        create: 15,
        invite: 20,
        purchase: 50,
      },
      levelFormula: config.levelFormula ?? 'logarithmic',
      levelBase: config.levelBase ?? 100,
      streakMultiplierCap: config.streakMultiplierCap ?? 5.0,
      freezeTokensPerPeriod: config.freezeTokensPerPeriod ?? 2,
      comboWindow: config.comboWindow ?? 30000, // 30 seconds
      maxComboMultiplier: config.maxComboMultiplier ?? 4.0,
    };
  }

  private getOrCreateUser(userId: string): UserGamificationState {
    let state = this.users.get(userId);
    if (!state) {
      state = {
        progression: {
          userId,
          currentLevel: 1,
          currentXp: 0,
          xpToNextLevel: this.xpRequiredForLevel(2),
          totalXp: 0,
          levelHistory: [{ level: 1, reachedAt: Date.now(), xpAtLevel: 0 }],
          prestige: 0,
        },
        streak: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityAt: 0,
          freezeTokensRemaining: this.config.freezeTokensPerPeriod,
          multiplier: 1.0,
          gracePeriodsUsed: 0,
          streakStartedAt: 0,
        },
        badges: new Set(),
        challengeProgress: new Map(),
        comboState: {
          currentCombo: 0,
          multiplier: 1.0,
          lastActionAt: 0,
          comboActions: [],
        },
        lastActions: [],
      };
      this.users.set(userId, state);
    }
    return state;
  }

  // Logarithmic level scaling: level = floor(log2(xp / base) + 1)
  calculateLevel(totalXp: number): number {
    if (totalXp <= 0) return 1;

    switch (this.config.levelFormula) {
      case 'logarithmic':
        return Math.max(1, Math.floor(Math.log2(totalXp / this.config.levelBase + 1) + 1));
      case 'linear':
        return Math.max(1, Math.floor(totalXp / this.config.levelBase) + 1);
      case 'exponential':
        return Math.max(
          1,
          Math.floor(Math.log(totalXp / this.config.levelBase + 1) / Math.log(1.5)) + 1,
        );
      default:
        return Math.max(1, Math.floor(Math.log2(totalXp / this.config.levelBase + 1) + 1));
    }
  }

  xpRequiredForLevel(level: number): number {
    if (level <= 1) return 0;

    switch (this.config.levelFormula) {
      case 'logarithmic':
        // Inverse of level formula: xp = base * (2^(level-1) - 1)
        return Math.floor(this.config.levelBase * (Math.pow(2, level - 1) - 1));
      case 'linear':
        return this.config.levelBase * (level - 1);
      case 'exponential':
        return Math.floor(this.config.levelBase * (Math.pow(1.5, level - 1) - 1));
      default:
        return Math.floor(this.config.levelBase * (Math.pow(2, level - 1) - 1));
    }
  }

  recordAction(
    userId: string,
    action: string,
  ): { xpEarned: number; leveledUp: boolean; newLevel: number; comboMultiplier: number } {
    const state = this.getOrCreateUser(userId);
    const now = Date.now();

    // Base XP for action
    const baseXp = this.config.baseXpPerAction[action] ?? 1;

    // Update combo state
    const comboMultiplier = this.updateCombo(state, action, now);

    // Streak multiplier
    const streakMultiplier = state.streak.multiplier;

    // Total XP with multipliers
    const totalXpEarned = Math.floor(baseXp * comboMultiplier * streakMultiplier);

    // Update progression
    state.progression.currentXp += totalXpEarned;
    state.progression.totalXp += totalXpEarned;

    // Check for level up
    const newLevel = this.calculateLevel(state.progression.totalXp);
    const leveledUp = newLevel > state.progression.currentLevel;

    if (leveledUp) {
      state.progression.currentLevel = newLevel;
      state.progression.levelHistory.push({
        level: newLevel,
        reachedAt: now,
        xpAtLevel: state.progression.totalXp,
      });
    }

    state.progression.xpToNextLevel =
      this.xpRequiredForLevel(state.progression.currentLevel + 1) - state.progression.totalXp;

    // Record action
    state.lastActions.push({ action, timestamp: now, xpEarned: totalXpEarned });
    if (state.lastActions.length > 100) {
      state.lastActions.shift();
    }

    // Update streak
    this.updateStreak(state, now);

    // Check badge conditions
    this.checkBadgeUnlocks(userId, state);

    // Update challenge progress
    this.updateChallengeProgress(userId, action);

    // Update global metrics
    const currentCount = this.globalMetrics.get(action) ?? 0;
    this.globalMetrics.set(action, currentCount + 1);

    return {
      xpEarned: totalXpEarned,
      leveledUp,
      newLevel: state.progression.currentLevel,
      comboMultiplier,
    };
  }

  private updateCombo(state: UserGamificationState, action: string, now: number): number {
    const combo = state.comboState;
    const timeSinceLastAction = now - combo.lastActionAt;

    if (timeSinceLastAction <= this.config.comboWindow && combo.lastActionAt > 0) {
      // Continue combo
      combo.currentCombo += 1;
      combo.comboActions.push(action);

      // Combo multiplier with diminishing returns: 1 + log2(combo) up to cap
      combo.multiplier = Math.min(
        this.config.maxComboMultiplier,
        1 + Math.log2(combo.currentCombo + 1),
      );
    } else {
      // Reset combo
      combo.currentCombo = 1;
      combo.multiplier = 1.0;
      combo.comboActions = [action];
    }

    combo.lastActionAt = now;
    return combo.multiplier;
  }

  private updateStreak(state: UserGamificationState, now: number): void {
    const streak = state.streak;
    const dayMs = 86400000;
    const timeSinceLastActivity = now - streak.lastActivityAt;

    if (streak.lastActivityAt === 0) {
      // First activity
      streak.currentStreak = 1;
      streak.streakStartedAt = now;
    } else if (timeSinceLastActivity < dayMs) {
      // Same day - no streak change
    } else if (timeSinceLastActivity < dayMs * 2) {
      // Next day - increment streak
      streak.currentStreak += 1;
    } else if (timeSinceLastActivity < dayMs * 3 && streak.freezeTokensRemaining > 0) {
      // Missed one day but have freeze token
      streak.freezeTokensRemaining -= 1;
      streak.currentStreak += 1;
      streak.gracePeriodsUsed += 1;
    } else {
      // Streak broken
      streak.currentStreak = 1;
      streak.streakStartedAt = now;
    }

    streak.lastActivityAt = now;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

    // Calculate streak multiplier: logarithmic growth capped at max
    streak.multiplier = Math.min(
      this.config.streakMultiplierCap,
      1 + Math.log2(streak.currentStreak + 1) * 0.5,
    );
  }

  useStreakFreeze(userId: string): boolean {
    const state = this.getOrCreateUser(userId);
    if (state.streak.freezeTokensRemaining <= 0) return false;

    state.streak.freezeTokensRemaining -= 1;
    state.streak.gracePeriodExpiry = Date.now() + 86400000;
    return true;
  }

  // Badge system
  registerBadge(badge: BadgeDefinition): void {
    this.badges.set(badge.id, badge);
  }

  private checkBadgeUnlocks(_userId: string, state: UserGamificationState): string[] {
    const newBadges: string[] = [];

    for (const [badgeId, badge] of this.badges) {
      if (state.badges.has(badgeId)) continue;

      if (this.evaluateBadgeCondition(badge.unlockCondition, state)) {
        state.badges.add(badgeId);
        newBadges.push(badgeId);

        // Award XP for badge
        state.progression.currentXp += badge.xpReward;
        state.progression.totalXp += badge.xpReward;
      }
    }

    return newBadges;
  }

  private evaluateBadgeCondition(condition: BadgeCondition, state: UserGamificationState): boolean {
    switch (condition.type) {
      case 'count': {
        const count = state.lastActions.filter((a) => a.action === condition.metric).length;
        return count >= condition.target;
      }
      case 'streak': {
        return state.streak.currentStreak >= condition.target;
      }
      case 'threshold': {
        if (condition.metric === 'level') {
          return state.progression.currentLevel >= condition.target;
        }
        if (condition.metric === 'xp') {
          return state.progression.totalXp >= condition.target;
        }
        return false;
      }
      case 'combination': {
        if (!condition.subConditions) return false;
        return condition.subConditions.every((sub) => this.evaluateBadgeCondition(sub, state));
      }
      case 'time_limited': {
        if (!condition.timeWindow) return false;
        const now = Date.now();
        const recentActions = state.lastActions.filter(
          (a) => a.action === condition.metric && now - a.timestamp < condition.timeWindow!,
        );
        return recentActions.length >= condition.target;
      }
      default:
        return false;
    }
  }

  getUserBadges(userId: string): BadgeDefinition[] {
    const state = this.users.get(userId);
    if (!state) return [];

    const result: BadgeDefinition[] = [];
    for (const badgeId of state.badges) {
      const badge = this.badges.get(badgeId);
      if (badge) result.push(badge);
    }
    return result;
  }

  // Challenge system
  registerChallenge(challenge: ChallengeConfig): void {
    this.challenges.set(challenge.id, challenge);
  }

  private updateChallengeProgress(userId: string, action: string): void {
    const state = this.users.get(userId);
    if (!state) return;

    const now = Date.now();

    for (const [challengeId, challenge] of this.challenges) {
      // Check if challenge is active
      if (now < challenge.startTime || now > challenge.endTime) continue;

      // Check if action matches challenge metric
      if (challenge.metric !== action) continue;

      const progress = state.challengeProgress.get(challengeId) ?? 0;
      state.challengeProgress.set(challengeId, progress + 1);
    }
  }

  getChallengeProgress(
    userId: string,
    challengeId: string,
  ): { progress: number; target: number; completed: boolean } | null {
    const state = this.users.get(userId);
    if (!state) return null;

    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    const progress = state.challengeProgress.get(challengeId) ?? 0;
    return {
      progress,
      target: challenge.target,
      completed: progress >= challenge.target,
    };
  }

  getActiveChallenges(): ChallengeConfig[] {
    const now = Date.now();
    const active: ChallengeConfig[] = [];

    for (const [, challenge] of this.challenges) {
      if (now >= challenge.startTime && now <= challenge.endTime) {
        active.push(challenge);
      }
    }

    return active;
  }

  // Leaderboard
  updateLeaderboard(): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const [userId, state] of this.users) {
      entries.push({
        userId,
        rank: 0,
        score: state.progression.totalXp,
        level: state.progression.currentLevel,
        badges: Array.from(state.badges),
        streak: state.streak.currentStreak,
        change: 0,
        updatedAt: Date.now(),
      });
    }

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks and calculate changes
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const previousRank = this.leaderboard.find((e) => e.userId === entry.userId)?.rank ?? i + 1;
      entry.rank = i + 1;
      entry.change = previousRank - (i + 1); // Positive = moved up
    }

    this.leaderboard = entries;
    return entries;
  }

  getLeaderboard(limit: number = 100): LeaderboardEntry[] {
    return this.leaderboard.slice(0, limit);
  }

  getUserRank(userId: string): number {
    const entry = this.leaderboard.find((e) => e.userId === userId);
    return entry?.rank ?? -1;
  }

  // Progression queries
  getProgression(userId: string): LevelProgression | null {
    const state = this.users.get(userId);
    return state?.progression ?? null;
  }

  getStreak(userId: string): StreakData | null {
    const state = this.users.get(userId);
    return state?.streak ?? null;
  }

  getComboState(userId: string): ComboState | null {
    const state = this.users.get(userId);
    return state?.comboState ?? null;
  }

  // Prestige system - reset level for permanent bonuses
  prestige(userId: string): boolean {
    const state = this.users.get(userId);
    if (!state) return false;

    // Require minimum level to prestige
    if (state.progression.currentLevel < 50) return false;

    state.progression.prestige += 1;
    state.progression.currentLevel = 1;
    state.progression.currentXp = 0;
    state.progression.totalXp = 0;
    state.progression.xpToNextLevel = this.xpRequiredForLevel(2);
    state.progression.levelHistory = [{ level: 1, reachedAt: Date.now(), xpAtLevel: 0 }];

    return true;
  }

  getPrestigeBonus(userId: string): number {
    const state = this.users.get(userId);
    if (!state) return 1.0;

    // Each prestige gives 10% XP bonus (multiplicative)
    return Math.pow(1.1, state.progression.prestige);
  }

  getUserCount(): number {
    return this.users.size;
  }

  getBadgeCount(): number {
    return this.badges.size;
  }

  getChallengeCount(): number {
    return this.challenges.size;
  }
}
