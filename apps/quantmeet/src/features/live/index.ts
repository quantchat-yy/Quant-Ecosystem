// ============================================================================
// quantmeet — quant-live feature barrel (Layer 5)
// ============================================================================
//
// The single import point for UI surfaces consuming the quant-live (voice)
// engine. Every export here is an `@quant/api-client` hook backed by a
// same-origin `/api/quant-live/*` proxy — the sanctioned, inline-fetch-free call
// path (Requirement 1.4). UI components import from `@/features/live`.
//
// Note: the visual QuantLive components already live in `@quant/shared-ui`
// (QuantLive, QuantLivePrivacyIndicator, QuantLiveControls); this barrel is the
// *data path* for those surfaces, not a re-implementation of them.

export * from './types';
export * from './useQuantLive';
