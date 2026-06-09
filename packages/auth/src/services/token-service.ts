// ============================================================================
// Auth - Token Service (Production Prisma-backed version)
// ============================================================================

import * as jose from 'jose';
import type { AuthConfig, TokenPair, TokenPayload, RefreshTokenPayload } from '../types';
import type { PermissionScope, QuantApp } from '@quant/common';
import { generateId } from '../crypto/secure-random';
import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';

interface JWKSKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export class TokenService {
  private config: AuthConfig;
  private secret: Uint8Array;
  private prisma: PrismaClient;
  private jwksKeyPair: JWKSKeyPair | null = null;

  constructor(config: AuthConfig, prismaClient?: PrismaClient) {
    this.config = config;
    this.secret = new TextEncoder().encode(config.jwtSecret);
    this.prisma = prismaClient || prisma;
  }

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

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      jti: refreshTokenId,
      family: familyId,
      iat: now,
      exp: now + this.config.refreshTokenExpiresIn,
    };

    const refreshToken = await new jose.SignJWT(refreshPayload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.config.refreshTokenExpiresIn}s`)
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setJti(refreshTokenId)
      .setSubject(userId)
      .sign(this.secret);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        token: refreshToken,
        family: familyId,
        expiresAt: new Date((now + this.config.refreshTokenExpiresIn) * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenExpiresIn,
      tokenType: 'Bearer',
    };
  }

  async refreshToken(oldRefreshToken: string): Promise<TokenPair> {
    let payload: any;

    try {
      const verified = await jose.jwtVerify(oldRefreshToken, this.secret);
      payload = verified.payload;
    } catch {
      throw new Error('Invalid refresh token');
    }

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!existingToken || existingToken.isRevoked) {
      if (existingToken?.family) {
        await this.prisma.refreshToken.updateMany({
          where: { family: existingToken.family },
          data: { isRevoked: true },
        });
      }
      throw new Error('Refresh token reuse detected or token revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Use original scopes if available, otherwise default
    const scopes: PermissionScope[] = payload.scopes || ['openid', 'profile', 'email'];

    return this.generateTokenPair(
      payload.sub,
      {
        email: user.email,
        username: user.username,
        role: user.role,
      },
      scopes,
      (payload.app || 'quantmail') as any,
    );
  }

  async revokeToken(tokenId: string, reason: string = 'user_logout'): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  async validateAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }
}
