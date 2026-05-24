// ============================================================================
// QuantAds API - Middleware Configuration
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
// QuantAds-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantAds */
const adsCorsOptions: CorsOptions = {
  origins: ['https://quantads.app', 'https://ads.quant.app', 'http://localhost:3003', 'http://localhost:5176'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  message: 'Too many requests to QuantAds API, please try again later.',
});

/** Rate limiting for campaign creation */
const campaignRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Campaign creation rate limit exceeded.',
});

/** Rate limiting for bidding (high frequency) */
const biddingRateLimiter = new RateLimiter({
  windowMs: 1000,
  maxRequests: 50,
  message: 'Bidding rate limit exceeded.',
});

// ----------------------------------------------------------------------------
// Configured Middleware Exports
// ----------------------------------------------------------------------------

/** Pre-configured CORS middleware for QuantAds */
export const cors = corsMiddleware(adsCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/pixel/*'] });

/** Pre-configured auth middleware with QuantAds public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*', '/serve/*', '/pixel/*', '/click/*'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Campaign rate limiter middleware */
export const campaignLimit = campaignRateLimiter.middleware();

/** Bidding rate limiter middleware */
export const biddingLimit = biddingRateLimiter.middleware();
