import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { VersionService } from '../services/version.service';

const fileIdParamsSchema = z.object({
  fileId: z.string().min(1),
});

const fileVersionParamsSchema = z.object({
  fileId: z.string().min(1),
  versionId: z.string().min(1),
});

const createVersionSchema = z.object({
  encryptedContent: z.string().min(1),
  encryptionIV: z.string().min(1),
  encryptionAuthTag: z.string().min(1),
  encryptionKey: z.string().min(1),
  size: z.number().int().nonnegative(),
});

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

export default async function versionsRoutes(fastify: FastifyInstance) {
  // GET /:fileId - List all versions for a file (newest first)
  fastify.get<{ Params: { fileId: string } }>('/:fileId', async (request, reply) => {
    const parseResult = fileIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = requireUserId(request);

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new VersionService(prisma as never);
    const versions = await service.listVersions(parseResult.data.fileId, userId);

    return reply.send({ success: true, data: versions });
  });

  // GET /:fileId/:versionId - Get a single version
  fastify.get<{ Params: { fileId: string; versionId: string } }>(
    '/:fileId/:versionId',
    async (request, reply) => {
      const parseResult = fileVersionParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        throw parseResult.error;
      }

      const userId = requireUserId(request);

      const prisma = (fastify as unknown as { prisma: unknown }).prisma;
      const service = new VersionService(prisma as never);
      const version = await service.getVersion(parseResult.data.versionId, userId);

      return reply.send({ success: true, data: version });
    },
  );

  // POST /:fileId - Create a new version of a file
  fastify.post<{ Params: { fileId: string } }>('/:fileId', async (request, reply) => {
    const paramsResult = fileIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      throw paramsResult.error;
    }

    const bodyResult = createVersionSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const userId = requireUserId(request);

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new VersionService(prisma as never);
    const version = await service.createVersion({
      fileId: paramsResult.data.fileId,
      encryptedContent: bodyResult.data.encryptedContent,
      encryptionIV: bodyResult.data.encryptionIV,
      encryptionAuthTag: bodyResult.data.encryptionAuthTag,
      encryptionKey: bodyResult.data.encryptionKey,
      size: bodyResult.data.size,
      userId,
    });

    return reply.status(201).send({ success: true, data: version });
  });

  // POST /:fileId/restore/:versionId - Restore a file to a prior version
  fastify.post<{ Params: { fileId: string; versionId: string } }>(
    '/:fileId/restore/:versionId',
    async (request, reply) => {
      const parseResult = fileVersionParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        throw parseResult.error;
      }

      const userId = requireUserId(request);

      const prisma = (fastify as unknown as { prisma: unknown }).prisma;
      const service = new VersionService(prisma as never);
      const version = await service.restoreVersion(parseResult.data.versionId, userId);

      return reply.send({ success: true, data: version });
    },
  );
}
