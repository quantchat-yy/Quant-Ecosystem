import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as jose from 'jose';
import { createApp } from '../app';
import type { AppConfig } from '../types';

const testConfig: AppConfig = {
  port: 3000,
  host: '0.0.0.0',
  logLevel: 'silent',
  corsOrigins: ['http://localhost:3000'],
  rateLimitMax: 100,
  rateLimitWindow: '1 minute',
  jwtSecret: 'test-secret-key-that-is-long-enough-for-hs256',
  jwtIssuer: 'quant-test',
  jwtAudience: 'quant-test-audience',
  env: 'test',
};

describe('server-core app', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp(testConfig);

    // Register a protected test route before starting
    app.get('/test-protected', { preHandler: app.requireAuth() }, async (request) => {
      return { userId: request.auth.userId };
    });

    // Register an unprotected route (global auth hook should still protect it)
    app.get('/test-unprotected', async () => {
      return { ok: true };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health endpoints', () => {
    it('GET /healthz returns 200 with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/healthz',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });

    it('GET /readyz returns 200 when no Redis configured', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readyz',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('error handling', () => {
    it('unknown routes return 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent-route',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('prisma plugin', () => {
    it('decorates app with prisma client', () => {
      expect(app.prisma).toBeDefined();
    });
  });

  describe('global auth enforcement', () => {
    it('rejects unauthenticated requests to unprotected routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-unprotected',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('auth plugin', () => {
    it('rejects requests without Bearer token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-protected',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-protected',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts valid JWT and populates request.auth', async () => {
      const secret = new TextEncoder().encode(testConfig.jwtSecret);
      const token = await new jose.SignJWT({
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        scopes: ['profile:read'],
        app: 'quantmail',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setIssuer(testConfig.jwtIssuer)
        .setAudience(testConfig.jwtAudience)
        .setJti('test-token-id')
        .setSubject('user-123')
        .sign(secret);

      const response = await app.inject({
        method: 'GET',
        url: '/test-protected',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.userId).toBe('user-123');
    });

    it('rejects token with wrong issuer', async () => {
      const secret = new TextEncoder().encode(testConfig.jwtSecret);
      const token = await new jose.SignJWT({
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        scopes: ['profile:read'],
        app: 'quantmail',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setIssuer('wrong-issuer')
        .setAudience(testConfig.jwtAudience)
        .setJti('test-token-id-2')
        .setSubject('user-123')
        .sign(secret);

      const response = await app.inject({
        method: 'GET',
        url: '/test-protected',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
