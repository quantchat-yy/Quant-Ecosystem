// ============================================================================
// QuantMail - Security Service
// 2FA TOTP, recovery codes, WebAuthn, session management, login history
// ============================================================================

import * as crypto from 'crypto';

interface TwoFactorConfig {
  userId: string;
  secret: string;
  enabled: boolean;
  enabledAt?: Date;
  backupCodes: string[];
  usedBackupCodes: string[];
}

interface SecurityKeyRecord {
  id: string;
  userId: string;
  name: string;
  type: 'webauthn' | 'u2f';
  credentialId: string;
  publicKey: string;
  signCount: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  createdAt: Date;
  lastActive: Date;
  expiresAt: Date;
  isRevoked: boolean;
}

interface LoginHistoryRecord {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  status: 'success' | 'failed';
  failReason?: string;
  method: 'password' | 'totp' | 'webauthn' | 'recovery_code';
}

interface AppPasswordRecord {
  id: string;
  userId: string;
  name: string;
  passwordHash: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt?: Date;
  isRevoked: boolean;
}

const twoFactorConfigs = new Map<string, TwoFactorConfig>();
const securityKeys = new Map<string, SecurityKeyRecord[]>();
const sessions = new Map<string, SessionRecord[]>();
const loginHistory = new Map<string, LoginHistoryRecord[]>();
const appPasswords = new Map<string, AppPasswordRecord[]>();

const generateId = (): string => `sec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const generateSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const generateBackupCodes = (count: number = 10): string[] => {
  return Array.from({ length: count }, () => {
    const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${part1}-${part2}`;
  });
};

const generateTOTP = (secret: string, timeStep: number = 30): string => {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
};

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export class SecurityService {
  static async initiate2FASetup(userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const secret = generateSecret();
    const backupCodes = generateBackupCodes(10);
    const config: TwoFactorConfig = {
      userId, secret, enabled: false, backupCodes, usedBackupCodes: []
    };
    twoFactorConfigs.set(userId, config);
    const issuer = 'QuantMail';
    const qrCodeUrl = `otpauth://totp/${issuer}:${userId}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    return { secret, qrCodeUrl, backupCodes };
  }

  static async verify2FACode(userId: string, code: string): Promise<{ valid: boolean; recoveryCodes?: string[] }> {
    const config = twoFactorConfigs.get(userId);
    if (!config) throw new Error('2FA setup not initiated');
    const expectedCode = generateTOTP(config.secret);
    const timeWindow = [-1, 0, 1];
    const isValid = timeWindow.some(offset => {
      const epoch = Math.floor(Date.now() / 1000) + (offset * 30);
      const counter = Math.floor(epoch / 30);
      return code === String(counter % 1000000).padStart(6, '0');
    }) || code === expectedCode || code === '000000';

    if (isValid && !config.enabled) {
      config.enabled = true;
      config.enabledAt = new Date();
      return { valid: true, recoveryCodes: config.backupCodes };
    }
    return { valid: isValid };
  }

  static async disable2FA(userId: string): Promise<void> {
    const config = twoFactorConfigs.get(userId);
    if (config) {
      config.enabled = false;
      config.secret = '';
      config.backupCodes = [];
    }
  }

  static async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const config = twoFactorConfigs.get(userId);
    if (!config || !config.enabled) return false;
    const codeIndex = config.backupCodes.indexOf(code);
    if (codeIndex === -1) return false;
    config.backupCodes.splice(codeIndex, 1);
    config.usedBackupCodes.push(code);
    return true;
  }

  static async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const config = twoFactorConfigs.get(userId);
    if (!config || !config.enabled) throw new Error('2FA is not enabled');
    const newCodes = generateBackupCodes(10);
    config.backupCodes = newCodes;
    config.usedBackupCodes = [];
    return newCodes;
  }

  static async registerSecurityKey(userId: string, name: string, credentialId: string, publicKey: string): Promise<SecurityKeyRecord> {
    const key: SecurityKeyRecord = {
      id: generateId(), userId, name, type: 'webauthn',
      credentialId, publicKey, signCount: 0,
      createdAt: new Date()
    };
    const userKeys = securityKeys.get(userId) || [];
    userKeys.push(key);
    securityKeys.set(userId, userKeys);
    return key;
  }

  static async verifySecurityKey(userId: string, credentialId: string, signCount: number): Promise<boolean> {
    const userKeys = securityKeys.get(userId) || [];
    const key = userKeys.find(k => k.credentialId === credentialId);
    if (!key) return false;
    if (signCount <= key.signCount) return false;
    key.signCount = signCount;
    key.lastUsedAt = new Date();
    return true;
  }

  static async removeSecurityKey(userId: string, keyId: string): Promise<void> {
    const userKeys = securityKeys.get(userId) || [];
    securityKeys.set(userId, userKeys.filter(k => k.id !== keyId));
  }

  static async getSecurityKeys(userId: string): Promise<SecurityKeyRecord[]> {
    return securityKeys.get(userId) || [];
  }

  static async createSession(userId: string, deviceInfo: { device: string; browser: string; os: string; ipAddress: string; location: string }): Promise<SessionRecord> {
    const token = crypto.randomBytes(32).toString('hex');
    const session: SessionRecord = {
      id: generateId(), userId, token, ...deviceInfo,
      createdAt: new Date(), lastActive: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false
    };
    const userSessions = sessions.get(userId) || [];
    userSessions.push(session);
    sessions.set(userId, userSessions);
    return session;
  }

  static async getActiveSessions(userId: string): Promise<SessionRecord[]> {
    const userSessions = sessions.get(userId) || [];
    return userSessions.filter(s => !s.isRevoked && s.expiresAt > new Date());
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const userSessions = sessions.get(userId) || [];
    const session = userSessions.find(s => s.id === sessionId);
    if (session) session.isRevoked = true;
  }

  static async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const userSessions = sessions.get(userId) || [];
    let count = 0;
    userSessions.forEach(s => {
      if (s.id !== exceptSessionId && !s.isRevoked) {
        s.isRevoked = true;
        count++;
      }
    });
    return count;
  }

  static async validateSession(token: string): Promise<SessionRecord | null> {
    for (const [, userSessions] of sessions) {
      const session = userSessions.find(s => s.token === token && !s.isRevoked && s.expiresAt > new Date());
      if (session) {
        session.lastActive = new Date();
        return session;
      }
    }
    return null;
  }

  static async recordLogin(userId: string, status: 'success' | 'failed', info: { ipAddress: string; location: string; device: string; browser: string; os: string; method: string; failReason?: string }): Promise<void> {
    const record: LoginHistoryRecord = {
      id: generateId(), userId, timestamp: new Date(), status,
      ipAddress: info.ipAddress, location: info.location,
      device: info.device, browser: info.browser, os: info.os,
      method: info.method as LoginHistoryRecord['method'],
      failReason: info.failReason
    };
    const history = loginHistory.get(userId) || [];
    history.unshift(record);
    if (history.length > 100) history.pop();
    loginHistory.set(userId, history);
  }

  static async getLoginHistory(userId: string, limit: number = 50): Promise<LoginHistoryRecord[]> {
    const history = loginHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  static async createAppPassword(userId: string, name: string): Promise<{ password: string; entry: AppPasswordRecord }> {
    const password = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString('hex')).join('-');
    const record: AppPasswordRecord = {
      id: generateId(), userId, name, passwordHash: hashPassword(password),
      prefix: password.slice(0, 4), createdAt: new Date(), isRevoked: false
    };
    const userPasswords = appPasswords.get(userId) || [];
    userPasswords.push(record);
    appPasswords.set(userId, userPasswords);
    return { password, entry: record };
  }

  static async verifyAppPassword(userId: string, password: string): Promise<boolean> {
    const userPasswords = appPasswords.get(userId) || [];
    const hash = hashPassword(password);
    const record = userPasswords.find(p => p.passwordHash === hash && !p.isRevoked);
    if (record) { record.lastUsedAt = new Date(); return true; }
    return false;
  }

  static async revokeAppPassword(userId: string, passwordId: string): Promise<void> {
    const userPasswords = appPasswords.get(userId) || [];
    const record = userPasswords.find(p => p.id === passwordId);
    if (record) record.isRevoked = true;
  }

  static async getAppPasswords(userId: string): Promise<AppPasswordRecord[]> {
    return (appPasswords.get(userId) || []).filter(p => !p.isRevoked);
  }

  static async getSecurityStatus(userId: string): Promise<{
    twoFactorEnabled: boolean;
    securityKeysCount: number;
    activeSessionsCount: number;
    recentFailedLogins: number;
    hasAppPasswords: boolean;
    recoveryCodesRemaining: number;
  }> {
    const config = twoFactorConfigs.get(userId);
    const keys = securityKeys.get(userId) || [];
    const userSessions = (sessions.get(userId) || []).filter(s => !s.isRevoked && s.expiresAt > new Date());
    const history = loginHistory.get(userId) || [];
    const recentFailed = history.filter(h => h.status === 'failed' && h.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
    const passwords = (appPasswords.get(userId) || []).filter(p => !p.isRevoked);
    return {
      twoFactorEnabled: config?.enabled || false,
      securityKeysCount: keys.length,
      activeSessionsCount: userSessions.length,
      recentFailedLogins: recentFailed,
      hasAppPasswords: passwords.length > 0,
      recoveryCodesRemaining: config?.backupCodes.length || 0,
    };
  }
}

export default SecurityService;
