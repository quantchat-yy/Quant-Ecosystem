import type { AIEngine } from '@quant/ai';
import { AvailabilityService } from './availability.service';

export interface SchedulePreferences {
  preferMorning?: boolean;
  preferAfternoon?: boolean;
  avoidLunchHour?: boolean;
}

export interface SuggestedSlot {
  start: Date;
  end: Date;
  score: number;
  reason: string;
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

export class AIScheduleService {
  private availabilityService: AvailabilityService;

  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {
    this.availabilityService = new AvailabilityService(prisma);
  }

  async suggestMeetingTimes(
    organizerUserId: string,
    attendeeIds: string[],
    duration: number,
    preferences?: SchedulePreferences,
  ): Promise<SuggestedSlot[]> {
    const allUserIds = [organizerUserId, ...attendeeIds];
    const today = new Date();

    // Check availability for the next 5 business days
    const slots: SuggestedSlot[] = [];
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const commonSlots = await this.availabilityService.checkMultiUserAvailability(
        allUserIds,
        date,
        duration,
      );

      for (const slot of commonSlots) {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        if (slotEnd <= slot.end) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            score: 0,
            reason: '',
          });
        }
      }
    }

    if (slots.length === 0) return [];

    // Use AI to rank and explain
    const response = await this.ai.infer({
      prompt: `Given these available time slots for a ${duration}-minute meeting, rank the top 3 and explain why each is good.
Preferences: ${JSON.stringify(preferences ?? {})}
Available slots: ${JSON.stringify(slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })))}

Respond ONLY with valid JSON array:
[{"index": 0, "score": 0.9, "reason": "explanation"}]`,
      systemPrompt:
        'You are a scheduling assistant. Rank meeting times based on productivity patterns and preferences. Always respond with valid JSON only.',
      userId: organizerUserId,
      app: 'quantcalendar',
      feature: 'ai-schedule',
      temperature: 0.3,
      maxTokens: 512,
    });

    try {
      const rankings = JSON.parse(response.content) as Array<{
        index: number;
        score: number;
        reason: string;
      }>;

      return rankings
        .filter((r) => r.index < slots.length)
        .map((r) => ({
          ...slots[r.index]!,
          score: r.score,
          reason: r.reason,
        }));
    } catch {
      // Fallback: return top slots with default scoring
      return slots.slice(0, 3).map((s, i) => ({
        ...s,
        score: 1 - i * 0.2,
        reason: 'Available time slot',
      }));
    }
  }
}
