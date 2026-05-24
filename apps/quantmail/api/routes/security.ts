// ============================================================================
// QuantMail - Security Routes
// 2FA, security keys, sessions, login history, app passwords, recovery codes
// ============================================================================

import { Router } from '@quant/server';
import { SecurityController } from '../controllers/security-controller';

export function registerSecurityRoutes(router: Router): void {
  // Status
  router.register('GET', '/api/security/status', SecurityController.getStatus);

  // 2FA
  router.register('POST', '/api/security/2fa/setup', SecurityController.setup2FA);
  router.register('POST', '/api/security/2fa/verify', SecurityController.verify2FA);
  router.register('POST', '/api/security/2fa/disable', SecurityController.disable2FA);

  // Recovery codes
  router.register('POST', '/api/security/recovery-codes/regenerate', SecurityController.regenerateRecoveryCodes);

  // Security keys (WebAuthn)
  router.register('POST', '/api/security/keys/register', SecurityController.registerKey);
  router.register('DELETE', '/api/security/keys/:id', SecurityController.removeKey);

  // Sessions
  router.register('GET', '/api/security/sessions', SecurityController.getSessions);
  router.register('POST', '/api/security/sessions/:id/revoke', SecurityController.revokeSession);
  router.register('POST', '/api/security/sessions/revoke-all', SecurityController.revokeAllSessions);

  // Login history
  router.register('GET', '/api/security/login-history', SecurityController.getLoginHistory);

  // App passwords
  router.register('GET', '/api/security/app-passwords', SecurityController.getAppPasswords);
  router.register('POST', '/api/security/app-passwords', SecurityController.createAppPassword);
  router.register('DELETE', '/api/security/app-passwords/:id', SecurityController.revokeAppPassword);
}

export default registerSecurityRoutes;
