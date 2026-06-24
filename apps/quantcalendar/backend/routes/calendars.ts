import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CalendarService } from '../services/calendar.service';

// ============================================================================
// QuantCalendar calendars routes (mounted at /calendars).
//
//   GET  /calendars   -> the caller's calendars (auto-provisions Primary)
//   POST /calendars   { name, color? }
// ============================================================================

const createSchema = z.object({
  name: z.string().min(1).max(200),
  color: z.string().max(32).optional(),
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
}
