import { describe, it, expect } from 'vitest';
import { DoubleSubmitCSRF } from '../csrf-protection.js';
import type { CSRFConfig } from '../types.js';

const config: CSRFConfig = {
  secret: 'test-secret-key-for-csrf-protection',
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  ttlMs: 3600000, // 1 hour
};

describe('DoubleSubmitCSRF', () => {
  it('should generate a valid token pair', () => {
    const csrf = new DoubleSubmitCSRF(config);
    const pair = csrf.generateTokenPair();

    expect(pair.cookie).toBeTruthy();
    expect(pair.header).toBeTruthy();
    expect(pair.cookie).toBe(pair.header);
  });

  it('should validate matching cookie and header tokens', () => {
    const csrf = new DoubleSubmitCSRF(config);
    const pair = csrf.generateTokenPair();

    expect(csrf.validate(pair.cookie, pair.header)).toBe(true);
  });

  it('should reject mismatched tokens', () => {
    const csrf = new DoubleSubmitCSRF(config);
    const pair1 = csrf.generateTokenPair();
    const pair2 = csrf.generateTokenPair();

    expect(csrf.validate(pair1.cookie, pair2.header)).toBe(false);
  });

  it('should reject empty tokens', () => {
    const csrf = new DoubleSubmitCSRF(config);

    expect(csrf.validate('', '')).toBe(false);
    expect(csrf.validate('token', '')).toBe(false);
    expect(csrf.validate('', 'token')).toBe(false);
  });

  it('should reject expired tokens', () => {
    const shortTtlConfig: CSRFConfig = { ...config, ttlMs: 1 };
    const csrf = new DoubleSubmitCSRF(shortTtlConfig);
    const pair = csrf.generateTokenPair();

    // Wait for token to expire
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait
    }

    expect(csrf.validate(pair.cookie, pair.header)).toBe(false);
  });

  it('should reject tampered tokens', () => {
    const csrf = new DoubleSubmitCSRF(config);
    const pair = csrf.generateTokenPair();

    const tampered = pair.cookie.slice(0, -4) + 'xxxx';
    expect(csrf.validate(tampered, tampered)).toBe(false);
  });

  it('should create a Fastify plugin', () => {
    const csrf = new DoubleSubmitCSRF(config);
    const plugin = csrf.createFastifyPlugin();

    expect(typeof plugin).toBe('function');
  });
});
