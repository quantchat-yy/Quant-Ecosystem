import { describe, it, expect, beforeEach } from 'vitest';
import { PGPEncryptionService } from '../services/pgp-encryption.service';

describe('PGPEncryptionService', () => {
  let service: PGPEncryptionService;

  beforeEach(() => {
    service = new PGPEncryptionService();
  });

  describe('generateKeyPair', () => {
    it('generates a key pair with expected fields', async () => {
      const result = await service.generateKeyPair('user-1', 'my-passphrase');

      expect(result.userId).toBe('user-1');
      expect(result.publicKey).toContain('-----BEGIN PGP PUBLIC KEY-----');
      expect(result.publicKey).toContain('-----END PGP PUBLIC KEY-----');
      expect(result.privateKeyEncrypted).toContain('-----BEGIN PGP PRIVATE KEY-----');
      expect(result.privateKeyEncrypted).toContain('-----END PGP PRIVATE KEY-----');
      expect(result.fingerprint).toMatch(/^[A-F0-9]{40}$/);
      expect(result.createdAt).toBeGreaterThan(0);
      expect(result.algorithm).toBe('RSA-4096');
    });

    it('generates different key pairs each time', async () => {
      const first = await service.generateKeyPair('user-1', 'pass1');
      const second = await service.generateKeyPair('user-2', 'pass2');

      expect(first.fingerprint).not.toBe(second.fingerprint);
      expect(first.publicKey).not.toBe(second.publicKey);
    });
  });

  describe('encrypt/decrypt round trip', () => {
    it('encrypts and decrypts a message successfully', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'my-passphrase');
      const message = 'Hello, this is a secret message!';

      const encrypted = await service.encrypt(message, keyPair.publicKey);
      expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');
      expect(encrypted).not.toContain(message);

      const decrypted = await service.decrypt(
        encrypted,
        keyPair.privateKeyEncrypted,
        'my-passphrase',
      );
      expect(decrypted).toBe(message);
    });

    it('handles unicode messages', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'pass');
      const message = 'Unicode test: Hello World';

      const encrypted = await service.encrypt(message, keyPair.publicKey);
      const decrypted = await service.decrypt(encrypted, keyPair.privateKeyEncrypted, 'pass');
      expect(decrypted).toBe(message);
    });

    it('handles empty messages', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'pass');
      const message = '';

      const encrypted = await service.encrypt(message, keyPair.publicKey);
      const decrypted = await service.decrypt(encrypted, keyPair.privateKeyEncrypted, 'pass');
      expect(decrypted).toBe(message);
    });
  });

  describe('signMessage', () => {
    it('produces a PGP signature', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'my-passphrase');
      const message = 'Sign this message';

      const signature = await service.signMessage(
        message,
        keyPair.privateKeyEncrypted,
        'my-passphrase',
      );

      expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');
      expect(signature).toContain('-----END PGP SIGNATURE-----');
    });

    it('produces different signatures for different messages', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'my-passphrase');

      const sig1 = await service.signMessage(
        'Message A',
        keyPair.privateKeyEncrypted,
        'my-passphrase',
      );
      const sig2 = await service.signMessage(
        'Message B',
        keyPair.privateKeyEncrypted,
        'my-passphrase',
      );

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('verifies a valid signature', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'my-passphrase');
      const message = 'Verified message';

      const signature = await service.signMessage(
        message,
        keyPair.privateKeyEncrypted,
        'my-passphrase',
      );

      const isValid = await service.verifySignature(message, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('returns false for empty signature content', async () => {
      const keyPair = await service.generateKeyPair('user-1', 'pass');
      const emptySignature = '-----BEGIN PGP SIGNATURE-----\n\n-----END PGP SIGNATURE-----';

      const isValid = await service.verifySignature('test', emptySignature, keyPair.publicKey);
      expect(isValid).toBe(false);
    });
  });
});
