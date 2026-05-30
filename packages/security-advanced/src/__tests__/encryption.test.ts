import { describe, it, expect } from 'vitest';
import { FieldEncryption } from '../encryption.js';

describe('FieldEncryption', () => {
  it('should encrypt and decrypt a round-trip correctly', () => {
    const enc = new FieldEncryption();
    const key = enc.generateKey();
    const plaintext = 'sensitive data: SSN 123-45-6789';

    const encrypted = enc.encrypt(plaintext, key);
    const decrypted = enc.decrypt(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce unique IVs for each encryption', () => {
    const enc = new FieldEncryption();
    const key = enc.generateKey();
    const plaintext = 'same text';

    const encrypted1 = enc.encrypt(plaintext, key);
    const encrypted2 = enc.encrypt(plaintext, key);

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
  });

  it('should fail decryption with wrong key', () => {
    const enc = new FieldEncryption();
    const key1 = enc.generateKey();
    const key2 = enc.generateKey();
    const plaintext = 'confidential';

    const encrypted = enc.encrypt(plaintext, key1);

    expect(() => enc.decrypt(encrypted, key2)).toThrow();
  });

  it('should fail if authTag is tampered', () => {
    const enc = new FieldEncryption();
    const key = enc.generateKey();
    const plaintext = 'important data';

    const encrypted = enc.encrypt(plaintext, key);
    const tampered = { ...encrypted, authTag: '00'.repeat(16) };

    expect(() => enc.decrypt(tampered, key)).toThrow();
  });

  it('should rotate keys for multiple encrypted fields', () => {
    const enc = new FieldEncryption();
    const oldKey = enc.generateKey();
    const newKey = enc.generateKey();

    const fields = [
      enc.encrypt('field1', oldKey),
      enc.encrypt('field2', oldKey),
      enc.encrypt('field3', oldKey),
    ];

    const rotated = enc.rotateKey(fields, oldKey, newKey);

    expect(rotated.length).toBe(3);
    expect(enc.decrypt(rotated[0]!, newKey)).toBe('field1');
    expect(enc.decrypt(rotated[1]!, newKey)).toBe('field2');
    expect(enc.decrypt(rotated[2]!, newKey)).toBe('field3');

    // Old key should not work on rotated data
    expect(() => enc.decrypt(rotated[0]!, oldKey)).toThrow();
  });

  it('should set algorithm correctly in encrypted output', () => {
    const enc = new FieldEncryption();
    const key = enc.generateKey();

    const encrypted = enc.encrypt('test', key);
    expect(encrypted.algorithm).toBe('aes-256-gcm');
  });

  it('should generate 32-byte keys', () => {
    const enc = new FieldEncryption();
    const key = enc.generateKey();

    expect(key.length).toBe(32);
  });
});
