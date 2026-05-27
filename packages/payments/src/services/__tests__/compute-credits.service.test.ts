// ============================================================================
// Payments - Compute Credits Service Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ComputeCreditsService, AI_ACTION_COSTS } from '../compute-credits.service';

describe('ComputeCreditsService', () => {
  let service: ComputeCreditsService;

  beforeEach(() => {
    service = new ComputeCreditsService();
  });

  describe('purchaseCredits', () => {
    it('should add credits to user balance', () => {
      const credits = service.purchaseCredits({ userId: 'user_1', amount: 100 });

      expect(credits.userId).toBe('user_1');
      expect(credits.balance).toBe(100);
      expect(credits.totalPurchased).toBe(100);
      expect(credits.totalUsed).toBe(0);
      expect(credits.lastPurchaseAt).toBeDefined();
    });

    it('should accumulate credits across purchases', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 50 });
      const credits = service.purchaseCredits({ userId: 'user_1', amount: 75 });

      expect(credits.balance).toBe(125);
      expect(credits.totalPurchased).toBe(125);
    });

    it('should reject zero amount', () => {
      expect(() => service.purchaseCredits({ userId: 'user_1', amount: 0 })).toThrow();
    });

    it('should reject negative amount', () => {
      expect(() => service.purchaseCredits({ userId: 'user_1', amount: -10 })).toThrow();
    });

    it('should reject non-integer amount', () => {
      expect(() => service.purchaseCredits({ userId: 'user_1', amount: 10.5 })).toThrow();
    });
  });

  describe('deductCredits', () => {
    it('should deduct correct cost for gpt4', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 100 });

      const usage = service.deductCredits({ userId: 'user_1', actionType: 'gpt4' });

      expect(usage.actionType).toBe('gpt4');
      expect(usage.creditsUsed).toBe(10);

      const balance = service.getBalance('user_1');
      expect(balance.balance).toBe(90);
    });

    it('should deduct correct cost for gpt35', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 10 });

      const usage = service.deductCredits({ userId: 'user_1', actionType: 'gpt35' });
      expect(usage.creditsUsed).toBe(2);
    });

    it('should deduct correct cost for claude3', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 20 });

      const usage = service.deductCredits({ userId: 'user_1', actionType: 'claude3' });
      expect(usage.creditsUsed).toBe(8);
    });

    it('should deduct correct cost for stable_diffusion', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 20 });

      const usage = service.deductCredits({
        userId: 'user_1',
        actionType: 'stable_diffusion',
      });
      expect(usage.creditsUsed).toBe(15);
    });

    it('should throw when insufficient credits', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 5 });

      expect(() => service.deductCredits({ userId: 'user_1', actionType: 'gpt4' })).toThrow(
        'Insufficient credits',
      );
    });

    it('should throw when user has no balance', () => {
      expect(() => service.deductCredits({ userId: 'user_new', actionType: 'gpt35' })).toThrow(
        'No credit balance found',
      );
    });

    it('should use custom description when provided', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 50 });

      const usage = service.deductCredits({
        userId: 'user_1',
        actionType: 'whisper',
        description: 'Transcribe podcast ep 42',
      });

      expect(usage.description).toBe('Transcribe podcast ep 42');
    });
  });

  describe('getBalance', () => {
    it('should return balance for existing user', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 50 });
      service.deductCredits({ userId: 'user_1', actionType: 'llama3' });

      const balance = service.getBalance('user_1');
      expect(balance.balance).toBe(49);
      expect(balance.totalPurchased).toBe(50);
      expect(balance.totalUsed).toBe(1);
    });

    it('should return zero balance for unknown user', () => {
      const balance = service.getBalance('nonexistent');
      expect(balance.balance).toBe(0);
      expect(balance.totalPurchased).toBe(0);
      expect(balance.totalUsed).toBe(0);
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history sorted by timestamp descending', () => {
      service.purchaseCredits({ userId: 'user_1', amount: 100 });

      service.deductCredits({ userId: 'user_1', actionType: 'gpt35' });
      service.deductCredits({ userId: 'user_1', actionType: 'gpt4' });
      service.deductCredits({ userId: 'user_1', actionType: 'whisper' });

      const history = service.getUsageHistory('user_1');
      expect(history).toHaveLength(3);
      expect(history[0]!.timestamp).toBeGreaterThanOrEqual(history[1]!.timestamp);
      expect(history[1]!.timestamp).toBeGreaterThanOrEqual(history[2]!.timestamp);
    });

    it('should return empty array for no usage', () => {
      expect(service.getUsageHistory('user_1')).toHaveLength(0);
    });
  });

  describe('AI_ACTION_COSTS', () => {
    it('should have correct cost values', () => {
      expect(AI_ACTION_COSTS.gpt4).toBe(10);
      expect(AI_ACTION_COSTS.gpt35).toBe(2);
      expect(AI_ACTION_COSTS.claude3).toBe(8);
      expect(AI_ACTION_COSTS.llama3).toBe(1);
      expect(AI_ACTION_COSTS.stable_diffusion).toBe(15);
      expect(AI_ACTION_COSTS.whisper).toBe(5);
      expect(AI_ACTION_COSTS.custom).toBe(3);
    });
  });
});
