// ============================================================================
// Gaming Package - Leaderboard System
// ============================================================================

import {
  ScoreEntry,
  LeaderboardConfig,
  LeaderboardPeriod,
  AntiCheatConfig,
} from '../types';

// ---------------------------------------------------------------------------
// Leaderboard Data Store
// ---------------------------------------------------------------------------

interface LeaderboardData {
  config: LeaderboardConfig;
  entries: ScoreEntry[];
  lastReset: number;
  submissionHistory: Map<string, { count: number; lastTime: number; lastScore: number }>;
}

// ---------------------------------------------------------------------------
// Leaderboard System
// ---------------------------------------------------------------------------

export class LeaderboardSystem {
  private leaderboards: Map<string, LeaderboardData> = new Map();
  private playerScoreHistory: Map<string, ScoreEntry[]> = new Map();
  private maxHistoryPerPlayer: number = 100;

  constructor(config?: { maxHistoryPerPlayer?: number }) {
    if (config?.maxHistoryPerPlayer) {
      this.maxHistoryPerPlayer = config.maxHistoryPerPlayer;
    }
  }

  /** Create a new leaderboard */
  createLeaderboard(config: LeaderboardConfig): void {
    this.leaderboards.set(config.id, {
      config,
      entries: [],
      lastReset: Date.now(),
      submissionHistory: new Map(),
    });
  }

  /** Remove a leaderboard */
  removeLeaderboard(leaderboardId: string): void {
    this.leaderboards.delete(leaderboardId);
  }

  /** Submit a score with anti-cheat validation */
  submitScore(
    leaderboardId: string,
    playerId: string,
    playerName: string,
    score: number,
    metadata?: Record<string, unknown>
  ): { accepted: boolean; rank: number; reason?: string } {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) {
      return { accepted: false, rank: -1, reason: 'Leaderboard not found' };
    }

    // Anti-cheat validation
    const validation = this.validateSubmission(board, playerId, score);
    if (!validation.valid) {
      return { accepted: false, rank: -1, reason: validation.reason };
    }

    // Update submission history
    const history = board.submissionHistory.get(playerId) || { count: 0, lastTime: 0, lastScore: 0 };
    history.count++;
    history.lastTime = Date.now();
    history.lastScore = score;
    board.submissionHistory.set(playerId, history);

    // Create score entry
    const entry: ScoreEntry = {
      playerId,
      playerName,
      score,
      rank: 0,
      timestamp: Date.now(),
      metadata: metadata || {},
      verified: board.config.antiCheat.requireVerification ? false : true,
    };

    // Insert score in sorted position
    const rank = this.insertScore(board, entry);
    entry.rank = rank;

    // Add to player history
    this.addToPlayerHistory(playerId, entry);

    return { accepted: true, rank };
  }

  /** Get leaderboard entries with pagination */
  getEntries(
    leaderboardId: string,
    options?: { offset?: number; limit?: number; playerId?: string }
  ): { entries: ScoreEntry[]; total: number; playerRank?: number } {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) {
      return { entries: [], total: 0 };
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    const entries = board.entries.slice(offset, offset + limit);

    let playerRank: number | undefined;
    if (options?.playerId) {
      const idx = board.entries.findIndex((e) => e.playerId === options.playerId);
      if (idx >= 0) {
        playerRank = idx + 1;
      }
    }

    return { entries, total: board.entries.length, playerRank };
  }

  /** Get a specific player's rank */
  getPlayerRank(leaderboardId: string, playerId: string): number | null {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return null;

    const idx = board.entries.findIndex((e) => e.playerId === playerId);
    return idx >= 0 ? idx + 1 : null;
  }

  /** Get player's score history */
  getPlayerHistory(playerId: string, limit?: number): ScoreEntry[] {
    const history = this.playerScoreHistory.get(playerId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /** Calculate player's percentile */
  getPercentile(leaderboardId: string, playerId: string): number | null {
    const board = this.leaderboards.get(leaderboardId);
    if (!board || board.entries.length === 0) return null;

    const idx = board.entries.findIndex((e) => e.playerId === playerId);
    if (idx < 0) return null;

    // Percentile = (number below / total) * 100
    const total = board.entries.length;
    const below = board.config.sortOrder === 'desc' ? total - idx - 1 : idx;
    return Math.round((below / total) * 100);
  }

  /** Get entries around a player (context window) */
  getAroundPlayer(
    leaderboardId: string,
    playerId: string,
    range: number = 5
  ): ScoreEntry[] {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return [];

    const idx = board.entries.findIndex((e) => e.playerId === playerId);
    if (idx < 0) return [];

    const start = Math.max(0, idx - range);
    const end = Math.min(board.entries.length, idx + range + 1);
    return board.entries.slice(start, end);
  }

  /** Reset a leaderboard (daily/weekly/seasonal) */
  resetLeaderboard(leaderboardId: string): void {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return;

    board.entries = [];
    board.lastReset = Date.now();
    board.submissionHistory.clear();
  }

  /** Check if a leaderboard needs resetting based on schedule */
  checkResetSchedule(leaderboardId: string): boolean {
    const board = this.leaderboards.get(leaderboardId);
    if (!board || !board.config.resetSchedule) return false;

    const now = Date.now();
    const elapsed = now - board.lastReset;

    switch (board.config.period) {
      case 'daily':
        return elapsed >= 24 * 60 * 60 * 1000;
      case 'weekly':
        return elapsed >= 7 * 24 * 60 * 60 * 1000;
      case 'seasonal':
        return elapsed >= 90 * 24 * 60 * 60 * 1000;
      default:
        return false;
    }
  }

  /** Get top N entries */
  getTopEntries(leaderboardId: string, count: number = 10): ScoreEntry[] {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return [];
    return board.entries.slice(0, count);
  }

  /** Get leaderboard stats */
  getStats(leaderboardId: string): {
    totalEntries: number;
    averageScore: number;
    medianScore: number;
    highestScore: number;
    lowestScore: number;
  } | null {
    const board = this.leaderboards.get(leaderboardId);
    if (!board || board.entries.length === 0) return null;

    const scores = board.entries.map((e) => e.score);
    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);

    return {
      totalEntries: board.entries.length,
      averageScore: sum / scores.length,
      medianScore: sorted[Math.floor(sorted.length / 2)],
      highestScore: sorted[sorted.length - 1],
      lowestScore: sorted[0],
    };
  }

  /** Verify a score (mark as verified by anti-cheat) */
  verifyScore(leaderboardId: string, playerId: string): boolean {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return false;

    const entry = board.entries.find((e) => e.playerId === playerId);
    if (entry) {
      entry.verified = true;
      return true;
    }
    return false;
  }

  /** Remove a player's entry (ban, cheating detected) */
  removePlayerEntry(leaderboardId: string, playerId: string): boolean {
    const board = this.leaderboards.get(leaderboardId);
    if (!board) return false;

    const idx = board.entries.findIndex((e) => e.playerId === playerId);
    if (idx >= 0) {
      board.entries.splice(idx, 1);
      this.recalculateRanks(board);
      return true;
    }
    return false;
  }

  /** Get leaderboard count */
  getLeaderboardCount(): number {
    return this.leaderboards.size;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private validateSubmission(
    board: LeaderboardData,
    playerId: string,
    score: number
  ): { valid: boolean; reason?: string } {
    const antiCheat = board.config.antiCheat;
    const history = board.submissionHistory.get(playerId);

    // Rate limiting
    if (history) {
      const timeSinceLastSubmission = Date.now() - history.lastTime;
      const minInterval = 60000 / antiCheat.maxSubmissionsPerMinute;
      if (timeSinceLastSubmission < minInterval) {
        return { valid: false, reason: 'Rate limit exceeded' };
      }

      // Max score delta check
      if (antiCheat.maxScoreDelta > 0 && history.lastScore > 0) {
        const delta = Math.abs(score - history.lastScore);
        if (delta > antiCheat.maxScoreDelta) {
          return { valid: false, reason: 'Score delta too large' };
        }
      }
    }

    // Score must be positive
    if (score < 0) {
      return { valid: false, reason: 'Negative score not allowed' };
    }

    return { valid: true };
  }

  private insertScore(board: LeaderboardData, entry: ScoreEntry): number {
    const { entries, config } = board;

    // Check if player already has an entry
    const existingIdx = entries.findIndex((e) => e.playerId === entry.playerId);

    if (existingIdx >= 0) {
      const existing = entries[existingIdx];
      // Only update if new score is better
      const isBetter = config.sortOrder === 'desc'
        ? entry.score > existing.score
        : entry.score < existing.score;

      if (!isBetter) {
        return existingIdx + 1;
      }
      // Remove existing to re-insert
      entries.splice(existingIdx, 1);
    }

    // Binary search for insertion point
    let low = 0;
    let high = entries.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const comparison = config.sortOrder === 'desc'
        ? entries[mid].score - entry.score
        : entry.score - entries[mid].score;

      if (comparison < 0) {
        high = mid;
      } else if (comparison > 0) {
        low = mid + 1;
      } else {
        // Tie-breaking
        const tieResult = this.breakTie(entries[mid], entry, config.tieBreaker);
        if (tieResult <= 0) {
          high = mid;
        } else {
          low = mid + 1;
        }
      }
    }

    entries.splice(low, 0, entry);

    // Enforce max entries
    if (entries.length > config.maxEntries) {
      const removed = entries.pop();
      if (removed) {
        this.pool_release_noop();
      }
    }

    // Recalculate ranks
    this.recalculateRanks(board);

    return low + 1;
  }

  private breakTie(existing: ScoreEntry, newEntry: ScoreEntry, rule: string): number {
    switch (rule) {
      case 'first_submission':
        return -1; // Existing keeps position
      case 'timestamp':
        return existing.timestamp - newEntry.timestamp;
      case 'secondary_score':
        return 0; // No secondary score available
      default:
        return -1;
    }
  }

  private recalculateRanks(board: LeaderboardData): void {
    for (let i = 0; i < board.entries.length; i++) {
      board.entries[i].rank = i + 1;
    }
  }

  private addToPlayerHistory(playerId: string, entry: ScoreEntry): void {
    if (!this.playerScoreHistory.has(playerId)) {
      this.playerScoreHistory.set(playerId, []);
    }
    const history = this.playerScoreHistory.get(playerId)!;
    history.push(entry);
    if (history.length > this.maxHistoryPerPlayer) {
      history.shift();
    }
  }

  private pool_release_noop(): void {
    // Placeholder for cleanup logic
  }
}
