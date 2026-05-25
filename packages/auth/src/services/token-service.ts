// ============================================================================
// Auth - Token Service (JWT management with jose)
// ============================================================================

import * as jose from 'jose';
import type { AuthConfig, TokenPair, TokenPayload, RefreshTokenPayload } from '../types';
import type { PermissionScope, QuantApp } from '@quant/common';
import { generateId } from '../crypto/secure-random';

/** Revoked token tracking */
interface RevokedToken {
  tokenId: string;
  revokedAt: Date;
  reason: string;
}

/** JWKS key pair for RS256 signing */
interface JWKSKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

/**
 * Token Service
 *
 * Handles JWT token creation, validation, and refresh for the Quant Ecosystem.
 * Implements:
 * - Access token generation with HS256 via jose
 * - Refresh token rotation (one-time use)
 * - Token revocation and blacklisting
 * - Token family tracking for refresh token reuse detection
 * - JWKS support for federation (RS256)
 */
export class TokenService {
  private config: AuthConfig;
  private secret: Uint8Array;
  private revokedTokens: Map<string, RevokedToken> = new Map();
  private refreshTokenFamilies: Map<
    string,
    { userId: string; currentTokenId: string; isRevoked: boolean }
  > = new Map();
  private activeRefreshTokens: Map<
    string,
    RefreshTokenPayload & {
      userId: string;
      email: string;
      username: string;
      role: string;
      scopes: PermissionScope[];
      app: QuantApp;
    }
  > = new Map();
  private jwksKeyPair: JWKSKeyPair | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.secret = new TextEncoder().encode(config.jwtSecret);
  }

  /**
   * Generate an access token + refresh token pair
   */
  async generateTokenPair(
    userId: string,
    userInfo: { email: string; username: string; role: string },
    scopes: PermissionScope[],
    app: QuantApp,
  ): Promise<TokenPair> {
    const tokenId = generateId('tok');
    const refreshTokenId = generateId('tok');
    const familyId = generateId('fam');
    const now = Math.floor(Date.now() / 1000);

    // Build access token with jose
    const accessToken = await new jose.SignJWT({
      email: userInfo.email,
      username: userInfo.username,
      role: userInfo.role,
      scopes,
      app,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.config.accessTokenExpiresIn}s`)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setJti(tokenId)
      .setSubject(userId)
      .sign(this.secret);

    // Build refresh token with jose
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      jti: refreshTokenId,
      family: familyId,
      iat: now,
      exp: now + this.config.refreshTokenExpiresIn,
    };

    const refreshToken = await new jose.SignJWT({
      family: familyId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.config.refreshTokenExpiresIn}s`)
      .setJti(refreshTokenId)
      .setSubject(userId)
      .sign(this.secret);

    // Track refresh token family
    this.refreshTokenFamilies.set(familyId, {
      userId,
      currentTokenId: refreshTokenId,
      isRevoked: false,
    });

    // Store refresh token with user claims for rotation
    this.activeRefreshTokens.set(refreshTokenId, {
      ...refreshPayload,
      userId,
      email: userInfo.email,
      username: userInfo.username,
      role: userInfo.role,
      scopes,
      app,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenExpiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Validate an access token and return its payload
   */
  async validateAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      const jti = payload.jti;
      if (!jti) return null;

      // Check if token is revoked
      if (this.revokedTokens.has(jti)) return null;

      return {
        sub: payload.sub ?? '',
        email: (payload['email'] as string) ?? '',
        username: (payload['username'] as string) ?? '',
        role: (payload['role'] as string) ?? '',
        scopes: (payload['scopes'] as PermissionScope[]) ?? [],
        app: (payload['app'] as QuantApp) ?? 'quantmail',
        iat: payload.iat ?? 0,
        exp: payload.exp ?? 0,
        iss: payload.iss ?? '',
        aud: (typeof payload.aud === 'string' ? payload.aud : payload.aud?.[0]) ?? '',
        jti,
      };
    } catch {
      return null;
    }
  }

  /**
   * Refresh tokens using a refresh token (implements rotation)
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    try {
      const { payload } = await jose.jwtVerify(refreshToken, this.secret);

      const jti = payload.jti;
      const familyId = payload['family'] as string | undefined;
      if (!jti || !familyId) return null;

      // Check if family exists and is revoked
      const family = this.refreshTokenFamilies.get(familyId);
      if (!family || family.isRevoked) {
        // Family already revoked
        if (family) {
          await this.revokeFamily(familyId);
        }
        return null;
      }

      // Find the token in active tokens
      const storedToken = this.activeRefreshTokens.get(jti);
      if (!storedToken) {
        // Token not in active tokens but family exists - reuse detected!
        await this.revokeFamily(familyId);
        return null;
      }

      // Verify this is the current token in the family (rotation check)
      if (family.currentTokenId !== jti) {
        // Token reuse detected! Revoke entire family
        await this.revokeFamily(familyId);
        return null;
      }

      // Invalidate old refresh token
      this.activeRefreshTokens.delete(jti);

      // Generate new token pair with same family
      const newRefreshTokenId = generateId('tok');
      const newTokenId = generateId('tok');
      const now = Math.floor(Date.now() / 1000);

      // Update family
      family.currentTokenId = newRefreshTokenId;

      // Generate new access token
      const accessToken = await new jose.SignJWT({
        email: storedToken.email,
        username: storedToken.username,
        role: storedToken.role,
        scopes: storedToken.scopes,
        app: storedToken.app,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${this.config.accessTokenExpiresIn}s`)
        .setIssuer(this.config.issuer)
        .setAudience(this.config.audience)
        .setJti(newTokenId)
        .setSubject(storedToken.userId)
        .sign(this.secret);

      // Generate new refresh token
      const newRefreshPayload: RefreshTokenPayload = {
        sub: storedToken.userId,
        jti: newRefreshTokenId,
        family: familyId,
        iat: now,
        exp: now + this.config.refreshTokenExpiresIn,
      };

      const newRefreshToken = await new jose.SignJWT({
        family: familyId,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${this.config.refreshTokenExpiresIn}s`)
        .setJti(newRefreshTokenId)
        .setSubject(storedToken.userId)
        .sign(this.secret);

      // Store new refresh token with original user claims
      this.activeRefreshTokens.set(newRefreshTokenId, {
        ...newRefreshPayload,
        userId: storedToken.userId,
        email: storedToken.email,
        username: storedToken.username,
        role: storedToken.role,
        scopes: storedToken.scopes,
        app: storedToken.app,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.config.accessTokenExpiresIn,
        tokenType: 'Bearer',
      };
    } catch {
      return null;
    }
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(tokenId: string, reason: string = 'manual_revocation'): Promise<void> {
    this.revokedTokens.set(tokenId, {
      tokenId,
      revokedAt: new Date(),
      reason,
    });
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllForUser(userId: string): Promise<void> {
    // Revoke all refresh token families for this user
    for (const [_familyId, family] of this.refreshTokenFamilies) {
      if (family.userId === userId) {
        family.isRevoked = true;
      }
    }

    // Remove all active refresh tokens for this user
    for (const [tokenId, token] of this.activeRefreshTokens) {
      if (token.userId === userId) {
        this.activeRefreshTokens.delete(tokenId);
      }
    }
  }

  /**
   * Initialize the JWKS key pair for RS256 signing (federation)
   */
  async initializeJWKS(): Promise<void> {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
    this.jwksKeyPair = { privateKey, publicKey };
  }

  /**
   * Get the JWKS document containing the public key
   */
  async getJWKS(): Promise<jose.JSONWebKeySet> {
    if (!this.jwksKeyPair) {
      await this.initializeJWKS();
    }
    const publicJwk = await jose.exportJWK(this.jwksKeyPair!.publicKey);
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    publicJwk.kid = 'quant-primary';
    return { keys: [publicJwk] };
  }

  /**
   * Sign a token with the private key (for federation tokens)
   */
  async signWithPrivateKey(payload: Record<string, unknown>): Promise<string> {
    if (!this.jwksKeyPair) {
      await this.initializeJWKS();
    }
    return new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg: 'RS256', kid: 'quant-primary' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer(this.config.issuer)
      .sign(this.jwksKeyPair!.privateKey);
  }

  /**
   * Revoke an entire refresh token family (used for theft detection)
   */
  private async revokeFamily(familyId: string): Promise<void> {
    const family = this.refreshTokenFamilies.get(familyId);
    if (family) {
      family.isRevoked = true;
      // Remove all tokens in this family
      for (const [tokenId, token] of this.activeRefreshTokens) {
        if (token.family === familyId) {
          this.activeRefreshTokens.delete(tokenId);
        }
      }
    }
  }

  /**
   * Cleanup expired tokens and revocations
   */
  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);

    // Clean up expired refresh tokens
    for (const [tokenId, token] of this.activeRefreshTokens) {
      if (token.exp < now) {
        this.activeRefreshTokens.delete(tokenId);
      }
    }

    // Clean up old revocations (older than 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [tokenId, revocation] of this.revokedTokens) {
      if (revocation.revokedAt < cutoff) {
        this.revokedTokens.delete(tokenId);
      }
    }
  }
}
