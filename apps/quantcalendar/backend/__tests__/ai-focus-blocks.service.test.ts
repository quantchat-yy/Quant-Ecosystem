import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIFocusBlocksService } from '../services/ai-focus-blocks.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

function createMockPrisma() {
  return {
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('AIFocusBlocksService', () => {
  let service: AIFocusBlocksService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AIFocusBlocksService(ai as never, prisma as never);
  });

  describe('reserveFocusBlocks', () => {
    it('reserves blocks in empty 60+ minute gaps', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
      ]);

      // AI returns both gap indices
      ai.infer.mockResolvedValue({
        content: JSON.stringify([0, 1]),
      });

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: `focus-${Date.now()}`,
        ...args.data,
      }));

      const result = await service.reserveFocusBlocks('user-1', date);

      // Gaps: 10:00-14:00 (4h) and 15:00-17:00 (2h) - both >= 60 min
      expect(result.blocksCreated).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]!.title).toBe('Deep Work');
    });

    it('uses AI response to select a subset of gaps', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
      ]);

      // AI returns only the first gap index
      ai.infer.mockResolvedValue({
        content: JSON.stringify([0]),
      });

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: `focus-${Date.now()}`,
        ...args.data,
      }));

      const result = await service.reserveFocusBlocks('user-1', date);

      // Only the first gap (10:00-14:00) should be selected by AI
      expect(result.blocksCreated).toBe(1);
      expect(result.events).toHaveLength(1);
    });

    it('respects minBlockMinutes parameter', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T10:30:00'), endTime: new Date('2024-01-15T11:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
      ]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify([0, 1]),
      });

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: `focus-${Date.now()}`,
        ...args.data,
      }));

      // With 120 min minimum, the 30-min gap and 2h gap should be filtered
      const result = await service.reserveFocusBlocks('user-1', date, 120);

      // Only 11:00-14:00 (3h) and 15:00-17:00 (2h) are >= 120 min
      expect(result.blocksCreated).toBe(2);
    });

    it('does nothing when day is fully packed', async () => {
      const date = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T17:00:00') },
      ]);

      const result = await service.reserveFocusBlocks('user-1', date);

      expect(result.blocksCreated).toBe(0);
      expect(result.events).toHaveLength(0);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });
  });
});
