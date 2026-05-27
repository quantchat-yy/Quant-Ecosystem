// ============================================================================
// Payments - Quant Pro Service Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { QuantProService } from '../quant-pro.service';
import type { IAPReceipt } from '../../types';

describe('QuantProService', () => {
  let service: QuantProService;

  beforeEach(() => {
    service = new QuantProService();
  });

  describe('subscribe', () => {
    it('should subscribe user to pro_monthly plan', async () => {
      const state = await service.subscribe('user_1', 'pro_monthly', 'pm_card_123');

      expect(state.userId).toBe('user_1');
      expect(state.plan).toBe('pro_monthly');
      expect(state.subscriptionId).toBeDefined();
      expect(state.autoRenewing).toBe(true);
      expect(state.startedAt).toBeGreaterThan(0);
    });

    it('should subscribe user to pro_yearly plan', async () => {
      const state = await service.subscribe('user_1', 'pro_yearly');

      expect(state.plan).toBe('pro_yearly');
      expect(state.subscriptionId).toBeDefined();
    });

    it('should subscribe user to free plan', async () => {
      const state = await service.subscribe('user_1', 'free');

      expect(state.plan).toBe('free');
      expect(state.subscriptionId).toBeUndefined();
      expect(state.autoRenewing).toBe(false);
    });

    it('should reject duplicate subscription for active user', async () => {
      await service.subscribe('user_1', 'pro_monthly');
      await expect(service.subscribe('user_1', 'pro_yearly')).rejects.toThrow(
        'already has an active subscription',
      );
    });

    it('should allow re-subscription after cancellation', async () => {
      await service.subscribe('user_1', 'pro_monthly');
      await service.cancelSubscription('user_1');
      const state = await service.subscribe('user_1', 'pro_yearly');

      expect(state.plan).toBe('pro_yearly');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel an active subscription', async () => {
      await service.subscribe('user_1', 'pro_monthly');
      const state = await service.cancelSubscription('user_1');

      expect(state.cancelledAt).toBeGreaterThan(0);
      expect(state.autoRenewing).toBe(false);
    });

    it('should reject cancellation for non-existent user', async () => {
      await expect(service.cancelSubscription('unknown_user')).rejects.toThrow(
        'No subscription found',
      );
    });

    it('should reject cancellation of free plan', async () => {
      await service.subscribe('user_1', 'free');
      await expect(service.cancelSubscription('user_1')).rejects.toThrow('Cannot cancel free plan');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return current subscription state', async () => {
      await service.subscribe('user_1', 'pro_monthly');
      const status = await service.getSubscriptionStatus('user_1');

      expect(status.plan).toBe('pro_monthly');
      expect(status.userId).toBe('user_1');
    });

    it('should default to free plan for unknown user', async () => {
      const status = await service.getSubscriptionStatus('new_user');

      expect(status.plan).toBe('free');
      expect(status.autoRenewing).toBe(false);
    });
  });

  describe('isProFeatureEnabled', () => {
    it('should return true for pro features on pro plan', async () => {
      await service.subscribe('user_1', 'pro_monthly');

      expect(await service.isProFeatureEnabled('user_1', 'unlimited_ai')).toBe(true);
      expect(await service.isProFeatureEnabled('user_1', 'ad_free')).toBe(true);
      expect(await service.isProFeatureEnabled('user_1', 'priority_support')).toBe(true);
    });

    it('should return false for pro features on free plan', async () => {
      await service.subscribe('user_1', 'free');

      expect(await service.isProFeatureEnabled('user_1', 'unlimited_ai')).toBe(false);
      expect(await service.isProFeatureEnabled('user_1', 'ad_free')).toBe(false);
    });

    it('should return false for unknown user (defaults to free)', async () => {
      expect(await service.isProFeatureEnabled('unknown', 'unlimited_ai')).toBe(false);
    });
  });

  describe('validateIAPReceipt - Apple', () => {
    it('should validate a valid Apple receipt', async () => {
      const receipt: IAPReceipt = {
        platform: 'apple',
        receiptData: 'valid_apple_receipt_data_base64',
        transactionId: 'txn_apple_123',
        productId: 'com.quant.pro_monthly',
      };

      const result = await service.validateIAPReceipt(receipt);

      expect(result.valid).toBe(true);
      expect(result.platform).toBe('apple');
      expect(result.productId).toBe('com.quant.pro_monthly');
      expect(result.transactionId).toBe('txn_apple_123');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.autoRenewing).toBe(true);
    });

    it('should reject invalid Apple receipt data', async () => {
      const receipt: IAPReceipt = {
        platform: 'apple',
        receiptData: 'short',
        transactionId: 'txn_1',
        productId: 'com.quant.pro_monthly',
      };

      const result = await service.validateIAPReceipt(receipt);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid receipt data');
    });

    it('should set yearly expiration for yearly product', async () => {
      const receipt: IAPReceipt = {
        platform: 'apple',
        receiptData: 'valid_yearly_receipt_data_here',
        transactionId: 'txn_apple_yearly',
        productId: 'com.quant.pro_yearly',
      };

      const result = await service.validateIAPReceipt(receipt);
      const oneYearFromNow = Date.now() + 364 * 86400000;

      expect(result.valid).toBe(true);
      expect(result.expiresAt).toBeGreaterThan(oneYearFromNow);
    });
  });

  describe('validateIAPReceipt - Google', () => {
    it('should validate a valid Google receipt', async () => {
      const receipt: IAPReceipt = {
        platform: 'google',
        receiptData: 'valid_google_purchase_token_data',
        transactionId: 'GPA.1234-5678-9012',
        productId: 'com.quant.pro_monthly',
      };

      const result = await service.validateIAPReceipt(receipt);

      expect(result.valid).toBe(true);
      expect(result.platform).toBe('google');
      expect(result.productId).toBe('com.quant.pro_monthly');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.autoRenewing).toBe(true);
    });

    it('should reject invalid Google receipt data', async () => {
      const receipt: IAPReceipt = {
        platform: 'google',
        receiptData: 'bad',
        transactionId: 'GPA.123',
        productId: 'com.quant.pro_monthly',
      };

      const result = await service.validateIAPReceipt(receipt);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid receipt data');
    });
  });

  describe('syncIAPSubscription', () => {
    it('should sync Apple IAP subscription to local state', async () => {
      const receipt: IAPReceipt = {
        platform: 'apple',
        receiptData: 'valid_apple_receipt_sync_test',
        transactionId: 'txn_sync_apple',
        productId: 'com.quant.pro_monthly',
      };

      const state = await service.syncIAPSubscription('user_1', receipt);

      expect(state.userId).toBe('user_1');
      expect(state.plan).toBe('pro_monthly');
      expect(state.iapReceipt).toEqual(receipt);
      expect(state.autoRenewing).toBe(true);
    });

    it('should sync Google IAP subscription to local state', async () => {
      const receipt: IAPReceipt = {
        platform: 'google',
        receiptData: 'valid_google_receipt_sync_test',
        transactionId: 'GPA.sync_google',
        productId: 'com.quant.pro_yearly',
      };

      const state = await service.syncIAPSubscription('user_1', receipt);

      expect(state.plan).toBe('pro_yearly');
      expect(state.iapReceipt!.platform).toBe('google');
    });

    it('should reject sync with invalid receipt', async () => {
      const receipt: IAPReceipt = {
        platform: 'apple',
        receiptData: 'bad',
        transactionId: 'txn_bad',
        productId: 'com.quant.pro_monthly',
      };

      await expect(service.syncIAPSubscription('user_1', receipt)).rejects.toThrow(
        'IAP receipt validation failed',
      );
    });
  });

  describe('getPlanDetails', () => {
    it('should return correct details for pro_monthly', () => {
      const details = service.getPlanDetails('pro_monthly');

      expect(details.name).toBe('Quant Pro Monthly');
      expect(details.amount).toBe(9.99);
      expect(details.interval).toBe('monthly');
      expect(details.features).toContain('unlimited_ai');
    });

    it('should return correct details for pro_yearly', () => {
      const details = service.getPlanDetails('pro_yearly');

      expect(details.name).toBe('Quant Pro Yearly');
      expect(details.amount).toBe(99.99);
      expect(details.interval).toBe('yearly');
    });

    it('should return correct details for free', () => {
      const details = service.getPlanDetails('free');

      expect(details.amount).toBe(0);
      expect(details.features).toHaveLength(0);
    });
  });
});
