import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelService } from '../services/channel.service';

function createMockPrisma() {
  return {
    videoChannel: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    video: {
      findMany: vi.fn(),
    },
  };
}

describe('ChannelService', () => {
  let service: ChannelService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ChannelService(prisma as never);
  });

  describe('createChannel', () => {
    it('creates a channel with zero subscribers', async () => {
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        name: 'My Channel',
        handle: 'mychannel',
        description: null,
        avatarUrl: null,
        bannerUrl: null,
        subscriberCount: 0,
        videoCount: 0,
        isVerified: false,
      };
      prisma.videoChannel.create.mockResolvedValue(mockChannel);

      const result = await service.createChannel({
        userId: 'user-1',
        name: 'My Channel',
        handle: 'mychannel',
      });

      expect(result.subscriberCount).toBe(0);
      expect(result.isVerified).toBe(false);
      expect(prisma.videoChannel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'My Channel',
          handle: 'mychannel',
        }),
      });
    });
  });

  describe('getChannel', () => {
    it('returns channel by id', async () => {
      const mockChannel = { id: 'channel-1', name: 'Test' };
      prisma.videoChannel.findUnique.mockResolvedValue(mockChannel);

      const result = await service.getChannel('channel-1');

      expect(result).toEqual(mockChannel);
    });

    it('throws CHANNEL_NOT_FOUND for missing channel', async () => {
      prisma.videoChannel.findUnique.mockResolvedValue(null);

      await expect(service.getChannel('missing')).rejects.toThrow('Channel not found');
    });
  });

  describe('subscribe', () => {
    it('increments subscriber count', async () => {
      prisma.videoChannel.findUnique.mockResolvedValue({
        id: 'channel-1',
        subscriberCount: 10,
      });
      prisma.videoChannel.update.mockResolvedValue({
        id: 'channel-1',
        subscriberCount: 11,
      });

      const result = await service.subscribe('channel-1', 'user-2');

      expect(result.subscriberCount).toBe(11);
    });
  });

  describe('unsubscribe', () => {
    it('decrements subscriber count', async () => {
      prisma.videoChannel.findUnique.mockResolvedValue({
        id: 'channel-1',
        subscriberCount: 10,
      });
      prisma.videoChannel.update.mockResolvedValue({
        id: 'channel-1',
        subscriberCount: 9,
      });

      const result = await service.unsubscribe('channel-1', 'user-2');

      expect(result.subscriberCount).toBe(9);
    });
  });

  describe('getSubscribers', () => {
    it('returns subscriber count for channel', async () => {
      prisma.videoChannel.findUnique.mockResolvedValue({
        id: 'channel-1',
        subscriberCount: 1000,
      });

      const result = await service.getSubscribers('channel-1');

      expect(result.subscriberCount).toBe(1000);
    });
  });

  describe('getSubscriptions', () => {
    it('returns paginated subscriptions', async () => {
      prisma.videoChannel.findMany.mockResolvedValue([{ id: 'channel-1', name: 'Ch1' }]);
      prisma.videoChannel.count.mockResolvedValue(1);

      const result = await service.getSubscriptions('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
