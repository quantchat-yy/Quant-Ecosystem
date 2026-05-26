import type { AIEngine } from '@quant/ai';

export interface ProposedChange {
  eventId: string;
  originalStart: Date;
  originalEnd: Date;
  newStart: Date;
  newEnd: Date;
}

export interface RescheduleResult {
  proposedChanges: ProposedChange[];
  parsed: { sourceDay: string; targetDay: string };
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

export class AIRescheduleService {
  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {}

  async rescheduleEvents(userId: string, instruction: string): Promise<RescheduleResult> {
    // NOTE: instruction is interpolated directly into the prompt without sanitization.
    // This is acceptable for now since results are only returned to the caller,
    // but should be hardened if automated actions are wired up later.
    // Use AI to parse the natural language instruction
    const parseResponse = await this.ai.infer({
      prompt: `Parse this scheduling instruction and identify the source and target days:

"${instruction}"

Respond ONLY with valid JSON:
{
  "sourceDay": "weekday name (e.g., Thursday)",
  "targetDay": "weekday name (e.g., Friday)"
}`,
      systemPrompt:
        'You are a scheduling instruction parser. Extract source and target days from natural language rescheduling requests. Always respond with valid JSON only.',
      userId,
      app: 'quantcalendar',
      feature: 'ai-reschedule',
      temperature: 0.2,
      maxTokens: 128,
    });

    let parsed: { sourceDay: string; targetDay: string };
    try {
      parsed = JSON.parse(parseResponse.content) as { sourceDay: string; targetDay: string };
    } catch {
      return { proposedChanges: [], parsed: { sourceDay: '', targetDay: '' } };
    }

    // Find events on the source day
    const sourceDate = this.getNextDayOfWeek(parsed.sourceDay);
    const targetDate = this.getNextDayOfWeek(parsed.targetDay);

    const dayStart = new Date(sourceDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(sourceDate);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
      },
    });

    // Compute day offset
    const dayDiff = targetDate.getTime() - sourceDate.getTime();

    const proposedChanges: ProposedChange[] = (events as Array<Record<string, unknown>>).map(
      (e) => {
        const originalStart = new Date(e['startTime'] as string | Date);
        const originalEnd = new Date(e['endTime'] as string | Date);

        return {
          eventId: e['id'] as string,
          originalStart,
          originalEnd,
          newStart: new Date(originalStart.getTime() + dayDiff),
          newEnd: new Date(originalEnd.getTime() + dayDiff),
        };
      },
    );

    return { proposedChanges, parsed };
  }

  private getNextDayOfWeek(dayName: string): Date {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay = days[dayName.toLowerCase()] ?? 0;
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    const result = new Date(today);
    result.setDate(result.getDate() + daysUntil);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}
