// ============================================================================
// QuantNeon API - Middleware Configuration
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
// QuantNeon-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantNeon (photo/social platform) */
const neonCorsOptions: CorsOptions = {
  origins: ['https://quantneon.app', 'https://photos.quant.app', 'http://localhost:3005', 'http://localhost:5178'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150,
  message: 'Too many requests to QuantNeon API, please try again later.',
});

/** Rate limiting for photo upload */
const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Upload rate limit exceeded. Please try again later.',
});

/** Rate limiting for story posting */
const storyRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 50,
  message: 'Story posting rate limit exceeded.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantNeon */
export const cors = corsMiddleware(neonCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/feed/refresh'] });

/** Pre-configured auth middleware with QuantNeon public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/explore', '/profiles/:username'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Upload rate limiter middleware */
export const uploadLimit = uploadRateLimiter.middleware();

/** Story rate limiter middleware */
export const storyLimit = storyRateLimiter.middleware();
