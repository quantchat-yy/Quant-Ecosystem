// ============================================================================
// quantmax — economy surface DTOs (Layer 5 request/response contracts)
// ============================================================================
//
// Frontend-facing shapes for the quant-economy api-client hooks (Task 14.4).
// Mirror the JSON the quantmax backend routes return
// (apps/quantmax/backend/routes/economy.ts), wrapping the as-shipped
// `@quant/quant-economy` coin/store/subscription/gifting engines.

export type SubscriptionTierName = 'Free' | 'Pro' | 'ProPlus' | 'Family';

export interface WalletResponse {
  balance: number;
  transactions: unknown[];
}

export interface StoreCatalogResponse {
  items: unknown[];
}

export interface PurchaseInput {
  itemId: string;
}

export interface PurchaseResponse {
  result: { success: boolean; message: string };
}

export interface SubscriptionResponse {
  tier: SubscriptionTierName;
  entitlements: string[];
}

export interface SubscribeInput {
  tier: SubscriptionTierName;
}

export interface SubscribeResponse {
  subscription: unknown;
}

export interface SendGiftInput {
  toUserId: string;
  itemId: string;
}

export interface SendGiftResponse {
  result: { success: boolean; message?: string; gift?: unknown };
}
