import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { StorageService } from '../services/storage.service';

const uploadSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export default async function uploadRoutes(fastify: FastifyInstance) {
  const storage = new StorageService();

  fastify.post('/upload', async (request, reply) => {
    const parseResult = uploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { filename, contentType, size } = parseResult.data;

    // In real implementation, get file buffer from multipart
    const fileBuffer = Buffer.from('placeholder'); // TODO: Replace with actual file

    const result = await storage.uploadFile(fileBuffer, filename, contentType);

    return reply.send({
      success: true,
      ...result,
    });
  });
}
