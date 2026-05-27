import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CrossAppOrchestrator } from '../services/cross-app-orchestrator.service';
import { DemoModeConnector } from '../services/demo-mode.service';

const draftReplySchema = z.object({
  emailId: z.string().min(1),
});

const scheduleMeetingSchema = z.object({
  title: z.string().min(1),
  attendees: z.array(z.string().min(1)),
  preferredTime: z.string().min(1),
});

const searchAndSummarizeSchema = z.object({
  query: z.string().min(1),
});

const chatFollowupSchema = z.object({
  conversationId: z.string().min(1),
});

export default async function orchestrationRoutes(fastify: FastifyInstance) {
  const isDemoMode = process.env['DEMO_MODE'] === 'true';
  const connectors = new DemoModeConnector();

  // Only use wildcard permissions when DEMO_MODE=true.
  // In production mode, users must have explicit permission entries.
  const permissions: Record<string, string[]> = isDemoMode
    ? { '*': ['mail', 'chat', 'docs', 'calendar', 'drive'] }
    : {};
  const orchestrator = new CrossAppOrchestrator(connectors, permissions);

  function getUserId(request: unknown): string {
    const req = request as { auth?: { userId?: string } };
    const userId = req.auth?.userId ?? (isDemoMode ? 'demo-user' : '');
    return userId;
  }

  function ensurePermissions(userId: string): void {
    if (!isDemoMode) {
      // Production mode: require explicit permissions for the user
      if (!permissions[userId]) {
        throw createAppError(
          'Permission denied: no explicit permissions for user',
          403,
          'FORBIDDEN',
        );
      }
      return;
    }
    // Demo mode: fall back to wildcard if user has no explicit entry
    if (!permissions[userId] && !permissions['*']) {
      throw createAppError('Permission denied', 403, 'FORBIDDEN');
    }
    if (!permissions[userId]) {
      permissions[userId] = permissions['*']!;
    }
  }

  // POST /api/v1/orchestrate/summarize-day
  fastify.post('/summarize-day', async (request, reply) => {
    const userId = getUserId(request);
    ensurePermissions(userId);

    const result = await orchestrator.summarizeDay(userId);
    return reply.send(result);
  });

  // POST /api/v1/orchestrate/draft-reply
  fastify.post('/draft-reply', async (request, reply) => {
    const parseResult = draftReplySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const userId = getUserId(request);
    ensurePermissions(userId);

    const result = await orchestrator.draftReply(userId, parseResult.data.emailId);
    return reply.send(result);
  });

  // POST /api/v1/orchestrate/schedule-meeting
  fastify.post('/schedule-meeting', async (request, reply) => {
    const parseResult = scheduleMeetingSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const userId = getUserId(request);
    ensurePermissions(userId);

    const result = await orchestrator.scheduleMeeting(userId, parseResult.data);
    return reply.send(result);
  });

  // POST /api/v1/orchestrate/search-and-summarize
  fastify.post('/search-and-summarize', async (request, reply) => {
    const parseResult = searchAndSummarizeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const userId = getUserId(request);
    ensurePermissions(userId);

    const result = await orchestrator.searchAndSummarize(userId, parseResult.data.query);
    return reply.send(result);
  });

  // POST /api/v1/orchestrate/chat-followup
  fastify.post('/chat-followup', async (request, reply) => {
    const parseResult = chatFollowupSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const userId = getUserId(request);
    ensurePermissions(userId);

    const result = await orchestrator.chatFollowup(userId, parseResult.data.conversationId);
    return reply.send(result);
  });
}
