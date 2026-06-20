import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { PromptTemplateService } from '../services/prompt-template.service';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100000),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(100000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isFavorite: z.boolean().optional(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  favorites: z.enum(['true', 'false']).optional(),
});

function getUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

/**
 * Prompt library routes (mounted under /prompts). Persisted, per-user prompt
 * templates backed by PromptTemplateService -> AiPromptTemplate.
 */
export default async function promptTemplateRoutes(fastify: FastifyInstance) {
  function getService(): PromptTemplateService {
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    return new PromptTemplateService(prisma as never);
  }

  // GET /prompts - list (with optional search/category/favorites filters)
  fastify.get('/', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) throw parsed.error;
    const userId = getUserId(request);
    const data = await getService().list(userId, {
      search: parsed.data.search,
      category: parsed.data.category,
      favoritesOnly: parsed.data.favorites === 'true',
    });
    return reply.send({ success: true, data });
  });

  // GET /prompts/categories - distinct categories for the current user
  fastify.get('/categories', async (request, reply) => {
    const userId = getUserId(request);
    const data = await getService().getCategories(userId);
    return reply.send({ success: true, data });
  });

  // POST /prompts - create a new template
  fastify.post('/', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const userId = getUserId(request);
    const data = await getService().create(userId, parsed.data);
    return reply.status(201).send({ success: true, data });
  });

  // PUT /prompts/:id - update fields
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const userId = getUserId(request);
    const data = await getService().update(request.params.id, userId, parsed.data);
    return reply.send({ success: true, data });
  });

  // POST /prompts/:id/favorite - toggle favorite
  fastify.post<{ Params: { id: string } }>('/:id/favorite', async (request, reply) => {
    const userId = getUserId(request);
    const data = await getService().toggleFavorite(request.params.id, userId);
    return reply.send({ success: true, data });
  });

  // POST /prompts/:id/use - record a usage (increments usageCount)
  fastify.post<{ Params: { id: string } }>('/:id/use', async (request, reply) => {
    const userId = getUserId(request);
    const data = await getService().recordUsage(request.params.id, userId);
    return reply.send({ success: true, data });
  });

  // DELETE /prompts/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = getUserId(request);
    await getService().delete(request.params.id, userId);
    return reply.send({ success: true });
  });
}
