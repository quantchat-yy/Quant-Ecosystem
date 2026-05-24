// ============================================================================
// QuantChat - Streak Service
// Track daily exchanges, calculate streak, freeze tokens, notifications, badges
// ============================================================================
interface Streak { id: string; userIds: [string, string]; currentCount: number; longestCount: number; lastExchangeAt: Date; startedAt: Date; freezeTokens: number; isFrozen: boolean; frozenAt?: Date; status: 'active' | 'at_risk' | 'broken'; }
interface StreakBadge { id: string; name: string; description: string; icon: string; requiredStreak: number; }

const streaks = new Map<string, Streak>();
const badges: StreakBadge[] = [
  { id: 'fire_starter', name: 'Fire Starter', description: '3-day streak', icon: '\u{1F525}', requiredStreak: 3 },
  { id: 'week_warrior', name: 'Week Warrior', description: '7-day streak', icon: '\u{1F4AA}', requiredStreak: 7 },
  { id: 'month_master', name: 'Month Master', description: '30-day streak', icon: '\u{1F3C6}', requiredStreak: 30 },
  { id: 'century_club', name: 'Century Club', description: '100-day streak', icon: '\u{1F48E}', requiredStreak: 100 },
  { id: 'legendary', name: 'Legendary', description: '365-day streak', icon: '\u{1F451}', requiredStreak: 365 },
];

const generateId = (): string => `strk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const getStreakKey = (id1: string, id2: string): string => [id1, id2].sort().join(':');

export class StreakService {
  static async recordExchange(userId1: string, userId2: string): Promise<Streak> {
    const key = getStreakKey(userId1, userId2);
    let streak = streaks.get(key);
    const now = new Date();
    if (!streak) { streak = { id: generateId(), userIds: [userId1, userId2].sort() as [string, string], currentCount: 1, longestCount: 1, lastExchangeAt: now, startedAt: now, freezeTokens: 0, isFrozen: false, status: 'active' }; streaks.set(key, streak); return streak; }
    const hoursSinceLastExchange = (now.getTime() - streak.lastExchangeAt.getTime()) / 3600000;
    if (hoursSinceLastExchange < 24) { streak.lastExchangeAt = now; return streak; }
    if (hoursSinceLastExchange <= 48) { streak.currentCount++; streak.longestCount = Math.max(streak.longestCount, streak.currentCount); streak.lastExchangeAt = now; streak.status = 'active'; streak.isFrozen = false; }
    else if (streak.isFrozen && hoursSinceLastExchange <= 72) { streak.lastExchangeAt = now; streak.isFrozen = false; streak.status = 'active'; }
    else { streak.currentCount = 1; streak.startedAt = now; streak.lastExchangeAt = now; streak.status = 'active'; }
    return streak;
  }

  static async getStreak(userId1: string, userId2: string): Promise<Streak | null> { return streaks.get(getStreakKey(userId1, userId2)) || null; }

  static async getUserStreaks(userId: string): Promise<Streak[]> { return Array.from(streaks.values()).filter(s => s.userIds.includes(userId) && s.currentCount > 0).sort((a, b) => b.currentCount - a.currentCount); }

  static async useFreeze(userId1: string, userId2: string): Promise<{ success: boolean; remainingTokens: number }> {
    const streak = streaks.get(getStreakKey(userId1, userId2));
    if (!streak || streak.freezeTokens <= 0) return { success: false, remainingTokens: 0 };
    streak.freezeTokens--; streak.isFrozen = true; streak.frozenAt = new Date();
    return { success: true, remainingTokens: streak.freezeTokens };
  }

  static async addFreezeToken(userId1: string, userId2: string, count: number = 1): Promise<number> {
    const key = getStreakKey(userId1, userId2);
    const streak = streaks.get(key);
    if (!streak) return 0;
    streak.freezeTokens = Math.min(streak.freezeTokens + count, 5);
    return streak.freezeTokens;
  }

  static async checkAtRiskStreaks(userId: string): Promise<Streak[]> {
    const now = new Date();
    return Array.from(streaks.values()).filter(s => { if (!s.userIds.includes(userId) || s.currentCount === 0) return false; const hours = (now.getTime() - s.lastExchangeAt.getTime()) / 3600000; if (hours >= 20 && hours < 48) { s.status = 'at_risk'; return true; } return false; });
  }

  static async getEarnedBadges(userId: string): Promise<StreakBadge[]> {
    const userStreaks = await StreakService.getUserStreaks(userId);
    const maxStreak = Math.max(0, ...userStreaks.map(s => s.longestCount));
    return badges.filter(b => maxStreak >= b.requiredStreak);
  }

  static async getStreakStats(userId: string): Promise<{ totalStreaks: number; longestEver: number; currentActive: number; totalDaysStreaked: number }> {
    const userStreaks = Array.from(streaks.values()).filter(s => s.userIds.includes(userId));
    return { totalStreaks: userStreaks.length, longestEver: Math.max(0, ...userStreaks.map(s => s.longestCount)), currentActive: userStreaks.filter(s => s.status === 'active' && s.currentCount > 0).length, totalDaysStreaked: userStreaks.reduce((sum, s) => sum + s.currentCount, 0) };
  }
}

export default StreakService;
