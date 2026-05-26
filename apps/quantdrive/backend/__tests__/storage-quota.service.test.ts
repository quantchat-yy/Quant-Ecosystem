import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageQuotaService, STORAGE_TIERS } from '../services/storage-quota.service';

function createMockPrisma() {
  return {
    file: {
      aggregate: vi.fn(),
    },
    userSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('StorageQuotaService', () => {
  let service: StorageQuotaService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new StorageQuotaService(prisma as never);
  });

  describe('getUsage', () => {
    it('returns the sum of file sizes', async () => {
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: 5000 } });

      const result = await service.getUsage('user-1');

      expect(result).toBe(5000);
    });

    it('returns 0 when no files exist (null sum)', async () => {
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: null } });

      const result = await service.getUsage('user-1');

      expect(result).toBe(0);
    });
  });

  describe('checkQuota', () => {
    it('passes when under limit', async () => {
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: 1000 } });
      prisma.userSubscription.findUnique.mockResolvedValue(null); // FREE tier

      await expect(service.checkQuota('user-1', 1000)).resolves.toBeUndefined();
    });

    it('throws QUOTA_EXCEEDED when over limit', async () => {
      // FREE tier limit is 15GB
      const freeLimit = 15 * 1024 * 1024 * 1024;
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: freeLimit } });
      prisma.userSubscription.findUnique.mockResolvedValue(null); // FREE tier

      await expect(service.checkQuota('user-1', 1)).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('getStorageTier', () => {
    it('returns FREE when no subscription', async () => {
      prisma.userSubscription.findUnique.mockResolvedValue(null);

      const result = await service.getStorageTier('user-1');

      expect(result).toBe('FREE');
    });

    it('returns tier from subscription', async () => {
      prisma.userSubscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        tier: 'PREMIUM',
      });

      const result = await service.getStorageTier('user-1');

      expect(result).toBe('PREMIUM');
    });
  });

  describe('upgradeTier', () => {
    it('creates subscription if none exists', async () => {
      prisma.userSubscription.findUnique.mockResolvedValue(null);
      prisma.userSubscription.create.mockResolvedValue({
        userId: 'user-1',
        tier: 'STANDARD',
      });
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: 2000 } });

      const result = await service.upgradeTier('user-1', 'STANDARD');

      expect(prisma.userSubscription.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', tier: 'STANDARD' },
      });
      expect(result.tier).toBe('STANDARD');
      expect(result.usedBytes).toBe(2000);
    });

    it('updates existing subscription', async () => {
      prisma.userSubscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        tier: 'FREE',
      });
      prisma.userSubscription.update.mockResolvedValue({
        userId: 'user-1',
        tier: 'PREMIUM',
      });
      prisma.file.aggregate.mockResolvedValue({ _sum: { size: 50000 } });

      const result = await service.upgradeTier('user-1', 'PREMIUM');

      expect(prisma.userSubscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { tier: 'PREMIUM' },
      });
      expect(result.tier).toBe('PREMIUM');
    });
  });

  describe('tier limits', () => {
    it('FREE tier is 15GB', () => {
      expect(STORAGE_TIERS.FREE.limit).toBe(15 * 1024 * 1024 * 1024);
    });

    it('STANDARD tier is 100GB', () => {
      expect(STORAGE_TIERS.STANDARD.limit).toBe(100 * 1024 * 1024 * 1024);
    });

    it('PREMIUM tier is 2TB', () => {
      expect(STORAGE_TIERS.PREMIUM.limit).toBe(2 * 1024 * 1024 * 1024 * 1024);
    });
  });
});
