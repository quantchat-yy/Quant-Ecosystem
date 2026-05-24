// ============================================================================
// @quant/server - CORS Middleware
// Unified Cross-Origin Resource Sharing with consistent CorsOptions interface
// ============================================================================

import type { Request, Response, NextFunction, Middleware, CorsOptions } from '../types';

// ----------------------------------------------------------------------------
// Default Configuration
// ----------------------------------------------------------------------------

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-Device-ID',
  'X-Client-Version',
  'X-Timezone',
  'Accept',
  'Accept-Language',
  'Cache-Control',
];
const DEFAULT_EXPOSED_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-Request-ID',
  'X-Response-Time',
  'Content-Disposition',
];
const DEFAULT_MAX_AGE = 86400; // 24 hours

// ----------------------------------------------------------------------------
// CORS Middleware Factory
// ----------------------------------------------------------------------------

/**
 * Create a CORS middleware with the unified CorsOptions interface.
 *
 * This ensures consistent CORS handling across all 9 Quant Ecosystem apps.
 * The same CorsOptions interface is used everywhere, eliminating the
 * string[] vs CorsOptions mismatch that previously existed in QuantTube.
 *
 * Features:
 * - Origin allowlist checking
 * - Wildcard origin support
 * - Regex origin pattern matching
 * - Credentials header management
 * - Preflight request handling (OPTIONS)
 * - Configurable exposed/allowed headers
 * - Preflight response caching via Max-Age
 * - Vary header for proper CDN caching
 *
 * Usage:
 * ```typescript
 * const cors = corsMiddleware({
 *   origins: ['https://quantchat.app', 'https://admin.quantchat.app'],
 *   credentials: true,
 *   maxAge: 3600,
 *   exposedHeaders: ['X-Custom-Header'],
 * });
 * router.use(cors);
 * ```
 */
export function corsMiddleware(options: CorsOptions): Middleware {
  const allowedMethods = (options.methods || DEFAULT_METHODS).join(', ');
  const allowedHeaders = (options.allowedHeaders || DEFAULT_ALLOWED_HEADERS).join(', ');
  const exposedHeaders = [...DEFAULT_EXPOSED_HEADERS, ...(options.exposedHeaders || [])].join(', ');
  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
  const credentials = options.credentials ?? false;

  // Pre-compile origin patterns for regex-based matching
  const originPatterns = options.origins
    .filter((o) => o.includes('*') && o !== '*')
    .map((o) => new RegExp('^' + o.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'));

  return (req: Request, res: Response, next: NextFunction): void => {
    const requestOrigin = req.headers['origin'] || '';

    // Determine if origin is allowed
    const isAllowed = isOriginAllowed(requestOrigin, options.origins, originPatterns);

    // Set Vary header for proper CDN/proxy caching
    res.setHeader('Vary', 'Origin');

    if (isAllowed) {
      // Set the specific origin (not *) when credentials are enabled
      if (credentials) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
      } else if (options.origins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
      }
    } else if (requestOrigin) {
      // Origin not allowed - don't set CORS headers, browser will block
      // Still continue processing for non-CORS requests
      if (req.method === 'OPTIONS') {
        res.status(403).json({
          success: false,
          error: {
            code: 'CORS_ORIGIN_DENIED',
            message: `Origin ${requestOrigin} is not allowed`,
            statusCode: 403,
          },
        });
        return;
      }
      next();
      return;
    }

    // Set credentials header
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Set exposed headers (for non-preflight)
    res.setHeader('Access-Control-Expose-Headers', exposedHeaders);

    // Handle preflight (OPTIONS) request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', allowedMethods);
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders);

      if (maxAge > 0) {
        res.setHeader('Access-Control-Max-Age', String(maxAge));
      }

      // Respond immediately to preflight - no need to continue to route handler
      res.status(204).send('');
      return;
    }

    next();
  };
}

// ----------------------------------------------------------------------------
// Origin Matching
// ----------------------------------------------------------------------------

/**
 * Check if a request origin is allowed by the configured origins list
 */
function isOriginAllowed(origin: string, allowedOrigins: string[], patterns: RegExp[]): boolean {
  // If no origin header, allow (non-browser request)
  if (!origin) return true;

  // Wildcard allows everything
  if (allowedOrigins.includes('*')) return true;

  // Exact match
  if (allowedOrigins.includes(origin)) return true;

  // Pattern match (for wildcard subdomains like *.quant.app)
  for (const pattern of patterns) {
    if (pattern.test(origin)) return true;
  }

  return false;
}

// ----------------------------------------------------------------------------
// Preset Configurations
// ----------------------------------------------------------------------------

/**
 * Create CORS options for development (allow all origins)
 */
export function developmentCors(): CorsOptions {
  return {
    origins: ['*'],
    credentials: true,
    maxAge: 0,
  };
}

/**
 * Create CORS options for a specific app with its production domains
 */
export function productionCors(appDomains: string[]): CorsOptions {
  return {
    origins: appDomains,
    credentials: true,
    maxAge: 86400,
    exposedHeaders: ['X-Request-ID'],
  };
}

/**
 * Create restrictive CORS options for internal APIs
 */
export function internalCors(): CorsOptions {
  return {
    origins: ['https://*.quant.app', 'https://*.quant.internal'],
    credentials: true,
    maxAge: 3600,
    methods: ['GET', 'POST'],
  };
}
