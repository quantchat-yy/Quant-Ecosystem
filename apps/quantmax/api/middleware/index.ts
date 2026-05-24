// ============================================================================
// QuantMax API - Middleware Configuration
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
// QuantMax-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantMax (dating/random-chat) */
const maxCorsOptions: CorsOptions = {
  origins: ['https://quantmax.app', 'https://meet.quant.app', 'http://localhost:3007', 'http://localhost:5180'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests to QuantMax API, please try again later.',
});

/** Rate limiting for swipe/match actions */
const swipeRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Swipe rate limit exceeded. Take a breather!',
});

/** Rate limiting for messaging */
const messageRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Message rate limit exceeded. Please slow down.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantMax */
export const cors = corsMiddleware(maxCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/presence/*'] });

/** Pre-configured auth middleware with QuantMax public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Swipe rate limiter middleware */
export const swipeLimit = swipeRateLimiter.middleware();

/** Message rate limiter middleware */
export const messageLimit = messageRateLimiter.middleware();
