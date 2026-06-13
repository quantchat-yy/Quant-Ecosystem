import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CommunityService } from '../services/community.service';

const createCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
});

export default async function communitiesRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;
  const communityService = new CommunityService(prisma);

  fastify.post('/', async (request, reply) => {
    const parseResult = createCommunitySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const community = await communityService.createCommunity(userId, parseResult.data);

    return reply.send(community);
  });

  fastify.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;

    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const result = await communityService.joinCommunity(userId, id);
    return reply.send(result);
  });

  fastify.get('/trending', async (request, reply) => {
    const communities = await communityService.getTrendingCommunities();
    return reply.send(communities);
  });
}
