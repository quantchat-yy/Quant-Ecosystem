import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../_auth';

let retentionPolicies = [
  { resource: 'auth_logs', maxAgeDays: 90, enabled: true },
  { resource: 'access_logs', maxAgeDays: 365, enabled: true },
  { resource: 'session_data', maxAgeDays: 30, enabled: true },
];

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      policies: retentionPolicies,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'export-data': {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        data: {
          userId,
          exportedAt: new Date().toISOString(),
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    }

    case 'delete-data': {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        data: {
          userId,
          scheduledAt: new Date().toISOString(),
          executeAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
          status: 'scheduled',
        },
      });
    }

    case 'update-retention': {
      const { policies } = body;
      if (!Array.isArray(policies)) {
        return NextResponse.json(
          { success: false, error: 'policies array is required' },
          { status: 400 },
        );
      }
      retentionPolicies = policies;
      return NextResponse.json({
        success: true,
        data: { policies: retentionPolicies },
      });
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 },
      );
  }
}
