import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect API routes (not pages/static)
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for admin auth token in Authorization header or cookie
  const authHeader = request.headers.get('Authorization');
  const adminToken = request.cookies.get('admin_token')?.value;
  const token = authHeader?.replace('Bearer ', '') || adminToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  // Verify token format (in production this would validate JWT with admin role)
  // For now, require a non-empty token as the auth gate
  const adminSecret = process.env.ADMIN_SECRET || 'admin-secret-key';
  if (token !== adminSecret && !token.startsWith('eyJ')) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid admin credentials', code: 'FORBIDDEN' } },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
