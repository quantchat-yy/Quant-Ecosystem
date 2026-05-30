import crypto from 'node:crypto';
import type { APIKeyConfig, APIKeyRecord, APIKeyScope } from './types.js';

export class APIKeyManager {
  private readonly config: APIKeyConfig;
  private readonly keys: Map<string, APIKeyRecord> = new Map();

  constructor(config: APIKeyConfig) {
    this.config = config;
  }

  generate(scopes: APIKeyScope[], expiresInMs?: number): { key: string; record: APIKeyRecord } {
    const id = crypto.randomUUID();
    const rawKey = crypto.randomBytes(this.config.keyLength).toString('hex');
    const key = `${this.config.prefix}_${rawKey}`;
    const hashedKey = this.hashKey(key);

    const now = new Date();
    const record: APIKeyRecord = {
      id,
      hashedKey,
      scopes,
      createdAt: now,
      expiresAt: expiresInMs ? new Date(now.getTime() + expiresInMs) : null,
      lastUsedAt: null,
      revoked: false,
    };

    this.keys.set(id, record);
    return { key, record };
  }

  validate(key: string): APIKeyRecord | null {
    const hashedKey = this.hashKey(key);

    for (const [, record] of this.keys) {
      if (record.revoked) {
        continue;
      }

      const recordBuffer = Buffer.from(record.hashedKey, 'hex');
      const inputBuffer = Buffer.from(hashedKey, 'hex');

      if (recordBuffer.length !== inputBuffer.length) {
        continue;
      }

      if (crypto.timingSafeEqual(recordBuffer, inputBuffer)) {
        if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
          return null;
        }
        record.lastUsedAt = new Date();
        return record;
      }
    }

    return null;
  }

  rotate(keyId: string): { key: string; record: APIKeyRecord } | null {
    const existingRecord = this.keys.get(keyId);
    if (!existingRecord || existingRecord.revoked) {
      return null;
    }

    // Revoke old key
    existingRecord.revoked = true;

    // Generate new key with same scopes
    return this.generate(
      existingRecord.scopes,
      existingRecord.expiresAt ? existingRecord.expiresAt.getTime() - Date.now() : undefined,
    );
  }

  revoke(keyId: string): boolean {
    const record = this.keys.get(keyId);
    if (!record || record.revoked) {
      return false;
    }
    record.revoked = true;
    return true;
  }

  hasScope(record: APIKeyRecord, resource: string, action: string): boolean {
    return record.scopes.some(
      (scope) => scope.resource === resource && scope.actions.includes(action),
    );
  }

  listActive(): APIKeyRecord[] {
    const active: APIKeyRecord[] = [];
    for (const [, record] of this.keys) {
      if (!record.revoked && (!record.expiresAt || record.expiresAt.getTime() > Date.now())) {
        active.push(record);
      }
    }
    return active;
  }

  private hashKey(key: string): string {
    return crypto.createHash(this.config.hashAlgorithm).update(key).digest('hex');
  }
}
