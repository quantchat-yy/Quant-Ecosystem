// ============================================================================
// quantmax — payments surface DTOs (Layer 5 request/response contracts)
// ============================================================================
//
// Frontend-facing shapes for the payments api-client hooks (Task 14.4). Mirror
// the JSON the quantmax backend routes return
// (apps/quantmax/backend/routes/payments.ts), wrapping the as-shipped
// `@quant/payments` Stripe gateway. NO secret material is ever surfaced to the
// client — only ids/status/test-mode metadata.

export interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  id: string;
  clientSecret: string | null;
  status: string;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerResponse {
  id: string;
  email: string | null;
}

export interface RefundInput {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export interface RefundResponse {
  id: string;
  status: string | null;
  amount: number;
}

export interface PaymentsConfigResponse {
  /** True when the backend runs against a Stripe TEST placeholder key. */
  testMode: boolean;
}
