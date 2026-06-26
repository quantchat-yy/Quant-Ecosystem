// ============================================================================
// QuantCalendar - Call-style Alarm Service
// ============================================================================
//
// The vision: a calendar event can carry a "call" reminder so that when it
// fires the QuantMail/QuantCalendar client RINGS like an incoming call (and the
// user "answers" to be told what it is). This service is the authoritative,
// STATELESS computation of which call-style alarms are due right now, derived
// purely from an event's start time + its `call` reminders. The client polls
// `GET /events/alarms/due`, rings for each due alarm, and dismisses locally.
//
// Pure functions over CalendarEvent[] — no I/O, fully unit-testable.

import type { CalendarEvent } from './event.service';

export interface DueAlarm {
  eventId: string;
  title: string;
  startTime: string;
  /** When this alarm started firing (startTime - minutesBefore). */
  fireAt: string;
  /** Whole minutes until the event starts (negative if already started). */
  minutesUntilStart: number;
}

/**
 * How long after an alarm's fire time it keeps ringing if unanswered, in
 * seconds. Keeps the alarm "due" briefly so a 30s client poll can't miss it.
 */
const DEFAULT_RING_WINDOW_SEC = 120;

export class AlarmService {
  constructor(private readonly ringWindowSec: number = DEFAULT_RING_WINDOW_SEC) {}

  /**
   * The call-style alarms that are firing at `now`. An event contributes an
   * alarm for each `call` reminder whose fire time (start - minutesBefore) has
   * passed but is still within the ring window. Confirmed/tentative events only
   * (cancelled events never ring). Deduped to the earliest fireAt per event.
   */
  getDueCallAlarms(events: CalendarEvent[], now: Date = new Date()): DueAlarm[] {
    const nowMs = now.getTime();
    const ringMs = this.ringWindowSec * 1000;
    const due: DueAlarm[] = [];

    for (const event of events) {
      if (event.status === 'cancelled') continue;
      const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const startMs = start.getTime();
      if (!Number.isFinite(startMs)) continue;

      let earliestFireMs: number | null = null;
      for (const reminder of event.reminders ?? []) {
        if (reminder.type !== 'call') continue;
        const minutesBefore = Math.max(0, Number(reminder.minutesBefore) || 0);
        const fireMs = startMs - minutesBefore * 60_000;
        // Due when the fire time has passed and we're still within the ring
        // window measured from that fire time.
        if (nowMs >= fireMs && nowMs <= fireMs + ringMs) {
          if (earliestFireMs === null || fireMs < earliestFireMs) {
            earliestFireMs = fireMs;
          }
        }
      }

      if (earliestFireMs !== null) {
        due.push({
          eventId: event.id,
          title: event.title,
          startTime: start.toISOString(),
          fireAt: new Date(earliestFireMs).toISOString(),
          minutesUntilStart: Math.round((startMs - nowMs) / 60_000),
        });
      }
    }

    due.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
    return due;
  }

  /**
   * The widest event window the route needs to fetch to find due alarms at
   * `now`: from `now - ringWindow` (alarms that fired moments ago and are still
   * ringing) up to `now + maxLookaheadMinutes` (call reminders set far ahead).
   */
  fetchWindow(now: Date, maxLookaheadMinutes = 24 * 60): { start: Date; end: Date } {
    return {
      start: new Date(now.getTime() - this.ringWindowSec * 1000),
      end: new Date(now.getTime() + maxLookaheadMinutes * 60_000),
    };
  }
}
