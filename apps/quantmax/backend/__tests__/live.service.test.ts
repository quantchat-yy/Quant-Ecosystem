import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveService } from '../services/live.service';

function createMockPrisma() {
  return {
    liveStream: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    liveStreamViewer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('LiveService', () => {
  let service: LiveService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new LiveService(prisma as never);
  });

  describe('startLive', () => {
    it('creates a live stream and maps the hyphenated type to the enum', async () => {
      prisma.liveStream.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 's1',
          startedAt: new Date('2026-06-22T00:00:00Z'),
          ...data,
        }),
      );

      const view = await service.startLive('host-1', {
        title: '  Speed night  ',
        type: 'speed-dating',
      });

      expect(prisma.liveStream.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hostId: 'host-1',
            title: 'Speed night',
            type: 'SPEED_DATING',
            isLive: true,
          }),
        }),
      );
      expect(view.type).toBe('speed-dating'); // projected back to hyphenated
      expect(view.isLive).toBe(true);
    });

    it('rejects a blank title and an invalid type', async () => {
      await expect(service.startLive('h', { title: '  ' })).rejects.toThrow('title is required');
      await expect(service.startLive('h', { title: 'x', type: 'bogus' })).rejects.toThrow(
        'Invalid stream type',
      );
    });
  });

  describe('listLive', () => {
    it('returns only live streams (ordered by viewers) as views', async () => {
      prisma.liveStream.findMany.mockResolvedValue([
        {
          id: 's1',
          hostId: 'h',
          title: 'A',
          type: 'SOLO',
          viewerCount: 9,
          isLive: true,
          startedAt: new Date(),
        },
      ]);
      const list = await service.listLive();
      expect(prisma.liveStream.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isLive: true }, orderBy: { viewerCount: 'desc' } }),
      );
      expect(list[0]!.type).toBe('solo');
    });
  });

  describe('join', () => {
    it('idempotently joins and recomputes the distinct viewer count', async () => {
      prisma.liveStream.findUnique.mockResolvedValue({
        id: 's1',
        isLive: true,
        maxParticipants: 0,
      });
      prisma.liveStreamViewer.findUnique.mockResolvedValue(null);
      prisma.liveStreamViewer.create.mockResolvedValue({});
      prisma.liveStreamViewer.count.mockResolvedValue(1);
      prisma.liveStream.update.mockResolvedValue({});

      const r = await service.join('s1', 'viewer-1');
      expect(r).toEqual({ joined: true, viewerCount: 1 });
      expect(prisma.liveStreamViewer.create).toHaveBeenCalled();

      // Re-join: no second viewer row created.
      prisma.liveStreamViewer.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.liveStreamViewer.count.mockResolvedValue(1);
      prisma.liveStreamViewer.create.mockClear();
      const again = await service.join('s1', 'viewer-1');
      expect(again.viewerCount).toBe(1);
      expect(prisma.liveStreamViewer.create).not.toHaveBeenCalled();
    });

    it('throws when the stream is missing or not live', async () => {
      prisma.liveStream.findUnique.mockResolvedValue(null);
      await expect(service.join('missing', 'u')).rejects.toThrow('Live stream not found');

      prisma.liveStream.findUnique.mockResolvedValue({ id: 's1', isLive: false });
      await expect(service.join('s1', 'u')).rejects.toThrow('Live stream not found');
    });

    it('rejects a new viewer when the stream is at capacity', async () => {
      prisma.liveStream.findUnique.mockResolvedValue({
        id: 's1',
        isLive: true,
        maxParticipants: 2,
      });
      prisma.liveStreamViewer.findUnique.mockResolvedValue(null);
      prisma.liveStreamViewer.count.mockResolvedValue(2); // already full
      await expect(service.join('s1', 'viewer-3')).rejects.toThrow('full');
      expect(prisma.liveStreamViewer.create).not.toHaveBeenCalled();
    });
  });

  describe('end', () => {
    it('lets the host end the stream', async () => {
      prisma.liveStream.findUnique.mockResolvedValue({ id: 's1', hostId: 'host-1' });
      prisma.liveStream.update.mockResolvedValue({});
      const r = await service.end('s1', 'host-1');
      expect(r).toEqual({ ended: true });
      expect(prisma.liveStream.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isLive: false }) }),
      );
    });

    it('forbids a non-host from ending the stream', async () => {
      prisma.liveStream.findUnique.mockResolvedValue({ id: 's1', hostId: 'host-1' });
      await expect(service.end('s1', 'someone-else')).rejects.toThrow('Only the host');
    });
  });
});
