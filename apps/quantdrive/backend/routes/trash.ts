import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { TrashService } from '../services/trash.service';

const fileIdParamsSchema = z.object({
  fileId: z.string().min(1),
});

export default async function trashRoutes(fastify: FastifyInstance) {
  // GET / - List files currently in trash
  fastify.get('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new TrashService(prisma as never);
    const files = await service.listTrash(userId);

    return reply.send({ success: true, data: files });
  });

  // POST /:fileId - Move a file to trash (soft delete)
  fastify.post<{ Params: { fileId: string } }>('/:fileId', async (request, reply) => {
    const parseResult = fileIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new TrashService(prisma as never);
    const file = await service.moveToTrash(parseResult.data.fileId, userId);

    return reply.send({ success: true, data: file });
  });

  // POST /:fileId/restore - Restore a file from trash
  fastify.post<{ Params: { fileId: string } }>('/:fileId/restore', async (request, reply) => {
    const parseResult = fileIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new TrashService(prisma as never);
    const file = await service.restoreFromTrash(parseResult.data.fileId, userId);

    return reply.send({ success: true, data: file });
  });

  // DELETE / - Empty the trash (permanently delete all trashed files)
  fastify.delete('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new TrashService(prisma as never);
    const purged = await service.emptyTrash(userId);

    return reply.send({ success: true, data: { purged } });
  });
}
