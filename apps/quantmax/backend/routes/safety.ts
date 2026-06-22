import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { SafetyService, REPORT_TARGET_TYPES, REPORT_REASONS } from '../services/safety.service';

// ============================================================================
// QuantMax safety routes (mounted at /safety).
//
//   POST /safety/report    { targetType, targetId, reason, details? }
//   GET  /safety/settings
//   PUT  /safety/settings  { hideSensitiveContent?, allowRandomChat?,
//                            blockUnknownMessages?, filteredKeywords? }
//
// All authenticated (the global auth hook rejects anonymous callers).
// ============================================================================

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(5000).optional(),
});

const settingsSchema = z
  .object({
    hideSensitiveContent: z.boolean().optional(),
    allowRandomChat: z.boolean().optional(),
    blockUnknownMessages: z.boolean().optional(),
    filteredKeywords: z.array(z.string().max(100)).max(100).optional(),
  })
  .strict();

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

function buildService(fastify: FastifyInstance): SafetyService {
  const prisma = (fastify as unknown as { prisma: unknown }).prisma;
  return new SafetyService(prisma as never);
}

export default async function safetyRoutes(fastify: FastifyInstance) {
  fastify.post('/report', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = reportSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const report = await buildService(fastify).reportContent(userId, parsed.data);
    return reply.status(201).send({ success: true, data: report });
  });

  fastify.get('/settings', async (request, reply) => {
    const userId = requireUserId(request);
    const settings = await buildService(fastify).getSettings(userId);
    return reply.send({ success: true, data: settings });
  });

  fastify.put('/settings', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error;
    }
    const settings = await buildService(fastify).updateSettings(userId, parsed.data);
    return reply.send({ success: true, data: settings });
  });
}
