// ============================================================================
// quantmax — economy api-client hooks (Layer 5, Task 14.4)
// ============================================================================
//
// The ONLY sanctioned call path from a quantmax UI surface to the
// `@quant/quant-economy` engines: typed react-query hooks over the same-origin
// Next proxy paths under `/api/economy/*` (never inline fetch —
// Requirement 1.4). Each proxy forwards the bearer + x-request-id to the backend
// (Layer 4), which reaches the decorated economy engine behind the global auth
// hook (Layer 2/3). quant-economy `dependsOn @quant/payments` (the money rail).
import { useApiQuery, useApiMutation } from '@quant/api-client';
import type { UseApiQueryOptions } from '@quant/api-client';
import type {
  PurchaseInput,
  PurchaseResponse,
  SendGiftInput,
  SendGiftResponse,
  StoreCatalogResponse,
  SubscribeInput,
  SubscribeResponse,
  SubscriptionResponse,
  WalletResponse,
} from './types';

/** GET /api/economy/wallet — the caller's coin wallet + balance. */
export function useWallet(options?: UseApiQueryOptions) {
  return useApiQuery<WalletResponse>('/api/economy/wallet', options);
}

/** GET /api/economy/store/catalog — the virtual goods catalog. */
export function useStoreCatalog(options?: UseApiQueryOptions) {
  return useApiQuery<StoreCatalogResponse>('/api/economy/store/catalog', options);
}

/** POST /api/economy/store/purchase — buy a virtual good with coins. */
export function usePurchaseItem() {
  return useApiMutation<PurchaseInput, PurchaseResponse>('/api/economy/store/purchase');
}

/** GET /api/economy/subscription — the caller's current tier + entitlements. */
export function useSubscription(options?: UseApiQueryOptions) {
  return useApiQuery<SubscriptionResponse>('/api/economy/subscription', options);
}

/** POST /api/economy/subscription — subscribe the caller to a tier. */
export function useSubscribe() {
  return useApiMutation<SubscribeInput, SubscribeResponse>('/api/economy/subscription');
}

/** POST /api/economy/gifts — send a virtual good gift to another user. */
export function useSendGift() {
  return useApiMutation<SendGiftInput, SendGiftResponse>('/api/economy/gifts');
}
