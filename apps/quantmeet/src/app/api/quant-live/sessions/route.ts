// quant-live seam proxy (Layer 4):
//   POST /api/quant-live/sessions -> backend POST /quant-live/sessions
//   GET  /api/quant-live/sessions -> backend GET  /quant-live/sessions
// Forwards bearer + x-request-id (via proxyToBackend).
//
// NOTE: the backend prefix is `/quant-live` (NOT `/live`) to avoid colliding
// with createApp()'s `/live` Kubernetes-liveness PUBLIC_PATHS entry, which would
// otherwise bypass the global auth hook for `/live/*` (Req 7.1/7.3, P2).
import type { NextRequest } from 'next/server';
import { proxyLiveRequest } from '../../_lib/quant-live-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => undefined);
  return proxyLiveRequest(request, '/quant-live/sessions', { body });
}

export async function GET(request: NextRequest) {
  return proxyLiveRequest(request, '/quant-live/sessions', {
    searchParams: request.nextUrl.searchParams,
  });
}
