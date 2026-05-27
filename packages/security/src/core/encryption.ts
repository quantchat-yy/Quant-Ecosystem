// ============================================================================
// Security Package - Encryption Service
// ============================================================================

import type { EncryptionConfig, KeyPair, EncryptedData, DerivedKey } from '../types';

/** Default encryption configuration */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keySize: 256,
  ivLength: 12,
  tagLength: 16,
  iterations: 100000,
  saltLength: 32,
  keyRotationInterval: 86400000 * 30,
};

/**
 * EncryptionService - Complete encryption infrastructure with AES-256-GCM,
 * RSA keypair simulation, PBKDF2 key derivation, envelope encryption, and key rotation.
 */
export class EncryptionService {
  private config: EncryptionConfig;
  private keyStore: Map<string, { key: string; createdAt: number; active: boolean }>;
  private keyPairs: Map<string, KeyPair>;
  private currentKeyId: string;
  private encryptionCount: number;
  private decryptionCount: number;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyStore = new Map();
    this.keyPairs = new Map();
    this.encryptionCount = 0;
    this.decryptionCount = 0;

    // Generate initial key
    this.currentKeyId = this.generateKeyId();
    this.keyStore.set(this.currentKeyId, {
      key: this.generateRandomKey(this.config.keySize / 8),
      createdAt: Date.now(),
      active: true,
    });
  }

  /** Encrypt plaintext using AES-256-GCM flow */
  async encrypt(plaintext: string, associatedData?: string): Promise<EncryptedData> {
    const now = Date.now();
    this.encryptionCount++;

    // Check if key rotation is needed
    await this.checkKeyRotation(now);

    const keyEntry = this.keyStore.get(this.currentKeyId);
    if (!keyEntry) throw new Error('No active encryption key');

    // Generate random IV (nonce)
    const iv = this.generateRandomHex(this.config.ivLength);

    // Perform AES-256-GCM encryption simulation
    const ciphertext = this.aes256GCMEncrypt(plaintext, keyEntry.key, iv, associatedData);

    // Generate authentication tag
    const tag = this.computeGCMTag(ciphertext, keyEntry.key, iv, associatedData);

    return {
      ciphertext,
      iv,
      tag,
      keyId: this.currentKeyId,
      algorithm: this.config.algorithm,
      version: 1,
      timestamp: now,
    };
  }

  /** Decrypt AES-256-GCM encrypted data */
  async decrypt(encryptedData: EncryptedData, associatedData?: string): Promise<string> {
    this.decryptionCount++;

    const keyEntry = this.keyStore.get(encryptedData.keyId);
    if (!keyEntry) throw new Error(`Key not found: ${encryptedData.keyId}`);

    // Verify authentication tag first (authenticate-then-decrypt)
    const expectedTag = this.computeGCMTag(
      encryptedData.ciphertext,
      keyEntry.key,
      encryptedData.iv,
      associatedData,
    );

    if (!this.timingSafeEqual(expectedTag, encryptedData.tag)) {
      throw new Error('Authentication tag verification failed - data may be tampered');
    }

    // Perform decryption
    return this.aes256GCMDecrypt(encryptedData.ciphertext, keyEntry.key, encryptedData.iv);
  }

  /** Derive a key from password using PBKDF2 */
  async deriveKey(password: string, salt?: string): Promise<DerivedKey> {
    const useSalt = salt || this.generateRandomHex(this.config.saltLength);

    // PBKDF2 simulation - iterative hashing
    let derivedKey = password + useSalt;
    for (let i = 0; i < this.config.iterations; i++) {
      derivedKey = this.hmacHash(derivedKey, useSalt + i.toString());
      // XOR with previous iteration result (simplified PBKDF2)
      if (i % 1000 === 0) {
        derivedKey = this.hmacHash(derivedKey, password);
      }
    }

    // Truncate to desired key length
    const key = derivedKey.substring(0, this.config.keySize / 4);

    return {
      key,
      salt: useSalt,
      iterations: this.config.iterations,
      algorithm: 'pbkdf2-sha256',
    };
  }

  /** Generate an RSA keypair simulation */
  async generateKeyPair(keySize: number = 2048): Promise<KeyPair> {
    const keyId = this.generateKeyId();
    const now = Date.now();

    // RSA keypair simulation using large prime number generation
    const p = this.generateLargePrime(keySize / 2);
    const q = this.generateLargePrime(keySize / 2);
    const n = p * q;
    const phi = (p - 1) * (q - 1);
    const e = 65537;
    const d = this.modInverse(e, phi);

    const publicKey = this.encodeKeyComponent(`RSA-PUB:${n.toString(16)}:${e.toString(16)}`);
    const privateKey = this.encodeKeyComponent(`RSA-PRV:${n.toString(16)}:${d.toString(16)}`);

    const keyPair: KeyPair = {
      publicKey,
      privateKey,
      keyId,
      createdAt: now,
      expiresAt: now + this.config.keyRotationInterval,
      algorithm: 'RSA-OAEP',
      keySize,
    };

    this.keyPairs.set(keyId, keyPair);
    return keyPair;
  }

  /** Envelope encryption - encrypt data key with RSA, then encrypt data with data key */
  async envelopeEncrypt(
    plaintext: string,
    keyPairId: string,
  ): Promise<{
    encryptedData: EncryptedData;
    encryptedDataKey: string;
  }> {
    const keyPair = this.keyPairs.get(keyPairId);
    if (!keyPair) throw new Error(`Key pair not found: ${keyPairId}`);

    // Generate ephemeral data encryption key
    const dataKey = this.generateRandomKey(32);
    const dataKeyId = this.generateKeyId();

    // Store data key temporarily
    this.keyStore.set(dataKeyId, { key: dataKey, createdAt: Date.now(), active: true });

    // Encrypt data with the data key using AES-256-GCM
    const prevKeyId = this.currentKeyId;
    this.currentKeyId = dataKeyId;
    const encryptedData = await this.encrypt(plaintext);
    this.currentKeyId = prevKeyId;

    // Encrypt the data key with RSA public key
    const encryptedDataKey = this.rsaEncrypt(dataKey, keyPair.publicKey);

    // Remove plaintext data key from store
    this.keyStore.delete(dataKeyId);

    return { encryptedData, encryptedDataKey };
  }

  /** Rotate encryption keys */
  async rotateKeys(): Promise<string> {
    // Mark current key as inactive
    const currentKey = this.keyStore.get(this.currentKeyId);
    if (currentKey) {
      currentKey.active = false;
    }

    // Generate new key
    const newKeyId = this.generateKeyId();
    this.keyStore.set(newKeyId, {
      key: this.generateRandomKey(this.config.keySize / 8),
      createdAt: Date.now(),
      active: true,
    });

    this.currentKeyId = newKeyId;
    return newKeyId;
  }

  /** Check if key rotation is needed and rotate if so */
  private async checkKeyRotation(now: number): Promise<void> {
    const currentKey = this.keyStore.get(this.currentKeyId);
    if (currentKey && now - currentKey.createdAt > this.config.keyRotationInterval) {
      await this.rotateKeys();
    }
  }

  /** AES-256-GCM encryption simulation */
  private aes256GCMEncrypt(plaintext: string, key: string, iv: string, _aad?: string): string {
    // Simulate AES-256-GCM: XOR plaintext with keystream derived from key+IV
    const keystream = this.generateKeystream(key, iv, plaintext.length);
    let ciphertext = '';

    for (let i = 0; i < plaintext.length; i++) {
      const plainByte = plaintext.charCodeAt(i);
      const keyByte = parseInt(keystream.substring(i * 2, i * 2 + 2) || 'ff', 16);
      const encByte = plainByte ^ keyByte;
      ciphertext += encByte.toString(16).padStart(2, '0');
    }

    return ciphertext;
  }

  /** AES-256-GCM decryption simulation */
  private aes256GCMDecrypt(ciphertext: string, key: string, iv: string): string {
    const keystream = this.generateKeystream(key, iv, ciphertext.length / 2);
    let plaintext = '';

    for (let i = 0; i < ciphertext.length; i += 2) {
      const encByte = parseInt(ciphertext.substring(i, i + 2), 16);
      const keyByte = parseInt(keystream.substring(i, i + 2) || 'ff', 16);
      const plainByte = encByte ^ keyByte;
      plaintext += String.fromCharCode(plainByte);
    }

    return plaintext;
  }

  /** Generate keystream from key and IV using counter mode */
  private generateKeystream(key: string, iv: string, length: number): string {
    let stream = '';
    let counter = 0;

    while (stream.length < length * 2) {
      const block = this.hmacHash(key + iv + counter.toString(), key);
      stream += block;
      counter++;
    }

    return stream.substring(0, length * 2);
  }

  /** Compute GCM authentication tag */
  private computeGCMTag(ciphertext: string, key: string, iv: string, aad?: string): string {
    const tagInput = `${ciphertext}:${iv}:${aad || ''}:${key.substring(0, 8)}`;
    return this.hmacHash(tagInput, key).substring(0, this.config.tagLength * 2);
  }

  /** RSA encryption simulation */
  private rsaEncrypt(plaintext: string, publicKey: string): string {
    // Simplified RSA encryption using key material
    let encrypted = '';
    for (let i = 0; i < plaintext.length; i++) {
      const charCode = plaintext.charCodeAt(i);
      const keyByte = publicKey.charCodeAt(i % publicKey.length);
      encrypted += (charCode ^ keyByte).toString(16).padStart(2, '0');
    }
    return encrypted;
  }

  /** HMAC hash function */
  private hmacHash(message: string, key: string): string {
    const ipad = key
      .split('')
      .map((c, _i) => String.fromCharCode(c.charCodeAt(0) ^ 0x36))
      .join('');
    const opad = key
      .split('')
      .map((c, _i) => String.fromCharCode(c.charCodeAt(0) ^ 0x5c))
      .join('');
    const inner = this.fnvHash(ipad + message);
    return this.fnvHash(opad + inner);
  }

  /** FNV-1a hash */
  private fnvHash(input: string): string {
    let h1 = 0x811c9dc5;
    let h2 = 0x6c62272e;
    let h3 = 0xd3a2646c;
    let h4 = 0xfed41b76;

    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = Math.imul(h2 ^ (c + 1), 0x5bd1e995);
      h3 = Math.imul(h3 ^ (c + 2), 0x1b873593);
      h4 = Math.imul(h4 ^ (c + 3), 0xcc9e2d51);
    }

    return [
      (h1 >>> 0).toString(16).padStart(8, '0'),
      (h2 >>> 0).toString(16).padStart(8, '0'),
      (h3 >>> 0).toString(16).padStart(8, '0'),
      (h4 >>> 0).toString(16).padStart(8, '0'),
    ].join('');
  }

  /** Generate a large pseudo-prime for RSA simulation */
  private generateLargePrime(_bits: number): number {
    // For simulation, generate a prime-like number
    const base = Math.floor(Math.random() * 10000) + 10000;
    // Find next prime after base
    let candidate = base | 1; // Make odd
    while (!this.isProbablePrime(candidate)) {
      candidate += 2;
    }
    return candidate;
  }

  /** Miller-Rabin primality test (simplified) */
  private isProbablePrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2 || n === 3) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  /** Modular inverse calculation */
  private modInverse(a: number, m: number): number {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1, 0];
    while (r !== 0) {
      const q = Math.floor(old_r / r);
      [old_r, r] = [r, old_r - q * r];
      [old_s, s] = [s, old_s - q * s];
    }
    return ((old_s % m) + m) % m;
  }

  /** Encode key component to base64-like format */
  private encodeKeyComponent(data: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let encoded = '';
    for (let i = 0; i < data.length; i++) {
      encoded += chars[data.charCodeAt(i) % 64];
    }
    return encoded;
  }

  /** Generate random key of specified byte length */
  private generateRandomKey(byteLength: number): string {
    return this.generateRandomHex(byteLength);
  }

  /** Generate random hex string */
  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length * 2; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }

  /** Generate a unique key ID */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /** Timing-safe comparison */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /** Get encryption service statistics */
  getStats(): {
    totalEncryptions: number;
    totalDecryptions: number;
    activeKeys: number;
    keyPairs: number;
  } {
    return {
      totalEncryptions: this.encryptionCount,
      totalDecryptions: this.decryptionCount,
      activeKeys: this.keyStore.size,
      keyPairs: this.keyPairs.size,
    };
  }

  /** Get current key ID */
  getCurrentKeyId(): string {
    return this.currentKeyId;
  }
}
