// ============================================================================
// @quant/server - Core Types
// Express-like request/response interfaces for the Quant Ecosystem
// ============================================================================

// ----------------------------------------------------------------------------
// User Context Types
// ----------------------------------------------------------------------------

/**
 * Authenticated user context attached to request after auth middleware
 */
export interface UserContext {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  scopes: string[];
  phoneNumber?: string;
  channelId?: string;
  deviceId?: string;
}

/**
 * Token metadata from decoded JWT
 */
export interface TokenMetadata {
  sub: string;
  email: string;
  username: string;
  role: string;
  scopes: string[];
  app: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string;
}

// ----------------------------------------------------------------------------
// Request / Response / Middleware Types
// ----------------------------------------------------------------------------

/**
 * Server request object - Express-compatible interface
 * Used across all Quant Ecosystem apps for consistent request handling
 */
export interface Request {
  /** HTTP method (GET, POST, PUT, DELETE, PATCH, OPTIONS) */
  method: string;
  /** Full URL including query string */
  url: string;
  /** URL path without query string */
  path: string;
  /** Route parameters extracted from path patterns */
  params: Record<string, string>;
  /** Query string parameters */
  query: Record<string, string | string[]>;
  /** Request body (parsed JSON) */
  body: unknown;
  /** Request headers (lowercased keys) */
  headers: Record<string, string>;
  /** Client IP address */
  ip: string;
  /** Authenticated user ID (set by authMiddleware) */
  userId?: string;
  /** Full user context (set by authMiddleware) */
  user?: UserContext;
  /** Request start timestamp in ms (set by requestIdMiddleware) */
  startTime?: number;
  /** Unique request identifier (set by requestIdMiddleware) */
  requestId?: string;
  /** Client device identifier */
  deviceId?: string;
  /** Content type of request body */
  contentType?: string;
  /** Raw request body bytes length */
  contentLength?: number;
}

/**
 * Server response object - Express-compatible interface
 * Chainable methods for setting status, headers, and sending responses
 */
export interface Response {
  /** Set HTTP status code - chainable */
  status(code: number): Response;
  /** Send JSON response body */
  json(data: unknown): void;
  /** Send raw string response */
  send(data: string): void;
  /** Set a response header - chainable */
  setHeader(name: string, value: string): Response;
  /** Current status code */
  statusCode: number;
  /** Whether headers have already been sent */
  headersSent: boolean;
}

/**
 * Next function to pass control to the next middleware
 * Optionally pass an error to trigger error handling middleware
 */
export type NextFunction = (error?: Error) => void;

/**
 * Standard middleware function signature
 * All middleware in the Quant Ecosystem follows this pattern
 */
export type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * Error handling middleware (4-argument signature)
 * Catches errors thrown or passed to next() in the middleware chain
 */
export type ErrorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => void;

// ----------------------------------------------------------------------------
// Route Types
// ----------------------------------------------------------------------------

/**
 * HTTP methods supported by the Router
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * Route handler with optional middleware chain
 */
export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: Middleware;
  middleware?: Middleware[];
}

/**
 * Route match result from the Router
 */
export interface RouteMatch {
  handler: Middleware;
  params: Record<string, string>;
  middleware: Middleware[];
}

// ----------------------------------------------------------------------------
// Configuration Types
// ----------------------------------------------------------------------------

/**
 * Rate limiter configuration
 */
export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Custom key generator for identifying clients */
  keyGenerator?: (req: Request) => string;
  /** Custom message when rate limit is exceeded */
  message?: string;
  /** Whether to skip counting failed requests (non-2xx) */
  skipFailedRequests?: boolean;
  /** Whether to skip counting successful requests */
  skipSuccessfulRequests?: boolean;
  /** Custom handler when rate limit is exceeded */
  handler?: (req: Request, res: Response) => void;
}

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allowed origins (use ['*'] for all) */
  origins: string[];
  /** Whether to include credentials (cookies, auth headers) */
  credentials?: boolean;
  /** Preflight cache duration in seconds */
  maxAge?: number;
  /** Headers to expose to the browser */
  exposedHeaders?: string[];
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed request headers */
  allowedHeaders?: string[];
}

/**
 * Security headers configuration
 */
export interface SecurityOptions {
  /** X-Frame-Options value (default: DENY) */
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  /** Enable/disable HSTS header */
  hsts?: boolean;
  /** HSTS max-age in seconds */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS */
  hstsIncludeSubDomains?: boolean;
  /** Content-Security-Policy directives */
  csp?: string;
  /** Referrer-Policy value */
  referrerPolicy?: string;
  /** Permissions-Policy directives */
  permissionsPolicy?: string;
}

/**
 * Logging configuration
 */
export interface LoggingOptions {
  /** Log level threshold */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Whether to log request body */
  logBody?: boolean;
  /** Whether to log response time */
  logTiming?: boolean;
  /** Paths to exclude from logging */
  excludePaths?: string[];
  /** Custom log formatter */
  formatter?: (entry: LogEntry) => string;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

/**
 * Auth middleware configuration
 */
export interface AuthOptions {
  /** Paths that don't require authentication */
  publicPaths?: string[];
  /** Required scopes for specific paths */
  scopeRequirements?: Record<string, string[]>;
  /** Custom token extractor */
  tokenExtractor?: (req: Request) => string | null;
  /** Whether to allow expired tokens (for refresh flows) */
  allowExpired?: boolean;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  metadata?: {
    requestId: string;
    timestamp: number;
    duration: number;
    version: string;
  };
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    requestId: string;
    timestamp: number;
    duration: number;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}
