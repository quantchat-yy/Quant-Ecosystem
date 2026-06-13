import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import { AIEngineAdapter } from '../services/ai-engine-adapter';
import { SummaryService } from '../services/summary.service';
import { ActionItemsService } from '../services/action-items.service';
import type { TranscriptSegment } from '../services/transcript.service';

interface TranscriptInput {
  participantId: string;
  text: string;
  roomId?: string;
}

export default async function aiRoutes(fastify: FastifyInstance) {
  const adapter = new AIEngineAdapter();
  const summaryService = new SummaryService(adapter);
  const actionItemsService = new ActionItemsService(adapter);

  fastify.post('/summary', async (request, reply) => {
    const body = request.body as { transcript?: TranscriptInput[] };

    if (!body.transcript || !Array.isArray(body.transcript) || body.transcript.length === 0) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const summary = await summaryService.generateSummary(body.transcript as TranscriptSegment[]);
    return reply.send({ success: true, data: summary });
  });

  fastify.post('/action-items', async (request, reply) => {
    const body = request.body as { transcript?: TranscriptInput[] };

    if (!body.transcript || !Array.isArray(body.transcript) || body.transcript.length === 0) {
      throw createAppError('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const items = await actionItemsService.extractActionItems(
      body.transcript as TranscriptSegment[],
    );
    return reply.send({ success: true, data: items });
  });
}
