// ============================================================================
// Developer Platform - OAuth2 Server
// Authorization code flow, client credentials, refresh token rotation,
// PKCE (S256), scope hierarchy, token introspection, dynamic client
// registration, consent management
// ============================================================================

import type { OAuthScope } from '../types';

/** Registered OAuth2 client */
interface OAuth2Client {
  clientId: string;
  clientSecretHash: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  grantTypes: GrantType[];
  isConfidential: boolean;
  registeredAt: number;
  ownerId: string;
}

/** Supported grant types */
type GrantType = 'authorization_code' | 'client_credentials' | 'refresh_token';

/** Authorization code record */
interface AuthorizationCodeRecord {
  code: string;
  clientId: string;
  userId: string;
  scopes: string[];
  redirectUri: string;
  codeChallenge: string | null;
  codeChallengeMethod: 'S256' | 'plain' | null;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/** Issued token record */
interface TokenRecord {
  accessToken: string;
  refreshToken: string | null;
  clientId: string;
  userId: string | null;
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
  refreshExpiresAt: number | null;
  revoked: boolean;
  tokenType: 'Bearer';
}

/** Token introspection response */
interface IntrospectionResult {
  active: boolean;
  clientId?: string;
  userId?: string;
  scopes?: string[];
  issuedAt?: number;
  expiresAt?: number;
  tokenType?: string;
}

/** Consent record */
interface ConsentRecord {
  userId: string;
  clientId: string;
  scopes: string[];
  grantedAt: number;
  revokedAt: number | null;
}

/** Scope definition with hierarchy */
interface ScopeDefinition {
  name: string;
  description: string;
  parent: string | null;
  children: string[];
}

/** Token issuance result */
interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
}

/**
 * OAuth2Server implements complete OAuth 2.0 flows including authorization code
 * with PKCE, client credentials, refresh token rotation, scope hierarchy with
 * inheritance, token introspection, dynamic client registration, and consent
 * management.
 */
export class OAuth2Server {
  private readonly clients: Map<string, OAuth2Client>;
  private readonly codes: Map<string, AuthorizationCodeRecord>;
  private readonly tokens: Map<string, TokenRecord>;
  private readonly refreshTokenIndex: Map<string, string>; // refreshToken -> accessToken key
  private readonly consents: Map<string, ConsentRecord>;
  private readonly scopes: Map<string, ScopeDefinition>;
  private readonly accessTokenTtlMs: number;
  private readonly refreshTokenTtlMs: number;
  private readonly codeLifetimeMs: number;
  private tokenCounter: number;
  private codeCounter: number;
  private clientCounter: number;

  constructor(config?: {
    accessTokenTtlMs?: number;
    refreshTokenTtlMs?: number;
    codeLifetimeMs?: number;
  }) {
    this.clients = new Map();
    this.codes = new Map();
    this.tokens = new Map();
    this.refreshTokenIndex = new Map();
    this.consents = new Map();
    this.scopes = new Map();
    this.accessTokenTtlMs = config?.accessTokenTtlMs ?? 3600000; // 1 hour
    this.refreshTokenTtlMs = config?.refreshTokenTtlMs ?? 2592000000; // 30 days
    this.codeLifetimeMs = config?.codeLifetimeMs ?? 600000; // 10 minutes
    this.tokenCounter = 0;
    this.codeCounter = 0;
    this.clientCounter = 0;
  }

  /**
   * Register a scope with hierarchy (parent/child relationships)
   */
  registerScope(name: string, description: string, parent: string | null = null): void {
    this.scopes.set(name, {
      name,
      description,
      parent,
      children: [],
    });

    // Update parent's children list
    if (parent) {
      const parentScope = this.scopes.get(parent);
      if (parentScope) {
        parentScope.children.push(name);
      }
    }
  }

  /**
   * Check if a scope inherits from another (write implies read).
   * Traverses up the scope hierarchy.
   */
  scopeIncludes(grantedScope: string, requiredScope: string): boolean {
    if (grantedScope === requiredScope) return true;

    // Check if required scope is a child of granted scope
    const granted = this.scopes.get(grantedScope);
    if (!granted) return false;

    // BFS through children
    const queue = [...granted.children];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === requiredScope) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const currentScope = this.scopes.get(current);
      if (currentScope) {
        queue.push(...currentScope.children);
      }
    }

    return false;
  }

  /**
   * Resolve effective scopes including inherited ones
   */
  resolveScopes(requestedScopes: string[]): string[] {
    const effective = new Set<string>();

    for (const scope of requestedScopes) {
      effective.add(scope);
      // Add all children (implied scopes)
      const scopeDef = this.scopes.get(scope);
      if (scopeDef) {
        const queue = [...scopeDef.children];
        while (queue.length > 0) {
          const child = queue.shift()!;
          effective.add(child);
          const childDef = this.scopes.get(child);
          if (childDef) queue.push(...childDef.children);
        }
      }
    }

    return Array.from(effective);
  }

  /**
   * Dynamic client registration
   */
  registerClient(
    name: string,
    redirectUris: string[],
    allowedScopes: string[],
    grantTypes: GrantType[],
    isConfidential: boolean,
    ownerId: string,
  ): { clientId: string; clientSecret: string } {
    const clientId = `client_${++this.clientCounter}_${Date.now()}`;
    const clientSecret = this.generateToken('secret');

    const client: OAuth2Client = {
      clientId,
      clientSecretHash: this.hashValue(clientSecret),
      name,
      redirectUris,
      allowedScopes,
      grantTypes,
      isConfidential,
      registeredAt: Date.now(),
      ownerId,
    };

    this.clients.set(clientId, client);
    return { clientId, clientSecret };
  }

  /**
   * Generate an authorization code for the authorization code flow
   */
  generateAuthorizationCode(
    clientId: string,
    userId: string,
    scopes: string[],
    redirectUri: string,
    codeChallenge?: string,
    codeChallengeMethod?: 'S256' | 'plain',
  ): string | null {
    const client = this.clients.get(clientId);
    if (!client) return null;

    // Validate redirect URI
    if (!client.redirectUris.includes(redirectUri)) return null;

    // Validate scopes
    const validScopes = scopes.filter((s) => client.allowedScopes.includes(s));
    if (validScopes.length === 0) return null;

    const code = this.generateToken('code');
    const now = Date.now();

    const record: AuthorizationCodeRecord = {
      code,
      clientId,
      userId,
      scopes: validScopes,
      redirectUri,
      codeChallenge: codeChallenge ?? null,
      codeChallengeMethod: codeChallengeMethod ?? null,
      createdAt: now,
      expiresAt: now + this.codeLifetimeMs,
      used: false,
    };

    this.codes.set(code, record);
    return code;
  }

  /**
   * Exchange an authorization code for tokens.
   * Validates code, client, redirect URI, and PKCE if present.
   */
  exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    codeVerifier?: string,
  ): TokenResult | { error: string } {
    const codeRecord = this.codes.get(code);
    if (!codeRecord) return { error: 'invalid_grant' };
    if (codeRecord.used) return { error: 'invalid_grant' };
    if (Date.now() > codeRecord.expiresAt) return { error: 'invalid_grant' };
    if (codeRecord.clientId !== clientId) return { error: 'invalid_client' };
    if (codeRecord.redirectUri !== redirectUri) return { error: 'invalid_grant' };

    // Verify client credentials
    const client = this.clients.get(clientId);
    if (!client) return { error: 'invalid_client' };
    if (client.isConfidential && this.hashValue(clientSecret) !== client.clientSecretHash) {
      return { error: 'invalid_client' };
    }

    // PKCE verification
    if (codeRecord.codeChallenge) {
      if (!codeVerifier) return { error: 'invalid_grant' };

      const computedChallenge =
        codeRecord.codeChallengeMethod === 'S256'
          ? this.computeS256Challenge(codeVerifier)
          : codeVerifier;

      if (computedChallenge !== codeRecord.codeChallenge) {
        return { error: 'invalid_grant' };
      }
    }

    // Mark code as used
    codeRecord.used = true;

    // Issue tokens
    return this.issueTokens(clientId, codeRecord.userId, codeRecord.scopes);
  }

  /**
   * Client credentials flow - direct token issuance for machine-to-machine.
   */
  clientCredentialsGrant(
    clientId: string,
    clientSecret: string,
    scopes: string[],
  ): TokenResult | { error: string } {
    const client = this.clients.get(clientId);
    if (!client) return { error: 'invalid_client' };
    if (!client.grantTypes.includes('client_credentials')) return { error: 'unauthorized_client' };
    if (this.hashValue(clientSecret) !== client.clientSecretHash)
      return { error: 'invalid_client' };

    const validScopes = scopes.filter((s) => client.allowedScopes.includes(s));
    if (validScopes.length === 0 && scopes.length > 0) return { error: 'invalid_scope' };

    const effectiveScopes = validScopes.length > 0 ? validScopes : client.allowedScopes;
    return this.issueTokens(clientId, null, effectiveScopes);
  }

  /**
   * Refresh token rotation - issue new tokens and invalidate old refresh token.
   */
  refreshTokenGrant(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): TokenResult | { error: string } {
    const tokenKey = this.refreshTokenIndex.get(refreshToken);
    if (!tokenKey) return { error: 'invalid_grant' };

    const tokenRecord = this.tokens.get(tokenKey);
    if (!tokenRecord) return { error: 'invalid_grant' };
    if (tokenRecord.revoked) return { error: 'invalid_grant' };
    if (tokenRecord.clientId !== clientId) return { error: 'invalid_client' };

    // Verify client
    const client = this.clients.get(clientId);
    if (!client) return { error: 'invalid_client' };
    if (client.isConfidential && this.hashValue(clientSecret) !== client.clientSecretHash) {
      return { error: 'invalid_client' };
    }

    // Check refresh token expiry
    if (tokenRecord.refreshExpiresAt && Date.now() > tokenRecord.refreshExpiresAt) {
      return { error: 'invalid_grant' };
    }

    // Revoke old token (rotation)
    tokenRecord.revoked = true;
    this.refreshTokenIndex.delete(refreshToken);

    // Issue new tokens with same scopes
    return this.issueTokens(clientId, tokenRecord.userId, tokenRecord.scopes);
  }

  /**
   * Token introspection - check if a token is active and get metadata
   */
  introspect(token: string): IntrospectionResult {
    // Search by access token
    const record = this.tokens.get(token);
    if (!record) return { active: false };
    if (record.revoked) return { active: false };
    if (Date.now() > record.expiresAt) return { active: false };

    return {
      active: true,
      clientId: record.clientId,
      userId: record.userId ?? undefined,
      scopes: record.scopes,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
      tokenType: 'Bearer',
    };
  }

  /**
   * Revoke a token (access or refresh)
   */
  revokeToken(token: string): boolean {
    const record = this.tokens.get(token);
    if (record) {
      record.revoked = true;
      if (record.refreshToken) {
        this.refreshTokenIndex.delete(record.refreshToken);
      }
      return true;
    }

    // Check if it's a refresh token
    const tokenKey = this.refreshTokenIndex.get(token);
    if (tokenKey) {
      const accessRecord = this.tokens.get(tokenKey);
      if (accessRecord) {
        accessRecord.revoked = true;
      }
      this.refreshTokenIndex.delete(token);
      return true;
    }

    return false;
  }

  /**
   * Record user consent for a client's scopes
   */
  grantConsent(userId: string, clientId: string, scopes: string[]): ConsentRecord {
    const key = `${userId}:${clientId}`;
    const consent: ConsentRecord = {
      userId,
      clientId,
      scopes,
      grantedAt: Date.now(),
      revokedAt: null,
    };
    this.consents.set(key, consent);
    return consent;
  }

  /**
   * Check if user has already consented to scopes
   */
  hasConsent(userId: string, clientId: string, requestedScopes: string[]): boolean {
    const key = `${userId}:${clientId}`;
    const consent = this.consents.get(key);
    if (!consent || consent.revokedAt !== null) return false;

    return requestedScopes.every((s) => consent.scopes.includes(s));
  }

  /**
   * Revoke consent for a client
   */
  revokeConsent(userId: string, clientId: string): boolean {
    const key = `${userId}:${clientId}`;
    const consent = this.consents.get(key);
    if (!consent) return false;
    consent.revokedAt = Date.now();
    return true;
  }

  /**
   * Get scope display information for consent screen
   */
  getScopeDisplay(scopes: string[]): Array<{ name: string; description: string }> {
    return scopes.map((s) => {
      const def = this.scopes.get(s);
      return {
        name: s,
        description: def?.description ?? s,
      };
    });
  }

  /**
   * PKCE: Compute S256 code challenge from verifier.
   * In production this is SHA256(verifier) base64url-encoded.
   * Here we simulate with a deterministic hash.
   */
  computeS256Challenge(codeVerifier: string): string {
    // Simulate SHA-256 hash with a deterministic string hash
    let hash = 0;
    for (let i = 0; i < codeVerifier.length; i++) {
      const char = codeVerifier.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    // Additional mixing for more uniqueness
    hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;

    return `S256_${hash.toString(36)}`;
  }

  /**
   * Issue access and refresh tokens
   */
  private issueTokens(clientId: string, userId: string | null, scopes: string[]): TokenResult {
    const now = Date.now();
    const accessToken = this.generateToken('access');
    const refreshToken = this.generateToken('refresh');

    const record: TokenRecord = {
      accessToken,
      refreshToken,
      clientId,
      userId,
      scopes,
      issuedAt: now,
      expiresAt: now + this.accessTokenTtlMs,
      refreshExpiresAt: now + this.refreshTokenTtlMs,
      revoked: false,
      tokenType: 'Bearer',
    };

    this.tokens.set(accessToken, record);
    this.refreshTokenIndex.set(refreshToken, accessToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(this.accessTokenTtlMs / 1000),
      scope: scopes.join(' '),
    };
  }

  /**
   * Generate a cryptographic-style token
   */
  private generateToken(prefix: string): string {
    const random =
      Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    return `${prefix}_${++this.tokenCounter}_${random}_${Date.now().toString(36)}`;
  }

  /**
   * Simple hash function for secrets (simulation)
   */
  private hashValue(value: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
      hash = hash >>> 0;
    }
    return `hashed_${hash.toString(16)}`;
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get a client by ID (without secret)
   */
  getClient(clientId: string): Omit<OAuth2Client, 'clientSecretHash'> | null {
    const client = this.clients.get(clientId);
    if (!client) return null;
    const { clientSecretHash: _secret, ...rest } = client;
    return rest;
  }
}
