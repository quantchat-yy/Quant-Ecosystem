import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AppConfig } from '@quant/server-core';
import { buildApp } from '../app';
import { resetState } from '../routes/auth';

const testConfig: AppConfig = {
  port: 3001,
  host: '0.0.0.0',
  logLevel: 'silent',
  corsOrigins: ['http://localhost:3000'],
  rateLimitMax: 1000,
  rateLimitWindow: '1 minute',
  jwtSecret: 'test-secret-key-that-is-long-enough-for-hs256',
  jwtIssuer: 'quantmail',
  jwtAudience: 'quant-ecosystem',
  env: 'test',
};

describe('auth routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetState();
  });

  describe('POST /auth/register', () => {
    it('returns 201 with tokens on successful registration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          username: 'testuser',
          displayName: 'Test User',
          password: 'password123',
          acceptedTerms: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('user@example.com');
      expect(body.data.user.username).toBe('testuser');
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
      expect(body.data.tokens.tokenType).toBe('Bearer');
    });

    it('returns 400 when email is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'not-an-email',
          username: 'testuser',
          displayName: 'Test User',
          password: 'password123',
          acceptedTerms: true,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          username: 'testuser',
          displayName: 'Test User',
          password: 'short',
          acceptedTerms: true,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when acceptedTerms is false', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          username: 'testuser',
          displayName: 'Test User',
          password: 'password123',
          acceptedTerms: false,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('returns 409 when email already exists', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          username: 'testuser1',
          displayName: 'Test User',
          password: 'password123',
          acceptedTerms: true,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'user@example.com',
          username: 'testuser2',
          displayName: 'Test User 2',
          password: 'password456',
          acceptedTerms: true,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user first
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'login@example.com',
          username: 'loginuser',
          displayName: 'Login User',
          password: 'correctpassword',
          acceptedTerms: true,
        },
      });
    });

    it('returns tokens on successful login with email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'correctpassword',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('returns tokens on successful login with username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'loginuser',
          password: 'correctpassword',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
    });

    it('returns 401 with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 with non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 when neither email nor username is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/token/refresh', () => {
    it('returns new token pair with valid refresh token', async () => {
      // Register a user to get tokens
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'refresh@example.com',
          username: 'refreshuser',
          displayName: 'Refresh User',
          password: 'password123',
          acceptedTerms: true,
        },
      });

      const { tokens } = registerResponse.json().data;

      const response = await app.inject({
        method: 'POST',
        url: '/auth/token/refresh',
        payload: {
          refreshToken: tokens.refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('returns 401 with invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/token/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 on successful logout', async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'logout@example.com',
          username: 'logoutuser',
          displayName: 'Logout User',
          password: 'password123',
          acceptedTerms: true,
        },
      });

      const { tokens } = registerResponse.json().data;

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('OIDC/.well-known', () => {
    it('GET /.well-known/openid-configuration returns discovery doc', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/openid-configuration',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.issuer).toBeDefined();
      expect(body.authorization_endpoint).toBeDefined();
      expect(body.token_endpoint).toBeDefined();
      expect(body.jwks_uri).toBeDefined();
    });

    it('GET /.well-known/jwks.json returns valid JWKS', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/jwks.json',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      expect(body.keys.length).toBeGreaterThan(0);
      expect(body.keys[0].alg).toBe('RS256');
    });
  });
});
