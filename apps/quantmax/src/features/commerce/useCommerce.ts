// ============================================================================
// quantmax — commerce api-client hooks (Layer 5, Task 14.4)
// ============================================================================
//
// The ONLY sanctioned call path from a quantmax UI surface to the
// `@quant/quant-commerce` engines: typed react-query hooks over the same-origin
// Next proxy paths under `/api/commerce/*` (never inline fetch —
// Requirement 1.4). Each proxy forwards the bearer + x-request-id to the backend
// (Layer 4), which reaches the decorated commerce engine behind the global auth
// hook (Layer 2/3). quant-commerce `dependsOn @quant/payments` (the money rail).
import { useApiQuery, useApiMutation } from '@quant/api-client';
import type { UseApiQueryOptions } from '@quant/api-client';
import type {
  CreatePriceAlertInput,
  CreatePriceAlertResponse,
  FlightSearchInput,
  FlightSearchResponse,
  OrdersResponse,
  PriceAlertsResponse,
  ShoppingSearchInput,
  ShoppingSearchResponse,
  TrackOrderInput,
  TrackOrderResponse,
  TrainSearchInput,
  TrainSearchResponse,
} from './types';

/** POST /api/commerce/flights/search — aggregate a flight search. */
export function useFlightSearch() {
  return useApiMutation<FlightSearchInput, FlightSearchResponse>('/api/commerce/flights/search');
}

/** POST /api/commerce/trains/search — aggregate a train search. */
export function useTrainSearch() {
  return useApiMutation<TrainSearchInput, TrainSearchResponse>('/api/commerce/trains/search');
}

/** POST /api/commerce/shopping/search — cross-merchant price comparison. */
export function useShoppingSearch() {
  return useApiMutation<ShoppingSearchInput, ShoppingSearchResponse>(
    '/api/commerce/shopping/search',
  );
}

/** GET /api/commerce/orders — order history + active orders. */
export function useOrders(options?: UseApiQueryOptions) {
  return useApiQuery<OrdersResponse>('/api/commerce/orders', options);
}

/** POST /api/commerce/orders — start tracking an order. */
export function useTrackOrder() {
  return useApiMutation<TrackOrderInput, TrackOrderResponse>('/api/commerce/orders');
}

/** GET /api/commerce/price-alerts — the active price alerts. */
export function usePriceAlerts(options?: UseApiQueryOptions) {
  return useApiQuery<PriceAlertsResponse>('/api/commerce/price-alerts', options);
}

/** POST /api/commerce/price-alerts — create a price alert. */
export function useCreatePriceAlert() {
  return useApiMutation<CreatePriceAlertInput, CreatePriceAlertResponse>(
    '/api/commerce/price-alerts',
  );
}
