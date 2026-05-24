// ============================================================================
// QuantMail - Security Controller
// 2FA setup/verify, sessions, login history, security keys, app passwords
// ============================================================================

import { SecurityService } from '../services/security-service';

interface Request { method: string; url: string; headers: Record<string, string>; params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; user?: { id: string; email: string; role: string }; }
interface Response { status(code: number): Response; json(data: unknown): void; }

export class SecurityController {
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const status = await SecurityService.getSecurityStatus(userId);
      const keys = await SecurityService.getSecurityKeys(userId);
      const sessions = await SecurityService.getActiveSessions(userId);
      res.status(200).json({ ...status, securityKeys: keys, activeSessions: sessions });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async setup2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const result = await SecurityService.initiate2FASetup(userId);
      res.status(200).json(result);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : '2FA setup failed' }); }
  }

  static async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { code } = req.body as { code: string };
      if (!code || code.length !== 6) { res.status(400).json({ error: 'Valid 6-digit code required' }); return; }
      const result = await SecurityService.verify2FACode(userId, code);
      if (!result.valid) { res.status(400).json({ error: 'Invalid verification code' }); return; }
      res.status(200).json({ success: true, recoveryCodes: result.recoveryCodes });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Verification failed' }); }
  }

  static async disable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await SecurityService.disable2FA(userId);
      res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Disable failed' }); }
  }

  static async regenerateRecoveryCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const codes = await SecurityService.regenerateRecoveryCodes(userId);
      res.status(200).json({ codes });
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Regeneration failed' }); }
  }

  static async registerKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { name } = req.body as { name: string };
      if (!name) { res.status(400).json({ error: 'Key name required' }); return; }
      const credentialId = `cred_${Date.now()}`;
      const publicKey = `pk_${Math.random().toString(36).slice(2)}`;
      const key = await SecurityService.registerSecurityKey(userId, name, credentialId, publicKey);
      res.status(201).json(key);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' }); }
  }

  static async removeKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await SecurityService.removeSecurityKey(userId, req.params.id);
      res.status(204).json({ success: true });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Remove failed' }); }
  }

  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const sessions = await SecurityService.getActiveSessions(userId);
      res.status(200).json({ sessions });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await SecurityService.revokeSession(userId, req.params.id);
      res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Revoke failed' }); }
  }

  static async revokeAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const count = await SecurityService.revokeAllSessions(userId);
      res.status(200).json({ revokedCount: count });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Revoke all failed' }); }
  }

  static async getLoginHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const limit = Number(req.query.limit) || 50;
      const history = await SecurityService.getLoginHistory(userId, limit);
      res.status(200).json({ history });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async createAppPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { name } = req.body as { name: string };
      if (!name) { res.status(400).json({ error: 'Name required' }); return; }
      const result = await SecurityService.createAppPassword(userId, name);
      res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' }); }
  }

  static async getAppPasswords(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const passwords = await SecurityService.getAppPasswords(userId);
      res.status(200).json({ passwords });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async revokeAppPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await SecurityService.revokeAppPassword(userId, req.params.id);
      res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Revoke failed' }); }
  }
}

export default SecurityController;
