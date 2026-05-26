import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  WalletService,
  CreateWalletSchema,
  AddFundsSchema,
  WithdrawFundsSchema,
  ConvertCurrencySchema,
} from '../services/wallet.service';

const walletIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function walletsRoutes(fastify: FastifyInstance) {
  const walletService = new WalletService();

  fastify.post('/', async (request, reply) => {
    const parseResult = CreateWalletSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid wallet data', 400, 'VALIDATION_ERROR');
    }

    const wallet = walletService.createWallet(parseResult.data);
    return reply.status(201).send({ success: true, data: wallet });
  });

  fastify.get<{ Params: { id: string } }>('/:id/balance', async (request, reply) => {
    const paramResult = walletIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid wallet ID', 400, 'VALIDATION_ERROR');
    }

    const balance = walletService.getBalance(paramResult.data.id);
    return reply.send({ success: true, data: balance });
  });

  fastify.post('/add-funds', async (request, reply) => {
    const parseResult = AddFundsSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid funds data', 400, 'VALIDATION_ERROR');
    }

    const wallet = walletService.addFunds(parseResult.data);
    return reply.send({ success: true, data: wallet });
  });

  fastify.post('/withdraw', async (request, reply) => {
    const parseResult = WithdrawFundsSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid withdrawal data', 400, 'VALIDATION_ERROR');
    }

    const wallet = walletService.withdrawFunds(parseResult.data);
    return reply.send({ success: true, data: wallet });
  });

  fastify.post('/convert', async (request, reply) => {
    const parseResult = ConvertCurrencySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid conversion data', 400, 'VALIDATION_ERROR');
    }

    const wallet = walletService.convertCurrency(parseResult.data);
    return reply.send({ success: true, data: wallet });
  });

  fastify.get<{ Params: { id: string } }>('/:id/transactions', async (request, reply) => {
    const paramResult = walletIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid wallet ID', 400, 'VALIDATION_ERROR');
    }

    const transactions = walletService.getTransactionHistory(paramResult.data.id);
    return reply.send({ success: true, data: transactions });
  });

  fastify.get('/exchange-rates', async (_request, reply) => {
    const rates = walletService.getExchangeRates();
    return reply.send({ success: true, data: rates });
  });
}
