import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { AIScheduleService } from '../services/ai-schedule.service';
import { AIBufferService } from '../services/ai-buffer.service';
import { AIFocusBlocksService } from '../services/ai-focus-blocks.service';
import { AICancelDetectorService } from '../services/ai-cancel-detector.service';
import { AIRescheduleService } from '../services/ai-reschedule.service';
import { AIWeeklyDigestService } from '../services/ai-weekly-digest.service';

const suggestTimesSchema = z.object({
  attendeeIds: z.array(z.string()),
  duration: z.number().min(5).max(480),
  preferences: z
    .object({
      preferMorning: z.boolean().optional(),
      preferAfternoon: z.boolean().optional(),
      avoidLunchHour: z.boolean().optional(),
    })
    .optional(),
});

const bufferSchema = z.object({
  date: z.string(),
});

const focusBlocksSchema = z.object({
  date: z.string(),
  minBlockMinutes: z.number().optional(),
});

const detectCancellationSchema = z.object({
  messageText: z.string().min(1),
});

const rescheduleSchema = z.object({
  instruction: z.string().min(1),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  // POST /suggest-times
  fastify.post('/suggest-times', async (request, reply) => {
    const parseResult = suggestTimesSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const ai = (fastify as unknown as { ai: unknown }).ai;
    const service = new AIScheduleService(ai as never, prisma as never);

    const suggestions = await service.suggestMeetingTimes(
      userId,
      parseResult.data.attendeeIds,
      parseResult.data.duration,
      parseResult.data.preferences,
    );

    return reply.send({ success: true, data: suggestions });
  });

  // POST /buffer
  fastify.post('/buffer', async (request, reply) => {
    const parseResult = bufferSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new AIBufferService(prisma as never);

    const result = await service.addBufferTime(userId, new Date(parseResult.data.date));

    return reply.send({ success: true, data: result });
  });

  // POST /focus-blocks
  fastify.post('/focus-blocks', async (request, reply) => {
    const parseResult = focusBlocksSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const ai = (fastify as unknown as { ai: unknown }).ai;
    const service = new AIFocusBlocksService(ai as never, prisma as never);

    const result = await service.reserveFocusBlocks(
      userId,
      new Date(parseResult.data.date),
      parseResult.data.minBlockMinutes,
    );

    return reply.send({ success: true, data: result });
  });

  // POST /detect-cancellation
  fastify.post('/detect-cancellation', async (request, reply) => {
    const parseResult = detectCancellationSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const ai = (fastify as unknown as { ai: unknown }).ai;
    const service = new AICancelDetectorService(ai as never);

    const result = await service.detectCancellation(parseResult.data.messageText);

    return reply.send({ success: true, data: result });
  });

  // POST /reschedule
  fastify.post('/reschedule', async (request, reply) => {
    const parseResult = rescheduleSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const ai = (fastify as unknown as { ai: unknown }).ai;
    const service = new AIRescheduleService(ai as never, prisma as never);

    const result = await service.rescheduleEvents(userId, parseResult.data.instruction);

    return reply.send({ success: true, data: result });
  });

  // GET /weekly-digest
  fastify.get('/weekly-digest', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const query = request.query as { weekStart?: string };
    const weekStart = query.weekStart ? new Date(query.weekStart) : getMonday(new Date());

    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const ai = (fastify as unknown as { ai: unknown }).ai;
    const service = new AIWeeklyDigestService(ai as never, prisma as never);

    const digest = await service.generateDigest(userId, weekStart);

    return reply.send({ success: true, data: digest });
  });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
