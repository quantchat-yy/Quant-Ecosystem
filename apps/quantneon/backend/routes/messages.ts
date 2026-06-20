import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { MessageService } from '../services/message.service';

const startSchema = z.object({ userId: z.string().min(1) });
const sendSchema = z.object({ text: z.string().min(1).max(4000) });
const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function requireUserId(request: FastifyRequest): string {
  const userId = (request as unknown as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

export default async function messagesRoutes(fastify: FastifyInstance) {
  const service = () => new MessageService((fastify as unknown as { prisma: never }).prisma);

  // GET /messages/conversations — the viewer's DM threads.
  fastify.get('/conversations', async (request, reply) => {
    const userId = requireUserId(request);
    const conversations = await service().listConversations(userId);
    return reply.send({ success: true, data: { conversations } });
  });

  // POST /messages/conversations — open (or reuse) a 1:1 DM with another user.
  fastify.post('/conversations', async (request, reply) => {
    const parsed = startSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const userId = requireUserId(request);
    const result = await service().getOrCreateDirect(userId, parsed.data.userId);
    return reply.status(201).send({ success: true, data: result });
  });

  // GET /messages/conversations/:id/messages — paginated thread (chronological).
  fastify.get<{ Params: { id: string } }>('/conversations/:id/messages', async (request, reply) => {
    const parsed = pageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw parsed.error;
    }
    const userId = requireUserId(request);
    const result = await service().getMessages(request.params.id, userId, parsed.data);
    return reply.send({ success: true, data: result });
  });

  // POST /messages/conversations/:id/messages — send a message.
  fastify.post<{ Params: { id: string } }>(
    '/conversations/:id/messages',
    async (request, reply) => {
      const parsed = sendSchema.safeParse(request.body);
      if (!parsed.success) {
        throw parsed.error;
      }
      const userId = requireUserId(request);
      const message = await service().sendMessage(request.params.id, userId, parsed.data.text);
      return reply.status(201).send({ success: true, data: { message } });
    },
  );

  // POST /messages/conversations/:id/read — mark the thread read for the viewer.
  fastify.post<{ Params: { id: string } }>('/conversations/:id/read', async (request, reply) => {
    const userId = requireUserId(request);
    const result = await service().markRead(request.params.id, userId);
    return reply.send({ success: true, data: result });
  });
}
