import { describe, it, expect, vi } from 'vitest';
import { VideoService, VideoNotFoundError, VideoValidationError } from '../services/video.service';
import type { PrismaClient } from '../types';

function mockPrisma() {
  const videos = new Map<string, Record<string, any>>();
  const likes = new Map<string, { userId: string; shortVideoId: string }>();
  let seq = 0;
  const prisma = {
    shortVideo: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const id = `v${++seq}`;
        const row = { id, deletedAt: null, createdAt: new Date('2026-06-20'), ...data };
        videos.set(id, row);
        return row;
      }),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) => videos.get(where.id) ?? null,
      ),
      findMany: vi.fn(async () => [...videos.values()].filter((v) => !v.deletedAt)),
      count: vi.fn(async () => videos.size),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
          const row = { ...videos.get(where.id), ...data };
          videos.set(where.id, row);
          return row;
        },
      ),
    },
    shortVideoLike: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        const k = where.userId_shortVideoId as { userId: string; shortVideoId: string };
        return likes.get(`${k.userId}:${k.shortVideoId}`) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        likes.set(`${data.userId}:${data.shortVideoId}`, data);
        return data;
      }),
      delete: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        const k = where.userId_shortVideoId as { userId: string; shortVideoId: string };
        likes.delete(`${k.userId}:${k.shortVideoId}`);
        return {};
      }),
      count: vi.fn(
        async ({ where }: { where: { shortVideoId: string } }) =>
          [...likes.values()].filter((l) => l.shortVideoId === where.shortVideoId).length,
      ),
    },
    datingProfile: {} as never,
    userRelationship: {} as never,
    swipe: {} as never,
    match: {} as never,
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  } as unknown as PrismaClient;
  return { prisma, videos, likes };
}

describe('VideoService', () => {
  describe('createVideo', () => {
    it('creates a video with sane defaults', async () => {
      const svc = new VideoService(mockPrisma().prisma);
      const v = await svc.createVideo({
        userId: 'u1',
        videoUrl: 'https://cdn/x.mp4',
        caption: 'hi',
      });
      expect(v.userId).toBe('u1');
      expect(v.videoUrl).toBe('https://cdn/x.mp4');
      expect(v.likeCount).toBe(0);
      expect(v.viewCount).toBe(0);
      expect(v.hashtags).toEqual([]);
    });

    it('rejects a missing/invalid videoUrl', async () => {
      const svc = new VideoService(mockPrisma().prisma);
      await expect(svc.createVideo({ userId: 'u', videoUrl: '' })).rejects.toBeInstanceOf(
        VideoValidationError,
      );
      await expect(svc.createVideo({ userId: 'u', videoUrl: 'ftp://x' })).rejects.toBeInstanceOf(
        VideoValidationError,
      );
    });

    it('rejects an over-long duration', async () => {
      const svc = new VideoService(mockPrisma().prisma);
      await expect(
        svc.createVideo({ userId: 'u', videoUrl: 'https://x', duration: 99999 }),
      ).rejects.toBeInstanceOf(VideoValidationError);
    });
  });

  describe('getVideo', () => {
    it('returns the video and counts a view', async () => {
      const { prisma } = mockPrisma();
      const svc = new VideoService(prisma);
      const created = await svc.createVideo({ userId: 'u', videoUrl: 'https://x' });
      const got = await svc.getVideo(created.id);
      expect(got.viewCount).toBe(1);
      const again = await svc.getVideo(created.id);
      expect(again.viewCount).toBe(2);
    });

    it('throws for an unknown video', async () => {
      const svc = new VideoService(mockPrisma().prisma);
      await expect(svc.getVideo('missing')).rejects.toBeInstanceOf(VideoNotFoundError);
    });
  });

  describe('toggleLike', () => {
    it('likes then unlikes, keeping the count in sync', async () => {
      const { prisma } = mockPrisma();
      const svc = new VideoService(prisma);
      const v = await svc.createVideo({ userId: 'author', videoUrl: 'https://x' });

      const liked = await svc.toggleLike('viewer', v.id);
      expect(liked).toEqual({ liked: true, likeCount: 1 });

      const unliked = await svc.toggleLike('viewer', v.id);
      expect(unliked).toEqual({ liked: false, likeCount: 0 });
    });

    it('counts likes from distinct users', async () => {
      const { prisma } = mockPrisma();
      const svc = new VideoService(prisma);
      const v = await svc.createVideo({ userId: 'author', videoUrl: 'https://x' });
      await svc.toggleLike('a', v.id);
      const r = await svc.toggleLike('b', v.id);
      expect(r.likeCount).toBe(2);
    });

    it('throws liking an unknown video', async () => {
      const svc = new VideoService(mockPrisma().prisma);
      await expect(svc.toggleLike('u', 'missing')).rejects.toBeInstanceOf(VideoNotFoundError);
    });
  });

  describe('listFeed', () => {
    it('returns created videos newest-first envelope', async () => {
      const { prisma } = mockPrisma();
      const svc = new VideoService(prisma);
      await svc.createVideo({ userId: 'u', videoUrl: 'https://a' });
      await svc.createVideo({ userId: 'u', videoUrl: 'https://b' });
      const feed = await svc.listFeed({ page: 1, pageSize: 10 });
      expect(feed.videos).toHaveLength(2);
      expect(feed.page).toBe(1);
    });
  });
});
