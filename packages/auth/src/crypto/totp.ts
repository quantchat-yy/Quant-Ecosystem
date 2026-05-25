// ============================================================================
// Auth - TOTP (Time-based One-Time Password) Service
// ============================================================================

import { authenticator } from 'otplib';
import { randomBytes } from 'node:crypto';

/**
 * TOTP Service using otplib
 */
export class TOTPService {
  constructor() {
    // Set a 1-step window for clock drift tolerance
    authenticator.options = {
      window: 1,
    };
  }

  /**
   * Generate a new TOTP secret (base32 encoded)
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate an otpauth:// URI for QR code generation
   */
  generateQRCodeUri(secret: string, email: string, issuer: string = 'Quant'): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  /**
   * Verify a TOTP token against a secret
   */
  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  /**
   * Generate backup codes (8 codes, each 8 hex chars)
   */
  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(randomBytes(4).toString('hex'));
    }
    return codes;
  }
}

/** Singleton TOTP service instance */
export const totpService = new TOTPService();
