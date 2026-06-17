// quant-live seam proxy (Layer 4): GET /api/quant-live/sessions/:id
// -> backend GET /quant-live/sessions/:id. Forwards bearer + x-request-id.
import type { NextRequest } from 'next/server';
import { proxyLiveRequest } from '../../../_lib/quant-live-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyLiveRequest(request, `/quant-live/sessions/${encodeURIComponent(id)}`);
}
