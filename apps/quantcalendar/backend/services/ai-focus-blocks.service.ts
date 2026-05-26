import type { AIEngine } from '@quant/ai';
import type { CalendarEvent } from './event.service';

export interface FocusBlockResult {
  blocksCreated: number;
  events: CalendarEvent[];
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export class AIFocusBlocksService {
  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {}

  async reserveFocusBlocks(
    userId: string,
    date: Date,
    minBlockMinutes: number = 60,
  ): Promise<FocusBlockResult> {
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
      },
      orderBy: { startTime: 'asc' },
    });

    const sortedEvents = (events as Array<Record<string, unknown>>)
      .map((e) => ({
        startTime: new Date(e['startTime'] as string | Date),
        endTime: new Date(e['endTime'] as string | Date),
      }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find empty gaps
    const gaps: Array<{ start: Date; end: Date }> = [];
    let current = dayStart.getTime();

    for (const event of sortedEvents) {
      if (event.startTime.getTime() > current) {
        gaps.push({
          start: new Date(current),
          end: new Date(event.startTime),
        });
      }
      if (event.endTime.getTime() > current) {
        current = event.endTime.getTime();
      }
    }

    if (current < dayEnd.getTime()) {
      gaps.push({
        start: new Date(current),
        end: new Date(dayEnd),
      });
    }

    // Filter by min duration
    const minDurationMs = minBlockMinutes * 60 * 1000;
    const eligibleGaps = gaps.filter((g) => g.end.getTime() - g.start.getTime() >= minDurationMs);

    if (eligibleGaps.length === 0) {
      return { blocksCreated: 0, events: [] };
    }

    // Use AI to pick best slots
    let selectedGaps = eligibleGaps;
    try {
      const response = await this.ai.infer({
        prompt: `Given these available time gaps for deep work: ${JSON.stringify(eligibleGaps.map((g, i) => ({ index: i, start: g.start.toISOString(), end: g.end.toISOString() })))}, select the best ones for focused deep work blocks. Respond with JSON array of indices: [0, 1, ...]`,
        systemPrompt:
          'You are a productivity assistant. Pick the best time slots for deep work focus blocks based on typical energy patterns.',
        userId,
        app: 'quantcalendar',
        feature: 'ai-focus-blocks',
        temperature: 0.3,
        maxTokens: 256,
      });

      const indices = JSON.parse(response.content) as number[];
      if (Array.isArray(indices) && indices.length > 0) {
        const filtered = indices
          .filter((i) => typeof i === 'number' && i >= 0 && i < eligibleGaps.length)
          .map((i) => eligibleGaps[i]!);
        if (filtered.length > 0) {
          selectedGaps = filtered;
        }
      }
    } catch {
      // Fall back to all eligible gaps if AI fails or returns unparseable response
    }

    const focusEvents: CalendarEvent[] = [];
    const now = new Date();

    for (const gap of selectedGaps) {
      const created = await this.prisma.event.create({
        data: {
          title: 'Deep Work',
          description: 'AI-reserved focus block for deep work',
          startTime: gap.start,
          endTime: gap.end,
          allDay: false,
          location: '',
          userId,
          attendees: JSON.stringify([]),
          recurrenceRule: null,
          status: 'confirmed',
          reminders: JSON.stringify([]),
          createdAt: now,
          updatedAt: now,
        },
      });

      const record = created as Record<string, unknown>;
      focusEvents.push({
        id: (record['id'] as string) ?? `focus-${focusEvents.length}`,
        title: 'Deep Work',
        description: 'AI-reserved focus block for deep work',
        startTime: gap.start,
        endTime: gap.end,
        allDay: false,
        location: '',
        userId,
        attendees: [],
        recurrenceRule: null,
        status: 'confirmed',
        reminders: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      blocksCreated: focusEvents.length,
      events: focusEvents,
    };
  }
}
