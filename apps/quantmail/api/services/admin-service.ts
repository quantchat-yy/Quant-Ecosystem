// ============================================================================
// QuantMail - Admin Service
// User CRUD, role assignment, org settings, policy enforcement, audit logging
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'member' | 'viewer';
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  department?: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  invitedBy?: string;
  loginAttempts: number;
  lockedUntil?: Date;
}

interface OrgSettings {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  defaultRole: string;
  allowSignup: boolean;
  requireTwoFactor: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  ipWhitelist: string[];
  allowedDomains: string[];
  updatedAt: Date;
  updatedBy: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  details: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  department?: string;
  message?: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: Date;
}

const users = new Map<string, User>();
const auditLog: AuditLogEntry[] = [];
const invitations = new Map<string, Invitation>();
let orgSettings: OrgSettings = {
  id: 'org_default', name: 'QuantMail Organization', domain: 'quantmail.io',
  defaultRole: 'member', allowSignup: true, requireTwoFactor: false,
  sessionTimeout: 480, passwordMinLength: 8, passwordRequireSpecial: true,
  passwordRequireNumbers: true, passwordExpiryDays: 90, maxLoginAttempts: 5,
  ipWhitelist: [], allowedDomains: [], updatedAt: new Date(), updatedBy: 'system'
};

const generateId = (): string => `adm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const generateToken = (): string => Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('');

export class AdminService {
  static async listUsers(filters?: { role?: string; status?: string; query?: string; page?: number; limit?: number }): Promise<{ users: User[]; total: number }> {
    let result = Array.from(users.values()).filter(u => u.status !== 'deleted');
    if (filters?.role) result = result.filter(u => u.role === filters.role);
    if (filters?.status) result = result.filter(u => u.status === filters.status);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    const total = result.length;
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;
    return { users: result.slice(offset, offset + limit), total };
  }

  static async getUser(userId: string): Promise<User | null> {
    return users.get(userId) || null;
  }

  static async createUser(data: { email: string; name: string; role?: string; department?: string }, actorId: string): Promise<User> {
    const existing = Array.from(users.values()).find(u => u.email === data.email);
    if (existing) throw new Error('User with this email already exists');
    if (orgSettings.allowedDomains.length > 0) {
      const domain = data.email.split('@')[1];
      if (!orgSettings.allowedDomains.includes(domain)) throw new Error(`Email domain ${domain} is not allowed`);
    }
    const user: User = {
      id: generateId(), email: data.email, name: data.name,
      role: (data.role as User['role']) || (orgSettings.defaultRole as User['role']),
      status: 'active', department: data.department, twoFactorEnabled: false,
      createdAt: new Date(), updatedAt: new Date(), loginAttempts: 0
    };
    users.set(user.id, user);
    await AdminService.logAudit(actorId, 'user.created', user.id, 'user', `Created user ${data.email}`, 'info');
    return user;
  }

  static async updateUserRole(userId: string, newRole: string, actorId: string): Promise<User> {
    const user = users.get(userId);
    if (!user) throw new Error('User not found');
    const oldRole = user.role;
    user.role = newRole as User['role'];
    user.updatedAt = new Date();
    await AdminService.logAudit(actorId, 'user.role_changed', userId, 'user', `Changed role from ${oldRole} to ${newRole}`, 'warning');
    return user;
  }

  static async suspendUser(userId: string, actorId: string, reason?: string): Promise<User> {
    const user = users.get(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot suspend admin users');
    user.status = 'suspended';
    user.updatedAt = new Date();
    await AdminService.logAudit(actorId, 'user.suspended', userId, 'user', `Suspended user: ${reason || 'No reason given'}`, 'warning');
    return user;
  }

  static async activateUser(userId: string, actorId: string): Promise<User> {
    const user = users.get(userId);
    if (!user) throw new Error('User not found');
    user.status = 'active';
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    user.updatedAt = new Date();
    await AdminService.logAudit(actorId, 'user.activated', userId, 'user', 'Activated user account', 'info');
    return user;
  }

  static async deleteUser(userId: string, actorId: string): Promise<void> {
    const user = users.get(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') throw new Error('Cannot delete admin users');
    user.status = 'deleted';
    user.updatedAt = new Date();
    await AdminService.logAudit(actorId, 'user.deleted', userId, 'user', `Deleted user ${user.email}`, 'critical');
  }

  static async inviteUser(data: { email: string; role: string; department?: string; message?: string }, actorId: string): Promise<Invitation> {
    const existing = Array.from(invitations.values()).find(i => i.email === data.email && i.status === 'pending');
    if (existing) throw new Error('Invitation already pending for this email');
    const invitation: Invitation = {
      id: generateId(), email: data.email, role: data.role,
      department: data.department, message: data.message, invitedBy: actorId,
      token: generateToken(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending', createdAt: new Date()
    };
    invitations.set(invitation.id, invitation);
    await AdminService.logAudit(actorId, 'user.invited', invitation.id, 'invitation', `Invited ${data.email} as ${data.role}`, 'info');
    return invitation;
  }

  static async acceptInvitation(token: string, name: string): Promise<User> {
    const invitation = Array.from(invitations.values()).find(i => i.token === token && i.status === 'pending');
    if (!invitation) throw new Error('Invalid or expired invitation');
    if (invitation.expiresAt < new Date()) { invitation.status = 'expired'; throw new Error('Invitation has expired'); }
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    return AdminService.createUser({ email: invitation.email, name, role: invitation.role, department: invitation.department }, invitation.invitedBy);
  }

  static async getOrgSettings(): Promise<OrgSettings> {
    return { ...orgSettings };
  }

  static async updateOrgSettings(updates: Partial<OrgSettings>, actorId: string): Promise<OrgSettings> {
    const changedFields = Object.keys(updates).filter(k => (updates as Record<string, unknown>)[k] !== (orgSettings as Record<string, unknown>)[k]);
    orgSettings = { ...orgSettings, ...updates, updatedAt: new Date(), updatedBy: actorId };
    await AdminService.logAudit(actorId, 'org.settings_updated', orgSettings.id, 'org', `Updated settings: ${changedFields.join(', ')}`, 'warning');
    return orgSettings;
  }

  static async enforcePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < orgSettings.passwordMinLength) errors.push(`Password must be at least ${orgSettings.passwordMinLength} characters`);
    if (orgSettings.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain a special character');
    if (orgSettings.passwordRequireNumbers && !/\d/.test(password)) errors.push('Password must contain a number');
    return { valid: errors.length === 0, errors };
  }

  static async checkLoginAttempt(userId: string, ipAddress: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
    const user = users.get(userId);
    if (!user) return { allowed: false, remainingAttempts: 0 };
    if (user.lockedUntil && user.lockedUntil > new Date()) return { allowed: false, remainingAttempts: 0 };
    if (user.status === 'suspended') return { allowed: false, remainingAttempts: 0 };
    if (orgSettings.ipWhitelist.length > 0 && !orgSettings.ipWhitelist.includes(ipAddress)) return { allowed: false, remainingAttempts: 0 };
    const remaining = orgSettings.maxLoginAttempts - user.loginAttempts;
    return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
  }

  static async recordLoginAttempt(userId: string, success: boolean, ipAddress: string): Promise<void> {
    const user = users.get(userId);
    if (!user) return;
    if (success) {
      user.loginAttempts = 0;
      user.lastLogin = new Date();
      user.lockedUntil = undefined;
    } else {
      user.loginAttempts += 1;
      if (user.loginAttempts >= orgSettings.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await AdminService.logAudit(userId, 'user.locked', userId, 'user', `Account locked after ${user.loginAttempts} failed attempts`, 'critical');
      }
    }
  }

  static async logAudit(actorId: string, action: string, targetId: string | undefined, targetType: string | undefined, details: string, severity: 'info' | 'warning' | 'critical', ipAddress: string = '0.0.0.0'): Promise<void> {
    const actor = users.get(actorId);
    const entry: AuditLogEntry = {
      id: generateId(), action, actorId, actorName: actor?.name || 'System',
      actorEmail: actor?.email || 'system@quantmail.io', targetId, targetType,
      details, ipAddress, timestamp: new Date(), severity
    };
    auditLog.push(entry);
    if (auditLog.length > 10000) auditLog.splice(0, auditLog.length - 10000);
  }

  static async getAuditLogs(filters?: { page?: number; limit?: number; severity?: string; action?: string }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let result = [...auditLog].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (filters?.severity) result = result.filter(l => l.severity === filters.severity);
    if (filters?.action) result = result.filter(l => l.action.includes(filters.action!));
    const total = result.length;
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    return { logs: result.slice((page - 1) * limit, page * limit), total };
  }
}

export default AdminService;
