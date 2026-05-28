// ============================================================================
// QuantMail - Admin Panel
// User management, roles, organization settings, security policies, audit logs
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@quant/common';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'member' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  avatarUrl?: string;
  department?: string;
  twoFactorEnabled: boolean;
}

interface OrgSettings {
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
}

interface AuditLogEntry {
  id: string;
  action: string;
  actor: { name: string; email: string };
  target?: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

interface InviteForm {
  email: string;
  role: string;
  department: string;
  message: string;
}

interface AdminPageProps {
  currentUser?: { id: string; role: string };
}

type AdminTab = 'users' | 'settings' | 'security' | 'audit';

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'member',
    department: '',
    message: '',
  });
  const [inviting, setInviting] = useState<boolean>(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: '',
    domain: '',
    defaultRole: 'member',
    allowSignup: true,
    requireTwoFactor: false,
    sessionTimeout: 480,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    ipWhitelist: [],
    allowedDomains: [],
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  const fetchOrgSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrgSettings(data);
      }
    } catch (err) {
      logger.error('Failed to fetch settings:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/audit-logs?page=${auditPage}&limit=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setAuditTotal(data.total || 0);
      }
    } catch (err) {
      logger.error('Failed to fetch audit logs:', err);
    }
  }, [auditPage]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'settings' || activeTab === 'security') fetchOrgSettings();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchUsers, fetchOrgSettings, fetchAuditLogs]);

  const handleInviteUser = useCallback(async () => {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(inviteForm),
      });
      if (!response.ok) throw new Error('Failed to invite user');
      const newUser = await response.json();
      setUsers((prev) => [...prev, newUser]);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member', department: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  }, [inviteForm]);

  const handleUpdateRole = useCallback(async (userId: string, newRole: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as AdminUser['role'] } : u)),
      );
      setEditingRole(null);
    } catch (err) {
      logger.error('Failed to update role:', err);
    }
  }, []);

  const handleSuspendUser = useCallback(async (userId: string, suspend: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}/${suspend ? 'suspend' : 'activate'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: suspend ? ('suspended' as const) : ('active' as const) }
            : u,
        ),
      );
    } catch (err) {
      logger.error('Failed to update user status:', err);
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
    } catch (err) {
      logger.error('Failed to delete user:', err);
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(orgSettings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }, [orgSettings]);

  const filteredUsers = useMemo(() => users, [users]);

  if (error && users.length === 0 && activeTab === 'users') {
    return (
      <div className="admin-error">
        <h2>Admin Panel Error</h2>
        <p>{error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <nav className="admin-tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'active' : ''}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={activeTab === 'settings' ? 'active' : ''}
          >
            Organization
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={activeTab === 'security' ? 'active' : ''}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={activeTab === 'audit' ? 'active' : ''}
          >
            Audit Log
          </button>
        </nav>
      </header>

      {activeTab === 'users' && (
        <div className="users-section">
          <div className="users-toolbar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <button onClick={() => setShowInviteModal(true)} className="invite-btn">
              + Invite User
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="user-skeleton"></div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              <h3>No users found</h3>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>2FA</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={user.status === 'suspended' ? 'suspended' : ''}>
                    <td className="user-cell">
                      <div className="user-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" />
                        ) : (
                          <span>{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      {editingRole === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                        >
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span
                          className={`role-badge ${user.role}`}
                          onClick={() => setEditingRole(user.id)}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>{user.status}</span>
                    </td>
                    <td>{user.twoFactorEnabled ? '\u2705' : '\u274C'}</td>
                    <td>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleSuspendUser(user.id, user.status !== 'suspended')}
                      >
                        {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="settings-section">
          <h2>Organization Settings</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                value={orgSettings.name}
                onChange={(e) => setOrgSettings((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Domain</label>
              <input
                type="text"
                value={orgSettings.domain}
                onChange={(e) => setOrgSettings((p) => ({ ...p, domain: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Default Role for New Members</label>
              <select
                value={orgSettings.defaultRole}
                onChange={(e) => setOrgSettings((p) => ({ ...p, defaultRole: e.target.value }))}
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={orgSettings.allowSignup}
                  onChange={(e) => setOrgSettings((p) => ({ ...p, allowSignup: e.target.checked }))}
                />{' '}
                Allow public signup
              </label>
            </div>
            <div className="form-group">
              <label>Allowed Email Domains (comma-separated)</label>
              <input
                type="text"
                value={orgSettings.allowedDomains.join(', ')}
                onChange={(e) =>
                  setOrgSettings((p) => ({
                    ...p,
                    allowedDomains: e.target.value
                      .split(',')
                      .map((d) => d.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="example.com, company.org"
              />
            </div>
            <button onClick={handleSaveSettings} disabled={savingSettings} className="save-btn">
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="security-section">
          <h2>Security Policies</h2>
          <div className="policy-group">
            <h3>Authentication</h3>
            <label>
              <input
                type="checkbox"
                checked={orgSettings.requireTwoFactor}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, requireTwoFactor: e.target.checked }))
                }
              />{' '}
              Require Two-Factor Authentication for all users
            </label>
            <div className="form-group">
              <label>Session Timeout (minutes)</label>
              <input
                type="number"
                value={orgSettings.sessionTimeout}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, sessionTimeout: Number(e.target.value) }))
                }
                min={5}
                max={1440}
              />
            </div>
            <div className="form-group">
              <label>Max Login Attempts</label>
              <input
                type="number"
                value={orgSettings.maxLoginAttempts}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, maxLoginAttempts: Number(e.target.value) }))
                }
                min={3}
                max={10}
              />
            </div>
          </div>
          <div className="policy-group">
            <h3>Password Policy</h3>
            <div className="form-group">
              <label>Minimum Length</label>
              <input
                type="number"
                value={orgSettings.passwordMinLength}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, passwordMinLength: Number(e.target.value) }))
                }
                min={6}
                max={32}
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={orgSettings.passwordRequireSpecial}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, passwordRequireSpecial: e.target.checked }))
                }
              />{' '}
              Require special characters
            </label>
            <label>
              <input
                type="checkbox"
                checked={orgSettings.passwordRequireNumbers}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, passwordRequireNumbers: e.target.checked }))
                }
              />{' '}
              Require numbers
            </label>
            <div className="form-group">
              <label>Password Expiry (days, 0 = never)</label>
              <input
                type="number"
                value={orgSettings.passwordExpiryDays}
                onChange={(e) =>
                  setOrgSettings((p) => ({ ...p, passwordExpiryDays: Number(e.target.value) }))
                }
                min={0}
                max={365}
              />
            </div>
          </div>
          <div className="policy-group">
            <h3>IP Whitelist</h3>
            <div className="form-group">
              <label>Allowed IPs (one per line)</label>
              <textarea
                value={orgSettings.ipWhitelist.join('\n')}
                onChange={(e) =>
                  setOrgSettings((p) => ({
                    ...p,
                    ipWhitelist: e.target.value.split('\n').filter(Boolean),
                  }))
                }
                rows={4}
                placeholder="192.168.1.0/24"
              />
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="save-btn">
            {savingSettings ? 'Saving...' : 'Save Security Policies'}
          </button>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="audit-section">
          <h2>Audit Log ({auditTotal} entries)</h2>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className={`severity-${log.severity}`}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="action-cell">{log.action}</td>
                  <td>{log.actor.name}</td>
                  <td>{log.target || '-'}</td>
                  <td className="details-cell">{log.details}</td>
                  <td>
                    <code>{log.ipAddress}</code>
                  </td>
                  <td>
                    <span className={`severity-badge ${log.severity}`}>{log.severity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditTotal > 50 && (
            <div className="pagination">
              <button disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {auditPage} of {Math.ceil(auditTotal / 50)}
              </span>
              <button
                disabled={auditPage >= Math.ceil(auditTotal / 50)}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Invite User</h2>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={inviteForm.department}
                onChange={(e) => setInviteForm((p) => ({ ...p, department: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Personal Message</label>
              <textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm((p) => ({ ...p, message: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button onClick={handleInviteUser} disabled={inviting || !inviteForm.email.trim()}>
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
