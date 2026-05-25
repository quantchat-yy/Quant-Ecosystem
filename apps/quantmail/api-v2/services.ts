import { TokenService } from '@quant/auth';
import type { AuthConfig } from '@quant/auth';

let sharedTokenService: TokenService | null = null;

export function getAuthConfig(): AuthConfig {
  return {
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret',
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 604800,
    issuer: process.env['JWT_ISSUER'] ?? 'quantmail',
    audience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
  };
}

export function getTokenService(): TokenService {
  if (!sharedTokenService) {
    sharedTokenService = new TokenService(getAuthConfig());
  }
  return sharedTokenService;
}

/** Reset shared state - used in testing */
export function resetTokenService(): void {
  sharedTokenService = null;
}
