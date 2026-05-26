import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  P2PTransferService,
  SendMoneySchema,
  RequestMoneySchema,
  SplitBillSchema,
} from '../services/transfer.service';

const transferIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function transfersRoutes(fastify: FastifyInstance) {
  const transferService = new P2PTransferService();

  fastify.post('/send', async (request, reply) => {
    const parseResult = SendMoneySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid transfer data', 400, 'VALIDATION_ERROR');
    }

    const transfer = transferService.sendMoney(parseResult.data);
    return reply.status(201).send({ success: true, data: transfer });
  });

  fastify.post('/request', async (request, reply) => {
    const parseResult = RequestMoneySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid request data', 400, 'VALIDATION_ERROR');
    }

    const transfer = transferService.requestMoney(parseResult.data);
    return reply.status(201).send({ success: true, data: transfer });
  });

  fastify.post('/split', async (request, reply) => {
    const parseResult = SplitBillSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid split bill data', 400, 'VALIDATION_ERROR');
    }

    const bill = transferService.splitBill(parseResult.data);
    return reply.status(201).send({ success: true, data: bill });
  });

  fastify.post<{ Params: { id: string } }>('/:id/approve', async (request, reply) => {
    const paramResult = transferIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid transfer ID', 400, 'VALIDATION_ERROR');
    }

    const body = z.object({ approverId: z.string().min(1) }).safeParse(request.body);
    if (!body.success) {
      throw createAppError('Invalid approve data', 400, 'VALIDATION_ERROR');
    }

    const transfer = transferService.approveRequest(paramResult.data.id, body.data.approverId);
    return reply.send({ success: true, data: transfer });
  });

  fastify.post<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    const paramResult = transferIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid transfer ID', 400, 'VALIDATION_ERROR');
    }

    const body = z.object({ userId: z.string().min(1) }).safeParse(request.body);
    if (!body.success) {
      throw createAppError('Invalid cancel data', 400, 'VALIDATION_ERROR');
    }

    const transfer = transferService.cancelTransfer(paramResult.data.id, body.data.userId);
    return reply.send({ success: true, data: transfer });
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const paramResult = transferIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid transfer ID', 400, 'VALIDATION_ERROR');
    }

    const transfer = transferService.getTransfer(paramResult.data.id);
    return reply.send({ success: true, data: transfer });
  });

  fastify.get<{ Querystring: { userId: string } }>('/history', async (request, reply) => {
    const userId = (request.query as { userId?: string }).userId;
    if (!userId) {
      throw createAppError('userId query parameter required', 400, 'VALIDATION_ERROR');
    }

    const transfers = transferService.getTransferHistory(userId);
    return reply.send({ success: true, data: transfers });
  });
}
