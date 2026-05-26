import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { ShareService } from '../services/share.service';

const createShareSchema = z.object({
  fileId: z.string().optional(),
  folderId: z.string().optional(),
  sharedWithUserId: z.string().min(1),
  encryptedFileKey: z.string().min(1),
  permission: z.enum(['read', 'write']),
});

export default async function sharingRoutes(fastify: FastifyInstance) {
  // POST / - Share file or folder
  fastify.post('/', async (request, reply) => {
    const parseResult = createShareSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new ShareService(prisma as never);

    if (parseResult.data.folderId) {
      const share = await service.shareFolder({
        folderId: parseResult.data.folderId,
        ownerUserId: userId,
        sharedWithUserId: parseResult.data.sharedWithUserId,
        encryptedFileKey: parseResult.data.encryptedFileKey,
        permission: parseResult.data.permission,
      });
      return reply.status(201).send({ success: true, data: share });
    }

    if (parseResult.data.fileId) {
      const share = await service.shareFile({
        fileId: parseResult.data.fileId,
        ownerUserId: userId,
        sharedWithUserId: parseResult.data.sharedWithUserId,
        encryptedFileKey: parseResult.data.encryptedFileKey,
        permission: parseResult.data.permission,
      });
      return reply.status(201).send({ success: true, data: share });
    }

    throw createAppError('Either fileId or folderId is required', 400, 'INVALID_INPUT');
  });

  // GET / - List shares
  fastify.get('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new ShareService(prisma as never);
    const shares = await service.listShares(userId);

    return reply.send({ success: true, data: shares });
  });

  // POST /:id/accept - Accept share
  fastify.post<{ Params: { id: string } }>('/:id/accept', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new ShareService(prisma as never);
    const share = await service.acceptShare(request.params.id, userId);

    return reply.send({ success: true, data: share });
  });

  // DELETE /:id - Revoke share
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new ShareService(prisma as never);
    const share = await service.revokeShare(request.params.id, userId);

    return reply.send({ success: true, data: share });
  });
}
