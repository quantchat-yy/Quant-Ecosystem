// ============================================================================
// Payments - UPI Payment Service
// UPI payment integration for India market
// ============================================================================

import { z } from 'zod';
import type { UPIPayment, CurrencyCode } from '../types';

export const GenerateUPIPaymentLinkSchema = z.object({
  amount: z.number().positive(),
  upiId: z
    .string()
    .min(1)
    .regex(/^[\w.-]+@[\w]+$/, 'Invalid UPI ID format'),
});

export const VerifyUPIPaymentSchema = z.object({
  transactionRef: z.string().min(1),
});

/**
 * UPIPaymentService - UPI payment handling for India market
 *
 * Generates payment links, verifies transactions, and tracks
 * payment status. Uses in-memory simulation for testing.
 */
export class UPIPaymentService {
  private payments: Map<string, UPIPayment>;

  constructor() {
    this.payments = new Map();
  }

  /** Generate a UPI payment link */
  async generatePaymentLink(
    amount: number,
    upiId: string,
    description?: string,
  ): Promise<UPIPayment> {
    GenerateUPIPaymentLinkSchema.parse({ amount, upiId });

    const transactionRef = `upi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payment: UPIPayment = {
      id: `upay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      upiId,
      amount,
      currency: 'INR' as CurrencyCode,
      status: 'pending',
      paymentLink: `upi://pay?pa=${upiId}&pn=Quant&am=${amount}&cu=INR&tn=${description || 'Payment'}`,
      transactionRef,
      createdAt: Date.now(),
    };

    this.payments.set(transactionRef, payment);
    return payment;
  }

  /** Verify a UPI payment by transaction reference */
  async verifyPayment(
    transactionRef: string,
  ): Promise<{ verified: boolean; payment?: UPIPayment }> {
    VerifyUPIPaymentSchema.parse({ transactionRef });

    const payment = this.payments.get(transactionRef);
    if (!payment) {
      return { verified: false };
    }

    if (payment.status === 'pending') {
      // Simulate successful payment verification
      payment.status = 'completed';
      return { verified: true, payment };
    }

    return { verified: payment.status === 'completed', payment };
  }

  /** Get payment status by transaction reference */
  async getPaymentStatus(ref: string): Promise<UPIPayment | null> {
    return this.payments.get(ref) || null;
  }

  /** Expire a pending payment (e.g., timeout after 15 minutes) */
  async expirePayment(transactionRef: string): Promise<UPIPayment | null> {
    const payment = this.payments.get(transactionRef);
    if (!payment) return null;

    if (payment.status === 'pending') {
      payment.status = 'expired';
    }
    return payment;
  }
}
