import { describe, it, expect, beforeEach } from 'vitest';
import { RecurringService } from '../services/recurring.service';
import type { CalendarEvent } from '../services/event.service';

function createTestEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    title: 'Recurring Meeting',
    description: '',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T11:00:00Z'),
    allDay: false,
    location: '',
    userId: 'user-1',
    attendees: [],
    recurrenceRule: null,
    status: 'confirmed',
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RecurringService', () => {
  let service: RecurringService;

  beforeEach(() => {
    service = new RecurringService();
  });

  describe('daily recurrence', () => {
    it('expands daily recurrence for 7 days', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-07T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(7);
      expect(occurrences[0]!.startTime).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(occurrences[6]!.startTime).toEqual(new Date('2024-01-07T10:00:00Z'));
    });

    it('handles interval > 1', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;INTERVAL=2',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-07T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(4); // Jan 1, 3, 5, 7
      expect(occurrences[0]!.startTime).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(occurrences[1]!.startTime).toEqual(new Date('2024-01-03T10:00:00Z'));
    });
  });

  describe('weekly recurrence', () => {
    it('expands weekly recurrence with byDay', () => {
      const event = createTestEvent({
        startTime: new Date('2024-01-01T10:00:00Z'), // Monday
        endTime: new Date('2024-01-01T11:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-07T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(3); // Mon, Wed, Fri
    });

    it('expands weekly recurrence without byDay', () => {
      const event = createTestEvent({
        startTime: new Date('2024-01-01T10:00:00Z'), // Monday
        endTime: new Date('2024-01-01T11:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=WEEKLY',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-21T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(3); // Jan 1, 8, 15
    });
  });

  describe('monthly recurrence', () => {
    it('expands monthly recurrence', () => {
      const event = createTestEvent({
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=MONTHLY',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-04-30T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(4); // Jan, Feb, Mar, Apr
      expect(occurrences[1]!.startTime).toEqual(new Date('2024-02-15T10:00:00Z'));
    });
  });

  describe('yearly recurrence', () => {
    it('expands yearly recurrence', () => {
      const event = createTestEvent({
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        recurrenceRule: 'RRULE:FREQ=YEARLY',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2026-12-31T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(3); // 2024, 2025, 2026
      expect(occurrences[1]!.startTime).toEqual(new Date('2025-01-15T10:00:00Z'));
    });
  });

  describe('recurrence with count limit', () => {
    it('stops after count is reached', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;COUNT=3',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-10T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(3);
    });
  });

  describe('recurrence with until date', () => {
    it('stops at until date', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;UNTIL=20240105T000000Z',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-10T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      expect(occurrences).toHaveLength(4); // Jan 1, 2, 3, 4 (until Jan 5 midnight means up to Jan 4 10:00)
    });
  });

  describe('exceptions', () => {
    it('skips exception dates during expansion', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;EXDATE=20240103T000000Z',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-05T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      // 5 days minus 1 exception = 4 occurrences
      expect(occurrences).toHaveLength(4);
      const dates = occurrences.map((o) => o.startTime.toISOString().split('T')[0]);
      expect(dates).not.toContain('2024-01-03');
      expect(dates).toContain('2024-01-01');
      expect(dates).toContain('2024-01-02');
      expect(dates).toContain('2024-01-04');
      expect(dates).toContain('2024-01-05');
    });

    it('exceptions do not consume COUNT (RFC 5545)', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;COUNT=5;EXDATE=20240103T000000Z',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-10T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      // COUNT=5 means 5 generated instances; the exception does not decrement count
      expect(occurrences).toHaveLength(5);
      const dates = occurrences.map((o) => o.startTime.toISOString().split('T')[0]);
      expect(dates).not.toContain('2024-01-03');
      // Should be: Jan 1, 2, 4, 5, 6
      expect(dates).toContain('2024-01-01');
      expect(dates).toContain('2024-01-02');
      expect(dates).toContain('2024-01-04');
      expect(dates).toContain('2024-01-05');
      expect(dates).toContain('2024-01-06');
    });

    it('handles multiple exception dates', () => {
      const event = createTestEvent({
        recurrenceRule: 'RRULE:FREQ=DAILY;EXDATE=20240102T000000Z,20240104T000000Z',
      });

      const startRange = new Date('2024-01-01T00:00:00Z');
      const endRange = new Date('2024-01-05T23:59:59Z');

      const occurrences = service.expandRecurrence(event, startRange, endRange);

      // 5 days minus 2 exceptions = 3 occurrences
      expect(occurrences).toHaveLength(3);
      const dates = occurrences.map((o) => o.startTime.toISOString().split('T')[0]);
      expect(dates).not.toContain('2024-01-02');
      expect(dates).not.toContain('2024-01-04');
    });

    it('serializes and parses EXDATE correctly', () => {
      const rule = service.parseRRule('RRULE:FREQ=DAILY;EXDATE=20240103T000000Z,20240105T000000Z');

      expect(rule.exceptions).toHaveLength(2);
      expect(rule.exceptions![0]!.toISOString().split('T')[0]).toBe('2024-01-03');
      expect(rule.exceptions![1]!.toISOString().split('T')[0]).toBe('2024-01-05');

      const serialized = service.serializeRRule(rule);
      expect(serialized).toContain('EXDATE=');
      expect(serialized).toContain('20240103T000000Z');
      expect(serialized).toContain('20240105T000000Z');
    });
  });

  describe('parseRRule and serializeRRule', () => {
    it('parses and serializes RRULE string correctly', () => {
      const rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE';
      const parsed = service.parseRRule(rrule);

      expect(parsed.frequency).toBe('weekly');
      expect(parsed.interval).toBe(2);
      expect(parsed.byDay).toEqual(['MO', 'WE']);

      const serialized = service.serializeRRule(parsed);
      expect(serialized).toContain('FREQ=WEEKLY');
      expect(serialized).toContain('INTERVAL=2');
      expect(serialized).toContain('BYDAY=MO,WE');
    });
  });
});
