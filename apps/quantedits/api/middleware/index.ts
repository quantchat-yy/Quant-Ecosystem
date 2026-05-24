// ============================================================================
// QuantEdits API - Middleware Configuration
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
// QuantEdits-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantEdits (video/photo editor) */
const editsCorsOptions: CorsOptions = {
  origins: ['https://quantedits.app', 'https://edit.quant.app', 'http://localhost:3006', 'http://localhost:5179'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID', 'Content-Disposition'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests to QuantEdits API, please try again later.',
});

/** Rate limiting for render/export operations (resource-intensive) */
const renderRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Render limit exceeded. Max 20 exports per hour.',
});

/** Rate limiting for file upload */
const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Upload rate limit exceeded.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantEdits */
export const cors = corsMiddleware(editsCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/autosave/*'] });

/** Pre-configured auth middleware with QuantEdits public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/templates/browse'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Render rate limiter middleware */
export const renderLimit = renderRateLimiter.middleware();

/** Upload rate limiter middleware */
export const uploadLimit = uploadRateLimiter.middleware();
