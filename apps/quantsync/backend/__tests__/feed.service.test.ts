import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedService } from '../services/feed.service';

function createMockPrisma() {
  return {
    post: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userRelationship: {
      findMany: vi.fn(),
    },
  };
}

describe('FeedService', () => {
  let service: FeedService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new FeedService(prisma as never);
    // Clear in-memory bookmark store between tests
    FeedService.clearBookmarks();
  });

  describe('getFeed', () => {
    it('returns paginated feed from followed users', async () => {
      prisma.userRelationship.findMany.mockResolvedValue([
        { followingId: 'user-2' },
        { followingId: 'user-3' },
      ]);
      prisma.post.findMany.mockResolvedValue([
        { id: 'post-1', userId: 'user-2' },
        { id: 'post-2', userId: 'user-3' },
      ]);
      prisma.post.count.mockResolvedValue(2);

      const result = await service.getFeed('user-1', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getTrending', () => {
    it('returns trending posts within timeframe', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', likeCount: 100 }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getTrending('24h', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getBookmarks', () => {
    it('returns paginated bookmarks for a user from in-memory store', async () => {
      // Add a bookmark to the in-memory store
      FeedService.addBookmark('user-1', 'post-1');

      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', userId: 'user-2', deletedAt: null }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getBookmarks('user-1', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      // Verify the query uses the bookmarked post IDs from in-memory store
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['post-1'] },
            deletedAt: null,
          },
        }),
      );
    });

    it('handles empty bookmarks', async () => {
      const result = await service.getBookmarks('user-1');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      // Should not query the database when there are no bookmarks
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getExploreFeed', () => {
    it('returns popular public content', async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 'post-1', viewCount: 1000 }]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.getExploreFeed({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('bookmark store', () => {
    it('addBookmark stores bookmark in memory', () => {
      FeedService.addBookmark('user-1', 'post-1');
      FeedService.addBookmark('user-1', 'post-2');

      const ids = FeedService.getBookmarkedPostIds('user-1');
      expect(ids.has('post-1')).toBe(true);
      expect(ids.has('post-2')).toBe(true);
      expect(ids.size).toBe(2);
    });

    it('addBookmark is idempotent', () => {
      FeedService.addBookmark('user-1', 'post-1');
      FeedService.addBookmark('user-1', 'post-1');

      const ids = FeedService.getBookmarkedPostIds('user-1');
      expect(ids.size).toBe(1);
    });

    it('getBookmarkedPostIds returns empty set for unknown user', () => {
      const ids = FeedService.getBookmarkedPostIds('unknown-user');
      expect(ids.size).toBe(0);
    });
  });
});
