import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CallService } from '../services/call.service';

const initiate1v1Schema = z.object({
  calleeId: z.string().min(1),
});

const initiateGroupSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1).max(7),
});

const createCallSchema = z.object({
  conversationId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
  maxParticipants: z.number().int().min(2).max(8).optional().default(2),
});

const endCallSchema = z.object({
  roomId: z.string().min(1),
});

function getCallService(): CallService {
  return new CallService({
    apiKey: process.env['LIVEKIT_API_KEY'] ?? 'devkey',
    apiSecret: process.env['LIVEKIT_API_SECRET'] ?? 'devsecret',
    wsUrl: process.env['LIVEKIT_WS_URL'] ?? 'ws://localhost:7880',
  });
}

/**
 * Checks whether LiveKit connection details are configured.
 * If not, we return mock tokens so the route still works in dev.
 */
function hasLiveKitConfig(): boolean {
  return !!(
    process.env['LIVEKIT_API_KEY'] &&
    process.env['LIVEKIT_API_SECRET'] &&
    process.env['LIVEKIT_URL']
  );
}

/**
 * Generate a mock token for dev environments without LiveKit.
 */
function generateMockToken(roomId: string, userId: string): string {
  const payload = { roomId, userId, mock: true, exp: Date.now() + 3600_000 };
  return `mock_token_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

/**
 * Generate a cuid-like ID for room creation.
 */
function generateRoomId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `room_${timestamp}${random}`;
}

export default async function callsRoutes(fastify: FastifyInstance) {
  const callService = getCallService();

  // POST /calls/create — Creates a LiveKit room and generates participant tokens
  fastify.post('/create', async (request, reply) => {
    const parseResult = createCallSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { participantIds, maxParticipants } = parseResult.data;
    const allParticipants = [userId, ...participantIds.filter((id) => id !== userId)];
    const roomId = generateRoomId();

    // If LiveKit is not configured, return mock tokens (dev mode)
    if (!hasLiveKitConfig()) {
      const tokens: Record<string, string> = {};
      for (const pid of allParticipants) {
        tokens[pid] = generateMockToken(roomId, pid);
      }
      return reply.status(201).send({ success: true, data: { roomId, tokens } });
    }

    // Create real LiveKit room and generate tokens
    try {
      const call = await callService.initiateGroupCall(userId, participantIds);

      // Generate tokens for all participants
      const tokens: Record<string, string> = {};
      for (const pid of allParticipants) {
        tokens[pid] = await callService.generateCallToken(call.callId, pid);
      }

      return reply.status(201).send({
        success: true,
        data: { roomId: call.callId, tokens },
      });
    } catch (err) {
      throw createAppError(
        `Failed to create call room: ${(err as Error).message}`,
        502,
        'CALL_CREATE_FAILED',
      );
    }
  });

  // POST /calls/end — Destroys the LiveKit room
  fastify.post('/end', async (request, reply) => {
    const parseResult = endCallSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { roomId } = parseResult.data;

    // If LiveKit is not configured, just acknowledge (dev mode)
    if (!hasLiveKitConfig()) {
      return reply.send({ success: true, data: { message: 'Call ended (mock)' } });
    }

    try {
      await callService.endCall(roomId);
      return reply.send({ success: true, data: { message: 'Call ended' } });
    } catch (err) {
      // If call not found, it may have already ended
      if ((err as { statusCode?: number }).statusCode === 404) {
        return reply.send({ success: true, data: { message: 'Call already ended' } });
      }
      throw err;
    }
  });

  // POST /calls/initiate - Initiate a 1:1 call
  fastify.post('/initiate', async (request, reply) => {
    const parseResult = initiate1v1Schema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const call = await callService.initiate1v1Call(userId, parseResult.data.calleeId);
    return reply.status(201).send({ success: true, data: call });
  });

  // POST /calls/group - Initiate a group call
  fastify.post('/group', async (request, reply) => {
    const parseResult = initiateGroupSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const call = await callService.initiateGroupCall(userId, parseResult.data.participantIds);
    return reply.status(201).send({ success: true, data: call });
  });

  // POST /calls/:id/join - Join a call and get token
  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = await callService.generateCallToken(request.params.id, userId);
    return reply.send({ success: true, data: { token } });
  });

  // POST /calls/:id/leave - Leave a call (only removes the requesting participant)
  fastify.post<{ Params: { id: string } }>('/:id/leave', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const result = await callService.leaveCall(request.params.id, userId);
    return reply.send({
      success: true,
      data: { message: result.ended ? 'Call ended' : 'Left call' },
    });
  });

  // GET /calls/:id/token - Get participant token
  fastify.get<{ Params: { id: string } }>('/:id/token', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = await callService.generateCallToken(request.params.id, userId);
    return reply.send({ success: true, data: { token } });
  });
}
