export interface CSRFConfig {
  secret: string;
  cookieName: string;
  headerName: string;
  ttlMs: number;
}

export interface CSRFTokenPair {
  cookie: string;
  header: string;
}

export interface APIKeyConfig {
  prefix: string;
  keyLength: number;
  hashAlgorithm: string;
}

export interface APIKeyRecord {
  id: string;
  hashedKey: string;
  scopes: APIKeyScope[];
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revoked: boolean;
}

export interface APIKeyScope {
  resource: string;
  actions: string[];
}

export interface IPReputationRule {
  name: string;
  pattern: string;
  scoreImpact: number;
  description: string;
}

export interface IPScore {
  ip: string;
  score: number;
  reasons: string[];
  blockedUntil?: Date;
}

export interface SessionConfig {
  maxConcurrent: number;
  fingerprintFields: string[];
  ttlMs: number;
}

export interface SessionRecord {
  id: string;
  userId: string;
  fingerprint: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export interface SessionFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  hash: string;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyLength: 32;
}

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}
