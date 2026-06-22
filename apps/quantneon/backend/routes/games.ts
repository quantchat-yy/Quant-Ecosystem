import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { GameError, NeonGamesService } from '../services/neon-games.service';

// ============================================================================
// QuantNeon in-feed games routes (mounted at /games).
//
//   GET  /games                 -> catalog (+ ?gameId for active sessions)
//   GET  /games/sessions/:id    -> a session's current state
//   POST /games/:gameId/start   -> create a session (caller is host)
//   POST /games/:id/join        -> join a waiting session
//   POST /games/:id/action      -> submit a move (turn-based)
//
// Authenticated; the NeonGamesService singleton is decorated on the app.
// ============================================================================

function getUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

function getService(fastify: FastifyInstance): NeonGamesService {
  return (fastify as unknown as { neonGames: NeonGamesService }).neonGames;
}

const actionSchema = z.object({ cell: z.coerce.number().int().min(0).max(8) });

const ERROR_STATUS: Record<GameError['code'], number> = {
  GAME_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  GAME_NOT_PLAYABLE: 409,
  SESSION_FULL: 409,
  SESSION_NOT_ACTIVE: 409,
  NOT_YOUR_TURN: 409,
  ALREADY_JOINED: 409,
  INVALID_MOVE: 422,
};

function handle<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof GameError) {
      throw createAppError(err.message, ERROR_STATUS[err.code], err.code);
    }
    throw err;
  }
}

export default async function gamesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    getUserId(request);
    const svc = getService(fastify);
    const gameId = (request.query as { gameId?: string } | undefined)?.gameId;
    return reply.send({
      success: true,
      data: { games: svc.listGames(), activeSessions: svc.listActiveSessions(gameId) },
    });
  });

  fastify.get<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    getUserId(request);
    const session = handle(() => getService(fastify).getSession(request.params.id));
    return reply.send({ success: true, data: { session } });
  });

  fastify.post<{ Params: { gameId: string } }>('/:gameId/start', async (request, reply) => {
    const userId = getUserId(request);
    const session = handle(() => getService(fastify).startGame(request.params.gameId, userId));
    return reply.status(201).send({ success: true, data: { session } });
  });

  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    const userId = getUserId(request);
    const session = handle(() => getService(fastify).joinGame(request.params.id, userId));
    return reply.send({ success: true, data: { session } });
  });

  fastify.post<{ Params: { id: string } }>('/:id/action', async (request, reply) => {
    const userId = getUserId(request);
    const parsed = actionSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const session = handle(() =>
      getService(fastify).submitMove(request.params.id, userId, parsed.data),
    );
    return reply.send({ success: true, data: { session } });
  });
}
