// ============================================================================
// quantmax — commerce surface DTOs (Layer 5 request/response contracts)
// ============================================================================
//
// Frontend-facing shapes for the quant-commerce api-client hooks (Task 14.4).
// Mirror the JSON the quantmax backend routes return
// (apps/quantmax/backend/routes/commerce.ts), wrapping the as-shipped
// `@quant/quant-commerce` travel/shopping engines. Kept intentionally loose
// (the engine result objects are surfaced verbatim) — the engines own their
// richer domain types.

export interface FlightSearchInput {
  from: string;
  to: string;
  date: string;
  passengers?: number;
  travelClass?: string;
}

export interface FlightSearchResponse {
  flights: unknown[];
}

export interface TrainSearchInput {
  from: string;
  to: string;
  date: string;
}

export interface TrainSearchResponse {
  trains: unknown[];
}

export interface ShoppingSearchInput {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  merchants?: string[];
}

export interface ShoppingSearchResponse {
  comparison: unknown;
}

export interface TrackOrderInput {
  merchantOrderId: string;
  merchant: string;
  items: string[];
}

export interface OrdersResponse {
  orders: unknown[];
  active: unknown[];
}

export interface TrackOrderResponse {
  order: unknown;
}

export interface CreatePriceAlertInput {
  itemId: string;
  targetPrice: number;
  currentPrice: number;
  autoBuy?: boolean;
  maxAutoBuyAmount?: number;
}

export interface PriceAlertsResponse {
  alerts: unknown[];
}

export interface CreatePriceAlertResponse {
  alert: unknown;
}
