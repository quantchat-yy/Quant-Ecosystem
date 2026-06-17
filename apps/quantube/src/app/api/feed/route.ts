import type { NextRequest } from 'next/server';
import { proxyEngineRequest } from '../_lib/engine-proxy';

// GET /api/feed — the composed feed (recommendations retrieval → ranking),
// paginated via ?feedId=&page=&pageSize=.
export async function GET(request: NextRequest) {
  return proxyEngineRequest(request, '/feed', {
    searchParams: request.nextUrl.searchParams,
  });
}
