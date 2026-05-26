import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { BookingLinkService } from '../services/booking-link.service';

const createBookingLinkSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  duration: z.number().min(5).max(480),
  availableDays: z.array(z.number().min(0).max(6)).optional(),
  startHour: z.number().min(0).max(23).optional(),
  endHour: z.number().min(1).max(24).optional(),
});

const confirmBookingSchema = z.object({
  slot: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  notes: z.string().optional(),
});

export default async function bookingRoutes(fastify: FastifyInstance) {
  // POST /links - Create booking link
  fastify.post('/links', async (request, reply) => {
    const parseResult = createBookingLinkSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new BookingLinkService(prisma as never);

    const link = await service.createBookingLink({
      ...parseResult.data,
      userId,
    });

    return reply.status(201).send({ success: true, data: link });
  });

  // GET /links/:slug - Get booking link info
  fastify.get<{ Params: { slug: string } }>('/links/:slug', async (request, reply) => {
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new BookingLinkService(prisma as never);

    const link = await service.getBookingLink(request.params.slug);

    return reply.send({ success: true, data: link });
  });

  // GET /links/:slug/slots - Get available slots
  fastify.get<{ Params: { slug: string } }>('/links/:slug/slots', async (request, reply) => {
    const query = request.query as { date?: string };
    if (!query.date) {
      throw createAppError('Date query parameter is required', 400, 'VALIDATION_FAILED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new BookingLinkService(prisma as never);

    const slots = await service.getAvailableSlots(request.params.slug, new Date(query.date));

    return reply.send({ success: true, data: slots });
  });

  // POST /links/:slug/book - Confirm booking
  fastify.post<{ Params: { slug: string } }>('/links/:slug/book', async (request, reply) => {
    const parseResult = confirmBookingSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new BookingLinkService(prisma as never);

    const event = await service.confirmBooking(
      request.params.slug,
      new Date(parseResult.data.slot),
      {
        name: parseResult.data.name,
        email: parseResult.data.email,
        notes: parseResult.data.notes,
      },
    );

    return reply.status(201).send({ success: true, data: event });
  });
}
