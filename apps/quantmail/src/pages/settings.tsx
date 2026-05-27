// ============================================================================
// QuantMail - Settings Page
// Account settings, security, connected apps
// ============================================================================

import React, { useState } from 'react';
import type { NotificationPreferences, QuantApp } from '../types';

export interface SettingsPageProps {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    twoFactorEnabled: boolean;
  };
  notificationPrefs: NotificationPreferences;
  connectedApps: Array<{ app: QuantApp; connectedAt: Date; scopes: string[] }>;
  onUpdateProfile: (data: { displayName: string; username: string }) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onSetupTwoFactor: () => Promise<{ qrCodeUrl: string; secret: string; backupCodes: string[] }>;
  onDisableTwoFactor: (password: string) => Promise<void>;
  onUpdateNotifications: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  onRevokeApp: (app: QuantApp) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}

const defaultUser = { id: '', email: '', username: '', displayName: '', twoFactorEnabled: false };
const defaultNotificationPrefs: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  desktopNotifications: true,
  digestFrequency: 'daily',
  quietHours: null,
  categories: {},
};
const noop = async () => {
  /* placeholder */
};
const noopSetup = async () => ({ qrCodeUrl: '', secret: '', backupCodes: [] as string[] });

type TabId = 'profile' | 'security' | 'notifications' | 'apps';

export function SettingsPage(props: Partial<SettingsPageProps>): React.ReactElement {
  const user = props.user ?? defaultUser;
  const notificationPrefs = props.notificationPrefs ?? defaultNotificationPrefs;
  const connectedApps = props.connectedApps ?? [];
  const onUpdateProfile = props.onUpdateProfile ?? noop;
  const onChangePassword = props.onChangePassword ?? noop;
  const onSetupTwoFactor = props.onSetupTwoFactor ?? noopSetup;
  const onDisableTwoFactor = props.onDisableTwoFactor ?? noop;
  const onUpdateNotifications = props.onUpdateNotifications ?? noop;
  const onRevokeApp = props.onRevokeApp ?? noop;
  const onDeleteAccount = props.onDeleteAccount ?? noop;

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState({
    displayName: user.displayName,
    username: user.username,
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'apps', label: 'Connected Apps' },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateProfile(profile);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await onChangePassword(passwords.current, passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password' });
    }
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Information</h2>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user.email} disabled className="input-disabled" />
                  <p className="form-hint">Email cannot be changed</p>
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security</h2>
              <div className="security-section">
                <h3>Change Password</h3>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Change Password
                  </button>
                </form>
              </div>
              <div className="security-section">
                <h3>Two-Factor Authentication</h3>
                <p className={`tfa-status ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                  Status: {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
                {user.twoFactorEnabled ? (
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={() => onDisableTwoFactor('')}
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={onSetupTwoFactor}>
                    Enable 2FA
                  </button>
                )}
              </div>
              <div className="security-section danger-zone">
                <h3>Danger Zone</h3>
                <p>Once you delete your account, there is no going back.</p>
                <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <div className="notification-settings">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.emailNotifications}
                    onChange={(e) =>
                      onUpdateNotifications({ emailNotifications: e.target.checked })
                    }
                  />
                  Email notifications
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.pushNotifications}
                    onChange={(e) => onUpdateNotifications({ pushNotifications: e.target.checked })}
                  />
                  Push notifications
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.desktopNotifications}
                    onChange={(e) =>
                      onUpdateNotifications({ desktopNotifications: e.target.checked })
                    }
                  />
                  Desktop notifications
                </label>
                <div className="form-group">
                  <label>Digest frequency</label>
                  <select
                    value={notificationPrefs.digestFrequency}
                    onChange={(e) =>
                      onUpdateNotifications({ digestFrequency: e.target.value as any })
                    }
                  >
                    <option value="realtime">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="settings-section">
              <h2>Connected Applications</h2>
              <p>These Quant apps have access to your account.</p>
              <div className="connected-apps-list">
                {connectedApps.length === 0 && <p className="empty-state">No connected apps</p>}
                {connectedApps.map((app) => (
                  <div key={app.app} className="connected-app">
                    <div className="app-info">
                      <h4>{app.app}</h4>
                      <span className="app-date">
                        Connected {new Date(app.connectedAt).toLocaleDateString()}
                      </span>
                      <div className="app-scopes">
                        {app.scopes.map((s) => (
                          <span key={s} className="scope-badge">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline btn-danger"
                      onClick={() => onRevokeApp(app.app)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-danger" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Account</h2>
            <p>This action cannot be undone. All your data will be permanently deleted.</p>
            <div className="form-group">
              <label>Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onDeleteAccount(deletePassword)}
                disabled={!deletePassword}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
