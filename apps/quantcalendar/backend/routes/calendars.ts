import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CalendarService } from '../services/calendar.service';

// ============================================================================
// QuantCalendar calendars routes (mounted at /calendars).
//
//   GET  /calendars   -> the caller's calendars (auto-provisions Primary)
//   POST /calendars   { name, color? }
//   PUT    /calendars/:id          { name?, color? }   rename / recolor
//   DELETE /calendars/:id                              delete (not primary)
//   POST   /calendars/:id/primary                      make primary
// ============================================================================

const createSchema = z.object({
  name: z.string().min(1).max(200),
  color: z.string().max(32).optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    color: z.string().max(32).optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: 'At least one of name or color must be provided',
  });

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

export default async function calendarsRoutes(fastify: FastifyInstance) {
  function service(): CalendarService {
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    return new CalendarService(prisma as never);
  }

  fastify.get('/', async (request, reply) => {
    const userId = requireUserId(request);
    return reply.send({ success: true, data: await service().listCalendars(userId) });
  });

  fastify.post('/', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const calendar = await service().createCalendar(userId, parsed.data);
    return reply.status(201).send({ success: true, data: calendar });
  });

  fastify.put('/:id', async (request, reply) => {
    const userId = requireUserId(request);
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const calendar = await service().updateCalendar(userId, id, parsed.data);
    return reply.send({ success: true, data: calendar });
  });

  fastify.delete('/:id', async (request, reply) => {
    const userId = requireUserId(request);
    const { id } = request.params as { id: string };
    const result = await service().deleteCalendar(userId, id);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/:id/primary', async (request, reply) => {
    const userId = requireUserId(request);
    const { id } = request.params as { id: string };
    const calendar = await service().setPrimary(userId, id);
    return reply.send({ success: true, data: calendar });
  });
}
