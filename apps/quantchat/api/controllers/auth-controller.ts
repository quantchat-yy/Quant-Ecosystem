// ============================================================================
// QuantChat API - Auth Controller
// Phone number authentication with OTP verification
// ============================================================================

import type { Request, Response } from '../middleware';
import type { PhoneAuthRequest, OTPVerifyRequest, QuantMailLinkRequest, AuthTokens } from '../../src/types';

// ============================================================================
// OTP Store (in-memory for simulation)
// ============================================================================

interface OTPEntry {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

interface UserRecord {
  id: string;
  phoneNumber: string;
  username: string;
  displayName: string;
  quantMailId?: string;
  createdAt: Date;
  isVerified: boolean;
}

// ============================================================================
// Auth Controller
// ============================================================================

export class AuthController {
  private otpStore: Map<string, OTPEntry> = new Map();
  private users: Map<string, UserRecord> = new Map();
  private sessions: Map<string, { userId: string; deviceId: string; createdAt: Date }> = new Map();

  async requestOTP(req: Request, res: Response): Promise<void> {
    const body = req.body as PhoneAuthRequest;
    if (!body.phoneNumber || !body.countryCode) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Phone number and country code are required', statusCode: 400 } });
      return;
    }

    const fullPhone = `${body.countryCode}${body.phoneNumber}`;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const entry: OTPEntry = {
      phoneNumber: fullPhone,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0,
      maxAttempts: 3,
    };

    this.otpStore.set(fullPhone, entry);

    // In production, would send SMS via provider
    console.log(`[OTP] Sent ${otp} to ${fullPhone}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresIn: 300,
        phoneNumber: fullPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
      },
    });
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    const body = req.body as OTPVerifyRequest;
    if (!body.phoneNumber || !body.otp || !body.deviceId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Phone number, OTP, and device ID are required', statusCode: 400 } });
      return;
    }

    const entry = this.otpStore.get(body.phoneNumber);
    if (!entry) {
      res.status(400).json({ success: false, error: { code: 'OTP_NOT_FOUND', message: 'No OTP request found. Please request a new code.', statusCode: 400 } });
      return;
    }

    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(body.phoneNumber);
      res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new code.', statusCode: 400 } });
      return;
    }

    if (entry.attempts >= entry.maxAttempts) {
      this.otpStore.delete(body.phoneNumber);
      res.status(429).json({ success: false, error: { code: 'MAX_ATTEMPTS', message: 'Maximum verification attempts exceeded. Please request a new code.', statusCode: 429 } });
      return;
    }

    entry.attempts++;

    if (entry.code !== body.otp) {
      res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: `Invalid OTP. ${entry.maxAttempts - entry.attempts} attempts remaining.`, statusCode: 400 } });
      return;
    }

    // OTP verified - create/find user
    this.otpStore.delete(body.phoneNumber);
    let user = this.findUserByPhone(body.phoneNumber);

    if (!user) {
      // New user registration
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      user = {
        id: userId,
        phoneNumber: body.phoneNumber,
        username: `user_${body.phoneNumber.slice(-4)}`,
        displayName: `User ${body.phoneNumber.slice(-4)}`,
        createdAt: new Date(),
        isVerified: true,
      };
      this.users.set(userId, user);
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, body.deviceId);

    // Store session
    this.sessions.set(tokens.accessToken, {
      userId: user.id,
      deviceId: body.deviceId,
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        ...tokens,
        isNewUser: user.createdAt.getTime() > Date.now() - 1000,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          username: user.username,
          displayName: user.displayName,
        },
      },
    });
  }

  async linkQuantMail(req: Request, res: Response): Promise<void> {
    const body = req.body as QuantMailLinkRequest;
    if (!body.quantMailEmail || !body.quantMailToken) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'QuantMail email and token are required', statusCode: 400 } });
      return;
    }

    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const user = this.users.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 } });
      return;
    }

    // Verify QuantMail token (simplified - would call QuantMail OAuth)
    user.quantMailId = `qm_${body.quantMailEmail}`;

    res.status(200).json({
      success: true,
      data: {
        message: 'QuantMail account linked successfully',
        quantMailEmail: body.quantMailEmail,
      },
    });
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const body = req.body as { refreshToken: string; deviceId: string };
    if (!body.refreshToken || !body.deviceId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Refresh token and device ID are required', statusCode: 400 } });
      return;
    }

    // Simplified refresh - validate and issue new tokens
    const tokens = this.generateTokens('refreshed_user', body.deviceId);
    res.status(200).json({ success: true, data: tokens });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.headers['authorization']?.substring(7);
    if (token) {
      this.sessions.delete(token);
    }
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const user = this.users.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        displayName: user.displayName,
        quantMailLinked: !!user.quantMailId,
        createdAt: user.createdAt,
      },
    });
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const user = this.users.get(userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 } });
      return;
    }

    const body = req.body as { username?: string; displayName?: string };
    if (body.username) user.username = body.username;
    if (body.displayName) user.displayName = body.displayName;

    res.status(200).json({ success: true, data: user });
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private findUserByPhone(phoneNumber: string): UserRecord | undefined {
    for (const user of this.users.values()) {
      if (user.phoneNumber === phoneNumber) return user;
    }
    return undefined;
  }

  private generateTokens(userId: string, deviceId: string): AuthTokens {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: userId,
      deviceId,
      iat: now,
      exp: now + 3600,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from(`sig_${userId}_${now}`).toString('base64url');

    const accessToken = `${header}.${body}.${signature}`;
    const refreshToken = `rt_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      userId,
    };
  }
}

export const authController = new AuthController();
