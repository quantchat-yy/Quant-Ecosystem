// quant-live seam proxy (Layer 4): GET /api/quant-live/search?q=
// -> backend GET /quant-live/search?q=. Forwards bearer + x-request-id.
import type { NextRequest } from 'next/server';
import { proxyLiveRequest } from '../../_lib/quant-live-proxy';

export async function GET(request: NextRequest) {
  return proxyLiveRequest(request, '/quant-live/search', {
    searchParams: request.nextUrl.searchParams,
  });
}
