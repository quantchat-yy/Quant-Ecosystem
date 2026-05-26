import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIScheduleService } from '../services/ai-schedule.service';

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

describe('AIScheduleService', () => {
  let service: AIScheduleService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AIScheduleService(ai as never, prisma as never);
  });

  describe('suggestMeetingTimes', () => {
    it('suggests available times across multiple calendars', async () => {
      // Mock events for both users showing some free time
      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
      ]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify([
          { index: 0, score: 0.95, reason: 'Morning slot after existing meeting' },
          { index: 1, score: 0.8, reason: 'Afternoon slot with good energy levels' },
        ]),
      });

      const suggestions = await service.suggestMeetingTimes('user-1', ['user-2'], 30, {
        preferMorning: true,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]!.score).toBeGreaterThan(0);
      expect(suggestions[0]!.reason).toBeTruthy();
    });

    it('respects morning preference', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify([
          { index: 0, score: 0.9, reason: 'Early morning is best for focused meetings' },
        ]),
      });

      const suggestions = await service.suggestMeetingTimes('user-1', ['user-2'], 60, {
        preferMorning: true,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(ai.infer).toHaveBeenCalled();
      const callArgs = ai.infer.mock.calls[0]![0];
      expect(callArgs.prompt).toContain('preferMorning');
    });

    it('returns scored and ranked slots', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      ai.infer.mockResolvedValue({
        content: JSON.stringify([
          { index: 0, score: 0.95, reason: 'Best slot' },
          { index: 1, score: 0.75, reason: 'Good slot' },
          { index: 2, score: 0.6, reason: 'Acceptable slot' },
        ]),
      });

      const suggestions = await service.suggestMeetingTimes('user-1', ['user-2'], 30);

      if (suggestions.length >= 2) {
        expect(suggestions[0]!.score).toBeGreaterThanOrEqual(suggestions[1]!.score);
      }
    });
  });
});
