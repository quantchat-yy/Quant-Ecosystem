// ============================================================================
// quantmax — payments api-client hooks (Layer 5, Task 14.4)
// ============================================================================
//
// The ONLY sanctioned call path from a quantmax UI surface to the
// `@quant/payments` Stripe gateway: typed react-query hooks over the same-origin
// Next proxy paths under `/api/payments/*` (never inline fetch —
// Requirement 1.4). Each proxy forwards the bearer + x-request-id to the backend
// (Layer 4), which reaches the decorated payments engine behind the global auth
// hook (Layer 2/3). Mirrors the completed quantube payments hooks.
import { useApiQuery, useApiMutation } from '@quant/api-client';
import type { UseApiQueryOptions } from '@quant/api-client';
import type {
  CreateCustomerInput,
  CreateCustomerResponse,
  CreatePaymentIntentInput,
  CreatePaymentIntentResponse,
  PaymentsConfigResponse,
  RefundInput,
  RefundResponse,
} from './types';

/** POST /api/payments/intents — create a Stripe PaymentIntent. */
export function useCreatePaymentIntent() {
  return useApiMutation<CreatePaymentIntentInput, CreatePaymentIntentResponse>(
    '/api/payments/intents',
  );
}

/** POST /api/payments/customers — create a Stripe Customer. */
export function useCreateCustomer() {
  return useApiMutation<CreateCustomerInput, CreateCustomerResponse>('/api/payments/customers');
}

/** POST /api/payments/refunds — refund a Stripe PaymentIntent. */
export function useRefund() {
  return useApiMutation<RefundInput, RefundResponse>('/api/payments/refunds');
}

/** GET /api/payments/config — non-sensitive integration metadata (test-mode). */
export function usePaymentsConfig(options?: UseApiQueryOptions) {
  return useApiQuery<PaymentsConfigResponse>('/api/payments/config', options);
}
