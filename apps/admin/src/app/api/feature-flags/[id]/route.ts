import { NextRequest, NextResponse } from 'next/server';
import { UpdateFlagInput } from '@quant/feature-flags';
import { requireAdminAuth } from '../../_auth';
import { flagsStore } from '../_store';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const flag = flagsStore.get(id);
  if (!flag) {
    return NextResponse.json(
      { success: false, error: { message: 'Flag not found', code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: flag });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const flag = flagsStore.get(id);
  if (!flag) {
    return NextResponse.json(
      { success: false, error: { message: 'Flag not found', code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = UpdateFlagInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    const updated = {
      ...flag,
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
      ...(parsed.data.rules !== undefined && { rules: parsed.data.rules }),
      ...(parsed.data.percentage !== undefined && { percentage: parsed.data.percentage }),
      ...(parsed.data.variants !== undefined && { variants: parsed.data.variants }),
      updatedAt: new Date().toISOString(),
    };

    flagsStore.set(id, updated);
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const existed = flagsStore.delete(id);
  if (!existed) {
    return NextResponse.json(
      { success: false, error: { message: 'Flag not found', code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: { deleted: true } });
}
