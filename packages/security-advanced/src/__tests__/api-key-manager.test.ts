import { describe, it, expect } from 'vitest';
import { APIKeyManager } from '../api-key-manager.js';
import type { APIKeyConfig, APIKeyScope } from '../types.js';

const config: APIKeyConfig = {
  prefix: 'qk',
  keyLength: 32,
  hashAlgorithm: 'sha256',
};

describe('APIKeyManager', () => {
  it('should generate an API key with correct prefix', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'users', actions: ['read', 'write'] }];

    const { key, record } = manager.generate(scopes);

    expect(key.startsWith('qk_')).toBe(true);
    expect(record.id).toBeTruthy();
    expect(record.revoked).toBe(false);
    expect(record.scopes).toEqual(scopes);
  });

  it('should validate a generated key', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'data', actions: ['read'] }];

    const { key } = manager.generate(scopes);
    const result = manager.validate(key);

    expect(result).not.toBeNull();
    expect(result?.scopes).toEqual(scopes);
  });

  it('should reject an invalid key', () => {
    const manager = new APIKeyManager(config);
    const result = manager.validate('qk_invalidkey123');

    expect(result).toBeNull();
  });

  it('should rotate a key - invalidating old and creating new', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'api', actions: ['read', 'write'] }];

    const { key: oldKey, record: oldRecord } = manager.generate(scopes);
    const rotationResult = manager.rotate(oldRecord.id);

    expect(rotationResult).not.toBeNull();
    expect(rotationResult!.key).not.toBe(oldKey);

    // Old key should no longer validate
    expect(manager.validate(oldKey)).toBeNull();
    // New key should validate
    expect(manager.validate(rotationResult!.key)).not.toBeNull();
  });

  it('should revoke a key', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'admin', actions: ['all'] }];

    const { key, record } = manager.generate(scopes);
    expect(manager.validate(key)).not.toBeNull();

    const revoked = manager.revoke(record.id);
    expect(revoked).toBe(true);
    expect(manager.validate(key)).toBeNull();
  });

  it('should check scopes correctly', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [
      { resource: 'users', actions: ['read', 'write'] },
      { resource: 'posts', actions: ['read'] },
    ];

    const { record } = manager.generate(scopes);

    expect(manager.hasScope(record, 'users', 'read')).toBe(true);
    expect(manager.hasScope(record, 'users', 'write')).toBe(true);
    expect(manager.hasScope(record, 'posts', 'read')).toBe(true);
    expect(manager.hasScope(record, 'posts', 'write')).toBe(false);
    expect(manager.hasScope(record, 'admin', 'read')).toBe(false);
  });

  it('should list only active keys', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'test', actions: ['read'] }];

    manager.generate(scopes);
    const { record: record2 } = manager.generate(scopes);
    manager.generate(scopes);

    manager.revoke(record2.id);

    const active = manager.listActive();
    expect(active.length).toBe(2);
  });

  it('should reject expired keys', () => {
    const manager = new APIKeyManager(config);
    const scopes: APIKeyScope[] = [{ resource: 'test', actions: ['read'] }];

    const { key } = manager.generate(scopes, -1000); // Already expired

    expect(manager.validate(key)).toBeNull();
  });
});
