import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from '../services/profile.service';

function createMockPrisma() {
  return {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    post: { count: vi.fn() },
    userRelationship: {
      count: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    closeFriend: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    notification: { create: vi.fn() },
  };
}

describe('ProfileService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ProfileService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ProfileService(prisma as never);
  });

  describe('getProfile', () => {
    it('derives counts and isFollowing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'alice',
        displayName: 'Alice',
        bio: 'hi',
        avatarUrl: 'a.jpg',
        website: '',
        emailVerified: true,
        deletedAt: null,
      });
      prisma.post.count.mockResolvedValue(7);
      prisma.userRelationship.count.mockResolvedValueOnce(100).mockResolvedValueOnce(50);
      prisma.userRelationship.findFirst.mockResolvedValue({ id: 'r1' });

      const profile = await service.getProfile('u1', 'viewer');

      expect(profile.postCount).toBe(7);
      expect(profile.followerCount).toBe(100);
      expect(profile.followingCount).toBe(50);
      expect(profile.isFollowing).toBe(true);
      expect(profile.isVerified).toBe(true);
    });
  });

  describe('follow', () => {
    it('rejects self-follow with 400', async () => {
      await expect(service.follow('u1', 'u1')).rejects.toThrow('You cannot follow yourself');
      expect(prisma.userRelationship.upsert).not.toHaveBeenCalled();
    });

    it('upserts a FOLLOW edge and sends a best-effort notification', async () => {
      prisma.userRelationship.upsert.mockResolvedValue({ id: 'r1' });

      const result = await service.follow('follower', 'target');

      expect(result).toEqual({ following: true });
      const arg = prisma.userRelationship.upsert.mock.calls[0][0] as {
        create: Record<string, unknown>;
      };
      expect(arg.create).toMatchObject({
        followerId: 'follower',
        followingId: 'target',
        type: 'FOLLOW',
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('unfollow', () => {
    it('deletes the FOLLOW edge', async () => {
      prisma.userRelationship.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfollow('follower', 'target');

      expect(result).toEqual({ following: false });
      expect(prisma.userRelationship.deleteMany).toHaveBeenCalledWith({
        where: { followerId: 'follower', followingId: 'target', type: 'FOLLOW' },
      });
    });
  });

  describe('close friends', () => {
    it('lists close friends joined to users', async () => {
      prisma.closeFriend.findMany.mockResolvedValue([{ friendId: 'f1' }, { friendId: 'f2' }]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'f1', username: 'one', displayName: 'One', avatarUrl: null },
        { id: 'f2', username: 'two', displayName: 'Two', avatarUrl: null },
      ]);

      const friends = await service.listCloseFriends('me');

      expect(friends.map((f) => f.id)).toEqual(['f1', 'f2']);
    });

    it('adds and removes a close friend', async () => {
      prisma.closeFriend.upsert.mockResolvedValue({ id: 'cf1' });
      prisma.closeFriend.deleteMany.mockResolvedValue({ count: 1 });

      expect(await service.addCloseFriend('me', 'f1')).toEqual({ isCloseFriend: true });
      expect(await service.removeCloseFriend('me', 'f1')).toEqual({ isCloseFriend: false });
    });
  });
});
