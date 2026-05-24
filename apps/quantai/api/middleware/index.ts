// ============================================================================
// QuantAI API - Middleware Configuration
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
// QuantAI-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantAI (AI hub) */
const aiCorsOptions: CorsOptions = {
  origins: ['https://quantai.app', 'https://ai.quant.app', 'http://localhost:3008', 'http://localhost:5181'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID', 'X-Model-Version'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many requests to QuantAI API, please try again later.',
});

/** Rate limiting for AI inference (expensive operations) */
const inferenceRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'AI inference rate limit exceeded. Please wait before sending more requests.',
});

/** Rate limiting for device control commands */
const deviceRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Device control rate limit exceeded.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantAI */
export const cors = corsMiddleware(aiCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/heartbeat'] });

/** Pre-configured auth middleware with QuantAI public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/models/list'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Inference rate limiter middleware */
export const inferenceLimit = inferenceRateLimiter.middleware();

/** Device control rate limiter middleware */
export const deviceLimit = deviceRateLimiter.middleware();
