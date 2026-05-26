import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIBufferService } from '../services/ai-buffer.service';

function createMockPrisma() {
  return {
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('AIBufferService', () => {
  let service: AIBufferService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AIBufferService(prisma as never);
  });

  describe('addBufferTime', () => {
    it('adds buffers between back-to-back meetings', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T10:00:00'), endTime: new Date('2024-01-15T11:00:00') },
        { startTime: new Date('2024-01-15T11:00:00'), endTime: new Date('2024-01-15T12:00:00') },
      ]);

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: `buffer-${Date.now()}`,
        ...args.data,
      }));

      const result = await service.addBufferTime('user-1', date);

      expect(result.buffersAdded).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]!.title).toBe('Buffer Time');
    });

    it('does nothing when no back-to-back meetings exist', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
      ]);

      const result = await service.addBufferTime('user-1', date);

      expect(result.buffersAdded).toBe(0);
      expect(result.events).toHaveLength(0);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('handles meetings separated by exactly 5 minutes (threshold)', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        // Exactly 5 minutes gap - should NOT trigger buffer (gap >= threshold)
        { startTime: new Date('2024-01-15T10:05:00'), endTime: new Date('2024-01-15T11:00:00') },
      ]);

      const result = await service.addBufferTime('user-1', date);

      // 5 min gap = 300000ms, threshold is 300000ms, so gap is NOT < threshold
      expect(result.buffersAdded).toBe(0);
    });
  });
});
