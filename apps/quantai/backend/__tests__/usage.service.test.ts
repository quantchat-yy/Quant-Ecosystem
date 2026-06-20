import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UsageService } from '../services/usage.service';

function createMockPrisma() {
  return {
    aISession: {
      findMany: vi.fn(),
    },
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

describe('UsageService', () => {
  let service: UsageService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new UsageService(prisma as never);
  });

  describe('getUsage', () => {
    it('aggregates tokens and cost for the period', async () => {
      prisma.aISession.findMany.mockResolvedValue([
        { totalTokensUsed: 100, totalCost: 0.5 },
        { totalTokensUsed: 250, totalCost: 1.25 },
      ]);

      const result = await service.getUsage('user-1', 'day');

      expect(result).toEqual({
        totalTokens: 350,
        totalCost: 1.75,
        sessionCount: 2,
        period: 'day',
      });
    });
  });

  describe('getStats', () => {
    it('derives totals, xp and level from real sessions (no hardcoded values)', async () => {
      prisma.aISession.findMany.mockResolvedValue([
        { totalTokensUsed: 1000, totalCost: 1, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
        { totalTokensUsed: 3000, totalCost: 2, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
      ]);

      const stats = await service.getStats('user-1');

      expect(stats.totalConversations).toBe(2);
      expect(stats.totalTokens).toBe(4000);
      // xp = conversations*25 + floor(tokens/100) = 50 + 40 = 90
      expect(stats.xp).toBe(90);
      // level = floor(sqrt(90/50)) + 1 = floor(1.34) + 1 = 2
      expect(stats.level).toBe(2);
      expect(prisma.aISession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        select: { totalTokensUsed: true, totalCost: true, createdAt: true, updatedAt: true },
      });
    });

    it('returns zeroed stats for a user with no sessions', async () => {
      prisma.aISession.findMany.mockResolvedValue([]);

      const stats = await service.getStats('user-1');

      expect(stats).toEqual({
        totalConversations: 0,
        totalTokens: 0,
        tokensToday: 0,
        streakDays: 0,
        xp: 0,
        level: 1,
      });
    });

    it('counts tokensToday only for sessions active since local midnight', async () => {
      prisma.aISession.findMany.mockResolvedValue([
        { totalTokensUsed: 500, totalCost: 0, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
        { totalTokensUsed: 700, totalCost: 0, createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      ]);

      const stats = await service.getStats('user-1');

      expect(stats.tokensToday).toBe(500);
    });

    it('computes a consecutive-day streak ending today', async () => {
      prisma.aISession.findMany.mockResolvedValue([
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(2), updatedAt: daysAgo(2) },
        // gap at day 3, then older activity that should not extend the streak
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
      ]);

      const stats = await service.getStats('user-1');

      expect(stats.streakDays).toBe(3);
    });

    it('keeps a streak alive when today has no activity but yesterday does', async () => {
      prisma.aISession.findMany.mockResolvedValue([
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(1), updatedAt: daysAgo(1) },
        { totalTokensUsed: 10, totalCost: 0, createdAt: daysAgo(2), updatedAt: daysAgo(2) },
      ]);

      const stats = await service.getStats('user-1');

      expect(stats.streakDays).toBe(2);
    });
  });
});
