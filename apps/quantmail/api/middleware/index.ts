// ============================================================================
// QuantMail API - Middleware Configuration
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
// QuantMail-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantMail */
const mailCorsOptions: CorsOptions = {
  origins: ['https://quantmail.app', 'https://mail.quant.app', 'http://localhost:3001', 'http://localhost:5174'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID', 'Content-Disposition'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests to QuantMail API, please try again later.',
});

/** Rate limiting for email sending (stricter) */
const sendRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  skipFailedRequests: true,
  message: 'Email send rate limit exceeded. Please try again later.',
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

/** Pre-configured CORS middleware for QuantMail */
export const cors = corsMiddleware(mailCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/metrics'] });

/** Pre-configured auth middleware with QuantMail public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/unsubscribe/*'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Send rate limiter middleware */
export const sendLimit = sendRateLimiter.middleware();

/** Auth rate limiter middleware */
export const authLimit = authRateLimiter.middleware();
