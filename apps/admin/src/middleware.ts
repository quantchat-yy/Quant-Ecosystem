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

  // Verify token against the configured admin secret. Fail closed: never fall
  // back to a hardcoded default — a missing ADMIN_SECRET must DENY access.
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Admin authentication is not configured', code: 'SERVICE_UNAVAILABLE' },
      },
      { status: 503 },
    );
  }
  // NOTE: the `eyJ` (JWT-shaped) acceptance is a follow-up — it should validate
  // the JWT signature/admin-role against the issuer's JWKS rather than trusting
  // its shape. Tracked separately; this change removes the hardcoded fallback.
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
