import type { CalendarEvent } from './event.service';

export interface BufferResult {
  buffersAdded: number;
  events: CalendarEvent[];
}

export interface PrismaClient {
  event: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export class AIBufferService {
  constructor(private readonly prisma: PrismaClient) {}

  async addBufferTime(userId: string, date: Date): Promise<BufferResult> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

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

    const bufferEvents: CalendarEvent[] = [];
    const BUFFER_MINUTES = 15;
    const BACK_TO_BACK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = sortedEvents[i]!.endTime;
      const nextStart = sortedEvents[i + 1]!.startTime;
      const gap = nextStart.getTime() - currentEnd.getTime();

      if (gap < BACK_TO_BACK_THRESHOLD) {
        const bufferStart = new Date(currentEnd);
        const bufferEnd = new Date(currentEnd.getTime() + BUFFER_MINUTES * 60 * 1000);

        const now = new Date();
        const created = await this.prisma.event.create({
          data: {
            title: 'Buffer Time',
            description: 'Auto-generated buffer between meetings',
            startTime: bufferStart,
            endTime: bufferEnd,
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
        bufferEvents.push({
          id: (record['id'] as string) ?? `buffer-${i}`,
          title: 'Buffer Time',
          description: 'Auto-generated buffer between meetings',
          startTime: bufferStart,
          endTime: bufferEnd,
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
    }

    return {
      buffersAdded: bufferEvents.length,
      events: bufferEvents,
    };
  }
}
