// ============================================================================
// QuantMail - Admin Controller
// User management, org settings, audit logs with authorization checks
// ============================================================================

import { AdminService } from '../services/admin-service';

interface Request { method: string; url: string; headers: Record<string, string>; params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; user?: { id: string; email: string; role: string }; }
interface Response { status(code: number): Response; json(data: unknown): void; }

export class AdminController {
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const { q, role, status, page, limit } = req.query;
      const result = await AdminService.listUsers({ query: q, role, status, page: Number(page) || 1, limit: Number(limit) || 50 });
      res.status(200).json(result);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const user = await AdminService.getUser(req.params.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.status(200).json(user);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
      const { email, name, role, department } = req.body as { email: string; name: string; role?: string; department?: string };
      if (!email || !name) { res.status(400).json({ error: 'Email and name are required' }); return; }
      const user = await AdminService.createUser({ email, name, role, department }, req.user.id);
      res.status(201).json(user);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Create failed' }); }
  }

  static async inviteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const { email, role, department, message } = req.body as { email: string; role: string; department?: string; message?: string };
      if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
      const invitation = await AdminService.inviteUser({ email, role: role || 'member', department, message }, req.user.id);
      res.status(201).json(invitation);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Invite failed' }); }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
      const { role } = req.body as { role: string };
      if (!role) { res.status(400).json({ error: 'Role is required' }); return; }
      const user = await AdminService.updateUserRole(req.params.id, role, req.user.id);
      res.status(200).json(user);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' }); }
  }

  static async suspendUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const { reason } = req.body as { reason?: string };
      const user = await AdminService.suspendUser(req.params.id, req.user.id, reason);
      res.status(200).json(user);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Suspend failed' }); }
  }

  static async activateUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const user = await AdminService.activateUser(req.params.id, req.user.id);
      res.status(200).json(user);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Activate failed' }); }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
      await AdminService.deleteUser(req.params.id, req.user.id);
      res.status(204).json({ success: true });
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Delete failed' }); }
  }

  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['admin', 'moderator'].includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
      const settings = await AdminService.getOrgSettings();
      res.status(200).json(settings);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
      const settings = await AdminService.updateOrgSettings(req.body as Partial<Record<string, unknown>>, req.user.id);
      res.status(200).json(settings);
    } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' }); }
  }

  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
      const { page, limit, severity, action } = req.query;
      const result = await AdminService.getAuditLogs({ page: Number(page) || 1, limit: Number(limit) || 50, severity, action });
      res.status(200).json(result);
    } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
}

export default AdminController;
