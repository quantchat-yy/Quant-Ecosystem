// ============================================================================
// Social Graph Service - Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialGraphService } from './social-graph.service';

function createMockPrisma() {
  return {
    userRelationship: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

function createMockRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };
}

describe('SocialGraphService', () => {
  let service: SocialGraphService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockRedis = createMockRedis();
    service = new SocialGraphService(mockPrisma as never, mockRedis as never);
  });

  describe('follow', () => {
    it('should create a follow relationship and invalidate cache', async () => {
      mockPrisma.userRelationship.upsert.mockResolvedValue({
        id: 'rel_1',
        followerId: 'user_a',
        followingId: 'user_b',
        type: 'FOLLOW',
        createdAt: new Date(),
      });
      mockRedis.del.mockResolvedValue(1);

      await service.follow('user_a', 'user_b');

      expect(mockPrisma.userRelationship.upsert).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: 'user_a', followingId: 'user_b' },
        },
        update: { type: 'FOLLOW' },
        create: { followerId: 'user_a', followingId: 'user_b', type: 'FOLLOW' },
      });
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should throw when following yourself', async () => {
      await expect(service.follow('user_a', 'user_a')).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw on empty followerId', async () => {
      await expect(service.follow('', 'user_b')).rejects.toThrow();
    });

    it('should throw on empty followingId', async () => {
      await expect(service.follow('user_a', '')).rejects.toThrow();
    });
  });

  describe('unfollow', () => {
    it('should delete the follow relationship and invalidate cache', async () => {
      mockPrisma.userRelationship.deleteMany.mockResolvedValue({ count: 1 });
      mockRedis.del.mockResolvedValue(1);

      await service.unfollow('user_a', 'user_b');

      expect(mockPrisma.userRelationship.deleteMany).toHaveBeenCalledWith({
        where: { followerId: 'user_a', followingId: 'user_b', type: 'FOLLOW' },
      });
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getFollowers', () => {
    it('should return paginated followers', async () => {
      const mockData = [
        {
          id: 'rel_1',
          followerId: 'user_c',
          followingId: 'user_a',
          type: 'FOLLOW',
          createdAt: new Date(),
        },
        {
          id: 'rel_2',
          followerId: 'user_d',
          followingId: 'user_a',
          type: 'FOLLOW',
          createdAt: new Date(),
        },
      ];
      mockPrisma.userRelationship.findMany.mockResolvedValue(mockData);
      mockPrisma.userRelationship.count.mockResolvedValue(2);

      const result = await service.getFollowers('user_a', { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.userId).toBe('user_c');
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should use default pagination when not provided', async () => {
      mockPrisma.userRelationship.findMany.mockResolvedValue([]);
      mockPrisma.userRelationship.count.mockResolvedValue(0);

      const result = await service.getFollowers('user_a');

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockPrisma.userRelationship.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should indicate hasMore when more results exist', async () => {
      mockPrisma.userRelationship.findMany.mockResolvedValue([
        {
          id: 'rel_1',
          followerId: 'user_c',
          followingId: 'user_a',
          type: 'FOLLOW',
          createdAt: new Date(),
        },
      ]);
      mockPrisma.userRelationship.count.mockResolvedValue(5);

      const result = await service.getFollowers('user_a', { page: 1, pageSize: 1 });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('getFollowing', () => {
    it('should return paginated following list', async () => {
      const mockData = [
        {
          id: 'rel_1',
          followerId: 'user_a',
          followingId: 'user_c',
          type: 'FOLLOW',
          createdAt: new Date(),
        },
      ];
      mockPrisma.userRelationship.findMany.mockResolvedValue(mockData);
      mockPrisma.userRelationship.count.mockResolvedValue(1);

      const result = await service.getFollowing('user_a', { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.userId).toBe('user_c');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getMutualFollowers', () => {
    it('should return mutual followers between two users', async () => {
      mockPrisma.userRelationship.findMany
        .mockResolvedValueOnce([
          { followerId: 'user_c' },
          { followerId: 'user_d' },
          { followerId: 'user_e' },
        ])
        .mockResolvedValueOnce([
          { followerId: 'user_c' },
          { followerId: 'user_f' },
          { followerId: 'user_d' },
        ]);

      const result = await service.getMutualFollowers('user_a', 'user_b');

      expect(result).toContain('user_c');
      expect(result).toContain('user_d');
      expect(result).not.toContain('user_e');
      expect(result).not.toContain('user_f');
    });

    it('should return empty array when no mutual followers', async () => {
      mockPrisma.userRelationship.findMany
        .mockResolvedValueOnce([{ followerId: 'user_c' }])
        .mockResolvedValueOnce([{ followerId: 'user_d' }]);

      const result = await service.getMutualFollowers('user_a', 'user_b');

      expect(result).toEqual([]);
    });
  });

  describe('suggestFriendsOfFriends', () => {
    it('should suggest users followed by friends but not by the user', async () => {
      // First call: who the user follows
      mockPrisma.userRelationship.findMany
        .mockResolvedValueOnce([{ followingId: 'friend_1' }, { followingId: 'friend_2' }])
        // Second call: who those friends follow
        .mockResolvedValueOnce([
          { followingId: 'suggested_1' },
          { followingId: 'suggested_2' },
          { followingId: 'suggested_1' }, // appears twice - higher rank
        ]);

      const result = await service.suggestFriendsOfFriends('user_a', 5);

      expect(result[0]).toBe('suggested_1'); // most common
      expect(result).toContain('suggested_2');
    });

    it('should return empty when user follows nobody', async () => {
      mockPrisma.userRelationship.findMany.mockResolvedValueOnce([]);

      const result = await service.suggestFriendsOfFriends('user_a');

      expect(result).toEqual([]);
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.userRelationship.findMany
        .mockResolvedValueOnce([{ followingId: 'friend_1' }])
        .mockResolvedValueOnce([
          { followingId: 's1' },
          { followingId: 's2' },
          { followingId: 's3' },
        ]);

      const result = await service.suggestFriendsOfFriends('user_a', 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('block', () => {
    it('should remove follows in both directions and create block', async () => {
      mockPrisma.userRelationship.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.userRelationship.upsert.mockResolvedValue({
        id: 'rel_1',
        followerId: 'user_a',
        followingId: 'user_b',
        type: 'BLOCK',
        createdAt: new Date(),
      });
      mockRedis.del.mockResolvedValue(1);

      await service.block('user_a', 'user_b');

      expect(mockPrisma.userRelationship.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { followerId: 'user_a', followingId: 'user_b', type: 'FOLLOW' },
            { followerId: 'user_b', followingId: 'user_a', type: 'FOLLOW' },
          ],
        },
      });
      expect(mockPrisma.userRelationship.upsert).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: 'user_a', followingId: 'user_b' },
        },
        update: { type: 'BLOCK' },
        create: { followerId: 'user_a', followingId: 'user_b', type: 'BLOCK' },
      });
    });
  });

  describe('mute', () => {
    it('should create a mute relationship', async () => {
      mockPrisma.userRelationship.upsert.mockResolvedValue({
        id: 'rel_1',
        followerId: 'user_a',
        followingId: 'user_b',
        type: 'MUTE',
        createdAt: new Date(),
      });

      await service.mute('user_a', 'user_b');

      expect(mockPrisma.userRelationship.upsert).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: 'user_a', followingId: 'user_b' },
        },
        update: { type: 'MUTE' },
        create: { followerId: 'user_a', followingId: 'user_b', type: 'MUTE' },
      });
    });
  });

  describe('getFollowerCount', () => {
    it('should return cached count when available', async () => {
      mockRedis.get.mockResolvedValue('42');

      const count = await service.getFollowerCount('user_a');

      expect(count).toBe(42);
      expect(mockPrisma.userRelationship.count).not.toHaveBeenCalled();
    });

    it('should query database and cache when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userRelationship.count.mockResolvedValue(15);
      mockRedis.set.mockResolvedValue('OK');

      const count = await service.getFollowerCount('user_a');

      expect(count).toBe(15);
      expect(mockPrisma.userRelationship.count).toHaveBeenCalledWith({
        where: { followingId: 'user_a', type: 'FOLLOW' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith('social:followers:count:user_a', '15', 'EX', 3600);
    });
  });

  describe('getFollowingCount', () => {
    it('should return cached count when available', async () => {
      mockRedis.get.mockResolvedValue('7');

      const count = await service.getFollowingCount('user_a');

      expect(count).toBe(7);
      expect(mockPrisma.userRelationship.count).not.toHaveBeenCalled();
    });

    it('should query database and cache when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userRelationship.count.mockResolvedValue(3);
      mockRedis.set.mockResolvedValue('OK');

      const count = await service.getFollowingCount('user_a');

      expect(count).toBe(3);
      expect(mockPrisma.userRelationship.count).toHaveBeenCalledWith({
        where: { followerId: 'user_a', type: 'FOLLOW' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith('social:following:count:user_a', '3', 'EX', 3600);
    });
  });
});
