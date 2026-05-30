import crypto from 'node:crypto';
import type { EncryptionConfig, EncryptedField } from './types.js';

export class FieldEncryption {
  private readonly config: EncryptionConfig;

  constructor(config?: EncryptionConfig) {
    this.config = config ?? { algorithm: 'aes-256-gcm', keyLength: 32 };
  }

  encrypt(plaintext: string, key: Buffer): EncryptedField {
    // AES-256-GCM requires a 12-byte IV
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      algorithm: this.config.algorithm,
    };
  }

  decrypt(encrypted: EncryptedField, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = crypto.createDecipheriv(encrypted.algorithm as 'aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  }

  generateKey(): Buffer {
    return crypto.randomBytes(32);
  }

  rotateKey(data: EncryptedField[], oldKey: Buffer, newKey: Buffer): EncryptedField[] {
    return data.map((field) => {
      const plaintext = this.decrypt(field, oldKey);
      return this.encrypt(plaintext, newKey);
    });
  }
}
