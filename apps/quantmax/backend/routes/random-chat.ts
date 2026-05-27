import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { RoomServiceClient, AccessToken, type VideoGrant } from 'livekit-server-sdk';

const joinQueueSchema = z.object({
  preferences: z
    .object({
      gender: z.string().optional(),
      language: z.string().optional(),
      interests: z.array(z.string()).optional(),
    })
    .optional(),
});

interface QueueEntry {
  userId: string;
  preferences: { gender?: string; language?: string; interests?: string[] };
  joinedAt: number;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

const queue = new Map<string, QueueEntry>();
// Stores partner tokens so the matched partner can retrieve their own token
// without leaking it to the initiator. Key: `${pairId}:${userId}` -> token
const pendingTokens = new Map<string, string>();
const QUEUE_TIMEOUT_MS = 30_000;
const PENDING_TOKEN_TTL_MS = 5 * 60_000; // tokens expire from pending map after 5 min

function getLiveKitConfig() {
  return {
    apiKey: process.env['LIVEKIT_API_KEY'] ?? 'devkey',
    apiSecret: process.env['LIVEKIT_API_SECRET'] ?? 'devsecret',
    wsUrl: process.env['LIVEKIT_WS_URL'] ?? 'ws://localhost:7880',
  };
}

function isCompatible(a: { language?: string }, b: { language?: string }): boolean {
  if (a.language && b.language && a.language !== b.language) {
    return false;
  }
  return true;
}

/**
 * Generate a LiveKit access token for a random-chat participant.
 *
 * Token TTL: 30 minutes. Random chat sessions are ephemeral by design.
 * A short TTL limits exposure if a token is leaked and encourages users
 * to re-queue for new interactions rather than lingering in old rooms.
 */
async function generateToken(
  roomName: string,
  userId: string,
  apiKey: string,
  apiSecret: string,
): Promise<string> {
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userId,
    ttl: '30m',
  });
  token.addGrant(grant);

  return await token.toJwt();
}

export default async function randomChatRoutes(fastify: FastifyInstance) {
  // POST /random-chat/join - Join the random chat queue
  fastify.post('/join', async (request, reply) => {
    const parseResult = joinQueueSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (queue.has(userId)) {
      throw createAppError('Already in queue', 409, 'ALREADY_IN_QUEUE');
    }

    const preferences = parseResult.data.preferences ?? {};

    // Try to find a compatible match
    let matchUserId: string | null = null;
    for (const [candidateId, entry] of queue) {
      if (candidateId === userId) continue;
      if (isCompatible(preferences, entry.preferences)) {
        matchUserId = candidateId;
        break;
      }
    }

    if (matchUserId) {
      const matchEntry = queue.get(matchUserId)!;
      if (matchEntry.timeoutHandle) {
        clearTimeout(matchEntry.timeoutHandle);
      }
      queue.delete(matchUserId);

      const config = getLiveKitConfig();
      const pairId = `pair_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const roomName = `max-random:${pairId}`;

      const roomClient = new RoomServiceClient(config.wsUrl, config.apiKey, config.apiSecret);
      await roomClient.createRoom({
        name: roomName,
        maxParticipants: 2,
        emptyTimeout: 30,
      });

      const tokenA = await generateToken(roomName, userId, config.apiKey, config.apiSecret);
      const tokenB = await generateToken(roomName, matchUserId, config.apiKey, config.apiSecret);

      // Store the partner's token for retrieval via GET /random-chat/:pairId/token
      const partnerKey = `${pairId}:${matchUserId}`;
      pendingTokens.set(partnerKey, tokenB);
      setTimeout(() => {
        pendingTokens.delete(partnerKey);
      }, PENDING_TOKEN_TTL_MS);

      return reply.send({
        success: true,
        data: {
          matched: true,
          pairId,
          roomName,
          token: tokenA,
        },
      });
    }

    // No match - add to queue with timeout
    const entry: QueueEntry = {
      userId,
      preferences,
      joinedAt: Date.now(),
    };

    entry.timeoutHandle = setTimeout(() => {
      queue.delete(userId);
    }, QUEUE_TIMEOUT_MS);

    queue.set(userId, entry);

    return reply.send({
      success: true,
      data: { matched: false, message: 'Added to queue, waiting for match' },
    });
  });

  // POST /random-chat/leave - Leave the queue
  fastify.post('/leave', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const entry = queue.get(userId);
    if (entry) {
      if (entry.timeoutHandle) {
        clearTimeout(entry.timeoutHandle);
      }
      queue.delete(userId);
    }

    return reply.send({ success: true, data: { removed: !!entry } });
  });

  // GET /random-chat/:pairId/token - Retrieve token for a matched partner
  fastify.get<{ Params: { pairId: string } }>('/:pairId/token', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const key = `${request.params.pairId}:${userId}`;
    const token = pendingTokens.get(key);
    if (!token) {
      throw createAppError('Token not found or expired', 404, 'TOKEN_NOT_FOUND');
    }

    // Remove token after retrieval (one-time use)
    pendingTokens.delete(key);

    return reply.send({ success: true, data: { token } });
  });

  // GET /random-chat/status - Get queue status
  fastify.get('/status', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    return reply.send({
      success: true,
      data: {
        queueSize: queue.size,
        userInQueue: queue.has(userId),
      },
    });
  });
}
