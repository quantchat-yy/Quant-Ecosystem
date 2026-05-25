// ============================================================================
// Developer Platform - Public API Gateway
// API versioning, request transformation, response envelopes, key scoping,
// request/response validation, changelog generation, quota management
// ============================================================================

/** API version registration */
interface APIVersionEntry {
  version: string;
  prefix: string;
  releaseDate: number;
  deprecatedAt: number | null;
  sunsetDate: number | null;
  isActive: boolean;
  endpoints: EndpointDefinition[];
}

/** Endpoint definition within a version */
interface EndpointDefinition {
  method: string;
  path: string;
  handler: string;
  requestSchema: SchemaDefinition | null;
  responseSchema: SchemaDefinition | null;
  requiredScopes: string[];
  rateLimit: number | null;
}

/** JSON Schema-like validator definition */
interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: SchemaDefinition;
}

/** Schema property definition */
interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: unknown[];
  items?: SchemaDefinition;
}

/** Response envelope format */
interface ResponseEnvelope<T = unknown> {
  data: T;
  meta: {
    requestId: string;
    timestamp: number;
    version: string;
  };
  errors: Array<{ code: string; message: string; field?: string }>;
  pagination: PaginationMeta | null;
}

/** Pagination metadata */
interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** API key with granular permissions */
interface ScopedAPIKey {
  id: string;
  keyHash: string;
  scopes: string[];
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  quotaPerMinute: number;
  quotaUsed: number;
  quotaResetAt: number;
  ownerId: string;
  createdAt: number;
}

/** Version transformation adapter */
interface VersionTransformer {
  fromVersion: string;
  toVersion: string;
  transformRequest: (body: Record<string, unknown>) => Record<string, unknown>;
  transformResponse: (body: Record<string, unknown>) => Record<string, unknown>;
}

/** Changelog entry for version differences */
interface ChangelogEntry {
  version: string;
  date: number;
  changes: Array<{
    type: 'added' | 'removed' | 'changed' | 'deprecated';
    endpoint: string;
    description: string;
  }>;
}

/** Validation error */
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * PublicAPIGateway provides API versioning with deprecation tracking,
 * request/response transformation between versions, standardized response
 * envelopes, granular API key scoping, JSON Schema validation, changelog
 * generation, and per-key quota management.
 */
export class PublicAPIGateway {
  private readonly versions: Map<string, APIVersionEntry>;
  private readonly keys: Map<string, ScopedAPIKey>;
  private readonly transformers: Map<string, VersionTransformer>;
  private readonly changelogs: ChangelogEntry[];
  private requestCounter: number;

  constructor() {
    this.versions = new Map();
    this.keys = new Map();
    this.transformers = new Map();
    this.changelogs = [];
    this.requestCounter = 0;
  }

  /**
   * Register an API version
   */
  registerVersion(
    version: string,
    endpoints: EndpointDefinition[],
    releaseDate?: number,
  ): APIVersionEntry {
    const entry: APIVersionEntry = {
      version,
      prefix: `/api/${version}`,
      releaseDate: releaseDate ?? Date.now(),
      deprecatedAt: null,
      sunsetDate: null,
      isActive: true,
      endpoints,
    };

    this.versions.set(version, entry);
    return entry;
  }

  /**
   * Deprecate an API version with sunset date
   */
  deprecateVersion(version: string, sunsetDate: number): boolean {
    const entry = this.versions.get(version);
    if (!entry) return false;

    entry.deprecatedAt = Date.now();
    entry.sunsetDate = sunsetDate;
    return true;
  }

  /**
   * Resolve which version to use for a request
   */
  resolveVersion(
    requestedVersion: string | null,
    headerVersion: string | null,
  ): { version: string; isDeprecated: boolean; source: 'url' | 'header' | 'default' } {
    // Priority: URL version > header > default
    const version = requestedVersion ?? headerVersion ?? this.getLatestVersion();
    const source: 'url' | 'header' | 'default' = requestedVersion
      ? 'url'
      : headerVersion
        ? 'header'
        : 'default';

    const entry = this.versions.get(version);
    const isDeprecated = entry?.deprecatedAt !== null && entry?.deprecatedAt !== undefined;

    return { version, isDeprecated, source };
  }

  /**
   * Get the latest active API version
   */
  getLatestVersion(): string {
    let latest: APIVersionEntry | null = null;
    for (const entry of this.versions.values()) {
      if (entry.isActive && (!latest || entry.releaseDate > latest.releaseDate)) {
        latest = entry;
      }
    }
    return latest?.version ?? 'v1';
  }

  /**
   * Register a transformation adapter between two versions
   */
  registerTransformer(transformer: VersionTransformer): void {
    const key = `${transformer.fromVersion}->${transformer.toVersion}`;
    this.transformers.set(key, transformer);
  }

  /**
   * Transform a request body from one API version to another
   */
  transformRequest(
    fromVersion: string,
    toVersion: string,
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const key = `${fromVersion}->${toVersion}`;
    const transformer = this.transformers.get(key);
    if (!transformer) return body;
    return transformer.transformRequest(body);
  }

  /**
   * Transform a response body from one API version to another
   */
  transformResponse(
    fromVersion: string,
    toVersion: string,
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const key = `${fromVersion}->${toVersion}`;
    const transformer = this.transformers.get(key);
    if (!transformer) return body;
    return transformer.transformResponse(body);
  }

  /**
   * Wrap a response in the standard envelope format
   */
  createEnvelope<T>(
    data: T,
    version: string,
    errors: Array<{ code: string; message: string; field?: string }> = [],
    pagination?: { page: number; perPage: number; total: number },
  ): ResponseEnvelope<T> {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;

    let paginationMeta: PaginationMeta | null = null;
    if (pagination) {
      const totalPages = Math.ceil(pagination.total / pagination.perPage);
      paginationMeta = {
        page: pagination.page,
        perPage: pagination.perPage,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      };
    }

    return {
      data,
      meta: {
        requestId,
        timestamp: Date.now(),
        version,
      },
      errors,
      pagination: paginationMeta,
    };
  }

  /**
   * Register a scoped API key with granular permissions
   */
  registerKey(
    id: string,
    keyHash: string,
    scopes: string[],
    tier: ScopedAPIKey['tier'],
    ownerId: string,
  ): ScopedAPIKey {
    const quotaPerMinute = this.getQuotaForTier(tier);

    const key: ScopedAPIKey = {
      id,
      keyHash,
      scopes,
      tier,
      quotaPerMinute,
      quotaUsed: 0,
      quotaResetAt: Date.now() + 60000,
      ownerId,
      createdAt: Date.now(),
    };

    this.keys.set(id, key);
    return key;
  }

  /**
   * Check if an API key has the required scope
   */
  checkScope(keyId: string, requiredScope: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    // Direct match
    if (key.scopes.includes(requiredScope)) return true;

    // Wildcard matching (e.g., "users:*" matches "users:read")
    for (const scope of key.scopes) {
      if (scope.endsWith(':*')) {
        const prefix = scope.slice(0, -1);
        if (requiredScope.startsWith(prefix)) return true;
      }
      // "admin" scope grants everything
      if (scope === 'admin') return true;
    }

    return false;
  }

  /**
   * Check and consume quota for an API key
   */
  checkQuota(keyId: string): { allowed: boolean; remaining: number; resetAt: number } {
    const key = this.keys.get(keyId);
    if (!key) return { allowed: false, remaining: 0, resetAt: 0 };

    const now = Date.now();

    // Reset quota if window has passed
    if (now >= key.quotaResetAt) {
      key.quotaUsed = 0;
      key.quotaResetAt = now + 60000;
    }

    const remaining = key.quotaPerMinute - key.quotaUsed;
    if (remaining <= 0) {
      return { allowed: false, remaining: 0, resetAt: key.quotaResetAt };
    }

    key.quotaUsed++;
    return { allowed: true, remaining: remaining - 1, resetAt: key.quotaResetAt };
  }

  /**
   * Validate request body against a JSON Schema-like definition
   */
  validateRequest(body: unknown, schema: SchemaDefinition): ValidationError[] {
    return this.validateValue(body, schema, '');
  }

  /**
   * Validate a value against a schema recursively
   */
  private validateValue(value: unknown, schema: SchemaDefinition, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type check
    if (schema.type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({ field: path || 'body', message: 'Expected object', code: 'type_error' });
        return errors;
      }

      const obj = value as Record<string, unknown>;

      // Required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in obj)) {
            errors.push({
              field: path ? `${path}.${field}` : field,
              message: `Field "${field}" is required`,
              code: 'required',
            });
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in obj) {
            const propErrors = this.validateProperty(
              obj[propName],
              propSchema,
              path ? `${path}.${propName}` : propName,
            );
            errors.push(...propErrors);
          }
        }
      }
    } else if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push({ field: path || 'body', message: 'Expected array', code: 'type_error' });
        return errors;
      }

      if (schema.items) {
        for (let i = 0; i < (value as unknown[]).length; i++) {
          const itemErrors = this.validateValue(
            (value as unknown[])[i],
            schema.items,
            `${path}[${i}]`,
          );
          errors.push(...itemErrors);
        }
      }
    }

    return errors;
  }

  /**
   * Validate a single property against its schema
   */
  private validateProperty(
    value: unknown,
    schema: SchemaProperty,
    path: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === undefined || value === null) {
      if (schema.required) {
        errors.push({ field: path, message: 'Field is required', code: 'required' });
      }
      return errors;
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push({
        field: path,
        message: `Expected ${schema.type}, got ${actualType}`,
        code: 'type_error',
      });
      return errors;
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          field: path,
          message: `Minimum length is ${schema.minLength}`,
          code: 'min_length',
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          field: path,
          message: `Maximum length is ${schema.maxLength}`,
          code: 'max_length',
        });
      }
      if (schema.pattern) {
        try {
          if (!new RegExp(schema.pattern).test(value)) {
            errors.push({
              field: path,
              message: `Does not match pattern ${schema.pattern}`,
              code: 'pattern',
            });
          }
        } catch {
          // Invalid regex pattern, skip
        }
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({
          field: path,
          message: `Must be one of: ${schema.enum.join(', ')}`,
          code: 'enum',
        });
      }
    }

    // Number validations
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          field: path,
          message: `Minimum value is ${schema.minimum}`,
          code: 'minimum',
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          field: path,
          message: `Maximum value is ${schema.maximum}`,
          code: 'maximum',
        });
      }
    }

    return errors;
  }

  /**
   * Generate a changelog by comparing two API versions
   */
  generateChangelog(fromVersion: string, toVersion: string): ChangelogEntry | null {
    const fromEntry = this.versions.get(fromVersion);
    const toEntry = this.versions.get(toVersion);
    if (!fromEntry || !toEntry) return null;

    const changes: ChangelogEntry['changes'] = [];

    const fromEndpoints = new Map(fromEntry.endpoints.map((e) => [`${e.method}:${e.path}`, e]));
    const toEndpoints = new Map(toEntry.endpoints.map((e) => [`${e.method}:${e.path}`, e]));

    // Find added endpoints
    for (const [key, endpoint] of toEndpoints) {
      if (!fromEndpoints.has(key)) {
        changes.push({
          type: 'added',
          endpoint: `${endpoint.method} ${endpoint.path}`,
          description: `New endpoint: ${endpoint.method} ${endpoint.path}`,
        });
      }
    }

    // Find removed endpoints
    for (const [key, endpoint] of fromEndpoints) {
      if (!toEndpoints.has(key)) {
        changes.push({
          type: 'removed',
          endpoint: `${endpoint.method} ${endpoint.path}`,
          description: `Removed endpoint: ${endpoint.method} ${endpoint.path}`,
        });
      }
    }

    // Find changed endpoints (different handler or schema)
    for (const [key, toEndpoint] of toEndpoints) {
      const fromEndpoint = fromEndpoints.get(key);
      if (fromEndpoint && fromEndpoint.handler !== toEndpoint.handler) {
        changes.push({
          type: 'changed',
          endpoint: `${toEndpoint.method} ${toEndpoint.path}`,
          description: `Handler changed for ${toEndpoint.method} ${toEndpoint.path}`,
        });
      }
    }

    const changelog: ChangelogEntry = {
      version: toVersion,
      date: toEntry.releaseDate,
      changes,
    };

    this.changelogs.push(changelog);
    return changelog;
  }

  /**
   * Get quota limit for a tier
   */
  private getQuotaForTier(tier: ScopedAPIKey['tier']): number {
    const limits: Record<string, number> = {
      free: 60,
      basic: 300,
      pro: 1000,
      enterprise: 10000,
    };
    return limits[tier] ?? 60;
  }

  /**
   * Get all registered versions
   */
  getVersions(): APIVersionEntry[] {
    return Array.from(this.versions.values());
  }

  /**
   * Get changelogs
   */
  getChangelogs(): ChangelogEntry[] {
    return [...this.changelogs];
  }

  /**
   * Get key count
   */
  getKeyCount(): number {
    return this.keys.size;
  }
}
