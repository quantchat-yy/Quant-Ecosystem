import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SessionManager, SessionSearch } from '@quant/quant-live';
import type { SessionStore } from '@quant/quant-live';
import { createAppError } from '@quant/server-core';

// ============================================================================
// quant-live (voice) seam routes — quantmeet (per-app lane, Stage 3)
// ============================================================================
//
// Layer 3 of the integration seam (design.md "The Standard Integration Seam
// Pattern"). Surfaces the real `@quant/quant-live` engine services over
// authenticated HTTP under the `/quant-live` prefix. The engine collaborators
// are constructed/decorated once in quantmeet's `buildApp()` (per-app lane,
// Layer 2) and read here off `fastify.quantLive`.
//
// NOTE: the prefix is `/quant-live` (NOT `/live`) on purpose — `/live` is a
// Kubernetes-liveness entry in createApp()'s PUBLIC_PATHS allowlist, and a
// `/live` prefix would make the global `onRequest` auth hook treat every
// `/live/*` route as public (auth bypass). `/quant-live` does not match any
// PUBLIC_PATHS entry, so the global auth hook protects all routes below
// (Req 7.1/7.3, Property P2).
//
// The global `onRequest` auth hook installed by `createApp()` already protects
// every non-public path, so these handlers read `request.auth` directly. The
// mutating route additionally declares a fine-grained scope via
// `requireAuth({ scopes })`. Inputs are validated with Zod and every response
// uses the canonical `{ success, data | error }` envelope (errors are produced
// centrally by `error-handler.ts` / `auth.ts` — never hand-rolled here).

/**
 * The composite quant-live service decorated onto the Fastify instance in
 * `buildApp()`. It bundles the engine's real, as-shipped exports — the
 * `SessionManager` live state machine, a `SessionStore` for persistence, and
 * `SessionSearch` (which takes the store as a collaborator). No engine code is
 * rewritten; this is pure composition at the seam.
 */
export interface QuantLiveService {
  sessions: SessionManager;
  store: SessionStore;
  search: SessionSearch;
}

// Layer 2 type augmentation (mirrors prisma.ts / auth.ts): expose the decorated
// quant-live engine on the Fastify instance so routes are typed everywhere.
declare module 'fastify' {
  interface FastifyInstance {
    quantLive: QuantLiveService;
  }
}

const LIVE_SESSION_STATES = [
  'idle',
  'listening',
  'processing',
  'speaking',
  'interrupted',
  'ended',
] as const;

// A live-session config with sensible defaults so a minimal `{}` body still
// produces a complete, valid `LiveSessionConfig` for the engine.
const sessionConfigSchema = z
  .object({
    asrProvider: z.string().min(1).default('whisper'),
    vadConfig: z
      .object({
        threshold: z.number().min(0).max(1).default(0.5),
        silenceDuration: z.number().nonnegative().default(800),
        minSpeechDuration: z.number().nonnegative().default(200),
      })
      .default({}),
    enableInterruption: z.boolean().default(true),
    maxSessionDuration: z.number().int().positive().default(3_600_000),
    language: z.string().min(1).default('en'),
  })
  .default({});

const createSessionSchema = z.object({
  config: sessionConfigSchema,
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  state: z.enum(LIVE_SESSION_STATES).optional(),
});

const sessionParamsSchema = z.object({
  id: z.string().min(1),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
});

/**
 * quant-live seam routes, registered under the `/quant-live` prefix in
 * quantmeet's `buildApp()`.
 */
export default async function quantLiveRoutes(fastify: FastifyInstance) {
  // POST /quant-live/sessions — start a voice session through the engine state
  // machine and persist a store entry scoped to the authenticated user.
  fastify.post(
    '/sessions',
    {
      preHandler: fastify.requireAuth({ scopes: ['live:write'] }),
    },
    async (request, reply) => {
      const parsed = createSessionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw parsed.error;
      }

      const session = fastify.quantLive.sessions.create(parsed.data.config);
      const entry = await fastify.quantLive.store.create({
        state: session.state,
        createdAt: session.createdAt,
        transcript: [],
        artifacts: [],
        userId: request.auth.userId,
        metadata: { liveSessionId: session.id },
      });

      return reply.status(201).send({ success: true, data: { session, entry } });
    },
  );

  // GET /quant-live/sessions — list the authenticated user's persisted live sessions.
  fastify.get('/sessions', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw parsed.error;
    }

    const result = await fastify.quantLive.store.list(request.auth.userId, parsed.data);
    return reply.send({ success: true, data: result });
  });

  // GET /quant-live/sessions/:id — fetch a live (in-memory) session or, failing that,
  // its persisted store entry.
  fastify.get('/sessions/:id', async (request, reply) => {
    const parsed = sessionParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw parsed.error;
    }

    const live = fastify.quantLive.sessions.getSession(parsed.data.id);
    if (live) {
      return reply.send({ success: true, data: { session: live } });
    }

    const persisted = await fastify.quantLive.store.get(parsed.data.id);
    if (!persisted) {
      throw createAppError('Session not found', 404, 'NOT_FOUND');
    }

    return reply.send({ success: true, data: { entry: persisted } });
  });

  // GET /quant-live/search?q= — full-text search across the user's session transcripts
  // via the engine's SessionSearch collaborator.
  fastify.get('/search', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw parsed.error;
    }

    const results = await fastify.quantLive.search.search(request.auth.userId, {
      query: parsed.data.q,
    });
    return reply.send({ success: true, data: { results } });
  });
}
