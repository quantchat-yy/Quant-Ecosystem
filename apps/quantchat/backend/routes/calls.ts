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

function getCallService(): CallService {
  return new CallService({
    apiKey: process.env['LIVEKIT_API_KEY'] ?? 'devkey',
    apiSecret: process.env['LIVEKIT_API_SECRET'] ?? 'devsecret',
    wsUrl: process.env['LIVEKIT_WS_URL'] ?? 'ws://localhost:7880',
  });
}

export default async function callsRoutes(fastify: FastifyInstance) {
  const callService = getCallService();

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
