import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReelService } from '../services/reel.service';

function createMockPrisma() {
  const prisma = {
    reel: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    reelLike: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    reelComment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return prisma;
}

describe('ReelService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ReelService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ReelService(prisma as never);
  });

  describe('getFeed', () => {
    it('ranks isFeatured > likeCount > createdAt and resolves isLiked', async () => {
      prisma.reel.findMany.mockResolvedValue([
        {
          id: 'r1',
          creatorId: 'c1',
          videoUrl: 'v1',
          likeCount: 5,
          isFeatured: true,
          creator: { username: 'a', avatarUrl: null },
        },
      ]);
      prisma.reelLike.findMany.mockResolvedValue([{ reelId: 'r1' }]);

      const reels = await service.getFeed('viewer', {});

      expect(reels[0].isLiked).toBe(true);
      const orderBy = (prisma.reel.findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy;
      expect(orderBy).toEqual([
        { isFeatured: 'desc' },
        { likeCount: 'desc' },
        { createdAt: 'desc' },
      ]);
    });
  });

  describe('toggleLike', () => {
    it('likes when not liked', async () => {
      prisma.reel.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.reelLike.findUnique.mockResolvedValue(null);
      prisma.reelLike.create.mockResolvedValue({ id: 'rl1' });
      prisma.reel.update.mockResolvedValue({ id: 'r1', likeCount: 3 });

      const result = await service.toggleLike('r1', 'u1');

      expect(result).toEqual({ liked: true, likeCount: 3 });
      expect(prisma.reelLike.create).toHaveBeenCalledWith({ data: { reelId: 'r1', userId: 'u1' } });
    });

    it('unlikes when already liked', async () => {
      prisma.reel.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.reelLike.findUnique.mockResolvedValue({ id: 'rl1' });
      prisma.reelLike.delete.mockResolvedValue({ id: 'rl1' });
      prisma.reel.update.mockResolvedValue({ id: 'r1', likeCount: 2 });

      const result = await service.toggleLike('r1', 'u1');

      expect(result).toEqual({ liked: false, likeCount: 2 });
      expect(prisma.reelLike.delete).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('creates a ReelComment and increments commentCount', async () => {
      prisma.reel.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.reelComment.create.mockResolvedValue({
        id: 'rc1',
        reelId: 'r1',
        userId: 'u1',
        content: 'fire',
        createdAt: new Date(),
      });
      prisma.reel.update.mockResolvedValue({ id: 'r1', commentCount: 1 });
      prisma.user.findUnique.mockResolvedValue({ username: 'bob', avatarUrl: null });

      const comment = await service.addComment('r1', 'u1', 'fire');

      expect(comment.content).toBe('fire');
      expect(comment.username).toBe('bob');
      expect(prisma.reel.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { commentCount: { increment: 1 } },
      });
    });
  });

  describe('getComments', () => {
    it('resolves usernames via batch user lookup', async () => {
      prisma.reelComment.findMany.mockResolvedValue([
        { id: 'rc1', reelId: 'r1', userId: 'u1', content: 'hi', createdAt: new Date() },
        { id: 'rc2', reelId: 'r1', userId: 'u2', content: 'yo', createdAt: new Date() },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', username: 'one', avatarUrl: null },
        { id: 'u2', username: 'two', avatarUrl: null },
      ]);

      const comments = await service.getComments('r1');

      expect(comments.map((c) => c.username)).toEqual(['one', 'two']);
    });
  });
});
