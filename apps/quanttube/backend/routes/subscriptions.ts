import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import { ChannelSubscriptionService } from '../services/subscription.service';

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

function service(fastify: FastifyInstance): ChannelSubscriptionService {
  const prisma = (fastify as unknown as { prisma: unknown }).prisma;
  return new ChannelSubscriptionService(prisma as never);
}

export default async function subscriptionsRoutes(fastify: FastifyInstance) {
  // The caller's subscription feed (channels they follow).
  fastify.get('/', async (request, reply) => {
    const userId = requireUserId(request);
    const data = await service(fastify).listSubscriptions(userId);
    return reply.send({ success: true, data });
  });

  fastify.get<{ Params: { channelId: string } }>(
    '/channels/:channelId/status',
    async (request, reply) => {
      const userId = requireUserId(request);
      const subscribed = await service(fastify).isSubscribed(userId, request.params.channelId);
      return reply.send({ success: true, data: { subscribed } });
    },
  );

  fastify.post<{ Params: { channelId: string } }>(
    '/channels/:channelId/subscribe',
    async (request, reply) => {
      const userId = requireUserId(request);
      const result = await service(fastify).subscribe(userId, request.params.channelId);
      return reply.send({ success: true, data: result });
    },
  );

  fastify.delete<{ Params: { channelId: string } }>(
    '/channels/:channelId/subscribe',
    async (request, reply) => {
      const userId = requireUserId(request);
      const result = await service(fastify).unsubscribe(userId, request.params.channelId);
      return reply.send({ success: true, data: result });
    },
  );
}
