import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  VirtualCardService,
  IssueCardSchema,
  SetSpendingLimitsSchema,
} from '../services/card.service';

const cardIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function cardsRoutes(fastify: FastifyInstance) {
  const cardService = new VirtualCardService();

  fastify.post('/', async (request, reply) => {
    const parseResult = IssueCardSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid card data', 400, 'VALIDATION_ERROR');
    }

    const card = cardService.issueCard(parseResult.data);
    return reply.status(201).send({ success: true, data: card });
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = cardIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid card ID', 400, 'VALIDATION_ERROR');
    }

    const card = cardService.getCard(paramResult.data.id);
    return reply.send({ success: true, data: card });
  });

  fastify.post<{ Params: { id: string } }>('/:id/freeze', async (request, reply) => {
    const paramResult = cardIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid card ID', 400, 'VALIDATION_ERROR');
    }

    const card = cardService.freezeCard(paramResult.data.id);
    return reply.send({ success: true, data: card });
  });

  fastify.post<{ Params: { id: string } }>('/:id/unfreeze', async (request, reply) => {
    const paramResult = cardIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid card ID', 400, 'VALIDATION_ERROR');
    }

    const card = cardService.unfreezeCard(paramResult.data.id);
    return reply.send({ success: true, data: card });
  });

  fastify.put('/spending-limits', async (request, reply) => {
    const parseResult = SetSpendingLimitsSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid spending limits data', 400, 'VALIDATION_ERROR');
    }

    const card = cardService.setSpendingLimits(parseResult.data);
    return reply.send({ success: true, data: card });
  });

  fastify.get<{ Params: { id: string } }>('/:id/transactions', async (request, reply) => {
    const paramResult = cardIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid card ID', 400, 'VALIDATION_ERROR');
    }

    const transactions = cardService.getCardTransactions(paramResult.data.id);
    return reply.send({ success: true, data: transactions });
  });
}
