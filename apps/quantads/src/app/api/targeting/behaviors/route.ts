import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.QUANTADS_BACKEND_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/targeting/behaviors`, {
    headers: { Authorization: request.headers.get('Authorization') || '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
