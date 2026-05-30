import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../_auth';

const MOCK_AUDIT_ENTRIES = [
  {
    id: '1',
    userId: 'user-1',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: null,
    ip: '192.168.1.1',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'user-2',
    action: 'DATA_ACCESS',
    resource: 'files',
    resourceId: 'file-123',
    ip: '10.0.0.1',
    timestamp: new Date().toISOString(),
  },
  {
    id: '3',
    userId: 'user-1',
    action: 'SETTINGS_CHANGE',
    resource: 'settings',
    resourceId: 'theme',
    ip: '192.168.1.1',
    timestamp: new Date().toISOString(),
  },
  {
    id: '4',
    userId: 'user-3',
    action: 'DATA_MODIFY',
    resource: 'users',
    resourceId: 'user-5',
    ip: '172.16.0.1',
    timestamp: new Date().toISOString(),
  },
  {
    id: '5',
    userId: 'user-1',
    action: 'LOGOUT',
    resource: 'auth',
    resourceId: null,
    ip: '192.168.1.1',
    timestamp: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const userId = url.searchParams.get('userId');
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  let results = [...MOCK_AUDIT_ENTRIES];

  if (action) {
    results = results.filter((e) => e.action === action);
  }
  if (userId) {
    results = results.filter((e) => e.userId === userId);
  }

  const total = results.length;
  const paged = results.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: paged,
    total,
    limit,
    offset,
  });
}
