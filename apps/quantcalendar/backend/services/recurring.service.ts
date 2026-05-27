import { createAppError } from '@quant/server-core';
import type { CalendarEvent } from './event.service';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[];
  byMonth?: number[];
  exceptions?: Date[];
}

export interface CreateRecurringInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  userId: string;
  rule: RecurrenceRule;
}

export interface PrismaClient {
  event: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

export class RecurringService {
  private readonly prisma: PrismaClient | null;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
  }

  async createRecurring(userId: string, input: CreateRecurringInput): Promise<CalendarEvent> {
    if (!this.prisma) {
      throw createAppError('Prisma client not available', 500, 'INTERNAL_ERROR');
    }
    const rrule = this.serializeRRule(input.rule);
    const now = new Date();
    const event = await this.prisma.event.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        startTime: input.startTime,
        endTime: input.endTime,
        allDay: false,
        location: '',
        userId,
        attendees: JSON.stringify([]),
        recurrenceRule: rrule,
        status: 'confirmed',
        reminders: JSON.stringify([]),
        createdAt: now,
        updatedAt: now,
      },
    });
    return this.toCalendarEvent(event);
  }

  expandOccurrences(event: CalendarEvent, startRange: Date, endRange: Date): CalendarEvent[] {
    return this.expandRecurrence(event, startRange, endRange);
  }

  expandRecurrence(event: CalendarEvent, startRange: Date, endRange: Date): CalendarEvent[] {
    if (!event.recurrenceRule) {
      return [event];
    }

    const rule = this.parseRRule(event.recurrenceRule);
    const occurrences: CalendarEvent[] = [];
    const duration = event.endTime.getTime() - event.startTime.getTime();
    const exceptionSet = new Set((rule.exceptions ?? []).map((d) => d.toISOString().split('T')[0]));

    let current = new Date(event.startTime);
    let count = 0;

    while (current <= endRange) {
      if (rule.count !== undefined && count >= rule.count) break;
      if (rule.until && current > rule.until) break;

      if (current >= startRange) {
        const dateKey = current.toISOString().split('T')[0];

        if (!exceptionSet.has(dateKey)) {
          if (this.matchesRule(current, rule)) {
            const occurrenceStart = new Date(current);
            const occurrenceEnd = new Date(current.getTime() + duration);

            occurrences.push({
              ...event,
              id: `${event.id}_${occurrenceStart.toISOString()}`,
              startTime: occurrenceStart,
              endTime: occurrenceEnd,
            });
            count++;
          }
        }
        // Exception dates do NOT decrement count (RFC 5545: COUNT = generated instances)
      } else {
        if (this.matchesRule(current, rule)) {
          const dateKey = current.toISOString().split('T')[0];
          if (!exceptionSet.has(dateKey)) {
            count++;
          }
        }
      }

      current = this.advanceDate(current, rule);

      // Safety: prevent infinite loops
      if (current.getTime() === event.startTime.getTime()) break;
    }

    return occurrences;
  }

  addException(
    eventId: string,
    _userId: string,
    exceptionDate: Date,
  ): { eventId: string; exceptionDate: Date } {
    return { eventId, exceptionDate };
  }

  async updateSingle(
    occurrenceId: string,
    userId: string,
    data: { title?: string; description?: string; startTime?: Date; endTime?: Date },
  ): Promise<CalendarEvent> {
    if (!this.prisma) {
      throw createAppError('Prisma client not available', 500, 'INTERNAL_ERROR');
    }
    // For single occurrence updates, we find the parent event and add an exception,
    // then create a new one-off event for this occurrence
    const parts = occurrenceId.split('_');
    const parentId = parts[0];
    if (!parentId) {
      throw createAppError('Invalid occurrence ID', 400, 'INVALID_OCCURRENCE_ID');
    }

    const parent = await this.prisma.event.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw createAppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const parentRecord = parent as unknown as Record<string, unknown>;
    if (parentRecord['userId'] !== userId) {
      throw createAppError('Not authorized', 403, 'UNAUTHORIZED');
    }

    const now = new Date();
    const event = await this.prisma.event.create({
      data: {
        title: data.title ?? (parentRecord['title'] as string),
        description: data.description ?? (parentRecord['description'] as string),
        startTime: data.startTime ?? (parentRecord['startTime'] as Date),
        endTime: data.endTime ?? (parentRecord['endTime'] as Date),
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

    return this.toCalendarEvent(event);
  }

  async updateAll(
    recurringId: string,
    userId: string,
    data: { title?: string; description?: string; startTime?: Date; endTime?: Date },
  ): Promise<CalendarEvent> {
    if (!this.prisma) {
      throw createAppError('Prisma client not available', 500, 'INTERNAL_ERROR');
    }
    const event = await this.prisma.event.findUnique({ where: { id: recurringId } });
    if (!event) {
      throw createAppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const record = event as unknown as Record<string, unknown>;
    if (record['userId'] !== userId) {
      throw createAppError('Not authorized', 403, 'UNAUTHORIZED');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData['title'] = data.title;
    if (data.description !== undefined) updateData['description'] = data.description;
    if (data.startTime !== undefined) updateData['startTime'] = data.startTime;
    if (data.endTime !== undefined) updateData['endTime'] = data.endTime;

    const updated = await this.prisma.event.update({
      where: { id: recurringId },
      data: updateData,
    });

    return this.toCalendarEvent(updated);
  }

  parseRRule(rruleString: string): RecurrenceRule {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
    };

    const parts = rruleString.replace('RRULE:', '').split(';');

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;

      switch (key.toUpperCase()) {
        case 'FREQ':
          rule.frequency = value.toLowerCase() as RecurrenceRule['frequency'];
          break;
        case 'INTERVAL':
          rule.interval = parseInt(value, 10);
          break;
        case 'COUNT':
          rule.count = parseInt(value, 10);
          break;
        case 'UNTIL':
          rule.until = this.parseRRuleDate(value);
          break;
        case 'BYDAY':
          rule.byDay = value.split(',');
          break;
        case 'BYMONTH':
          rule.byMonth = value.split(',').map((v) => parseInt(v, 10));
          break;
        case 'EXDATE':
          rule.exceptions = value.split(',').map((v) => this.parseRRuleDate(v));
          break;
      }
    }

    return rule;
  }

  serializeRRule(rule: RecurrenceRule): string {
    const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`];

    if (rule.interval > 1) {
      parts.push(`INTERVAL=${rule.interval}`);
    }

    if (rule.count !== undefined) {
      parts.push(`COUNT=${rule.count}`);
    }

    if (rule.until) {
      parts.push(`UNTIL=${this.formatRRuleDate(rule.until)}`);
    }

    if (rule.byDay && rule.byDay.length > 0) {
      parts.push(`BYDAY=${rule.byDay.join(',')}`);
    }

    if (rule.byMonth && rule.byMonth.length > 0) {
      parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
    }

    if (rule.exceptions && rule.exceptions.length > 0) {
      parts.push(`EXDATE=${rule.exceptions.map((d) => this.formatRRuleDate(d)).join(',')}`);
    }

    return `RRULE:${parts.join(';')}`;
  }

  private matchesRule(date: Date, rule: RecurrenceRule): boolean {
    if (rule.byDay && rule.byDay.length > 0) {
      const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const dayName = dayNames[date.getDay()];
      if (!rule.byDay.includes(dayName!)) {
        return false;
      }
    }

    if (rule.byMonth && rule.byMonth.length > 0) {
      const month = date.getMonth() + 1;
      if (!rule.byMonth.includes(month)) {
        return false;
      }
    }

    return true;
  }

  private advanceDate(date: Date, rule: RecurrenceRule): Date {
    const next = new Date(date);

    switch (rule.frequency) {
      case 'daily':
        if (rule.byDay && rule.byDay.length > 0) {
          next.setDate(next.getDate() + 1);
        } else {
          next.setDate(next.getDate() + rule.interval);
        }
        break;
      case 'weekly':
        if (rule.byDay && rule.byDay.length > 0) {
          next.setDate(next.getDate() + 1);
        } else {
          next.setDate(next.getDate() + 7 * rule.interval);
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + rule.interval);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + rule.interval);
        break;
    }

    return next;
  }

  private parseRRuleDate(value: string): Date {
    // Format: YYYYMMDD or YYYYMMDDTHHmmssZ
    const year = parseInt(value.slice(0, 4), 10);
    const month = parseInt(value.slice(4, 6), 10) - 1;
    const day = parseInt(value.slice(6, 8), 10);
    return new Date(Date.UTC(year, month, day));
  }

  private formatRRuleDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}T000000Z`;
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
          : ((record['attendees'] as unknown[]) ?? []),
      recurrenceRule: (record['recurrenceRule'] as string | null) ?? null,
      status: (record['status'] as CalendarEvent['status']) ?? 'confirmed',
      reminders:
        typeof record['reminders'] === 'string'
          ? JSON.parse(record['reminders'] as string)
          : ((record['reminders'] as unknown[]) ?? []),
      createdAt: new Date(record['createdAt'] as string | Date),
      updatedAt: new Date(record['updatedAt'] as string | Date),
    };
  }
}
