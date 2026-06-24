import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdServingService } from '../services/ad-serving.service';

function createMockPrisma() {
  return {
    ad: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    adSet: {
      findUnique: vi.fn(),
    },
    adCreative: {
      findUnique: vi.fn(),
    },
    campaign: {
      update: vi.fn(),
    },
  };
}

describe('AdServingService', () => {
  let service: AdServingService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AdServingService(prisma as never);
  });

  describe('serveAd', () => {
    it('returns null when no active ads exist', async () => {
      prisma.ad.findMany.mockResolvedValue([]);

      const result = await service.serveAd({ userId: 'u1', placement: 'feed' });

      expect(result).toBeNull();
    });

    it('returns a served ad with its creative', async () => {
      prisma.ad.findMany.mockResolvedValue([
        { id: 'ad-1', adSetId: 'as-1', creativeId: 'cr-1', status: 'ACTIVE' },
      ]);
      prisma.adCreative.findUnique.mockResolvedValue({
        id: 'cr-1',
        headline: 'Buy now',
        description: 'Great deal',
        mediaUrl: 'https://cdn/x.png',
        callToAction: 'Shop',
        landingUrl: 'https://shop',
      });

      const result = await service.serveAd({ userId: 'u1', placement: 'feed' });

      expect(result).not.toBeNull();
      expect(result?.adId).toBe('ad-1');
      expect(result?.headline).toBe('Buy now');
      expect(result?.callToAction).toBe('Shop');
    });

    it('returns null when the creative is missing', async () => {
      prisma.ad.findMany.mockResolvedValue([
        { id: 'ad-1', adSetId: 'as-1', creativeId: 'cr-x', status: 'ACTIVE' },
      ]);
      prisma.adCreative.findUnique.mockResolvedValue(null);

      const result = await service.serveAd({ userId: 'u1', placement: 'feed' });

      expect(result).toBeNull();
    });
  });

  describe('recordImpression', () => {
    it('increments campaign impressions via adSet -> campaign', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', adSetId: 'as-1' });
      prisma.adSet.findUnique.mockResolvedValue({ id: 'as-1', campaignId: 'camp-1' });

      await service.recordImpression('ad-1', 'u1');

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { totalImpressions: { increment: 1 } },
      });
    });

    it('is a no-op when the ad does not exist', async () => {
      prisma.ad.findUnique.mockResolvedValue(null);

      await service.recordImpression('missing', 'u1');

      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });
  });

  describe('recordClick', () => {
    it('increments campaign clicks via adSet -> campaign', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', adSetId: 'as-1' });
      prisma.adSet.findUnique.mockResolvedValue({ id: 'as-1', campaignId: 'camp-1' });

      await service.recordClick('ad-1', 'u1');

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { totalClicks: { increment: 1 } },
      });
    });

    it('is a no-op when the adSet is missing', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', adSetId: 'as-x' });
      prisma.adSet.findUnique.mockResolvedValue(null);

      await service.recordClick('ad-1', 'u1');

      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });
  });
});
