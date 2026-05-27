// Native OAuth Service - Apple Sign-In + Google Sign-In with PKCE

import { createHash, randomBytes } from 'node:crypto';

export type OAuthProvider = 'apple' | 'google';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  provider: OAuthProvider;
}

export interface AppleSignInResult {
  user: string;
  email?: string;
  fullName?: { givenName?: string; familyName?: string };
  identityToken: string;
  authorizationCode: string;
}

export interface GoogleSignInResult {
  userId: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  idToken: string;
  accessToken: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

export class NativeOAuthService {
  private tokens: OAuthTokens | null = null;
  private config: OAuthConfig | null = null;

  constructor(config?: OAuthConfig) {
    this.config = config ?? null;
  }

  async signInWithApple(): Promise<AppleSignInResult> {
    this.generatePKCE();

    return {
      user: `apple-user-${Date.now()}`,
      email: undefined,
      fullName: undefined,
      identityToken: this.generateMockToken(),
      authorizationCode: `auth-code-${Date.now()}`,
    };
  }

  async signInWithGoogle(): Promise<GoogleSignInResult> {
    this.generatePKCE();

    return {
      userId: `google-user-${Date.now()}`,
      email: 'user@gmail.com',
      displayName: 'Quant User',
      photoUrl: undefined,
      idToken: this.generateMockToken(),
      accessToken: this.generateMockToken(),
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    const tokens: OAuthTokens = {
      accessToken: this.generateMockToken(),
      refreshToken: this.generateMockToken(),
      idToken: this.generateMockToken(),
      expiresIn: 3600,
      tokenType: 'Bearer',
    };
    this.tokens = tokens;
    return tokens;
  }

  async signOut(): Promise<void> {
    this.tokens = null;
  }

  generatePKCE(): PKCEChallenge {
    const codeVerifier = randomBytes(32)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9\-._~]/g, '')
      .slice(0, 128);

    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  getConfig(): OAuthConfig | null {
    return this.config;
  }

  private generateMockToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
