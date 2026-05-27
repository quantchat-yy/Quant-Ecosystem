// ============================================================================
// Payments - Razorpay Gateway Service
// Razorpay payment gateway integration (India market)
// ============================================================================

import { z } from 'zod';
import type { RazorpayPayment, CurrencyCode } from '../types';

export const CreateRazorpayOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
});

export const VerifyRazorpayPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export const CreatePayoutSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
});

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: CurrencyCode;
  status: 'created' | 'attempted' | 'paid';
  createdAt: number;
}

interface RazorpayPayout {
  id: string;
  accountId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

/**
 * RazorpayGateway - Razorpay payment gateway for India market
 *
 * Handles order creation, payment verification, payouts,
 * and payment status tracking. Uses in-memory simulation for testing.
 */
export class RazorpayGateway {
  private orders: Map<string, RazorpayOrder>;
  private payments: Map<string, RazorpayPayment>;
  private payouts: Map<string, RazorpayPayout>;

  constructor() {
    this.orders = new Map();
    this.payments = new Map();
    this.payouts = new Map();
  }

  /** Create a new Razorpay order */
  async createOrder(amount: number, currency: CurrencyCode = 'INR'): Promise<RazorpayOrder> {
    const validated = CreateRazorpayOrderSchema.parse({ amount, currency });

    const order: RazorpayOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: validated.amount,
      currency: currency,
      status: 'created',
      createdAt: Date.now(),
    };

    this.orders.set(order.id, order);
    return order;
  }

  /** Verify a Razorpay payment after checkout */
  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{ verified: boolean; payment?: RazorpayPayment }> {
    VerifyRazorpayPaymentSchema.parse({ orderId, paymentId, signature });

    const order = this.orders.get(orderId);
    if (!order) {
      return { verified: false };
    }

    // Simulate signature verification (in production, uses HMAC-SHA256)
    const expectedSignature = this.generateSignature(orderId, paymentId);
    if (signature !== expectedSignature) {
      return { verified: false };
    }

    const payment: RazorpayPayment = {
      id: paymentId,
      orderId,
      amount: order.amount,
      currency: order.currency,
      status: 'captured',
      method: 'upi',
      createdAt: Date.now(),
    };

    order.status = 'paid';
    this.payments.set(paymentId, payment);
    return { verified: true, payment };
  }

  /** Create a payout to a bank account via Razorpay */
  async createPayout(accountId: string, amount: number): Promise<RazorpayPayout> {
    CreatePayoutSchema.parse({ accountId, amount });

    const payout: RazorpayPayout = {
      id: `pout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      amount,
      status: 'processing',
      createdAt: Date.now(),
    };

    this.payouts.set(payout.id, payout);

    // Simulate async payout completion
    setTimeout(() => {
      payout.status = 'completed';
    }, 0);

    return payout;
  }

  /** Get payment status by payment ID */
  async getPaymentStatus(paymentId: string): Promise<RazorpayPayment | null> {
    return this.payments.get(paymentId) || null;
  }

  /** Get order by ID */
  async getOrder(orderId: string): Promise<RazorpayOrder | null> {
    return this.orders.get(orderId) || null;
  }

  /** Generate a signature for verification (simulated, private) */
  private generateSignature(orderId: string, paymentId: string): string {
    // In production this would be HMAC-SHA256(orderId + '|' + paymentId, secret)
    return `sig_${orderId}_${paymentId}`;
  }

  /**
   * Generate a test signature for use in test environments only.
   * In production, signatures come from Razorpay webhooks.
   */
  generateTestSignature(orderId: string, paymentId: string): string {
    return this.generateSignature(orderId, paymentId);
  }
}
