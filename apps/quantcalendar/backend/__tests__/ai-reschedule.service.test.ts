import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIRescheduleService } from '../services/ai-reschedule.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

function createMockPrisma() {
  return {
    event: {
      findMany: vi.fn(),
    },
  };
}

describe('AIRescheduleService', () => {
  let service: AIRescheduleService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AIRescheduleService(ai as never, prisma as never);
  });

  describe('rescheduleEvents', () => {
    it('parses "Move Thursday meetings to Friday"', async () => {
      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          sourceDay: 'Thursday',
          targetDay: 'Friday',
        }),
      });

      // Thursday meetings
      prisma.event.findMany.mockResolvedValue([
        {
          id: 'event-1',
          startTime: new Date('2024-01-18T10:00:00'),
          endTime: new Date('2024-01-18T11:00:00'),
        },
        {
          id: 'event-2',
          startTime: new Date('2024-01-18T14:00:00'),
          endTime: new Date('2024-01-18T15:00:00'),
        },
      ]);

      const result = await service.rescheduleEvents(
        'user-1',
        'Move my Thursday meetings to Friday',
      );

      expect(result.parsed.sourceDay).toBe('Thursday');
      expect(result.parsed.targetDay).toBe('Friday');
      expect(result.proposedChanges).toHaveLength(2);
    });

    it('returns proposed changes with correct new times', async () => {
      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          sourceDay: 'Thursday',
          targetDay: 'Friday',
        }),
      });

      prisma.event.findMany.mockResolvedValue([
        {
          id: 'event-1',
          startTime: new Date('2024-01-18T09:00:00'),
          endTime: new Date('2024-01-18T10:00:00'),
        },
      ]);

      const result = await service.rescheduleEvents('user-1', 'Move Thursday meetings to Friday');

      expect(result.proposedChanges).toHaveLength(1);
      const change = result.proposedChanges[0]!;
      expect(change.eventId).toBe('event-1');
      expect(change.originalStart).toEqual(new Date('2024-01-18T09:00:00'));
      expect(change.originalEnd).toEqual(new Date('2024-01-18T10:00:00'));
      // New times should differ from original by the same duration as the day offset
      const durationMs = change.newEnd.getTime() - change.newStart.getTime();
      expect(durationMs).toBe(60 * 60 * 1000); // Preserves 1-hour duration
    });
  });
});
