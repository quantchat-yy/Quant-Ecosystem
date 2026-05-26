import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { FileService } from '../services/file.service';
import { StorageQuotaService } from '../services/storage-quota.service';
import { AISearchContentService } from '../services/ai-search-content.service';

const uploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1),
  mimeType: z.string().min(1),
  folderId: z.string().optional(),
});

const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
});

export default async function filesRoutes(fastify: FastifyInstance) {
  // POST / - Upload file
  fastify.post('/', async (request, reply) => {
    const parseResult = uploadFileSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FileService(prisma as never);
    const quotaService = new StorageQuotaService(prisma as never);

    const contentBuffer = Buffer.from(parseResult.data.content, 'base64');

    // Enforce storage quota before upload
    await quotaService.checkQuota(userId, contentBuffer.length);

    const file = await service.uploadFile({
      name: parseResult.data.name,
      content: contentBuffer,
      mimeType: parseResult.data.mimeType,
      userId,
      folderId: parseResult.data.folderId,
    });

    // Index file content for search
    try {
      const ai = (fastify as unknown as { ai: unknown }).ai;
      const searchService = new AISearchContentService(ai as never, prisma as never);
      await searchService.indexFile(
        file.id,
        contentBuffer.toString('utf-8'),
        parseResult.data.mimeType,
        userId,
      );
    } catch {
      // Search indexing failure should not block upload
    }

    return reply.status(201).send({ success: true, data: file });
  });

  // GET /:id - Download file
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FileService(prisma as never);
    const file = await service.downloadFile(request.params.id, userId);

    return reply.send({ success: true, data: file });
  });

  // GET /:id/metadata - Get file metadata
  fastify.get<{ Params: { id: string } }>('/:id/metadata', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FileService(prisma as never);
    const metadata = await service.getFileMetadata(request.params.id, userId);

    return reply.send({ success: true, data: metadata });
  });

  // PUT /:id - Update file
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parseResult = updateFileSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FileService(prisma as never);

    const input: { name?: string; content?: Buffer } = {};
    if (parseResult.data.name) {
      input.name = parseResult.data.name;
    }
    if (parseResult.data.content) {
      input.content = Buffer.from(parseResult.data.content, 'base64');
    }

    const file = await service.updateFile(request.params.id, userId, input);

    return reply.send({ success: true, data: file });
  });

  // DELETE /:id - Delete file
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FileService(prisma as never);
    const file = await service.deleteFile(request.params.id, userId);

    return reply.send({ success: true, data: file });
  });
}
