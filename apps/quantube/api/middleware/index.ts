// ============================================================================
// QuantTube API - Middleware Configuration
// Thin wrapper that imports from @quant/server with app-specific settings
// Fixed corsMiddleware to use consistent CorsOptions interface
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
// QuantTube-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantTube (uses CorsOptions, not string[]) */
const tubeCorsOptions: CorsOptions = {
  origins: ['https://quantube.app', 'https://watch.quant.app', 'http://localhost:3004', 'http://localhost:5177'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID', 'Content-Range', 'Accept-Ranges'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  message: 'Too many requests to QuantTube API, please try again later.',
});

/** Rate limiting for video upload */
const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Upload limit exceeded. Max 10 uploads per hour.',
});

/** Rate limiting for streaming endpoints */
const streamRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Stream request rate limit exceeded.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantTube */
export const cors = corsMiddleware(tubeCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/stream/*', '/hls/*'] });

/** Pre-configured auth middleware with QuantTube public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/watch/*', '/embed/*', '/stream/*'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Upload rate limiter middleware */
export const uploadLimit = uploadRateLimiter.middleware();

/** Stream rate limiter middleware */
export const streamLimit = streamRateLimiter.middleware();
