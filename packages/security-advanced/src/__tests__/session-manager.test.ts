import { describe, it, expect } from 'vitest';
import { SecureSessionManager } from '../session-manager.js';
import type { SessionConfig } from '../types.js';

const config: SessionConfig = {
  maxConcurrent: 3,
  fingerprintFields: ['ip', 'userAgent', 'acceptLanguage'],
  ttlMs: 3600000, // 1 hour
};

describe('SecureSessionManager', () => {
  it('should create a session with correct metadata', () => {
    const manager = new SecureSessionManager(config);
    const fingerprint = manager.generateFingerprint('192.168.1.1', 'Mozilla/5.0', 'en-US');
    const session = manager.create('user-1', fingerprint);

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-1');
    expect(session.fingerprint).toBe(fingerprint.hash);
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should validate session with matching fingerprint', () => {
    const manager = new SecureSessionManager(config);
    const fingerprint = manager.generateFingerprint('10.0.0.1', 'Chrome/120', 'en-GB');
    const session = manager.create('user-2', fingerprint);

    const result = manager.validate(session.id, fingerprint);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('user-2');
  });

  it('should reject session with non-matching fingerprint', () => {
    const manager = new SecureSessionManager(config);
    const fingerprint1 = manager.generateFingerprint('10.0.0.1', 'Chrome/120', 'en-GB');
    const fingerprint2 = manager.generateFingerprint('10.0.0.2', 'Firefox/119', 'fr-FR');
    const session = manager.create('user-3', fingerprint1);

    const result = manager.validate(session.id, fingerprint2);
    expect(result).toBeNull();
  });

  it('should revoke a specific session', () => {
    const manager = new SecureSessionManager(config);
    const fingerprint = manager.generateFingerprint('1.1.1.1', 'Safari/17', 'de-DE');
    const session = manager.create('user-4', fingerprint);

    expect(manager.revoke(session.id)).toBe(true);
    expect(manager.validate(session.id, fingerprint)).toBeNull();
  });

  it('should revoke all sessions for a user', () => {
    const manager = new SecureSessionManager(config);
    const fp = manager.generateFingerprint('1.1.1.1', 'Chrome', 'en');

    manager.create('user-5', fp);
    manager.create('user-5', fp);
    manager.create('user-5', fp);
    manager.create('other-user', fp);

    const revoked = manager.revokeAll('user-5');
    expect(revoked).toBe(3);
    expect(manager.listActive('user-5')).toHaveLength(0);
    expect(manager.listActive('other-user')).toHaveLength(1);
  });

  it('should enforce concurrency limits', () => {
    const manager = new SecureSessionManager(config);
    const fp = manager.generateFingerprint('2.2.2.2', 'Chrome', 'en');

    manager.create('user-6', fp);
    manager.create('user-6', fp);
    manager.create('user-6', fp);
    manager.create('user-6', fp);
    manager.create('user-6', fp);

    expect(manager.listActive('user-6')).toHaveLength(5);

    const revoked = manager.enforceConcurrencyLimit('user-6');
    expect(revoked.length).toBe(2); // 5 - 3 = 2 removed
    expect(manager.listActive('user-6')).toHaveLength(3);
  });

  it('should generate consistent fingerprints for same inputs', () => {
    const manager = new SecureSessionManager(config);
    const fp1 = manager.generateFingerprint('1.2.3.4', 'UA', 'en');
    const fp2 = manager.generateFingerprint('1.2.3.4', 'UA', 'en');

    expect(fp1.hash).toBe(fp2.hash);
  });

  it('should generate different fingerprints for different inputs', () => {
    const manager = new SecureSessionManager(config);
    const fp1 = manager.generateFingerprint('1.2.3.4', 'UA1', 'en');
    const fp2 = manager.generateFingerprint('1.2.3.5', 'UA2', 'fr');

    expect(fp1.hash).not.toBe(fp2.hash);
  });
});
