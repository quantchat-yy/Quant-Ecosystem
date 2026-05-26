import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly';
  features: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface BillingRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'failed' | 'refunded';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  price: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  interval: z.enum(['monthly', 'yearly', 'weekly']),
  features: z.array(z.string()).default([]),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const SubscribeToPlanSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
});

export type SubscribeToPlanInput = z.infer<typeof SubscribeToPlanSchema>;

export const UpgradePlanSchema = z.object({
  subscriptionId: z.string().min(1),
  newPlanId: z.string().min(1),
});

export type UpgradePlanInput = z.infer<typeof UpgradePlanSchema>;

export class SubscriptionManagementService {
  private readonly plans = new Map<string, SubscriptionPlan>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly billingRecords: BillingRecord[] = [];

  createPlan(input: CreatePlanInput): SubscriptionPlan {
    const parsed = CreatePlanSchema.parse(input);

    const plan: SubscriptionPlan = {
      id: randomUUID(),
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      currency: parsed.currency,
      interval: parsed.interval,
      features: parsed.features,
      isActive: true,
      createdAt: new Date(),
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  subscribeToPlan(input: SubscribeToPlanInput): Subscription {
    const parsed = SubscribeToPlanSchema.parse(input);

    const plan = this.plans.get(parsed.planId);
    if (!plan) {
      throw createAppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    if (!plan.isActive) {
      throw createAppError('Plan is no longer available', 400, 'PLAN_INACTIVE');
    }

    for (const sub of this.subscriptions.values()) {
      if (sub.userId === parsed.userId && sub.planId === parsed.planId && sub.status === 'active') {
        throw createAppError('Already subscribed to this plan', 409, 'ALREADY_SUBSCRIBED');
      }
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, plan.interval);

    const subscription: Subscription = {
      id: randomUUID(),
      userId: parsed.userId,
      planId: parsed.planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
      createdAt: now,
    };

    this.subscriptions.set(subscription.id, subscription);

    const billing: BillingRecord = {
      id: randomUUID(),
      subscriptionId: subscription.id,
      userId: parsed.userId,
      amount: plan.price,
      currency: plan.currency,
      status: 'paid',
      periodStart: now,
      periodEnd: periodEnd,
      createdAt: now,
    };
    this.billingRecords.push(billing);

    return subscription;
  }

  cancelSubscription(subscriptionId: string): Subscription {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw createAppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (subscription.status === 'cancelled') {
      throw createAppError('Subscription is already cancelled', 400, 'ALREADY_CANCELLED');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    return subscription;
  }

  upgradePlan(input: UpgradePlanInput): Subscription {
    const parsed = UpgradePlanSchema.parse(input);

    const subscription = this.subscriptions.get(parsed.subscriptionId);
    if (!subscription) {
      throw createAppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (subscription.status !== 'active') {
      throw createAppError('Can only upgrade active subscriptions', 400, 'SUBSCRIPTION_NOT_ACTIVE');
    }

    const newPlan = this.plans.get(parsed.newPlanId);
    if (!newPlan) {
      throw createAppError('New plan not found', 404, 'PLAN_NOT_FOUND');
    }

    if (!newPlan.isActive) {
      throw createAppError('New plan is not available', 400, 'PLAN_INACTIVE');
    }

    subscription.planId = parsed.newPlanId;
    const now = new Date();
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(now, newPlan.interval);

    const billing: BillingRecord = {
      id: randomUUID(),
      subscriptionId: subscription.id,
      userId: subscription.userId,
      amount: newPlan.price,
      currency: newPlan.currency,
      status: 'paid',
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      createdAt: now,
    };
    this.billingRecords.push(billing);

    return subscription;
  }

  getBillingHistory(userId: string): BillingRecord[] {
    return this.billingRecords
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getActivePlans(): SubscriptionPlan[] {
    const plans: SubscriptionPlan[] = [];
    for (const plan of this.plans.values()) {
      if (plan.isActive) {
        plans.push(plan);
      }
    }
    return plans;
  }

  private calculatePeriodEnd(start: Date, interval: string): Date {
    const end = new Date(start);
    switch (interval) {
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }
}
