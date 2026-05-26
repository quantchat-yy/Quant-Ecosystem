import { describe, it, expect, beforeEach } from 'vitest';
import { MerchantService } from '../services/merchant.service';
import type {
  RegisterMerchantInput,
  CreateInvoiceInput,
  GenerateQRCodeInput,
  ProcessPaymentInput,
} from '../services/merchant.service';

describe('MerchantService', () => {
  let service: MerchantService;

  beforeEach(() => {
    service = new MerchantService();
  });

  describe('registerMerchant', () => {
    it('registers a new merchant', () => {
      const input: RegisterMerchantInput = {
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      };

      const merchant = service.registerMerchant(input);

      expect(merchant.id).toBeDefined();
      expect(merchant.userId).toBe('user-1');
      expect(merchant.businessName).toBe('Coffee Shop');
      expect(merchant.businessType).toBe('Food & Beverage');
      expect(merchant.email).toBe('shop@example.com');
      expect(merchant.status).toBe('active');
      expect(merchant.createdAt).toBeInstanceOf(Date);
    });

    it('throws MERCHANT_EXISTS if user already registered', () => {
      service.registerMerchant({
        userId: 'user-1',
        businessName: 'Shop A',
        businessType: 'Retail',
        email: 'a@example.com',
      });

      expect(() =>
        service.registerMerchant({
          userId: 'user-1',
          businessName: 'Shop B',
          businessType: 'Retail',
          email: 'b@example.com',
        }),
      ).toThrow('User already registered as merchant');
    });

    it('generates unique merchant IDs', () => {
      const m1 = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Shop A',
        businessType: 'Retail',
        email: 'a@example.com',
      });
      const m2 = service.registerMerchant({
        userId: 'user-2',
        businessName: 'Shop B',
        businessType: 'Retail',
        email: 'b@example.com',
      });

      expect(m1.id).not.toBe(m2.id);
    });
  });

  describe('createInvoice', () => {
    it('creates an invoice for a registered merchant', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      });

      const input: CreateInvoiceInput = {
        merchantId: merchant.id,
        customerId: 'customer-1',
        amount: 45.99,
        currency: 'USD',
        description: 'Monthly subscription',
        dueDate: '2025-12-31',
      };

      const invoice = service.createInvoice(input);

      expect(invoice.id).toBeDefined();
      expect(invoice.merchantId).toBe(merchant.id);
      expect(invoice.customerId).toBe('customer-1');
      expect(invoice.amount).toBe(45.99);
      expect(invoice.status).toBe('pending');
      expect(invoice.paidAt).toBeNull();
    });

    it('throws MERCHANT_NOT_FOUND for non-existent merchant', () => {
      expect(() =>
        service.createInvoice({
          merchantId: 'non-existent',
          customerId: 'customer-1',
          amount: 10,
          currency: 'USD',
          description: 'Test',
          dueDate: '2025-12-31',
        }),
      ).toThrow('Merchant not found');
    });
  });

  describe('generateQRCode', () => {
    it('generates a QR code for payment', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      });

      const input: GenerateQRCodeInput = {
        merchantId: merchant.id,
        amount: 15.5,
        currency: 'USD',
        description: 'Latte',
        expiresInMinutes: 30,
      };

      const qrCode = service.generateQRCode(input);

      expect(qrCode.id).toBeDefined();
      expect(qrCode.merchantId).toBe(merchant.id);
      expect(qrCode.amount).toBe(15.5);
      expect(qrCode.payload).toContain('quantpay://pay/');
      expect(qrCode.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('throws MERCHANT_NOT_FOUND for non-existent merchant', () => {
      expect(() =>
        service.generateQRCode({
          merchantId: 'non-existent',
          amount: 10,
          currency: 'USD',
          description: '',
          expiresInMinutes: 30,
        }),
      ).toThrow('Merchant not found');
    });
  });

  describe('processPayment', () => {
    it('processes a payment successfully', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      });

      const input: ProcessPaymentInput = {
        merchantId: merchant.id,
        customerId: 'customer-1',
        amount: 25.0,
        currency: 'USD',
        description: 'Coffee and pastry',
      };

      const transaction = service.processPayment(input);

      expect(transaction.id).toBeDefined();
      expect(transaction.merchantId).toBe(merchant.id);
      expect(transaction.amount).toBe(25.0);
      expect(transaction.type).toBe('payment');
      expect(transaction.status).toBe('completed');
    });
  });

  describe('refundPayment', () => {
    it('refunds a completed payment', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      });

      const payment = service.processPayment({
        merchantId: merchant.id,
        customerId: 'customer-1',
        amount: 50,
        currency: 'USD',
        description: 'Order',
      });

      const refund = service.refundPayment({
        transactionId: payment.id,
        reason: 'Customer complaint',
      });

      expect(refund.type).toBe('refund');
      expect(refund.amount).toBe(50);
      expect(refund.status).toBe('completed');
    });

    it('throws TRANSACTION_NOT_FOUND for non-existent transaction', () => {
      expect(() => service.refundPayment({ transactionId: 'non-existent', reason: '' })).toThrow(
        'Transaction not found',
      );
    });

    it('throws ALREADY_REFUNDED for already refunded transaction', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Shop',
        businessType: 'Retail',
        email: 'shop@example.com',
      });

      const payment = service.processPayment({
        merchantId: merchant.id,
        customerId: 'customer-1',
        amount: 30,
        currency: 'USD',
        description: 'Item',
      });

      service.refundPayment({ transactionId: payment.id, reason: 'First refund' });

      expect(() =>
        service.refundPayment({ transactionId: payment.id, reason: 'Second refund' }),
      ).toThrow('Transaction already refunded');
    });
  });

  describe('getMerchantAnalytics', () => {
    it('returns analytics for a merchant with transactions', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Coffee Shop',
        businessType: 'Food & Beverage',
        email: 'shop@example.com',
      });

      service.processPayment({
        merchantId: merchant.id,
        customerId: 'c1',
        amount: 10,
        currency: 'USD',
        description: '',
      });
      service.processPayment({
        merchantId: merchant.id,
        customerId: 'c2',
        amount: 20,
        currency: 'USD',
        description: '',
      });

      const analytics = service.getMerchantAnalytics(merchant.id);

      expect(analytics.totalRevenue).toBe(30);
      expect(analytics.totalTransactions).toBe(2);
      expect(analytics.averageTransactionAmount).toBe(15);
    });

    it('returns zero analytics for merchant with no transactions', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'New Shop',
        businessType: 'Retail',
        email: 'new@example.com',
      });

      const analytics = service.getMerchantAnalytics(merchant.id);

      expect(analytics.totalRevenue).toBe(0);
      expect(analytics.totalTransactions).toBe(0);
      expect(analytics.averageTransactionAmount).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('returns all transactions for a merchant', () => {
      const merchant = service.registerMerchant({
        userId: 'user-1',
        businessName: 'Shop',
        businessType: 'Retail',
        email: 'shop@example.com',
      });

      service.processPayment({
        merchantId: merchant.id,
        customerId: 'c1',
        amount: 10,
        currency: 'USD',
        description: '',
      });
      service.processPayment({
        merchantId: merchant.id,
        customerId: 'c2',
        amount: 20,
        currency: 'USD',
        description: '',
      });

      const transactions = service.getTransactions(merchant.id);

      expect(transactions).toHaveLength(2);
    });

    it('throws MERCHANT_NOT_FOUND for non-existent merchant', () => {
      expect(() => service.getTransactions('non-existent')).toThrow('Merchant not found');
    });
  });
});
