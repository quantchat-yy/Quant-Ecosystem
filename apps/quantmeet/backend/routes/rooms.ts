import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { RoomService } from '../services/room.service';

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  isPrivate: z.boolean().optional(),
});

const DEFAULT_SETTINGS = {
  maxParticipants: 50,
  waitingRoom: false,
  muteOnEntry: false,
  allowScreenShare: true,
  enableRecording: false,
  enableTranscript: false,
};

export default async function roomsRoutes(fastify: FastifyInstance) {
  const roomService = new RoomService();

  fastify.post('/', async (request, reply) => {
    const parseResult = createRoomSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const room = roomService.createRoom({
      name: parseResult.data.name,
      hostId: userId,
      settings: {
        ...DEFAULT_SETTINGS,
        waitingRoom: parseResult.data.isPrivate ?? false,
      },
    });

    return reply.send(room);
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const room = roomService.getRoom(id);
      return reply.send(room);
    } catch {
      throw createAppError('Room not found', 404, 'NOT_FOUND');
    }
  });
}
