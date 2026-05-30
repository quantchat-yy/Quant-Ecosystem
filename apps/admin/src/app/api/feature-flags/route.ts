import { NextRequest, NextResponse } from 'next/server';
import { CreateFlagInput } from '@quant/feature-flags';
import { requireAdminAuth } from '../_auth';
import { flagsStore } from './_store';

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const flags = Array.from(flagsStore.values());
  return NextResponse.json({ success: true, data: flags });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateFlagInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    const id = 'flag_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    const now = new Date().toISOString();
    const flag = {
      id,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      enabled: parsed.data.enabled ?? false,
      rules: parsed.data.rules ?? [],
      percentage: parsed.data.percentage ?? 100,
      variants: parsed.data.variants ?? [],
      createdAt: now,
      updatedAt: now,
    };

    flagsStore.set(id, flag);
    return NextResponse.json({ success: true, data: flag }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
