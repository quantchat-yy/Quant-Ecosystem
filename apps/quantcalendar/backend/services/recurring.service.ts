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

export class RecurringService {
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
    userId: string,
    exceptionDate: Date,
  ): { eventId: string; exceptionDate: Date } {
    return { eventId, exceptionDate };
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
          // Advance one day at a time when byDay is specified
          next.setDate(next.getDate() + 1);
        } else {
          next.setDate(next.getDate() + rule.interval);
        }
        break;
      case 'weekly':
        if (rule.byDay && rule.byDay.length > 0) {
          // Advance one day at a time to find next matching day
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
}
