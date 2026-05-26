import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Merchant {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
}

export interface Invoice {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  dueDate: Date;
  createdAt: Date;
  paidAt: Date | null;
}

export interface QRCode {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  payload: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MerchantTransaction {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  type: 'payment' | 'refund';
  status: 'completed' | 'refunded' | 'failed';
  description: string;
  createdAt: Date;
}

export interface MerchantAnalytics {
  merchantId: string;
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  averageTransactionAmount: number;
  currency: string;
}

export const RegisterMerchantSchema = z.object({
  userId: z.string().min(1),
  businessName: z.string().min(1).max(200),
  businessType: z.string().min(1).max(100),
  email: z.string().email(),
});

export type RegisterMerchantInput = z.infer<typeof RegisterMerchantSchema>;

export const CreateInvoiceSchema = z.object({
  merchantId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  description: z.string().min(1).max(500),
  dueDate: z.string().min(1),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const GenerateQRCodeSchema = z.object({
  merchantId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  description: z.string().max(200).default(''),
  expiresInMinutes: z.number().int().positive().default(30),
});

export type GenerateQRCodeInput = z.infer<typeof GenerateQRCodeSchema>;

export const ProcessPaymentSchema = z.object({
  merchantId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  description: z.string().max(500).default(''),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;

export const RefundPaymentSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().max(500).default(''),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;

export class MerchantService {
  private readonly merchants = new Map<string, Merchant>();
  private readonly invoices = new Map<string, Invoice>();
  private readonly qrCodes = new Map<string, QRCode>();
  private readonly transactions = new Map<string, MerchantTransaction>();

  registerMerchant(input: RegisterMerchantInput): Merchant {
    const parsed = RegisterMerchantSchema.parse(input);

    for (const merchant of this.merchants.values()) {
      if (merchant.userId === parsed.userId) {
        throw createAppError('User already registered as merchant', 409, 'MERCHANT_EXISTS');
      }
    }

    const merchant: Merchant = {
      id: randomUUID(),
      userId: parsed.userId,
      businessName: parsed.businessName,
      businessType: parsed.businessType,
      email: parsed.email,
      status: 'active',
      createdAt: new Date(),
    };

    this.merchants.set(merchant.id, merchant);
    return merchant;
  }

  createInvoice(input: CreateInvoiceInput): Invoice {
    const parsed = CreateInvoiceSchema.parse(input);
    this.getMerchant(parsed.merchantId);

    const invoice: Invoice = {
      id: randomUUID(),
      merchantId: parsed.merchantId,
      customerId: parsed.customerId,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      status: 'pending',
      dueDate: new Date(parsed.dueDate),
      createdAt: new Date(),
      paidAt: null,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  generateQRCode(input: GenerateQRCodeInput): QRCode {
    const parsed = GenerateQRCodeSchema.parse(input);
    this.getMerchant(parsed.merchantId);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parsed.expiresInMinutes);

    const qrCode: QRCode = {
      id: randomUUID(),
      merchantId: parsed.merchantId,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      payload: `quantpay://pay/${parsed.merchantId}/${parsed.amount}/${parsed.currency}/${randomUUID()}`,
      expiresAt,
      createdAt: new Date(),
    };

    this.qrCodes.set(qrCode.id, qrCode);
    return qrCode;
  }

  processPayment(input: ProcessPaymentInput): MerchantTransaction {
    const parsed = ProcessPaymentSchema.parse(input);
    this.getMerchant(parsed.merchantId);

    const transaction: MerchantTransaction = {
      id: randomUUID(),
      merchantId: parsed.merchantId,
      customerId: parsed.customerId,
      amount: parsed.amount,
      currency: parsed.currency,
      type: 'payment',
      status: 'completed',
      description: parsed.description,
      createdAt: new Date(),
    };

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  getMerchantAnalytics(merchantId: string): MerchantAnalytics {
    this.getMerchant(merchantId);

    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalRefunds = 0;
    let currency = 'USD';

    for (const tx of this.transactions.values()) {
      if (tx.merchantId === merchantId) {
        if (tx.type === 'payment' && tx.status === 'completed') {
          totalRevenue += tx.amount;
          totalTransactions++;
          currency = tx.currency;
        } else if (tx.type === 'refund') {
          totalRefunds++;
          totalRevenue -= tx.amount;
        }
      }
    }

    return {
      merchantId,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTransactions,
      totalRefunds,
      averageTransactionAmount:
        totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
      currency,
    };
  }

  refundPayment(input: RefundPaymentInput): MerchantTransaction {
    const parsed = RefundPaymentSchema.parse(input);

    const originalTx = this.transactions.get(parsed.transactionId);
    if (!originalTx) {
      throw createAppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    if (originalTx.type !== 'payment') {
      throw createAppError('Can only refund payment transactions', 400, 'INVALID_REFUND');
    }

    if (originalTx.status === 'refunded') {
      throw createAppError('Transaction already refunded', 400, 'ALREADY_REFUNDED');
    }

    originalTx.status = 'refunded';

    const refundTx: MerchantTransaction = {
      id: randomUUID(),
      merchantId: originalTx.merchantId,
      customerId: originalTx.customerId,
      amount: originalTx.amount,
      currency: originalTx.currency,
      type: 'refund',
      status: 'completed',
      description: parsed.reason || `Refund for transaction ${originalTx.id}`,
      createdAt: new Date(),
    };

    this.transactions.set(refundTx.id, refundTx);
    return refundTx;
  }

  getTransactions(merchantId: string): MerchantTransaction[] {
    this.getMerchant(merchantId);
    const txList: MerchantTransaction[] = [];
    for (const tx of this.transactions.values()) {
      if (tx.merchantId === merchantId) {
        txList.push(tx);
      }
    }
    return txList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private getMerchant(merchantId: string): Merchant {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      throw createAppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }
    if (merchant.status === 'suspended') {
      throw createAppError('Merchant account is suspended', 403, 'MERCHANT_SUSPENDED');
    }
    return merchant;
  }
}
