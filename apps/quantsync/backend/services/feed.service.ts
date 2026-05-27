import type { PrismaClient } from '../types';

export interface Post {
  id: string;
  userId: string;
  type: string;
  content: string;
  mediaUrls: unknown;
  hashtags: unknown;
  mentions: unknown;
  replyToId: string | null;
  communityId: string | null;
  visibility: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewCount: number;
  isEdited: boolean;
  isPinned: boolean;
  moderationStatus: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * In-memory bookmark store.
 * Workaround: The Post model does not have a metadata JSON field for storing
 * bookmark state. Bookmarks are stored in memory (Map<userId, Set<postId>>)
 * until a schema migration adds a dedicated Bookmark join table or metadata field.
 */
const bookmarkStore = new Map<string, Set<string>>();

export class FeedService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Add a bookmark for a user. Called by PostService.bookmark to register
   * the bookmark in the shared in-memory store.
   */
  static addBookmark(userId: string, postId: string): void {
    const userBookmarks = bookmarkStore.get(userId) ?? new Set<string>();
    userBookmarks.add(postId);
    bookmarkStore.set(userId, userBookmarks);
  }

  /**
   * Get the set of bookmarked post IDs for a user.
   */
  static getBookmarkedPostIds(userId: string): Set<string> {
    return bookmarkStore.get(userId) ?? new Set<string>();
  }

  /**
   * Clear all bookmarks (useful for testing).
   */
  static clearBookmarks(): void {
    bookmarkStore.clear();
  }

  async getFeed(userId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Post>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Get list of users this user follows
    const relationships = await this.prisma.userRelationship.findMany({
      where: { followerId: userId, type: 'FOLLOW' },
      select: { followingId: true },
    });

    const followingIds = relationships.map((r: { followingId: string }) => r.followingId);

    // Include the user's own posts in their feed
    const feedUserIds = [userId, ...followingIds];

    // Get posts from followed users sorted by recency and engagement
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          userId: { in: feedUserIds },
          deletedAt: null,
          visibility: 'PUBLIC',
        },
        skip,
        take: pageSize,
        orderBy: [{ publishedAt: 'desc' }, { likeCount: 'desc' }],
      }),
      this.prisma.post.count({
        where: {
          userId: { in: feedUserIds },
          deletedAt: null,
          visibility: 'PUBLIC',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getExploreFeed(options: PaginationOptions = {}): Promise<PaginatedResult<Post>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Explore feed shows trending/popular content
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
        },
        skip,
        take: pageSize,
        orderBy: [{ viewCount: 'desc' }, { likeCount: 'desc' }],
      }),
      this.prisma.post.count({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getTrending(
    timeframe: '1h' | '24h' | '7d' = '24h',
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Post>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const since = new Date(now);
    if (timeframe === '1h') {
      since.setHours(since.getHours() - 1);
    } else if (timeframe === '24h') {
      since.setDate(since.getDate() - 1);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          publishedAt: { gte: since },
        },
        skip,
        take: pageSize,
        orderBy: [{ likeCount: 'desc' }, { repostCount: 'desc' }],
      }),
      this.prisma.post.count({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          publishedAt: { gte: since },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get bookmarked posts for a user.
   * Uses the in-memory bookmark store to look up bookmarked post IDs,
   * then fetches the actual posts from the database.
   */
  async getBookmarks(
    userId: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Post>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Get bookmarked post IDs from in-memory store
    const bookmarkedIds = Array.from(FeedService.getBookmarkedPostIds(userId));

    if (bookmarkedIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    const where = {
      id: { in: bookmarkedIds },
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
