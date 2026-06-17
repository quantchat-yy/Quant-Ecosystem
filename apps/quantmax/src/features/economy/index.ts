// ============================================================================
// quantmax — economy feature barrel (Layer 5, Task 14.4)
// ============================================================================
//
// Single import point for UI surfaces consuming the `@quant/quant-economy`
// coin/store/subscription/gifting engines. Every export is an `@quant/api-client`
// hook backed by a same-origin `/api/economy/*` proxy — the sanctioned,
// inline-fetch-free call path (Requirement 1.4).

export * from './types';
export * from './useEconomy';
