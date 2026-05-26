import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { FolderService } from '../services/folder.service';

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().optional(),
});

const listFoldersQuerySchema = z.object({
  parentId: z.string().optional(),
});

export default async function foldersRoutes(fastify: FastifyInstance) {
  // POST / - Create folder
  fastify.post('/', async (request, reply) => {
    const parseResult = createFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);

    const folder = await service.createFolder({
      name: parseResult.data.name,
      userId,
      parentId: parseResult.data.parentId,
    });

    return reply.status(201).send({ success: true, data: folder });
  });

  // GET / - List folders
  fastify.get('/', async (request, reply) => {
    const queryResult = listFoldersQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);
    const folders = await service.listFolders(userId, queryResult.data.parentId);

    return reply.send({ success: true, data: folders });
  });

  // GET /:id - Get folder
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);
    const folder = await service.getFolder(request.params.id, userId);

    return reply.send({ success: true, data: folder });
  });

  // PUT /:id - Update folder
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parseResult = updateFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);

    if (parseResult.data.parentId) {
      const folder = await service.moveFolder(request.params.id, userId, parseResult.data.parentId);
      return reply.send({ success: true, data: folder });
    }

    if (parseResult.data.name) {
      const folder = await service.renameFolder(request.params.id, userId, parseResult.data.name);
      return reply.send({ success: true, data: folder });
    }

    // If neither parentId nor name provided, just get and return the folder
    const folder = await service.getFolder(request.params.id, userId);
    return reply.send({ success: true, data: folder });
  });

  // DELETE /:id - Delete folder
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);
    const folder = await service.deleteFolder(request.params.id, userId);

    return reply.send({ success: true, data: folder });
  });

  // GET /:id/path - Get folder path (breadcrumbs)
  fastify.get<{ Params: { id: string } }>('/:id/path', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new FolderService(prisma as never);
    const path = await service.getFolderPath(request.params.id, userId);

    return reply.send({ success: true, data: path });
  });
}
