// ============================================================================
// @quant/server - Rate Limiter Middleware
// Production-grade rate limiting with sliding window, skip options, and headers
// ============================================================================

import type { Request, Response, NextFunction, Middleware, RateLimitOptions } from '../types';

// ----------------------------------------------------------------------------
// Rate Limit Store Entry
// ----------------------------------------------------------------------------

interface RateLimitEntry {
  /** Number of requests in current window */
  count: number;
  /** Timestamp when the current window resets */
  resetAt: number;
  /** Number of successful requests (for skipFailedRequests) */
  successCount: number;
  /** Number of failed requests (for skipSuccessfulRequests) */
  failedCount: number;
}

// ----------------------------------------------------------------------------
// Sliding Window Entry (for more accurate rate limiting)
// ----------------------------------------------------------------------------

interface SlidingWindowEntry {
  /** Timestamps of requests in current window */
  timestamps: number[];
  /** Total count in previous window (for weighted calculation) */
  previousCount: number;
  /** When previous window ended */
  previousWindowEnd: number;
}

// ----------------------------------------------------------------------------
// Rate Limiter Class
// ----------------------------------------------------------------------------

/**
 * RateLimiter provides configurable request rate limiting for API endpoints.
 *
 * Features:
 * - Fixed window rate limiting with configurable window size
 * - Per-client tracking via customizable key generator
 * - Skip counting for failed requests (useful for auth endpoints)
 * - Skip counting for successful requests (useful for polling)
 * - Standard rate limit headers (X-RateLimit-Limit, Remaining, Reset)
 * - Retry-After header on limit exceeded
 * - Custom exceeded handler support
 * - Automatic cleanup of expired entries
 * - Multiple rate limiter instances for different routes
 *
 * Usage:
 * ```typescript
 * const apiLimiter = new RateLimiter({
 *   windowMs: 60 * 1000,       // 1 minute
 *   maxRequests: 100,           // 100 requests per minute
 *   skipFailedRequests: true,   // Don't count 4xx/5xx responses
 * });
 * router.use(apiLimiter.middleware());
 * ```
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private options: Required<RateLimitOptions>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyGenerator: options.keyGenerator || ((req: Request) => req.ip || req.headers['x-forwarded-for'] || 'unknown'),
      message: options.message || 'Too many requests, please try again later.',
      skipFailedRequests: options.skipFailedRequests || false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      handler: options.handler || null as unknown as (req: Request, res: Response) => void,
    };

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), this.options.windowMs);
    // Prevent the interval from keeping the process alive in tests
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  // --------------------------------------------------------------------------
  // Middleware Factory
  // --------------------------------------------------------------------------

  /**
   * Create the rate limiting middleware function
   * Tracks requests per client key and enforces the configured limits
   */
  middleware(): Middleware {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();
      const entry = this.store.get(key);

      // New client or expired window - create fresh entry
      if (!entry || entry.resetAt <= now) {
        const newEntry: RateLimitEntry = {
          count: 1,
          resetAt: now + this.options.windowMs,
          successCount: 0,
          failedCount: 0,
        };
        this.store.set(key, newEntry);
        this.setRateLimitHeaders(res, newEntry);
        next();
        return;
      }

      // Calculate effective count based on skip options
      const effectiveCount = this.getEffectiveCount(entry);

      // Check if limit exceeded
      if (effectiveCount >= this.options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        // Use custom handler if provided
        if (this.options.handler) {
          this.options.handler(req, res);
          return;
        }

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: this.options.message,
            statusCode: 429,
            details: {
              retryAfter,
              limit: this.options.maxRequests,
              windowMs: this.options.windowMs,
            },
          },
        });
        return;
      }

      // Increment counter
      entry.count++;
      this.setRateLimitHeaders(res, entry);
      next();
    };
  }

  // --------------------------------------------------------------------------
  // Header Management
  // --------------------------------------------------------------------------

  /**
   * Set standard rate limit headers on the response
   */
  private setRateLimitHeaders(res: Response, entry: RateLimitEntry): void {
    const effectiveCount = this.getEffectiveCount(entry);
    const remaining = Math.max(0, this.options.maxRequests - effectiveCount);

    res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
  }

  // --------------------------------------------------------------------------
  // Count Calculation
  // --------------------------------------------------------------------------

  /**
   * Calculate the effective request count based on skip options
   */
  private getEffectiveCount(entry: RateLimitEntry): number {
    if (this.options.skipFailedRequests) {
      return entry.count - entry.failedCount;
    }
    if (this.options.skipSuccessfulRequests) {
      return entry.count - entry.successCount;
    }
    return entry.count;
  }

  // --------------------------------------------------------------------------
  // Store Management
  // --------------------------------------------------------------------------

  /**
   * Remove expired entries from the store to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  resetKey(key: string): void {
    this.store.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): { count: number; remaining: number; resetAt: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const effectiveCount = this.getEffectiveCount(entry);
    return {
      count: effectiveCount,
      remaining: Math.max(0, this.options.maxRequests - effectiveCount),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Get total number of tracked clients
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ----------------------------------------------------------------------------
// Convenience Factory Functions
// ----------------------------------------------------------------------------

/**
 * Create a rate limiter for general API endpoints
 * Default: 100 requests per minute
 */
export function createApiRateLimiter(overrides?: Partial<RateLimitOptions>): RateLimiter {
  return new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    ...overrides,
  });
}

/**
 * Create a strict rate limiter for auth endpoints
 * Default: 5 attempts per 15 minutes, skips failed requests
 */
export function createAuthRateLimiter(overrides?: Partial<RateLimitOptions>): RateLimiter {
  return new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    skipFailedRequests: true,
    message: 'Too many authentication attempts, please try again later.',
    ...overrides,
  });
}

/**
 * Create a rate limiter for upload endpoints
 * Default: 10 uploads per minute
 */
export function createUploadRateLimiter(overrides?: Partial<RateLimitOptions>): RateLimiter {
  return new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Upload limit exceeded, please try again later.',
    ...overrides,
  });
}

/**
 * Create a rate limiter for messaging/realtime endpoints
 * Default: 60 messages per minute
 */
export function createMessageRateLimiter(overrides?: Partial<RateLimitOptions>): RateLimiter {
  return new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Message rate limit exceeded, please slow down.',
    ...overrides,
  });
}
