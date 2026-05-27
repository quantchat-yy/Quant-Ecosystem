// ============================================================================
// Payments - UPI Payment Service Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { UPIPaymentService } from '../upi-payment.service';

describe('UPIPaymentService', () => {
  let service: UPIPaymentService;

  beforeEach(() => {
    service = new UPIPaymentService();
  });

  describe('generatePaymentLink', () => {
    it('should generate a valid UPI payment link', async () => {
      const payment = await service.generatePaymentLink(100, 'merchant@upi');

      expect(payment.id).toMatch(/^upay_/);
      expect(payment.upiId).toBe('merchant@upi');
      expect(payment.amount).toBe(100);
      expect(payment.currency).toBe('INR');
      expect(payment.status).toBe('pending');
      expect(payment.paymentLink).toContain('upi://pay');
      expect(payment.paymentLink).toContain('merchant@upi');
      expect(payment.paymentLink).toContain('am=100');
      expect(payment.transactionRef).toMatch(/^upi_/);
    });

    it('should include description in payment link', async () => {
      const payment = await service.generatePaymentLink(50, 'shop@paytm', 'Order 123');

      expect(payment.paymentLink).toContain('Order 123');
    });

    it('should reject zero amount', async () => {
      await expect(service.generatePaymentLink(0, 'test@upi')).rejects.toThrow();
    });

    it('should reject negative amount', async () => {
      await expect(service.generatePaymentLink(-10, 'test@upi')).rejects.toThrow();
    });

    it('should reject invalid UPI ID format', async () => {
      await expect(service.generatePaymentLink(100, 'invalid-upi')).rejects.toThrow();
    });

    it('should reject empty UPI ID', async () => {
      await expect(service.generatePaymentLink(100, '')).rejects.toThrow();
    });
  });

  describe('verifyPayment', () => {
    it('should verify a pending payment successfully', async () => {
      const payment = await service.generatePaymentLink(200, 'store@ybl');
      const result = await service.verifyPayment(payment.transactionRef);

      expect(result.verified).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment!.status).toBe('completed');
    });

    it('should return false for unknown transaction ref', async () => {
      const result = await service.verifyPayment('upi_unknown_ref');

      expect(result.verified).toBe(false);
      expect(result.payment).toBeUndefined();
    });

    it('should report already completed payment as verified', async () => {
      const payment = await service.generatePaymentLink(100, 'test@upi');
      await service.verifyPayment(payment.transactionRef);

      // Verify again - already completed
      const result = await service.verifyPayment(payment.transactionRef);
      expect(result.verified).toBe(true);
      expect(result.payment!.status).toBe('completed');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const payment = await service.generatePaymentLink(300, 'vendor@upi');
      const status = await service.getPaymentStatus(payment.transactionRef);

      expect(status).not.toBeNull();
      expect(status!.status).toBe('pending');
    });

    it('should return null for unknown reference', async () => {
      const status = await service.getPaymentStatus('unknown_ref');

      expect(status).toBeNull();
    });
  });

  describe('expirePayment', () => {
    it('should expire a pending payment', async () => {
      const payment = await service.generatePaymentLink(100, 'test@upi');
      const expired = await service.expirePayment(payment.transactionRef);

      expect(expired).not.toBeNull();
      expect(expired!.status).toBe('expired');
    });

    it('should not expire a completed payment', async () => {
      const payment = await service.generatePaymentLink(100, 'test@upi');
      await service.verifyPayment(payment.transactionRef);
      const result = await service.expirePayment(payment.transactionRef);

      expect(result!.status).toBe('completed');
    });

    it('should return null for unknown reference', async () => {
      const result = await service.expirePayment('unknown_ref');

      expect(result).toBeNull();
    });
  });
});
