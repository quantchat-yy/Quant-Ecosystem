import { NextRequest, NextResponse } from 'next/server';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// NOTE: State is intentionally stored in-memory for this demo/dev environment.
// It will reset on cold start or redeploy. A persistent store (database or KV)
// should be used before shipping to production.
let flags: FeatureFlag[] = [
  {
    id: 'ai_chat',
    name: 'AI Chat',
    description: 'Enable AI-powered chat assistant across apps',
    enabled: true,
  },
  {
    id: 'video_calls',
    name: 'Video Calls',
    description: 'Enable WebRTC video calling in QuantMeet',
    enabled: true,
  },
  {
    id: 'dark_mode',
    name: 'Dark Mode',
    description: 'Allow users to toggle dark mode',
    enabled: true,
  },
  {
    id: 'beta_features',
    name: 'Beta Features',
    description: 'Show beta features to opted-in users',
    enabled: false,
  },
  {
    id: 'maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Put ecosystem in maintenance mode',
    enabled: false,
  },
  {
    id: 'signup_enabled',
    name: 'Public Signup',
    description: 'Allow new user registrations',
    enabled: true,
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: { flags } });
}

export async function PUT(request: NextRequest) {
  // TODO: Add auth middleware to validate session/role before accepting writes.
  // Currently unprotected for dev parity with /api/feature-flags/[id]/route.ts.
  try {
    const body = await request.json();
    const { id, enabled } = body as { id: string; enabled: boolean };

    if (!id || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request body', code: 'VALIDATION_ERROR' } },
        { status: 400 },
      );
    }

    const flagIndex = flags.findIndex((f) => f.id === id);
    if (flagIndex === -1) {
      return NextResponse.json(
        { success: false, error: { message: 'Flag not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    flags = flags.map((f) => (f.id === id ? { ...f, enabled } : f));

    return NextResponse.json({ success: true, data: { flags } });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update settings', code: 'SERVER_ERROR' } },
      { status: 500 },
    );
  }
}
