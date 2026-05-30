import type { SecurityHeader, SecurityHeadersConfig } from './types.js';

export function getSecurityHeaders(): SecurityHeadersConfig {
  const headers: SecurityHeader[] = [
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  return { headers };
}

export function getCSPHeader(overrides: Partial<Record<string, string>> = {}): SecurityHeader {
  const defaults: Record<string, string> = {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https:",
    'connect-src': "'self' https:",
    'font-src': "'self' data:",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
  };

  const merged = { ...defaults, ...overrides };
  const value = Object.entries(merged)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');

  return { key: 'Content-Security-Policy', value };
}
