import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.QUANTADS_BACKEND_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const res = await fetch(`${BACKEND_URL}/creatives?${searchParams}`, {
    headers: { Authorization: request.headers.get('Authorization') || '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${BACKEND_URL}/creatives`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || '',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
