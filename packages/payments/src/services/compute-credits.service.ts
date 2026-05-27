// ============================================================================
// Payments - Compute Credits Service
// Quant Compute Credits for pay-per-AI-action billing
// ============================================================================

import { z } from 'zod';
import type { ComputeCredits, CreditUsage, AIActionType } from '../types';

/** Credit costs per AI action type */
export const AI_ACTION_COSTS: Record<AIActionType, number> = {
  gpt4: 10,
  gpt35: 2,
  claude3: 8,
  llama3: 1,
  stable_diffusion: 15,
  whisper: 5,
  custom: 3,
};

export const PurchaseCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
});

export const DeductCreditsSchema = z.object({
  userId: z.string().min(1),
  actionType: z.enum([
    'gpt4',
    'gpt35',
    'claude3',
    'llama3',
    'stable_diffusion',
    'whisper',
    'custom',
  ]),
  description: z.string().optional(),
});

/**
 * ComputeCreditsService - Quant Compute Credits for AI actions
 *
 * Users purchase credits and spend them on AI-powered actions.
 * Each action type has a fixed credit cost.
 */
export class ComputeCreditsService {
  private readonly balances: Map<string, ComputeCredits> = new Map();
  private readonly usageHistory: Map<string, CreditUsage[]> = new Map();

  /**
   * Purchase credits for a user
   */
  purchaseCredits(params: { userId: string; amount: number }): ComputeCredits {
    const validated = PurchaseCreditsSchema.parse(params);

    let credits = this.balances.get(validated.userId);
    if (!credits) {
      credits = {
        userId: validated.userId,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0,
      };
      this.balances.set(validated.userId, credits);
    }

    credits.balance += validated.amount;
    credits.totalPurchased += validated.amount;
    credits.lastPurchaseAt = Date.now();

    return { ...credits };
  }

  /**
   * Deduct credits for an AI action
   */
  deductCredits(params: {
    userId: string;
    actionType: AIActionType;
    description?: string;
  }): CreditUsage {
    const validated = DeductCreditsSchema.parse(params);

    const credits = this.balances.get(validated.userId);
    if (!credits) {
      throw new Error('No credit balance found for user');
    }

    const cost = AI_ACTION_COSTS[validated.actionType];
    if (credits.balance < cost) {
      throw new Error(`Insufficient credits: need ${cost}, have ${credits.balance}`);
    }

    credits.balance -= cost;
    credits.totalUsed += cost;
    credits.lastUsageAt = Date.now();

    const usage: CreditUsage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: validated.userId,
      actionType: validated.actionType,
      creditsUsed: cost,
      description: validated.description || `${validated.actionType} action`,
      timestamp: Date.now(),
    };

    if (!this.usageHistory.has(validated.userId)) {
      this.usageHistory.set(validated.userId, []);
    }
    this.usageHistory.get(validated.userId)!.push(usage);

    return usage;
  }

  /**
   * Get current credit balance for a user
   */
  getBalance(userId: string): ComputeCredits {
    const credits = this.balances.get(userId);
    if (!credits) {
      return {
        userId,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0,
      };
    }
    return { ...credits };
  }

  /**
   * Get usage history for a user
   */
  getUsageHistory(userId: string): CreditUsage[] {
    return (this.usageHistory.get(userId) || []).sort((a, b) => b.timestamp - a.timestamp);
  }
}
