import { describe, it, expect } from 'vitest';
import { getSecurityHeaders, getCSPHeader } from '../security-headers.js';

describe('getSecurityHeaders', () => {
  it('should return all required security headers', () => {
    const { headers } = getSecurityHeaders();
    const keys = headers.map((h) => h.key);

    expect(keys).toContain('Content-Security-Policy');
    expect(keys).toContain('Strict-Transport-Security');
    expect(keys).toContain('X-Frame-Options');
    expect(keys).toContain('X-Content-Type-Options');
    expect(keys).toContain('Referrer-Policy');
    expect(keys).toContain('Permissions-Policy');
  });

  it('should have proper CSP directives', () => {
    const { headers } = getSecurityHeaders();
    const csp = headers.find((h) => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    if (csp) {
      expect(csp.value).toContain("default-src 'self'");
      expect(csp.value).toContain('script-src');
      expect(csp.value).toContain('style-src');
      expect(csp.value).toContain('img-src');
      expect(csp.value).toContain('connect-src');
    }
  });

  it('should have HSTS with proper directives', () => {
    const { headers } = getSecurityHeaders();
    const hsts = headers.find((h) => h.key === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
    if (hsts) {
      expect(hsts.value).toContain('max-age=63072000');
      expect(hsts.value).toContain('includeSubDomains');
      expect(hsts.value).toContain('preload');
    }
  });

  it('should deny framing', () => {
    const { headers } = getSecurityHeaders();
    const xfo = headers.find((h) => h.key === 'X-Frame-Options');
    expect(xfo).toBeDefined();
    if (xfo) {
      expect(xfo.value).toBe('DENY');
    }
  });

  it('should prevent content type sniffing', () => {
    const { headers } = getSecurityHeaders();
    const xcto = headers.find((h) => h.key === 'X-Content-Type-Options');
    expect(xcto).toBeDefined();
    if (xcto) {
      expect(xcto.value).toBe('nosniff');
    }
  });

  it('should set strict referrer policy', () => {
    const { headers } = getSecurityHeaders();
    const rp = headers.find((h) => h.key === 'Referrer-Policy');
    expect(rp).toBeDefined();
    if (rp) {
      expect(rp.value).toBe('strict-origin-when-cross-origin');
    }
  });

  it('should restrict sensitive permissions', () => {
    const { headers } = getSecurityHeaders();
    const pp = headers.find((h) => h.key === 'Permissions-Policy');
    expect(pp).toBeDefined();
    if (pp) {
      expect(pp.value).toContain('camera=()');
      expect(pp.value).toContain('microphone=()');
      expect(pp.value).toContain('geolocation=()');
    }
  });

  it('should return well-formed header objects', () => {
    const { headers } = getSecurityHeaders();
    for (const header of headers) {
      expect(header).toHaveProperty('key');
      expect(header).toHaveProperty('value');
      expect(typeof header.key).toBe('string');
      expect(typeof header.value).toBe('string');
      expect(header.key.length).toBeGreaterThan(0);
      expect(header.value.length).toBeGreaterThan(0);
    }
  });
});

describe('getCSPHeader', () => {
  it('should return CSP header with defaults', () => {
    const csp = getCSPHeader();
    expect(csp.key).toBe('Content-Security-Policy');
    expect(csp.value).toContain("default-src 'self'");
  });

  it('should allow overriding specific directives', () => {
    const csp = getCSPHeader({ 'script-src': "'self' https://cdn.example.com" });
    expect(csp.value).toContain("script-src 'self' https://cdn.example.com");
    expect(csp.value).toContain("default-src 'self'");
  });
});
