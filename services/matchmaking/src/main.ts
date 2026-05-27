// ============================================================================
// Matchmaking Service - Pairs users for random video chat
// ============================================================================

import Fastify from 'fastify';
import { z } from 'zod';
import { MatchmakingService } from './matchmaker';

const port = Number(process.env['PORT'] ?? '3060');
const host = process.env['HOST'] ?? '0.0.0.0';

const livekitApiKey = process.env['LIVEKIT_API_KEY'] ?? 'devkey';
const livekitApiSecret = process.env['LIVEKIT_API_SECRET'] ?? 'devsecret';
const livekitWsUrl = process.env['LIVEKIT_WS_URL'] ?? 'ws://localhost:7880';

const matchmaker = new MatchmakingService({
  apiKey: livekitApiKey,
  apiSecret: livekitApiSecret,
  wsUrl: livekitWsUrl,
  queueTimeoutMs: 30_000,
});

const joinSchema = z.object({
  userId: z.string().min(1),
  preferences: z
    .object({
      gender: z.string().optional(),
      language: z.string().optional(),
      interests: z.array(z.string()).optional(),
    })
    .optional(),
});

const leaveSchema = z.object({
  userId: z.string().min(1),
});

const statusSchema = z.object({
  userId: z.string().min(1),
});

async function main(): Promise<void> {
  const app = Fastify({ logger: { level: 'info' } });

  // Health endpoint
  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'matchmaking' });
  });

  // POST /queue/join - Join the matchmaking queue
  app.post('/queue/join', async (request, reply) => {
    const parseResult = joinSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: parseResult.error.message });
    }

    const { userId, preferences } = parseResult.data;
    const result = await matchmaker.joinQueue(userId, preferences ?? {});

    if (result) {
      return reply.send({ success: true, data: { matched: true, ...result } });
    }

    return reply.send({ success: true, data: { matched: false, message: 'Added to queue' } });
  });

  // POST /queue/leave - Leave the matchmaking queue
  app.post('/queue/leave', async (request, reply) => {
    const parseResult = leaveSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: parseResult.error.message });
    }

    const removed = matchmaker.leaveQueue(parseResult.data.userId);
    return reply.send({ success: true, data: { removed } });
  });

  // GET /queue/status - Get queue status
  app.get('/queue/status', async (request, reply) => {
    const parseResult = statusSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: parseResult.error.message });
    }

    const status = matchmaker.getQueueStatus(parseResult.data.userId);
    return reply.send({ success: true, data: status });
  });

  await app.listen({ port, host });
  app.log.info({ port, host }, 'Matchmaking service listening');
}

void main();

export { main };
