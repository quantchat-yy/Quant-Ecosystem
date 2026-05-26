import type { AIEngine } from '@quant/ai';

export interface WeeklyDigest {
  summary: string;
  totalMeetings: number;
  totalHoursBooked: number;
  busiestDay: string;
  suggestions: string[];
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

export class AIWeeklyDigestService {
  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {}

  async generateDigest(userId: string, weekStartDate: Date): Promise<WeeklyDigest> {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: weekStartDate },
        endTime: { lte: weekEnd },
      },
    });

    const typedEvents = events as Array<Record<string, unknown>>;

    // Compute stats
    const totalMeetings = typedEvents.length;

    let totalHoursBooked = 0;
    const dayHours: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const event of typedEvents) {
      const start = new Date(event['startTime'] as string | Date);
      const end = new Date(event['endTime'] as string | Date);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHoursBooked += durationHours;

      const dayName = dayNames[start.getDay()]!;
      dayHours[dayName] = (dayHours[dayName] ?? 0) + durationHours;
    }

    let busiestDay = 'None';
    let maxHours = 0;
    for (const [day, hours] of Object.entries(dayHours)) {
      if (hours > maxHours) {
        maxHours = hours;
        busiestDay = day;
      }
    }

    // Use AI to generate summary
    const response = await this.ai.infer({
      prompt: `Generate a friendly weekly calendar digest summary for a user with these stats:
- Total meetings: ${totalMeetings}
- Total hours booked: ${totalHoursBooked.toFixed(1)}
- Busiest day: ${busiestDay}

Respond ONLY with valid JSON:
{
  "summary": "A friendly 1-2 sentence summary",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
      systemPrompt:
        'You are a productivity assistant generating weekly calendar digests. Be encouraging and provide actionable suggestions. Always respond with valid JSON only.',
      userId,
      app: 'quantcalendar',
      feature: 'ai-weekly-digest',
      temperature: 0.5,
      maxTokens: 512,
    });

    let summary = `You had ${totalMeetings} meetings this week totaling ${totalHoursBooked.toFixed(1)} hours.`;
    let suggestions: string[] = [];

    try {
      const parsed = JSON.parse(response.content) as { summary: string; suggestions: string[] };
      summary = parsed.summary;
      suggestions = parsed.suggestions ?? [];
    } catch {
      // Use default summary
    }

    return {
      summary,
      totalMeetings,
      totalHoursBooked: Math.round(totalHoursBooked * 10) / 10,
      busiestDay,
      suggestions,
    };
  }
}
