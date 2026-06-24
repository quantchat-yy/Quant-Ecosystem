import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { createAppError } from '@quant/server-core';
import { StorageService } from '../services/storage.service';

export default async function uploadRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100 MB max file size
    },
  });

  const storage = new StorageService();

  fastify.post('/', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const data = await request.file();
    if (!data) {
      throw createAppError('No file uploaded', 400, 'NO_FILE');
    }

    const fileBuffer = await data.toBuffer();
    const filename = data.filename;
    const contentType = data.mimetype;

    const result = await storage.uploadFile(fileBuffer, filename, contentType);

    return reply.send({
      success: true,
      ...result,
    });
  });
}
