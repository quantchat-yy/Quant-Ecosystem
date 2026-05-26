// ============================================================================
// QuantMail - Security Page
// 2FA setup, recovery codes, security keys, sessions, login history
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface SecurityKey {
  id: string;
  name: string;
  type: 'webauthn' | 'u2f';
  createdAt: string;
  lastUsedAt?: string;
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  status: 'success' | 'failed';
  failReason?: string;
}

interface AppPassword {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  prefix: string;
}

interface SecurityPageProps {
  userId?: string;
}

type SecurityTab = '2fa' | 'keys' | 'sessions' | 'history' | 'passwords' | 'recovery';

export const SecurityPage: React.FC<SecurityPageProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<SecurityTab>('2fa');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [securityKeys, setSecurityKeys] = useState<SecurityKey[]>([]);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [registeringKey, setRegisteringKey] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [appPasswords, setAppPasswords] = useState<AppPassword[]>([]);
  const [newAppPasswordName, setNewAppPasswordName] = useState<string>('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState<boolean>(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<number>(0);

  const fetchSecurityStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch security status');
      const data = await response.json();
      setTwoFactorEnabled(data.twoFactorEnabled || false);
      setSecurityKeys(data.securityKeys || []);
      setSessions(data.activeSessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security info');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLoginHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/security/login-history?limit=50', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    }
  }, []);

  const fetchAppPasswords = useCallback(async () => {
    try {
      const response = await fetch('/api/security/app-passwords', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAppPasswords(data.passwords || []);
      }
    } catch (err) {
      console.error('Failed to fetch app passwords:', err);
    }
  }, []);

  useEffect(() => {
    fetchSecurityStatus();
  }, [fetchSecurityStatus]);
  useEffect(() => {
    if (activeTab === 'history') fetchLoginHistory();
    if (activeTab === 'passwords') fetchAppPasswords();
  }, [activeTab, fetchLoginHistory, fetchAppPasswords]);

  const handleEnable2FA = useCallback(async () => {
    try {
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to initiate 2FA setup');
      const data = await response.json();
      setTwoFactorSetup(data);
      setSetupStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA setup failed');
    }
  }, []);

  const handleVerify2FA = useCallback(async () => {
    if (verificationCode.length !== 6) return;
    setVerifying(true);
    try {
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code: verificationCode, secret: twoFactorSetup?.secret }),
      });
      if (!response.ok) throw new Error('Invalid verification code');
      const data = await response.json();
      setTwoFactorEnabled(true);
      setRecoveryCodes(data.recoveryCodes || twoFactorSetup?.backupCodes || []);
      setSetupStep(2);
      setVerificationCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [verificationCode, twoFactorSetup]);

  const handleDisable2FA = useCallback(async () => {
    try {
      await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTwoFactorEnabled(false);
      setTwoFactorSetup(null);
      setSetupStep(0);
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    }
  }, []);

  const handleRegisterSecurityKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    setRegisteringKey(true);
    try {
      const response = await fetch('/api/security/keys/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newKeyName, type: 'webauthn' }),
      });
      if (!response.ok) throw new Error('Failed to register security key');
      const key = await response.json();
      setSecurityKeys((prev) => [...prev, key]);
      setNewKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key registration failed');
    } finally {
      setRegisteringKey(false);
    }
  }, [newKeyName]);

  const handleRemoveKey = useCallback(async (keyId: string) => {
    try {
      await fetch(`/api/security/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSecurityKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error('Failed to remove key:', err);
    }
  }, []);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    try {
      await fetch(`/api/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  }, []);

  const handleRevokeAllSessions = useCallback(async () => {
    try {
      await fetch('/api/security/sessions/revoke-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      console.error('Failed to revoke sessions:', err);
    }
  }, []);

  const handleCreateAppPassword = useCallback(async () => {
    if (!newAppPasswordName.trim()) return;
    try {
      const response = await fetch('/api/security/app-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newAppPasswordName }),
      });
      if (!response.ok) throw new Error('Failed to create app password');
      const data = await response.json();
      setGeneratedPassword(data.password);
      setAppPasswords((prev) => [...prev, data.entry]);
      setNewAppPasswordName('');
    } catch (err) {
      console.error('Failed to create app password:', err);
    }
  }, [newAppPasswordName]);

  const handleDeleteAppPassword = useCallback(async (passwordId: string) => {
    try {
      await fetch(`/api/security/app-passwords/${passwordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAppPasswords((prev) => prev.filter((p) => p.id !== passwordId));
    } catch (err) {
      console.error('Failed to delete app password:', err);
    }
  }, []);

  const handleRegenerateRecoveryCodes = useCallback(async () => {
    setRegeneratingCodes(true);
    try {
      const response = await fetch('/api/security/recovery-codes/regenerate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecoveryCodes(data.codes || []);
        setShowRecoveryCodes(true);
      }
    } catch (err) {
      console.error('Failed to regenerate codes:', err);
    } finally {
      setRegeneratingCodes(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="security-loading">
        <div className="loading-spinner">Loading security settings...</div>
      </div>
    );
  }

  if (error && !twoFactorSetup) {
    return (
      <div className="security-error">
        <h2>Security Error</h2>
        <p>{error}</p>
        <button onClick={fetchSecurityStatus}>Retry</button>
      </div>
    );
  }

  return (
    <div className="security-page">
      <header className="security-header">
        <h1>Security Settings</h1>
        <div className="security-status">
          <span className={`status-indicator ${twoFactorEnabled ? 'secure' : 'warning'}`}>
            {twoFactorEnabled ? '\u2705 2FA Enabled' : '\u26A0\uFE0F 2FA Disabled'}
          </span>
          <span className="keys-count">{securityKeys.length} security key(s)</span>
          <span className="sessions-count">{sessions.length} active session(s)</span>
        </div>
      </header>

      <nav className="security-tabs">
        <button onClick={() => setActiveTab('2fa')} className={activeTab === '2fa' ? 'active' : ''}>
          Two-Factor Auth
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={activeTab === 'keys' ? 'active' : ''}
        >
          Security Keys
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={activeTab === 'sessions' ? 'active' : ''}
        >
          Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'active' : ''}
        >
          Login History
        </button>
        <button
          onClick={() => setActiveTab('passwords')}
          className={activeTab === 'passwords' ? 'active' : ''}
        >
          App Passwords
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={activeTab === 'recovery' ? 'active' : ''}
        >
          Recovery
        </button>
      </nav>

      <main className="security-content">
        {activeTab === '2fa' && (
          <div className="twofa-section">
            {twoFactorEnabled && setupStep === 0 ? (
              <div className="twofa-enabled">
                <div className="status-card success">
                  <h3>\u2705 Two-Factor Authentication is Enabled</h3>
                  <p>Your account is protected with TOTP-based two-factor authentication.</p>
                </div>
                <button onClick={handleDisable2FA} className="danger-btn">
                  Disable 2FA
                </button>
              </div>
            ) : setupStep === 0 ? (
              <div className="twofa-disabled">
                <div className="status-card warning">
                  <h3>\u26A0\uFE0F Two-Factor Authentication is Disabled</h3>
                  <p>Enable 2FA to add an extra layer of security to your account.</p>
                </div>
                <div className="setup-steps-preview">
                  <p>Setup involves:</p>
                  <ol>
                    <li>Scan QR code with your authenticator app</li>
                    <li>Enter verification code</li>
                    <li>Save backup recovery codes</li>
                  </ol>
                </div>
                <button onClick={handleEnable2FA} className="enable-btn">
                  Enable Two-Factor Authentication
                </button>
              </div>
            ) : setupStep === 1 && twoFactorSetup ? (
              <div className="twofa-setup">
                <h3>Step 1: Scan QR Code</h3>
                <p>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="qr-code-container">
                  <img src={twoFactorSetup.qrCodeUrl} alt="2FA QR Code" className="qr-code" />
                </div>
                <p className="manual-entry">
                  Manual entry key: <code>{twoFactorSetup.secret}</code>
                </p>
                <div className="verify-section">
                  <h4>Step 2: Enter Verification Code</h4>
                  <div className="code-input-group">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      maxLength={6}
                      className="code-input"
                      autoFocus
                    />
                    <button
                      onClick={handleVerify2FA}
                      disabled={verifying || verificationCode.length !== 6}
                      className="verify-btn"
                    >
                      {verifying ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ) : setupStep === 2 ? (
              <div className="twofa-complete">
                <div className="status-card success">
                  <h3>\u2705 Two-Factor Authentication Enabled!</h3>
                </div>
                <div className="backup-codes-section">
                  <h4>Backup Recovery Codes</h4>
                  <p className="warning-text">
                    Save these codes in a secure place. Each code can only be used once.
                  </p>
                  <div className="codes-grid">
                    {recoveryCodes.map((code, i) => (
                      <code key={i} className="recovery-code">
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const text = recoveryCodes.join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                    className="copy-codes-btn"
                  >
                    Copy All Codes
                  </button>
                </div>
                <button onClick={() => setSetupStep(0)} className="done-btn">
                  Done
                </button>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="keys-section">
            <h2>Security Keys (WebAuthn/FIDO2)</h2>
            <p>Security keys provide phishing-resistant two-factor authentication.</p>
            <div className="register-key-form">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., YubiKey 5)"
              />
              <button
                onClick={handleRegisterSecurityKey}
                disabled={registeringKey || !newKeyName.trim()}
              >
                {registeringKey ? 'Registering...' : 'Register New Key'}
              </button>
            </div>
            {securityKeys.length === 0 ? (
              <div className="empty-state">
                <p>No security keys registered.</p>
              </div>
            ) : (
              <div className="keys-list">
                {securityKeys.map((key) => (
                  <div key={key.id} className="key-item">
                    <div className="key-icon">{'\u{1F511}'}</div>
                    <div className="key-info">
                      <span className="key-name">{key.name}</span>
                      <span className="key-meta">
                        Added {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt &&
                          ` | Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </span>
                    </div>
                    <button onClick={() => handleRemoveKey(key.id)} className="remove-key-btn">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <div className="sessions-header">
              <h2>Active Sessions</h2>
              <button onClick={handleRevokeAllSessions} className="revoke-all-btn">
                Revoke All Other Sessions
              </button>
            </div>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No active sessions found.</p>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`session-item ${session.isCurrent ? 'current' : ''}`}
                  >
                    <div className="session-device-icon">
                      {session.os.includes('Windows')
                        ? '\u{1F4BB}'
                        : session.os.includes('Mac')
                          ? '\u{1F4BB}'
                          : session.os.includes('Android') || session.os.includes('iOS')
                            ? '\u{1F4F1}'
                            : '\u{1F5A5}'}
                    </div>
                    <div className="session-info">
                      <span className="session-device">
                        {session.device} - {session.browser}
                      </span>
                      <span className="session-meta">
                        {session.os} | {session.ipAddress} | {session.location}
                      </span>
                      <span className="session-time">
                        Last active: {new Date(session.lastActive).toLocaleString()}
                      </span>
                    </div>
                    {session.isCurrent ? (
                      <span className="current-badge">Current Session</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="revoke-btn"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h2>Login History</h2>
            {loginHistory.length === 0 ? (
              <div className="empty-state">
                <p>No login history available.</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry) => (
                    <tr key={entry.id} className={entry.status === 'failed' ? 'failed-login' : ''}>
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td>
                        <span className={`login-status ${entry.status}`}>
                          {entry.status === 'success' ? '\u2705' : '\u274C'} {entry.status}
                        </span>
                        {entry.failReason && (
                          <span className="fail-reason"> ({entry.failReason})</span>
                        )}
                      </td>
                      <td>
                        <code>{entry.ipAddress}</code>
                      </td>
                      <td>{entry.location}</td>
                      <td>{entry.device}</td>
                      <td>{entry.browser}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'passwords' && (
          <div className="passwords-section">
            <h2>App Passwords</h2>
            <p>
              App passwords let you sign in to apps that do not support two-factor authentication.
            </p>
            <div className="create-password-form">
              <input
                type="text"
                value={newAppPasswordName}
                onChange={(e) => setNewAppPasswordName(e.target.value)}
                placeholder="App name (e.g., Thunderbird)"
              />
              <button onClick={handleCreateAppPassword} disabled={!newAppPasswordName.trim()}>
                Generate Password
              </button>
            </div>
            {generatedPassword && (
              <div className="generated-password-banner">
                <p>Your new app password (copy it now, it will not be shown again):</p>
                <code className="password-display">{generatedPassword}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                  }}
                >
                  Copy
                </button>
                <button onClick={() => setGeneratedPassword(null)}>Dismiss</button>
              </div>
            )}
            {appPasswords.length === 0 ? (
              <div className="empty-state">
                <p>No app passwords created.</p>
              </div>
            ) : (
              <div className="passwords-list">
                {appPasswords.map((pw) => (
                  <div key={pw.id} className="password-item">
                    <div className="password-info">
                      <span className="password-name">{pw.name}</span>
                      <span className="password-prefix">Starts with: {pw.prefix}...</span>
                      <span className="password-meta">
                        Created {new Date(pw.createdAt).toLocaleDateString()}
                        {pw.lastUsedAt &&
                          ` | Last used ${new Date(pw.lastUsedAt).toLocaleDateString()}`}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteAppPassword(pw.id)} className="delete-btn">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recovery' && (
          <div className="recovery-section">
            <h2>Recovery Codes</h2>
            <p>
              Recovery codes allow you to access your account if you lose your two-factor device.
            </p>
            {!twoFactorEnabled ? (
              <div className="info-card">
                <p>Enable two-factor authentication first to generate recovery codes.</p>
              </div>
            ) : (
              <>
                {showRecoveryCodes && recoveryCodes.length > 0 ? (
                  <div className="codes-display">
                    <div className="codes-grid">
                      {recoveryCodes.map((code, i) => (
                        <code key={i} className="recovery-code">
                          {code}
                        </code>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryCodes.join('\n'));
                      }}
                    >
                      Copy All
                    </button>
                    <button onClick={() => setShowRecoveryCodes(false)}>Hide</button>
                  </div>
                ) : (
                  <div className="recovery-actions">
                    <button
                      onClick={() => setShowRecoveryCodes(true)}
                      disabled={recoveryCodes.length === 0}
                    >
                      View Recovery Codes
                    </button>
                    <button
                      onClick={handleRegenerateRecoveryCodes}
                      disabled={regeneratingCodes}
                      className="regen-btn"
                    >
                      {regeneratingCodes ? 'Generating...' : 'Regenerate Codes'}
                    </button>
                    <p className="warning-text">
                      Regenerating codes will invalidate all previous codes.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SecurityPage;
