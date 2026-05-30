import crypto from 'node:crypto';
import type { SessionConfig, SessionRecord, SessionFingerprint } from './types.js';

export class SecureSessionManager {
  private readonly config: SessionConfig;
  private readonly sessions: Map<string, SessionRecord> = new Map();

  constructor(config: SessionConfig) {
    this.config = config;
  }

  create(userId: string, metadata: SessionFingerprint): SessionRecord {
    const id = crypto.randomUUID();
    const now = new Date();

    const record: SessionRecord = {
      id,
      userId,
      fingerprint: metadata.hash,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
      metadata: {
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        acceptLanguage: metadata.acceptLanguage,
      },
    };

    this.sessions.set(id, record);
    return record;
  }

  validate(sessionId: string, currentFingerprint: SessionFingerprint): SessionRecord | null {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return null;
    }

    // Check expiry
    if (record.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Verify fingerprint with constant-time comparison
    const storedBuffer = Buffer.from(record.fingerprint, 'utf8');
    const currentBuffer = Buffer.from(currentFingerprint.hash, 'utf8');

    if (storedBuffer.length !== currentBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(storedBuffer, currentBuffer)) {
      return null;
    }

    // Update last accessed
    record.lastAccessedAt = new Date();
    return record;
  }

  revoke(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  revokeAll(userId: string): number {
    let count = 0;
    for (const [id, record] of this.sessions) {
      if (record.userId === userId) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  listActive(userId: string): SessionRecord[] {
    const active: SessionRecord[] = [];
    const now = Date.now();
    for (const [, record] of this.sessions) {
      if (record.userId === userId && record.expiresAt.getTime() > now) {
        active.push(record);
      }
    }
    return active;
  }

  enforceConcurrencyLimit(userId: string): SessionRecord[] {
    const userSessions = this.listActive(userId);
    const revoked: SessionRecord[] = [];

    if (userSessions.length <= this.config.maxConcurrent) {
      return revoked;
    }

    // Sort by lastAccessedAt ascending (oldest first)
    const sorted = [...userSessions].sort(
      (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
    );

    // Remove oldest sessions until we're within the limit
    const toRemove = sorted.slice(0, sorted.length - this.config.maxConcurrent);
    for (const session of toRemove) {
      this.sessions.delete(session.id);
      revoked.push(session);
    }

    return revoked;
  }

  generateFingerprint(ip: string, userAgent: string, acceptLanguage: string): SessionFingerprint {
    const hash = crypto
      .createHash('sha256')
      .update(`${ip}|${userAgent}|${acceptLanguage}`)
      .digest('hex');

    return {
      ip,
      userAgent,
      acceptLanguage,
      hash,
    };
  }
}
