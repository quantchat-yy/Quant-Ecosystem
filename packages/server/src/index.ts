// ============================================================================
// @quant/server - Shared Server Infrastructure
// Eliminates Router/middleware duplication across all 9 Quant Ecosystem apps
// ============================================================================

// Types
export type {
  Request,
  Response,
  NextFunction,
  Middleware,
  ErrorMiddleware,
  HttpMethod,
  RouteDefinition,
  RouteMatch,
  RateLimitOptions,
  CorsOptions,
  SecurityOptions,
  LoggingOptions,
  LogEntry,
  AuthOptions,
  ErrorResponse,
  SuccessResponse,
  UserContext,
  TokenMetadata,
} from './types';

// Router
export { Router } from './router';

// Middleware - Rate Limiting
export {
  RateLimiter,
  createApiRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
  createMessageRateLimiter,
} from './middleware/rate-limiter';

// Middleware - CORS
export {
  corsMiddleware,
  developmentCors,
  productionCors,
  internalCors,
} from './middleware/cors';

// Middleware - Security
export {
  securityHeaders,
  requestIdMiddleware,
  sanitizeInput,
  contentLengthLimit,
  requireContentType,
} from './middleware/security';

// Middleware - Logging
export {
  loggingMiddleware,
  jsonFormatter,
  compactFormatter,
  accessLog,
} from './middleware/logging';

// Middleware - Error Handling
export {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  tooManyRequests,
  internalError,
  serviceUnavailable,
} from './middleware/error-handler';

// Middleware - Authentication
export {
  authMiddleware,
  requireRole,
  requireScopes,
  optionalAuth,
  setTokenService,
} from './middleware/auth';
