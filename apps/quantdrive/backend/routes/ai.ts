import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { AIEngine } from '@quant/ai';
import { AIOrganizeService } from '../services/ai-organize.service';
import { AIDuplicateService } from '../services/ai-duplicate.service';
import { AISearchContentService } from '../services/ai-search-content.service';
import { AISummarizeFileService } from '../services/ai-summarize-file.service';
import { AIExtractDataService } from '../services/ai-extract-data.service';

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
});

const extractSchema = z.object({
  type: z.enum(['receipt', 'invoice']),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  const aiEngine = new AIEngine();

  // POST /organize/:fileId - Auto-organize file
  fastify.post<{ Params: { fileId: string } }>('/organize/:fileId', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new AIOrganizeService(aiEngine, prisma as never);
    const result = await service.autoOrganize(request.params.fileId, userId);

    return reply.send({ success: true, data: result });
  });

  // POST /duplicates - Find duplicate files
  fastify.post('/duplicates', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new AIDuplicateService(prisma as never);
    const result = await service.findDuplicates(userId);

    return reply.send({ success: true, data: result });
  });

  // POST /search - Search file content
  fastify.post('/search', async (request, reply) => {
    const parseResult = searchSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new AISearchContentService(aiEngine, prisma as never);
    const results = await service.searchContent(parseResult.data.query, userId, {
      limit: parseResult.data.limit,
    });

    return reply.send({ success: true, data: results });
  });

  // POST /summarize/:fileId - Summarize file
  fastify.post<{ Params: { fileId: string } }>('/summarize/:fileId', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const fileService = await import('../services/file.service');
    const fService = new fileService.FileService(prisma as never);
    const file = await fService.downloadFile(request.params.fileId, userId);

    const service = new AISummarizeFileService(aiEngine);
    const result = await service.summarizeFile(
      {
        fileId: request.params.fileId,
        content: file.content.toString('utf-8'),
        mimeType: file.mimeType,
        fileName: file.name,
      },
      userId,
    );

    return reply.send({ success: true, data: result });
  });

  // POST /extract/:fileId - Extract data from file
  fastify.post<{ Params: { fileId: string } }>('/extract/:fileId', async (request, reply) => {
    const parseResult = extractSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const fileService = await import('../services/file.service');
    const fService = new fileService.FileService(prisma as never);
    const file = await fService.downloadFile(request.params.fileId, userId);
    const content = file.content.toString('utf-8');

    const service = new AIExtractDataService(aiEngine);

    if (parseResult.data.type === 'receipt') {
      const result = await service.extractFromReceipt(content, userId);
      return reply.send({ success: true, data: result });
    }

    const result = await service.extractFromInvoice(content, userId);
    return reply.send({ success: true, data: result });
  });
}
