import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CrossAppDispatcher } from '@quant/notifications';
import { EmailService } from '../services/email.service';
import { OutboundDeliveryPipeline } from '../services/outbound-delivery.service';
import { validateComposeEmail, sanitizeHtml } from '../middleware/validate-email';

const notifier = new CrossAppDispatcher('quantmail');

const composeSchema = z.object({
  toAddresses: z.array(z.string().email()).min(1),
  ccAddresses: z.array(z.string().email()).optional(),
  bccAddresses: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().optional(),
  bodyPlain: z.string().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
  send: z.boolean().optional(),
  sentFolderId: z.string().optional(),
});

const moveSchema = z.object({
  folderId: z.string().min(1),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  folderId: z.string().optional(),
});

const searchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export default async function emailsRoutes(fastify: FastifyInstance) {
  // POST /emails - Compose or send an email
  fastify.post('/', async (request, reply) => {
    const parseResult = composeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    validateComposeEmail({
      toAddresses: parseResult.data.toAddresses,
      ccAddresses: parseResult.data.ccAddresses,
      bccAddresses: parseResult.data.bccAddresses,
      subject: parseResult.data.subject,
      bodyHtml: parseResult.data.bodyHtml,
      bodyPlain: parseResult.data.bodyPlain,
    });

    const sanitizedHtml = parseResult.data.bodyHtml
      ? sanitizeHtml(parseResult.data.bodyHtml)
      : undefined;

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);

    const email = await service.compose({
      userId,
      ...parseResult.data,
      bodyHtml: sanitizedHtml,
    });

    if (parseResult.data.send && parseResult.data.sentFolderId) {
      // Durable, queued outbound delivery: enqueue a real BullMQ job and set
      // the email deliveryStatus to `queued` (Requirements 4.1/4.2).
      const pipeline = new OutboundDeliveryPipeline(
        prisma as never,
        OutboundDeliveryPipeline.createQueue(),
      );
      const sendService = new EmailService(prisma as never, pipeline);
      const sent = await sendService.send(userId, email.id, parseResult.data.sentFolderId);

      // Notify recipients about the new email
      try {
        notifier.notifyNewEmail(
          parseResult.data.toAddresses,
          userId,
          parseResult.data.subject,
          email.id,
        );
      } catch {
        /* notification failure should not block email sending */
      }

      return reply.status(201).send({ success: true, data: sent });
    }

    return reply.status(201).send({ success: true, data: email });
  });

  // GET /emails - List emails (requires folderId or search)
  fastify.get('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const q = (request.query ?? {}) as Record<string, string>;
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || q.limit) || 50));
    const skip = (page - 1) * pageSize;

    const prisma = (fastify as unknown as { prisma: any }).prisma;
    const where: any = { userId, deletedAt: null };
    if (q.folderId) where.folderId = q.folderId;

    const [data, total, unreadCount] = await Promise.all([
      prisma.email.findMany({ where, skip, take: pageSize, orderBy: { receivedAt: 'desc' } }),
      prisma.email.count({ where }),
      prisma.email.count({ where: { ...where, isRead: false } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Augment each email with a category (used by inbox tabs) and return a
    // shape that satisfies both consumers: useInbox reads response.data (the
    // array), useEmail reads response.emails.
    const items = data.map((e: any) => ({ ...e, category: e.aiCategory || 'primary' }));
    return reply.send({
      success: true,
      data: items,
      emails: items,
      page,
      pageSize,
      totalPages,
      totalCount: total,
      unreadCount,
    });
  });

  // GET /emails/search
  fastify.get('/search', async (request, reply) => {
    const queryResult = searchSchema.safeParse(request.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);

    const result = await service.search(userId, queryResult.data.q, {
      page: queryResult.data.page,
      pageSize: queryResult.data.pageSize,
    });

    return reply.send({ success: true, data: result });
  });

  // GET /emails/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);
    const email = await service.getEmail(request.params.id, userId);

    return reply.send({ success: true, data: email });
  });

  // DELETE /emails/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);
    const email = await service.delete(request.params.id, userId);

    return reply.send({ success: true, data: email });
  });

  // POST /emails/:id/read
  fastify.post<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);
    const email = await service.markRead(request.params.id, userId);

    return reply.send({ success: true, data: email });
  });

  // POST /emails/:id/star
  fastify.post<{ Params: { id: string } }>('/:id/star', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);
    const email = await service.markStarred(request.params.id, userId);

    return reply.send({ success: true, data: email });
  });

  // POST /emails/:id/move
  fastify.post<{ Params: { id: string } }>('/:id/move', async (request, reply) => {
    const parseResult = moveSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new EmailService(prisma as never);
    const email = await service.moveToFolder(request.params.id, parseResult.data.folderId, userId);

    return reply.send({ success: true, data: email });
  });
}
