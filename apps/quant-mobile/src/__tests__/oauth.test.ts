import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { NativeOAuthService } from '../auth/oauth.js';

describe('NativeOAuthService', () => {
  let service: NativeOAuthService;

  beforeEach(() => {
    service = new NativeOAuthService({
      clientId: 'com.quant.app',
      redirectUri: 'https://quant.app/oauth/callback',
      scopes: ['openid', 'email', 'profile'],
      provider: 'apple',
    });
  });

  describe('PKCE generation', () => {
    it('should generate a valid code verifier', () => {
      const pkce = service.generatePKCE();
      expect(pkce.codeVerifier).toBeTruthy();
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('should generate a valid code challenge from the verifier', () => {
      const pkce = service.generatePKCE();
      const expectedChallenge = createHash('sha256').update(pkce.codeVerifier).digest('base64url');
      expect(pkce.codeChallenge).toBe(expectedChallenge);
    });

    it('should generate unique verifiers each time', () => {
      const pkce1 = service.generatePKCE();
      const pkce2 = service.generatePKCE();
      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it('should only contain URL-safe characters in verifier', () => {
      const pkce = service.generatePKCE();
      expect(pkce.codeVerifier).toMatch(/^[a-zA-Z0-9\-._~]+$/);
    });
  });

  describe('signInWithApple', () => {
    it('should return an Apple sign-in result', async () => {
      const result = await service.signInWithApple();
      expect(result.user).toBeTruthy();
      expect(result.identityToken).toBeTruthy();
      expect(result.authorizationCode).toBeTruthy();
    });

    it('should generate a user ID starting with apple-user-', async () => {
      const result = await service.signInWithApple();
      expect(result.user).toMatch(/^apple-user-/);
    });
  });

  describe('signInWithGoogle', () => {
    it('should return a Google sign-in result', async () => {
      const result = await service.signInWithGoogle();
      expect(result.userId).toBeTruthy();
      expect(result.email).toBeTruthy();
      expect(result.idToken).toBeTruthy();
      expect(result.accessToken).toBeTruthy();
    });

    it('should generate a user ID starting with google-user-', async () => {
      const result = await service.signInWithGoogle();
      expect(result.userId).toMatch(/^google-user-/);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when given a refresh token', async () => {
      const tokens = await service.refreshToken('valid-refresh-token');
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.idToken).toBeTruthy();
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should throw if refresh token is empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow('Refresh token is required');
    });

    it('should store tokens for retrieval', async () => {
      await service.refreshToken('valid-refresh-token');
      expect(service.getTokens()).not.toBeNull();
    });
  });

  describe('signOut', () => {
    it('should clear stored tokens', async () => {
      await service.refreshToken('valid-refresh-token');
      expect(service.getTokens()).not.toBeNull();
      await service.signOut();
      expect(service.getTokens()).toBeNull();
    });
  });

  describe('config', () => {
    it('should return the configured OAuth settings', () => {
      const config = service.getConfig();
      expect(config).not.toBeNull();
      expect(config!.clientId).toBe('com.quant.app');
      expect(config!.provider).toBe('apple');
    });
  });
});
