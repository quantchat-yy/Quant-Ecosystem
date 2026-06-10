import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { RoomService } from '../services/room.service';

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  isPrivate: z.boolean().optional(),
});

export default async function roomsRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;
  const roomService = new RoomService(prisma);

  fastify.post('/', async (request, reply) => {
    const parseResult = createRoomSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const room = await roomService.createRoom(
      userId,
      parseResult.data.name,
      parseResult.data.isPrivate,
    );

    return reply.send(room);
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const room = await roomService.getRoom(id);

    if (!room) {
      throw createAppError('Room not found', 404, 'NOT_FOUND');
    }

    return reply.send(room);
  });
}
