import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIWeeklyDigestService } from '../services/ai-weekly-digest.service';

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

describe('AIWeeklyDigestService', () => {
  let service: AIWeeklyDigestService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AIWeeklyDigestService(ai as never, prisma as never);
  });

  describe('generateDigest', () => {
    it('generates digest with correct stats', async () => {
      const weekStart = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
        { startTime: new Date('2024-01-16T10:00:00'), endTime: new Date('2024-01-16T11:30:00') },
      ]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          summary: 'You had a productive week with 3 meetings.',
          suggestions: ['Try to batch meetings on fewer days', 'Block focus time in the morning'],
        }),
      });

      const digest = await service.generateDigest('user-1', weekStart);

      expect(digest.totalMeetings).toBe(3);
      expect(digest.totalHoursBooked).toBe(3.5);
      expect(digest.busiestDay).toBe('Monday');
      expect(digest.summary).toContain('productive week');
      expect(digest.suggestions).toHaveLength(2);
    });

    it('includes AI-generated summary', async () => {
      const weekStart = new Date('2024-01-15');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
      ]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          summary: 'Light week with just one meeting - great time for deep work!',
          suggestions: ['Use the free time for strategic planning'],
        }),
      });

      const digest = await service.generateDigest('user-1', weekStart);

      expect(digest.summary).toBe('Light week with just one meeting - great time for deep work!');
      expect(ai.infer).toHaveBeenCalledWith(
        expect.objectContaining({
          app: 'quantcalendar',
          feature: 'ai-weekly-digest',
        }),
      );
    });
  });
});
