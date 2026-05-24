// ============================================================================
// QuantSync API - Middleware Configuration
// Thin wrapper that imports from @quant/server with app-specific settings
// ============================================================================

import {
  Router,
  RateLimiter,
  corsMiddleware,
  securityHeaders,
  requestIdMiddleware,
  loggingMiddleware,
  authMiddleware,
  errorHandler,
  AppError,
  asyncHandler,
} from '@quant/server';

import type {
  Request,
  Response,
  NextFunction,
  Middleware,
  CorsOptions,
} from '@quant/server';

// Re-export all types and utilities from @quant/server
export { Router, RateLimiter, AppError, asyncHandler };
export type { Request, Response, NextFunction, Middleware };

// ----------------------------------------------------------------------------
// QuantSync-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantSync (social media platform) */
const syncCorsOptions: CorsOptions = {
  origins: ['https://quantsync.app', 'https://social.quant.app', 'http://localhost:3002', 'http://localhost:5175'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150,
  message: 'Too many requests to QuantSync API, please try again later.',
});

/** Rate limiting for post creation */
const postRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Post creation rate limit exceeded. Please slow down.',
});

/** Rate limiting for auth endpoints */
const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  skipFailedRequests: true,
  message: 'Too many login attempts. Please try again later.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantSync */
export const cors = corsMiddleware(syncCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/feed/refresh'] });

/** Pre-configured auth middleware with QuantSync public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/explore', '/trending'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Post creation rate limiter middleware */
export const postLimit = postRateLimiter.middleware();

/** Auth rate limiter middleware */
export const authLimit = authRateLimiter.middleware();
