// ============================================================================
// Gaming Package - Game Analytics
// ============================================================================

import {
  GameSession,
  AnalyticsEvent,
  DailyChallenge,
  Streak,
  RetentionMetrics,
  FunnelStep,
  AchievementReward,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerAnalytics {
  playerId: string;
  sessions: GameSession[];
  totalPlayTime: number;
  dailyPlayTime: Map<string, number>;
  weeklyPlayTime: Map<string, number>;
  levelCompletions: Map<string, LevelCompletion>;
  events: AnalyticsEvent[];
  firstSeen: number;
  lastSeen: number;
  sessionCount: number;
}

interface LevelCompletion {
  level: string;
  attempts: number;
  completions: number;
  bestTime: number;
  averageTime: number;
  dropOffCount: number;
}

interface FunnelDefinition {
  id: string;
  name: string;
  steps: string[];
}

// ---------------------------------------------------------------------------
// Game Analytics
// ---------------------------------------------------------------------------

export class GameAnalytics {
  private players: Map<string, PlayerAnalytics> = new Map();
  private activeSessions: Map<string, GameSession> = new Map();
  private dailyChallenges: Map<string, DailyChallenge> = new Map();
  private streaks: Map<string, Streak> = new Map();
  private funnels: Map<string, FunnelDefinition> = new Map();
  private funnelProgress: Map<string, Map<string, Set<string>>> = new Map(); // funnelId -> playerId -> completedSteps
  private globalEvents: AnalyticsEvent[] = [];
  private retentionCohorts: Map<string, Set<string>> = new Map();
  private sessionIdCounter: number = 0;
  private maxEventsPerPlayer: number = 5000;
  private maxGlobalEvents: number = 100000;

  constructor(config?: { maxEventsPerPlayer?: number; maxGlobalEvents?: number }) {
    if (config?.maxEventsPerPlayer) this.maxEventsPerPlayer = config.maxEventsPerPlayer;
    if (config?.maxGlobalEvents) this.maxGlobalEvents = config.maxGlobalEvents;
  }

  /** Start a game session */
  startSession(playerId: string, level?: string): GameSession {
    const player = this.getOrCreatePlayer(playerId);
    const session: GameSession = {
      id: `session_${++this.sessionIdCounter}`,
      playerId,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      level: level || 'unknown',
      score: 0,
      completed: false,
      events: [],
    };

    this.activeSessions.set(playerId, session);
    player.sessionCount++;
    player.lastSeen = Date.now();

    // Track retention cohort
    this.trackCohort(playerId);

    this.logEvent(playerId, 'session_start', { level, sessionId: session.id });
    return session;
  }

  /** End a game session */
  endSession(playerId: string, score?: number, completed?: boolean): GameSession | null {
    const session = this.activeSessions.get(playerId);
    if (!session) return null;

    session.endTime = Date.now();
    session.duration = (session.endTime - session.startTime) / 1000;
    if (score !== undefined) session.score = score;
    if (completed !== undefined) session.completed = completed;

    const player = this.getOrCreatePlayer(playerId);
    player.sessions.push(session);
    player.totalPlayTime += session.duration;

    // Track daily/weekly play time
    const dateKey = this.getDateKey(session.startTime);
    const weekKey = this.getWeekKey(session.startTime);
    player.dailyPlayTime.set(dateKey, (player.dailyPlayTime.get(dateKey) || 0) + session.duration);
    player.weeklyPlayTime.set(weekKey, (player.weeklyPlayTime.get(weekKey) || 0) + session.duration);

    // Track level completion
    if (session.level !== 'unknown') {
      this.trackLevelCompletion(player, session);
    }

    this.activeSessions.delete(playerId);
    this.logEvent(playerId, 'session_end', { duration: session.duration, score: session.score, completed: session.completed });
    return session;
  }

  /** Log a custom analytics event */
  logEvent(playerId: string, type: string, data: Record<string, unknown>): void {
    const player = this.getOrCreatePlayer(playerId);
    const session = this.activeSessions.get(playerId);

    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data,
      sessionId: session?.id || '',
      level: session?.level,
    };

    player.events.push(event);
    if (player.events.length > this.maxEventsPerPlayer) {
      player.events.shift();
    }

    if (session) {
      session.events.push(event);
    }

    this.globalEvents.push(event);
    if (this.globalEvents.length > this.maxGlobalEvents) {
      this.globalEvents.shift();
    }

    // Check funnel progress
    this.checkFunnelProgress(playerId, type);
  }

  /** Get total play time for a player */
  getPlayTime(playerId: string): { total: number; daily: number; weekly: number } {
    const player = this.players.get(playerId);
    if (!player) return { total: 0, daily: 0, weekly: 0 };

    const todayKey = this.getDateKey(Date.now());
    const weekKey = this.getWeekKey(Date.now());

    return {
      total: player.totalPlayTime,
      daily: player.dailyPlayTime.get(todayKey) || 0,
      weekly: player.weeklyPlayTime.get(weekKey) || 0,
    };
  }

  /** Get level completion rates */
  getLevelCompletionRates(playerId: string): Array<{ level: string; rate: number; avgTime: number; attempts: number }> {
    const player = this.players.get(playerId);
    if (!player) return [];

    const rates: Array<{ level: string; rate: number; avgTime: number; attempts: number }> = [];
    for (const [level, data] of player.levelCompletions.entries()) {
      rates.push({
        level,
        rate: data.attempts > 0 ? data.completions / data.attempts : 0,
        avgTime: data.averageTime,
        attempts: data.attempts,
      });
    }
    return rates;
  }

  /** Get drop-off points (levels where players quit) */
  getDropOffPoints(): Array<{ level: string; dropOffRate: number; totalAttempts: number }> {
    const levelStats = new Map<string, { attempts: number; dropOffs: number }>();

    for (const player of this.players.values()) {
      for (const [level, data] of player.levelCompletions.entries()) {
        const existing = levelStats.get(level) || { attempts: 0, dropOffs: 0 };
        existing.attempts += data.attempts;
        existing.dropOffs += data.dropOffCount;
        levelStats.set(level, existing);
      }
    }

    const results: Array<{ level: string; dropOffRate: number; totalAttempts: number }> = [];
    for (const [level, stats] of levelStats.entries()) {
      results.push({
        level,
        dropOffRate: stats.attempts > 0 ? stats.dropOffs / stats.attempts : 0,
        totalAttempts: stats.attempts,
      });
    }

    return results.sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  /** Create a daily challenge */
  createDailyChallenge(challenge: DailyChallenge): void {
    this.dailyChallenges.set(challenge.id, challenge);
  }

  /** Complete a daily challenge */
  completeDailyChallenge(playerId: string, challengeId: string): boolean {
    const challenge = this.dailyChallenges.get(challengeId);
    if (!challenge) return false;

    if (Date.now() > challenge.expiresAt) return false;

    // Update streak
    const streakKey = `${playerId}_daily`;
    const streak = this.streaks.get(streakKey) || {
      playerId,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      totalCompleted: 0,
    };

    const today = this.getDateKey(Date.now());
    const yesterday = this.getDateKey(Date.now() - 86400000);

    if (streak.lastCompletedDate === today) {
      return false; // Already completed today
    }

    if (streak.lastCompletedDate === yesterday || streak.totalCompleted === 0) {
      streak.currentStreak++;
    } else {
      streak.currentStreak = 1;
    }

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastCompletedDate = today;
    streak.totalCompleted++;
    this.streaks.set(streakKey, streak);

    this.logEvent(playerId, 'daily_challenge_completed', { challengeId, streak: streak.currentStreak });
    return true;
  }

  /** Get player streak data */
  getStreak(playerId: string): Streak {
    const streakKey = `${playerId}_daily`;
    return this.streaks.get(streakKey) || {
      playerId,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      totalCompleted: 0,
    };
  }

  /** Define a funnel for analysis */
  defineFunnel(id: string, name: string, steps: string[]): void {
    this.funnels.set(id, { id, name, steps });
    this.funnelProgress.set(id, new Map());
  }

  /** Get funnel analysis results */
  getFunnelResults(funnelId: string): FunnelStep[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const progress = this.funnelProgress.get(funnelId);
    if (!progress) return [];

    const results: FunnelStep[] = [];
    let previousCount = progress.size;

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      let completedCount = 0;

      for (const [, completedSteps] of progress.entries()) {
        if (completedSteps.has(step)) completedCount++;
      }

      const entered = i === 0 ? progress.size : previousCount;
      const dropOffRate = entered > 0 ? 1 - (completedCount / entered) : 0;

      results.push({
        name: step,
        entered,
        completed: completedCount,
        dropOffRate,
        averageTime: 0, // Would require timestamp tracking per step
      });

      previousCount = completedCount;
    }

    return results;
  }

  /** Calculate retention metrics for a cohort date */
  getRetentionMetrics(cohortDate: string): RetentionMetrics {
    const cohort = this.retentionCohorts.get(cohortDate);
    if (!cohort || cohort.size === 0) {
      return { d1: 0, d7: 0, d30: 0, cohortSize: 0, cohortDate };
    }

    const cohortTimestamp = new Date(cohortDate).getTime();
    let d1Count = 0;
    let d7Count = 0;
    let d30Count = 0;

    for (const playerId of cohort) {
      const player = this.players.get(playerId);
      if (!player) continue;

      // Check if player was active on D1, D7, D30
      const d1Key = this.getDateKey(cohortTimestamp + 86400000);
      const d7Key = this.getDateKey(cohortTimestamp + 7 * 86400000);
      const d30Key = this.getDateKey(cohortTimestamp + 30 * 86400000);

      if (player.dailyPlayTime.has(d1Key)) d1Count++;
      if (player.dailyPlayTime.has(d7Key)) d7Count++;
      if (player.dailyPlayTime.has(d30Key)) d30Count++;
    }

    return {
      d1: d1Count / cohort.size,
      d7: d7Count / cohort.size,
      d30: d30Count / cohort.size,
      cohortSize: cohort.size,
      cohortDate,
    };
  }

  /** Get session count for a player */
  getSessionCount(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.sessionCount : 0;
  }

  /** Get average session duration */
  getAverageSessionDuration(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player || player.sessions.length === 0) return 0;
    const totalDuration = player.sessions.reduce((sum, s) => sum + s.duration, 0);
    return totalDuration / player.sessions.length;
  }

  /** Get total player count */
  getPlayerCount(): number {
    return this.players.size;
  }

  /** Get daily active users count */
  getDAU(): number {
    const today = this.getDateKey(Date.now());
    let count = 0;
    for (const player of this.players.values()) {
      if (player.dailyPlayTime.has(today)) count++;
    }
    return count;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getOrCreatePlayer(playerId: string): PlayerAnalytics {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        playerId,
        sessions: [],
        totalPlayTime: 0,
        dailyPlayTime: new Map(),
        weeklyPlayTime: new Map(),
        levelCompletions: new Map(),
        events: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        sessionCount: 0,
      });
    }
    return this.players.get(playerId)!;
  }

  private trackLevelCompletion(player: PlayerAnalytics, session: GameSession): void {
    const level = session.level;
    const existing = player.levelCompletions.get(level) || {
      level,
      attempts: 0,
      completions: 0,
      bestTime: Infinity,
      averageTime: 0,
      dropOffCount: 0,
    };

    existing.attempts++;
    if (session.completed) {
      existing.completions++;
      if (session.duration < existing.bestTime) {
        existing.bestTime = session.duration;
      }
      existing.averageTime = (existing.averageTime * (existing.completions - 1) + session.duration) / existing.completions;
    } else {
      existing.dropOffCount++;
    }

    player.levelCompletions.set(level, existing);
  }

  private trackCohort(playerId: string): void {
    const player = this.players.get(playerId);
    if (player && player.sessionCount <= 1) {
      const dateKey = this.getDateKey(Date.now());
      if (!this.retentionCohorts.has(dateKey)) {
        this.retentionCohorts.set(dateKey, new Set());
      }
      this.retentionCohorts.get(dateKey)!.add(playerId);
    }
  }

  private checkFunnelProgress(playerId: string, eventType: string): void {
    for (const [funnelId, funnel] of this.funnels.entries()) {
      if (funnel.steps.includes(eventType)) {
        const progress = this.funnelProgress.get(funnelId)!;
        if (!progress.has(playerId)) {
          progress.set(playerId, new Set());
        }
        progress.get(playerId)!.add(eventType);
      }
    }
  }

  private getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getWeekKey(timestamp: number): string {
    const date = new Date(timestamp);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }
}
