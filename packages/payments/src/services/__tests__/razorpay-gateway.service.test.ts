// ============================================================================
// Payments - Razorpay Gateway Service Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { RazorpayGateway } from '../razorpay-gateway.service';

describe('RazorpayGateway', () => {
  let gateway: RazorpayGateway;

  beforeEach(() => {
    gateway = new RazorpayGateway();
  });

  describe('createOrder', () => {
    it('should create an order with specified amount and currency', async () => {
      const order = await gateway.createOrder(1000, 'INR');

      expect(order.id).toMatch(/^order_/);
      expect(order.amount).toBe(1000);
      expect(order.currency).toBe('INR');
      expect(order.status).toBe('created');
      expect(order.createdAt).toBeGreaterThan(0);
    });

    it('should default currency to INR', async () => {
      const order = await gateway.createOrder(500);

      expect(order.currency).toBe('INR');
    });

    it('should reject zero amount', async () => {
      await expect(gateway.createOrder(0)).rejects.toThrow();
    });

    it('should reject negative amount', async () => {
      await expect(gateway.createOrder(-100)).rejects.toThrow();
    });
  });

  describe('verifyPayment', () => {
    it('should verify a valid payment with correct signature', async () => {
      const order = await gateway.createOrder(1000, 'INR');
      const paymentId = 'pay_test_123';
      const signature = gateway.generateTestSignature(order.id, paymentId);

      const result = await gateway.verifyPayment(order.id, paymentId, signature);

      expect(result.verified).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment!.id).toBe(paymentId);
      expect(result.payment!.orderId).toBe(order.id);
      expect(result.payment!.amount).toBe(1000);
      expect(result.payment!.status).toBe('captured');
    });

    it('should reject payment with invalid signature', async () => {
      const order = await gateway.createOrder(1000, 'INR');
      const result = await gateway.verifyPayment(order.id, 'pay_123', 'invalid_sig');

      expect(result.verified).toBe(false);
      expect(result.payment).toBeUndefined();
    });

    it('should reject payment for non-existent order', async () => {
      const result = await gateway.verifyPayment('order_invalid', 'pay_123', 'sig');

      expect(result.verified).toBe(false);
    });

    it('should mark order as paid after verification', async () => {
      const order = await gateway.createOrder(1000, 'INR');
      const paymentId = 'pay_test_456';
      const signature = gateway.generateTestSignature(order.id, paymentId);

      await gateway.verifyPayment(order.id, paymentId, signature);
      const updatedOrder = await gateway.getOrder(order.id);

      expect(updatedOrder!.status).toBe('paid');
    });
  });

  describe('createPayout', () => {
    it('should create a payout with processing status', async () => {
      const payout = await gateway.createPayout('acc_123', 5000);

      expect(payout.id).toMatch(/^pout_/);
      expect(payout.accountId).toBe('acc_123');
      expect(payout.amount).toBe(5000);
      expect(payout.status).toBe('processing');
    });

    it('should reject zero amount payout', async () => {
      await expect(gateway.createPayout('acc_123', 0)).rejects.toThrow();
    });

    it('should reject empty account ID', async () => {
      await expect(gateway.createPayout('', 1000)).rejects.toThrow();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment after verification', async () => {
      const order = await gateway.createOrder(500, 'INR');
      const paymentId = 'pay_status_test';
      const signature = gateway.generateTestSignature(order.id, paymentId);

      await gateway.verifyPayment(order.id, paymentId, signature);
      const payment = await gateway.getPaymentStatus(paymentId);

      expect(payment).not.toBeNull();
      expect(payment!.id).toBe(paymentId);
      expect(payment!.status).toBe('captured');
    });

    it('should return null for unknown payment', async () => {
      const payment = await gateway.getPaymentStatus('pay_unknown');

      expect(payment).toBeNull();
    });
  });
});
