import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  MerchantService,
  RegisterMerchantSchema,
  CreateInvoiceSchema,
  GenerateQRCodeSchema,
  ProcessPaymentSchema,
  RefundPaymentSchema,
} from '../services/merchant.service';

const merchantIdParamSchema = z.object({
  id: z.string().min(1),
});

export default async function merchantsRoutes(fastify: FastifyInstance) {
  const merchantService = new MerchantService();

  fastify.post('/register', async (request, reply) => {
    const parseResult = RegisterMerchantSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid merchant data', 400, 'VALIDATION_ERROR');
    }

    const merchant = merchantService.registerMerchant(parseResult.data);
    return reply.status(201).send({ success: true, data: merchant });
  });

  fastify.post('/invoices', async (request, reply) => {
    const parseResult = CreateInvoiceSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid invoice data', 400, 'VALIDATION_ERROR');
    }

    const invoice = merchantService.createInvoice(parseResult.data);
    return reply.status(201).send({ success: true, data: invoice });
  });

  fastify.post('/qr-code', async (request, reply) => {
    const parseResult = GenerateQRCodeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid QR code data', 400, 'VALIDATION_ERROR');
    }

    const qrCode = merchantService.generateQRCode(parseResult.data);
    return reply.status(201).send({ success: true, data: qrCode });
  });

  fastify.post('/payments', async (request, reply) => {
    const parseResult = ProcessPaymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid payment data', 400, 'VALIDATION_ERROR');
    }

    const transaction = merchantService.processPayment(parseResult.data);
    return reply.status(201).send({ success: true, data: transaction });
  });

  fastify.post('/refund', async (request, reply) => {
    const parseResult = RefundPaymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid refund data', 400, 'VALIDATION_ERROR');
    }

    const refund = merchantService.refundPayment(parseResult.data);
    return reply.send({ success: true, data: refund });
  });

  fastify.get<{ Params: { id: string } }>('/:id/analytics', async (request, reply) => {
    const paramResult = merchantIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid merchant ID', 400, 'VALIDATION_ERROR');
    }

    const analytics = merchantService.getMerchantAnalytics(paramResult.data.id);
    return reply.send({ success: true, data: analytics });
  });

  fastify.get<{ Params: { id: string } }>('/:id/transactions', async (request, reply) => {
    const paramResult = merchantIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid merchant ID', 400, 'VALIDATION_ERROR');
    }

    const transactions = merchantService.getTransactions(paramResult.data.id);
    return reply.send({ success: true, data: transactions });
  });
}
