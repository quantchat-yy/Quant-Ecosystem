import { describe, it, expect } from 'vitest';
import { AlarmService } from '../services/alarm.service';
import type { CalendarEvent } from '../services/event.service';

function evt(partial: Partial<CalendarEvent> & { id: string; startTime: Date }): CalendarEvent {
  return {
    id: partial.id,
    title: partial.title ?? 'Event',
    description: '',
    startTime: partial.startTime,
    endTime: partial.endTime ?? new Date(partial.startTime.getTime() + 30 * 60_000),
    allDay: false,
    location: '',
    userId: 'u1',
    attendees: [],
    recurrenceRule: null,
    status: partial.status ?? 'confirmed',
    reminders: partial.reminders ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AlarmService.getDueCallAlarms', () => {
  const now = new Date('2026-06-24T15:00:00.000Z');
  const service = new AlarmService(120); // 2-min ring window

  it('fires a call alarm exactly at its fire time (minutesBefore before start)', () => {
    // start 10 min from now, reminder 10 min before => fires now.
    const e = evt({
      id: 'e1',
      startTime: new Date('2026-06-24T15:10:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 10 }],
    });
    const due = service.getDueCallAlarms([e], now);
    expect(due).toHaveLength(1);
    expect(due[0]?.eventId).toBe('e1');
    expect(due[0]?.minutesUntilStart).toBe(10);
  });

  it('does not fire before the fire time', () => {
    // start 30 min out, reminder 10 min before => fires in 20 min, not now.
    const e = evt({
      id: 'e2',
      startTime: new Date('2026-06-24T15:30:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 10 }],
    });
    expect(service.getDueCallAlarms([e], now)).toHaveLength(0);
  });

  it('keeps ringing within the ring window after the fire time', () => {
    // reminder fired 1 min ago (within 2-min window).
    const e = evt({
      id: 'e3',
      startTime: new Date('2026-06-24T15:04:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 5 }], // fireAt 14:59
    });
    expect(service.getDueCallAlarms([e], now)).toHaveLength(1);
  });

  it('stops ringing past the ring window', () => {
    // reminder fired 5 min ago (> 2-min window).
    const e = evt({
      id: 'e4',
      startTime: new Date('2026-06-24T15:50:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 55 }], // fireAt 14:55
    });
    expect(service.getDueCallAlarms([e], now)).toHaveLength(0);
  });

  it('ignores non-call reminders', () => {
    const e = evt({
      id: 'e5',
      startTime: new Date('2026-06-24T15:00:00.000Z'),
      reminders: [{ type: 'push', minutesBefore: 0 }],
    });
    expect(service.getDueCallAlarms([e], now)).toHaveLength(0);
  });

  it('never rings cancelled events', () => {
    const e = evt({
      id: 'e6',
      startTime: new Date('2026-06-24T15:00:00.000Z'),
      status: 'cancelled',
      reminders: [{ type: 'call', minutesBefore: 0 }],
    });
    expect(service.getDueCallAlarms([e], now)).toHaveLength(0);
  });

  it('sorts due alarms by earliest fire time', () => {
    const a = evt({
      id: 'a',
      startTime: new Date('2026-06-24T15:01:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 1 }], // fireAt 15:00
    });
    const b = evt({
      id: 'b',
      startTime: new Date('2026-06-24T15:05:00.000Z'),
      reminders: [{ type: 'call', minutesBefore: 6 }], // fireAt 14:59
    });
    const due = service.getDueCallAlarms([a, b], now);
    expect(due.map((d) => d.eventId)).toEqual(['b', 'a']);
  });
});

describe('AlarmService.fetchWindow', () => {
  it('spans from now-ringWindow to now+lookahead', () => {
    const now = new Date('2026-06-24T15:00:00.000Z');
    const { start, end } = new AlarmService(120).fetchWindow(now, 60);
    expect(start.toISOString()).toBe('2026-06-24T14:58:00.000Z');
    expect(end.toISOString()).toBe('2026-06-24T16:00:00.000Z');
  });
});
