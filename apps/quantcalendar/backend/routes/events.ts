import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { EventService } from '../services/event.service';

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  attendees: z
    .array(
      z.object({
        userId: z.string(),
        email: z.string(),
        name: z.string(),
        status: z.enum(['accepted', 'declined', 'tentative', 'pending']),
      }),
    )
    .optional(),
  recurrenceRule: z.string().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  reminders: z
    .array(
      z.object({
        type: z.enum(['email', 'push', 'sms']),
        minutesBefore: z.number(),
      }),
    )
    .optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().optional(),
  recurrenceRule: z.string().nullable().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  reminders: z
    .array(
      z.object({
        type: z.enum(['email', 'push', 'sms']),
        minutesBefore: z.number(),
      }),
    )
    .optional(),
});

const addAttendeeSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  status: z.enum(['accepted', 'declined', 'tentative', 'pending']),
});

const updateAttendeeStatusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'tentative', 'pending']),
});

export default async function eventsRoutes(fastify: FastifyInstance) {
  // POST / - Create event
  fastify.post('/', async (request, reply) => {
    const parseResult = createEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const event = await service.createEvent({
      ...parseResult.data,
      startTime: new Date(parseResult.data.startTime),
      endTime: new Date(parseResult.data.endTime),
      userId,
    });

    return reply.status(201).send({ success: true, data: event });
  });

  // GET / - List events
  fastify.get('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const query = request.query as { start?: string; end?: string };
    const start = query.start ? new Date(query.start) : new Date();
    const end = query.end ? new Date(query.end) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const events = await service.listEvents(userId, start, end);

    return reply.send({ success: true, data: events });
  });

  // GET /:id - Get event
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const event = await service.getEvent(request.params.id, userId);

    return reply.send({ success: true, data: event });
  });

  // PUT /:id - Update event
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parseResult = updateEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const input: Record<string, unknown> = {};
    if (parseResult.data.title !== undefined) input['title'] = parseResult.data.title;
    if (parseResult.data.description !== undefined)
      input['description'] = parseResult.data.description;
    if (parseResult.data.startTime !== undefined)
      input['startTime'] = new Date(parseResult.data.startTime);
    if (parseResult.data.endTime !== undefined)
      input['endTime'] = new Date(parseResult.data.endTime);
    if (parseResult.data.allDay !== undefined) input['allDay'] = parseResult.data.allDay;
    if (parseResult.data.location !== undefined) input['location'] = parseResult.data.location;
    if (parseResult.data.recurrenceRule !== undefined)
      input['recurrenceRule'] = parseResult.data.recurrenceRule;
    if (parseResult.data.status !== undefined) input['status'] = parseResult.data.status;
    if (parseResult.data.reminders !== undefined) input['reminders'] = parseResult.data.reminders;

    const event = await service.updateEvent(request.params.id, userId, input as never);

    return reply.send({ success: true, data: event });
  });

  // DELETE /:id - Delete event
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const event = await service.deleteEvent(request.params.id, userId);

    return reply.send({ success: true, data: event });
  });

  // POST /:id/attendees - Add attendee
  fastify.post<{ Params: { id: string } }>('/:id/attendees', async (request, reply) => {
    const parseResult = addAttendeeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EventService(prisma as never);

    const event = await service.addAttendee(request.params.id, userId, parseResult.data);

    return reply.send({ success: true, data: event });
  });

  // DELETE /:id/attendees/:attendeeId - Remove attendee
  fastify.delete<{ Params: { id: string; attendeeId: string } }>(
    '/:id/attendees/:attendeeId',
    async (request, reply) => {
      const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
      if (!userId) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const prisma = (fastify as unknown as { prisma: unknown }).prisma;
      const service = new EventService(prisma as never);

      const event = await service.removeAttendee(
        request.params.id,
        userId,
        request.params.attendeeId,
      );

      return reply.send({ success: true, data: event });
    },
  );

  // PATCH /:id/attendees/:attendeeId/status - Update attendee status
  fastify.patch<{ Params: { id: string; attendeeId: string } }>(
    '/:id/attendees/:attendeeId/status',
    async (request, reply) => {
      const parseResult = updateAttendeeStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw parseResult.error;
      }

      const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
      if (!userId) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const prisma = (fastify as unknown as { prisma: unknown }).prisma;
      const service = new EventService(prisma as never);

      const event = await service.updateAttendeeStatus(
        request.params.id,
        request.params.attendeeId,
        userId,
        parseResult.data.status,
      );

      return reply.send({ success: true, data: event });
    },
  );
}
