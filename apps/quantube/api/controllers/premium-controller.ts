// ============================================================================
// QuantTube - Premium Controller
// Handles premium subscription management, plans, payments, and features
// ============================================================================

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annual' | 'family';
  features: string[];
  maxUsers: number;
  trialDays: number;
}

interface PremiumSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod: PaymentMethod;
  trialEndsAt?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'google_pay' | 'apple_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

interface PaymentHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  date: string;
  invoiceUrl?: string;
}

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    price: 11.99,
    interval: 'monthly',
    features: ['Ad-free viewing', 'Background play', 'Offline downloads', 'Premium music access', '4K streaming', 'Exclusive content'],
    maxUsers: 1,
    trialDays: 30,
  },
  {
    id: 'annual',
    name: 'Premium Annual',
    price: 119.99,
    interval: 'annual',
    features: ['Ad-free viewing', 'Background play', 'Offline downloads', 'Premium music access', '4K streaming', 'Exclusive content', '2 months free'],
    maxUsers: 1,
    trialDays: 30,
  },
  {
    id: 'family',
    name: 'Premium Family',
    price: 22.99,
    interval: 'monthly',
    features: ['Ad-free viewing', 'Background play', 'Offline downloads', 'Premium music access', '4K streaming', 'Exclusive content', 'Up to 6 family members', 'Family mix playlist'],
    maxUsers: 6,
    trialDays: 30,
  },
];

const subscriptions: Map<string, PremiumSubscription> = new Map();
const paymentHistory: Map<string, PaymentHistory[]> = new Map();

export class PremiumController {
  async getPlans(req: any): Promise<{ status: number; body: any }> {
    return {
      status: 200,
      body: {
        plans: PREMIUM_PLANS,
        currency: 'USD',
        trialAvailable: true,
      },
    };
  }

  async getSubscription(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return {
        status: 200,
        body: { subscription: null, isActive: false, plans: PREMIUM_PLANS },
      };
    }

    const plan = PREMIUM_PLANS.find(p => p.id === subscription.planId);
    return {
      status: 200,
      body: {
        subscription,
        plan,
        isActive: subscription.status === 'active' || subscription.status === 'trial',
        daysRemaining: Math.max(0, Math.floor((new Date(subscription.endDate).getTime() - Date.now()) / 86400000)),
      },
    };
  }

  async subscribe(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    const { planId, paymentMethodId, startTrial } = req.body || {};

    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    if (!planId) {
      return { status: 400, body: { error: 'Plan ID is required' } };
    }

    const plan = PREMIUM_PLANS.find(p => p.id === planId);
    if (!plan) {
      return { status: 404, body: { error: 'Plan not found' } };
    }

    const existing = subscriptions.get(userId);
    if (existing && (existing.status === 'active' || existing.status === 'trial')) {
      return { status: 409, body: { error: 'Already subscribed. Cancel current subscription first or change plan.' } };
    }

    const now = new Date();
    const endDate = new Date(now);
    if (startTrial && plan.trialDays > 0) {
      endDate.setDate(endDate.getDate() + plan.trialDays);
    } else if (plan.interval === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription: PremiumSubscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId,
      status: startTrial ? 'trial' : 'active',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: true,
      paymentMethod: {
        id: paymentMethodId || 'pm_default',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2027,
      },
      trialEndsAt: startTrial ? endDate.toISOString() : undefined,
    };

    subscriptions.set(userId, subscription);

    if (!startTrial) {
      const payment: PaymentHistory = {
        id: `pay_${Date.now()}`,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: 'USD',
        status: 'succeeded',
        date: now.toISOString(),
      };
      const history = paymentHistory.get(userId) || [];
      history.push(payment);
      paymentHistory.set(userId, history);
    }

    return {
      status: 201,
      body: { subscription, plan, message: startTrial ? 'Trial started successfully' : 'Subscription activated' },
    };
  }

  async cancelSubscription(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return { status: 404, body: { error: 'No active subscription found' } };
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscriptions.set(userId, subscription);

    return {
      status: 200,
      body: {
        message: 'Subscription cancelled. You can still access premium features until the end of your billing period.',
        accessUntil: subscription.endDate,
      },
    };
  }

  async changePlan(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    const { newPlanId } = req.body || {};

    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const subscription = subscriptions.get(userId);
    if (!subscription || subscription.status === 'cancelled' || subscription.status === 'expired') {
      return { status: 404, body: { error: 'No active subscription to change' } };
    }

    const newPlan = PREMIUM_PLANS.find(p => p.id === newPlanId);
    if (!newPlan) {
      return { status: 404, body: { error: 'New plan not found' } };
    }

    if (subscription.planId === newPlanId) {
      return { status: 400, body: { error: 'Already on this plan' } };
    }

    const oldPlanId = subscription.planId;
    subscription.planId = newPlanId;
    subscriptions.set(userId, subscription);

    return {
      status: 200,
      body: {
        message: `Plan changed from ${oldPlanId} to ${newPlanId}`,
        subscription,
        newPlan,
        effectiveDate: new Date().toISOString(),
      },
    };
  }

  async getPaymentHistory(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const history = paymentHistory.get(userId) || [];
    return {
      status: 200,
      body: {
        payments: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        total: history.length,
      },
    };
  }

  async updatePaymentMethod(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    const { type, token, last4, brand, expiryMonth, expiryYear } = req.body || {};

    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return { status: 404, body: { error: 'No subscription found' } };
    }

    subscription.paymentMethod = {
      id: `pm_${Date.now()}`,
      type: type || 'card',
      last4: last4 || '0000',
      brand: brand || 'Unknown',
      expiryMonth: expiryMonth || 12,
      expiryYear: expiryYear || 2028,
    };
    subscriptions.set(userId, subscription);

    return {
      status: 200,
      body: { message: 'Payment method updated', paymentMethod: subscription.paymentMethod },
    };
  }

  async getExclusiveContent(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    const subscription = subscriptions.get(userId);
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
      return { status: 403, body: { error: 'Premium subscription required to access exclusive content' } };
    }

    const exclusiveContent = [
      { id: 'exc-1', title: 'Behind the Scenes: QuantTube', type: 'documentary', thumbnail: '/thumbs/exc1.jpg', duration: 3600 },
      { id: 'exc-2', title: 'Premium Music Mix: Chill Beats', type: 'music', thumbnail: '/thumbs/exc2.jpg', duration: 7200 },
      { id: 'exc-3', title: 'Creator Masterclass: Cinematography', type: 'education', thumbnail: '/thumbs/exc3.jpg', duration: 5400 },
      { id: 'exc-4', title: 'Exclusive Live Concert Recording', type: 'live', thumbnail: '/thumbs/exc4.jpg', duration: 9000 },
      { id: 'exc-5', title: 'Early Access: New Series Episode', type: 'series', thumbnail: '/thumbs/exc5.jpg', duration: 2700 },
    ];

    return {
      status: 200,
      body: { content: exclusiveContent, total: exclusiveContent.length },
    };
  }

  async redeemCode(req: any): Promise<{ status: number; body: any }> {
    const userId = req.params?.userId || req.headers?.['x-user-id'];
    const { code } = req.body || {};

    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } };
    }

    if (!code || code.length < 8) {
      return { status: 400, body: { error: 'Invalid redemption code' } };
    }

    const validCodes: Record<string, { planId: string; durationDays: number }> = {
      'PREMIUM30': { planId: 'monthly', durationDays: 30 },
      'ANNUAL365': { planId: 'annual', durationDays: 365 },
    };

    const redemption = validCodes[code.toUpperCase()];
    if (!redemption) {
      return { status: 404, body: { error: 'Code not found or already redeemed' } };
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + redemption.durationDays);

    const subscription: PremiumSubscription = {
      id: `sub_code_${Date.now()}`,
      userId,
      planId: redemption.planId,
      status: 'active',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: false,
      paymentMethod: { id: 'redeemed', type: 'card' },
    };

    subscriptions.set(userId, subscription);

    return {
      status: 200,
      body: { message: 'Code redeemed successfully', subscription, daysGranted: redemption.durationDays },
    };
  }
}

export default new PremiumController();
