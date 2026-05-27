import { createAppError } from '@quant/server-core';

export interface Attendee {
  userId: string;
  email: string;
  name: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface Reminder {
  type: 'email' | 'push' | 'sms';
  minutesBefore: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  location: string;
  userId: string;
  attendees: Attendee[];
  recurrenceRule: string | null;
  status: 'confirmed' | 'tentative' | 'cancelled';
  reminders: Reminder[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  userId: string;
  attendees?: Attendee[];
  recurrenceRule?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  reminders?: Reminder[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  location?: string;
  recurrenceRule?: string | null;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  reminders?: Reminder[];
}

/** Minimal PrismaClient interface for dependency injection */
export interface PrismaClient {
  event: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  };
}

export class EventService {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const now = new Date();
    const event = await this.prisma.event.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        startTime: input.startTime,
        endTime: input.endTime,
        allDay: input.allDay ?? false,
        location: input.location ?? '',
        userId: input.userId,
        attendees: JSON.stringify(input.attendees ?? []),
        recurrenceRule: input.recurrenceRule ?? null,
        status: input.status ?? 'confirmed',
        reminders: JSON.stringify(input.reminders ?? []),
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toCalendarEvent(event);
  }

  async getEvent(eventId: string, userId: string): Promise<CalendarEvent> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw createAppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const record = event as unknown as Record<string, unknown>;

    if (record['userId'] !== userId) {
      throw createAppError('Not authorized to access this event', 403, 'UNAUTHORIZED');
    }

    return this.toCalendarEvent(event);
  }

  async updateEvent(
    eventId: string,
    userId: string,
    input: UpdateEventInput,
  ): Promise<CalendarEvent> {
    await this.getEvent(eventId, userId);

    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (input.title !== undefined) data['title'] = input.title;
    if (input.description !== undefined) data['description'] = input.description;
    if (input.startTime !== undefined) data['startTime'] = input.startTime;
    if (input.endTime !== undefined) data['endTime'] = input.endTime;
    if (input.allDay !== undefined) data['allDay'] = input.allDay;
    if (input.location !== undefined) data['location'] = input.location;
    if (input.recurrenceRule !== undefined) data['recurrenceRule'] = input.recurrenceRule;
    if (input.status !== undefined) data['status'] = input.status;
    if (input.reminders !== undefined) data['reminders'] = JSON.stringify(input.reminders);

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data,
    });

    return this.toCalendarEvent(updated);
  }

  async deleteEvent(eventId: string, userId: string): Promise<CalendarEvent> {
    const event = await this.getEvent(eventId, userId);

    await this.prisma.event.delete({ where: { id: eventId } });

    return event;
  }

  async listEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
    });

    return events.map((e) => this.toCalendarEvent(e));
  }

  async listEventsInRange(userId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
      orderBy: { startTime: 'asc' },
    });

    return events.map((e) => this.toCalendarEvent(e));
  }

  async addAttendee(eventId: string, userId: string, attendee: Attendee): Promise<CalendarEvent> {
    const event = await this.getEvent(eventId, userId);

    const attendees = [...event.attendees, attendee];

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees), updatedAt: new Date() },
    });

    return this.toCalendarEvent(updated);
  }

  async removeAttendee(
    eventId: string,
    userId: string,
    attendeeUserId: string,
  ): Promise<CalendarEvent> {
    const event = await this.getEvent(eventId, userId);

    const attendees = event.attendees.filter((a) => a.userId !== attendeeUserId);

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees), updatedAt: new Date() },
    });

    return this.toCalendarEvent(updated);
  }

  async updateAttendeeStatus(
    eventId: string,
    attendeeUserId: string,
    callerUserId: string,
    status: Attendee['status'],
  ): Promise<CalendarEvent> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw createAppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const record = this.toCalendarEvent(event);

    // Authorization: caller must be the attendee being updated or the event owner
    if (callerUserId !== attendeeUserId && callerUserId !== record.userId) {
      throw createAppError('Not authorized to update attendee status', 403, 'UNAUTHORIZED');
    }

    const attendees = record.attendees.map((a) =>
      a.userId === attendeeUserId ? { ...a, status } : a,
    );

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees), updatedAt: new Date() },
    });

    return this.toCalendarEvent(updated);
  }

  private toCalendarEvent(raw: unknown): CalendarEvent {
    const record = raw as Record<string, unknown>;
    return {
      id: record['id'] as string,
      title: record['title'] as string,
      description: (record['description'] as string) ?? '',
      startTime: new Date(record['startTime'] as string | Date),
      endTime: new Date(record['endTime'] as string | Date),
      allDay: (record['allDay'] as boolean) ?? false,
      location: (record['location'] as string) ?? '',
      userId: record['userId'] as string,
      attendees:
        typeof record['attendees'] === 'string'
          ? JSON.parse(record['attendees'] as string)
          : ((record['attendees'] as Attendee[]) ?? []),
      recurrenceRule: (record['recurrenceRule'] as string | null) ?? null,
      status: (record['status'] as CalendarEvent['status']) ?? 'confirmed',
      reminders:
        typeof record['reminders'] === 'string'
          ? JSON.parse(record['reminders'] as string)
          : ((record['reminders'] as Reminder[]) ?? []),
      createdAt: new Date(record['createdAt'] as string | Date),
      updatedAt: new Date(record['updatedAt'] as string | Date),
    };
  }
}
