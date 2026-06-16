import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { AttachmentService } from '../services/attachment.service';

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/html',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.msi',
  '.msp',
  '.hta',
  '.cpl',
  '.inf',
]);

function hasBlockedExtension(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

export default async function attachmentRoutes(fastify: FastifyInstance) {
  const service = new AttachmentService();

  fastify.post('/upload-url', async (request, reply) => {
    const parseResult = uploadUrlSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError(
        `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
        400,
        'VALIDATION_ERROR',
      );
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { filename, contentType, size } = parseResult.data;

    if (hasBlockedExtension(filename)) {
      throw createAppError('File type not allowed for security reasons', 400, 'BLOCKED_FILE_TYPE');
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw createAppError(
        `Content type "${contentType}" is not supported`,
        400,
        'UNSUPPORTED_CONTENT_TYPE',
      );
    }

    const result = await service.generateUploadUrl(userId, filename, contentType, size);

    return reply.status(200).send({ success: true, data: result });
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const metadata = await service.getAttachment(request.params.id, userId);
    return reply.send({ success: true, data: metadata });
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const result = await service.deleteAttachment(request.params.id, userId);
    return reply.send({ success: true, data: result });
  });
}
