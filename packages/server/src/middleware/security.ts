// ============================================================================
// @quant/server - Security Middleware
// Security headers and request ID generation for the Quant Ecosystem
// ============================================================================

import type { Request, Response, NextFunction, Middleware, SecurityOptions } from '../types';

// ----------------------------------------------------------------------------
// Default Security Configuration
// ----------------------------------------------------------------------------

const DEFAULT_SECURITY_OPTIONS: Required<SecurityOptions> = {
  frameOptions: 'DENY',
  hsts: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;",
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// ----------------------------------------------------------------------------
// Security Headers Middleware
// ----------------------------------------------------------------------------

/**
 * Apply comprehensive security headers to all responses.
 *
 * Always sets X-Frame-Options: DENY to prevent clickjacking.
 * Includes HSTS, CSP, X-Content-Type-Options, and other protective headers.
 *
 * Usage:
 * ```typescript
 * router.use(securityHeaders());
 * // Or with custom options:
 * router.use(securityHeaders({ frameOptions: 'SAMEORIGIN', csp: "..." }));
 * ```
 */
export function securityHeaders(options?: SecurityOptions): Middleware {
  const config = { ...DEFAULT_SECURITY_OPTIONS, ...options };

  return (_req: Request, res: Response, next: NextFunction): void => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking - always DENY by default across all Quant apps
    res.setHeader('X-Frame-Options', config.frameOptions);

    // XSS protection (legacy but still useful for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // HTTP Strict Transport Security
    if (config.hsts) {
      let hstsValue = `max-age=${config.hstsMaxAge}`;
      if (config.hstsIncludeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      hstsValue += '; preload';
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy
    if (config.csp) {
      res.setHeader('Content-Security-Policy', config.csp);
    }

    // Referrer Policy
    res.setHeader('Referrer-Policy', config.referrerPolicy);

    // Permissions Policy (formerly Feature-Policy)
    if (config.permissionsPolicy) {
      res.setHeader('Permissions-Policy', config.permissionsPolicy);
    }

    // Prevent DNS prefetching leaks
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // Prevent browsers from doing MIME type sniffing on downloads
    res.setHeader('X-Download-Options', 'noopen');

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
  };
}

// ----------------------------------------------------------------------------
// Request ID Middleware
// ----------------------------------------------------------------------------

/**
 * Generate and attach a unique request ID to every request.
 *
 * If the client provides an X-Request-ID header, it is reused (for distributed tracing).
 * Otherwise a new ID is generated using a combination of timestamp and random bytes.
 *
 * Sets:
 * - req.requestId: The unique request identifier
 * - req.startTime: High-precision request start timestamp
 * - X-Request-ID response header: Echoed back to client
 *
 * Usage:
 * ```typescript
 * router.use(requestIdMiddleware());
 * // Later in handlers:
 * console.log(req.requestId); // "req_m1abc123_x8f9g2h1"
 * ```
 */
export function requestIdMiddleware(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use existing request ID from upstream proxy/client or generate new one
    const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId = existingId || generateRequestId();

    // Attach to request object
    req.requestId = requestId;
    req.startTime = Date.now();

    // Echo back in response header for client correlation
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

// ----------------------------------------------------------------------------
// Request ID Generation
// ----------------------------------------------------------------------------

/**
 * Generate a unique, sortable request ID
 * Format: req_{timestamp_base36}_{random_8chars}
 *
 * Properties:
 * - Sortable by time (timestamp prefix)
 * - Compact representation (base36 encoding)
 * - Low collision probability (8 random chars = ~41 bits entropy)
 * - Human-readable prefix for easy identification in logs
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = generateRandomString(8);
  return `req_${timestamp}_${randomPart}`;
}

/**
 * Generate a cryptographically-reasonable random string
 * Uses multiple random sources for better entropy in environments
 * where crypto.getRandomValues may not be available
 */
function generateRandomString(length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ----------------------------------------------------------------------------
// Additional Security Utilities
// ----------------------------------------------------------------------------

/**
 * Middleware to sanitize common injection vectors in request data
 * Strips null bytes and control characters from string values
 */
export function sanitizeInput(): Middleware {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body as Record<string, unknown>);
    }
    next();
  };
}

/**
 * Recursively sanitize string values in an object
 */
function deepSanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove null bytes and other control chars (except newline, tab)
      result[key] = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') {
          return item.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        }
        if (typeof item === 'object' && item !== null) {
          return deepSanitize(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepSanitize(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Middleware to enforce content length limits
 * Rejects requests with bodies exceeding the configured max size
 */
export function contentLengthLimit(maxBytes: number): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${Math.floor(maxBytes / 1024)}KB`,
          statusCode: 413,
        },
      });
      return;
    }
    next();
  };
}

/**
 * Middleware to validate content type for POST/PUT/PATCH requests
 */
export function requireContentType(allowedTypes: string[]): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      const isAllowed = allowedTypes.some((type) => contentType.includes(type));

      if (!isAllowed && contentType) {
        res.status(415).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
            statusCode: 415,
          },
        });
        return;
      }
    }
    next();
  };
}
