import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { EventService, type Attendee } from '../services/event.service';
import { AlarmService } from '../services/alarm.service';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string(),
  endTime: z.string(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recurrenceRule: z.string().optional(),
  reminders: z
    .array(
      z.object({
        type: z.enum(['email', 'push', 'sms', 'call']),
        minutesBefore: z.number().int().min(0).max(40320),
      }),
    )
    .optional(),
});

const listSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

function toAttendees(emails?: string[]): Attendee[] {
  return (emails ?? []).map((email) => ({
    userId: '',
    email,
    name: email,
    status: 'pending' as const,
  }));
}

export default async function eventsRoutes(fastify: FastifyInstance) {
  function service(): EventService {
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    return new EventService(prisma as never);
  }

  // POST /events - create
  fastify.post('/', async (request, reply) => {
    const parsed = createEventSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const event = await service().createEvent({
      title: parsed.data.title,
      description: parsed.data.description,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      allDay: parsed.data.allDay,
      location: parsed.data.location,
      userId,
      attendees: toAttendees(parsed.data.attendees),
      recurrenceRule: parsed.data.recurrenceRule,
      reminders: parsed.data.reminders,
    });

    return reply.status(201).send({ success: true, data: event });
  });

  // GET /events?start=&end= - list within a window (defaults to +/- 1 year)
  fastify.get('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      throw parsed.error;
    }
    const now = Date.now();
    const start = parsed.data.start
      ? new Date(parsed.data.start)
      : new Date(now - 365 * 24 * 60 * 60 * 1000);
    const end = parsed.data.end
      ? new Date(parsed.data.end)
      : new Date(now + 365 * 24 * 60 * 60 * 1000);

    const events = await service().listEventsInRange(userId, start, end);
    return reply.send({ success: true, data: events });
  });

  // GET /events/alarms/due — the call-style alarms firing right now for the
  // caller. The client polls this and rings (like an incoming call) for each.
  fastify.get('/alarms/due', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const alarms = new AlarmService();
    const now = new Date();
    const { start, end } = alarms.fetchWindow(now);
    const events = await service().listEventsInRange(userId, start, end);
    const due = alarms.getDueCallAlarms(events, now);
    return reply.send({ success: true, data: due });
  });
}
