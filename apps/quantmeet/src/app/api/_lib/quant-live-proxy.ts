// ============================================================================
// quantmeet — quant-live surface proxy helper (Layer 4 of the integration seam)
// ============================================================================
//
// Thin wrapper around `@quant/api-client`'s `proxyToBackend` (the canonical
// Layer-4 utility) used by every quantmeet quant-live `app/api/quant-live/*`
// route handler. It pins the single source of truth for the quantmeet backend
// URL and lets each route handler stay one line.
//
// `proxyToBackend` already:
//   - forwards the inbound `Authorization` bearer to the backend, and
//   - propagates `x-request-id` (minting one when absent) for cross-seam
//     correlation,
// so the per-feature handlers below only choose the backend path + (optional)
// body / query string.
//
// This module lives under `app/api/**`, so it is exempt from the inline-fetch
// guard (Requirement 1.4): backend fetches are allowed in proxy route handlers,
// never in UI surfaces. The `_lib` folder is underscore-prefixed and therefore
// ignored by Next.js App Router (it never becomes a route).

import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@quant/api-client';

/**
 * The quantmeet backend origin. Defaults to the backend's `PORT` (3006, see
 * `apps/quantmeet/backend/app.ts` `getConfig()`), overridable via a single env
 * var so the proxy and backend share one source of truth (Requirement 1.6).
 */
export const QUANTMEET_BACKEND_URL =
  process.env.NEXT_PUBLIC_QUANTMEET_BACKEND_URL ?? 'http://localhost:3006';

interface ProxyLiveOptions {
  /** Parsed request body to forward (mutations only). */
  body?: unknown;
  /** Query string to forward to the backend (GET filters). */
  searchParams?: URLSearchParams;
}

/**
 * Forward a quantmeet frontend request to the matching backend quant-live route,
 * propagating the bearer token + `x-request-id` and relaying status/body.
 */
export function proxyLiveRequest(request: NextRequest, path: string, options?: ProxyLiveOptions) {
  return proxyToBackend(request, {
    backendUrl: QUANTMEET_BACKEND_URL,
    path,
    body: options?.body,
    searchParams: options?.searchParams,
  });
}
