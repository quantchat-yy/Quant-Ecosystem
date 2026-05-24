// ============================================================================
// QuantChat API - Middleware Configuration
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
  createMessageRateLimiter,
} from '@quant/server';

import type {
  Request,
  Response,
  NextFunction,
  Middleware,
  CorsOptions,
  RateLimitOptions,
} from '@quant/server';

// Re-export all types and utilities from @quant/server
export { Router, RateLimiter, AppError, asyncHandler };
export type { Request, Response, NextFunction, Middleware };

// ----------------------------------------------------------------------------
// QuantChat-Specific Configuration
// ----------------------------------------------------------------------------

/** CORS configuration for QuantChat */
const chatCorsOptions: CorsOptions = {
  origins: ['https://quantchat.app', 'https://web.quantchat.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Request-ID'],
};

/** Rate limiting for general API calls */
const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many requests to QuantChat API, please try again later.',
});

/** Rate limiting for message sending (higher limit for real-time chat) */
const messageRateLimiter = createMessageRateLimiter({
  maxRequests: 60,
  message: 'Message rate limit exceeded. Please slow down.',
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

/** Pre-configured CORS middleware for QuantChat */
export const cors = corsMiddleware(chatCorsOptions);

/** Pre-configured security headers */
export const security = securityHeaders();

/** Pre-configured request ID middleware */
export const requestId = requestIdMiddleware();

/** Pre-configured logging middleware */
export const logging = loggingMiddleware({ excludePaths: ['/health', '/ws'] });

/** Pre-configured auth middleware with QuantChat public paths */
export const auth = authMiddleware({
  publicPaths: ['/health', '/auth/*', '/public/*'],
});

/** Pre-configured error handler */
export const errors = errorHandler({ version: '1.0.0' });

/** API rate limiter middleware */
export const apiLimit = apiRateLimiter.middleware();

/** Message rate limiter middleware */
export const messageLimit = messageRateLimiter.middleware();

/** Auth rate limiter middleware */
export const authLimit = authRateLimiter.middleware();

// ----------------------------------------------------------------------------
// Content Validation (QuantChat-specific)
// ----------------------------------------------------------------------------

export interface ContentValidationOptions {
  maxTextLength?: number;
  allowedMediaTypes?: string[];
  maxMediaSize?: number;
  requireContent?: boolean;
}

export function contentValidation(options: ContentValidationOptions = {}): Middleware {
  const maxText = options.maxTextLength || 10000;
  const allowedMedia = options.allowedMediaTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp4'];
  const maxSize = options.maxMediaSize || 100 * 1024 * 1024;

  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;

    if (options.requireContent && !body.content && !body.mediaUrl) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Message content or media is required', statusCode: 400 } });
      return;
    }
    if (body.content && typeof body.content === 'string' && body.content.length > maxText) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_TOO_LONG', message: `Content exceeds ${maxText} characters`, statusCode: 400 } });
      return;
    }
    if (body.mediaMetadata) {
      const meta = body.mediaMetadata as { mimeType?: string; size?: number };
      if (meta.mimeType && !allowedMedia.includes(meta.mimeType)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_MEDIA_TYPE', message: `Media type ${meta.mimeType} is not allowed`, statusCode: 400 } });
        return;
      }
      if (meta.size && meta.size > maxSize) {
        res.status(400).json({ success: false, error: { code: 'MEDIA_TOO_LARGE', message: `Media exceeds ${maxSize / (1024 * 1024)}MB limit`, statusCode: 400 } });
        return;
      }
    }
    next();
  };
}
