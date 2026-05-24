// ============================================================================
// @quant/server - Error Handler Middleware
// Centralized error handling with AppError class and structured responses
// ============================================================================

import type { Request, Response, NextFunction, ErrorMiddleware, Middleware, ErrorResponse } from '../types';

// ----------------------------------------------------------------------------
// AppError Class
// ----------------------------------------------------------------------------

/**
 * Application Error class for operational errors.
 *
 * Operational errors are expected errors that the application can handle gracefully:
 * - Validation failures (400)
 * - Authentication/Authorization failures (401, 403)
 * - Resource not found (404)
 * - Rate limiting (429)
 * - Business logic violations (422)
 *
 * Non-operational errors (programming bugs, system failures) are handled
 * differently by the error handler middleware.
 *
 * Usage:
 * ```typescript
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 * throw new AppError('Invalid input', 400, 'VALIDATION_ERROR', { field: 'email' });
 * ```
 */
export class AppError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;
  /** Machine-readable error code */
  public readonly code: string;
  /** Whether this is an expected operational error */
  public readonly isOperational: boolean;
  /** Additional error context/details */
  public readonly details?: unknown;
  /** Timestamp when the error was created */
  public readonly timestamp: number;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert to JSON response format
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

// ----------------------------------------------------------------------------
// Common Error Factory Functions
// ----------------------------------------------------------------------------

/**
 * Create a 400 Bad Request error
 */
export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(message, 400, 'BAD_REQUEST', details);
}

/**
 * Create a 401 Unauthorized error
 */
export function unauthorized(message: string = 'Authentication required'): AppError {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden error
 */
export function forbidden(message: string = 'Access denied'): AppError {
  return new AppError(message, 403, 'FORBIDDEN');
}

/**
 * Create a 404 Not Found error
 */
export function notFound(resource: string = 'Resource'): AppError {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Create a 409 Conflict error
 */
export function conflict(message: string): AppError {
  return new AppError(message, 409, 'CONFLICT');
}

/**
 * Create a 422 Unprocessable Entity error
 */
export function validationError(message: string, details?: unknown): AppError {
  return new AppError(message, 422, 'VALIDATION_ERROR', details);
}

/**
 * Create a 429 Too Many Requests error
 */
export function tooManyRequests(message: string = 'Rate limit exceeded'): AppError {
  return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
}

/**
 * Create a 500 Internal Server Error
 */
export function internalError(message: string = 'An unexpected error occurred'): AppError {
  return new AppError(message, 500, 'INTERNAL_SERVER_ERROR');
}

/**
 * Create a 503 Service Unavailable error
 */
export function serviceUnavailable(message: string = 'Service temporarily unavailable'): AppError {
  return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
}

// ----------------------------------------------------------------------------
// Error Handler Middleware Factory
// ----------------------------------------------------------------------------

/**
 * Create the centralized error handler middleware.
 *
 * This should be the last middleware registered on the router.
 * It catches all errors thrown or passed to next() and formats
 * them as consistent JSON error responses.
 *
 * Features:
 * - AppError instances produce structured operational error responses
 * - Unknown errors are treated as 500 Internal Server Errors
 * - Request metadata (ID, timing) included in responses
 * - Non-operational errors are logged for debugging
 * - Stack traces are only included in development
 * - Error events can be emitted for monitoring
 *
 * Usage:
 * ```typescript
 * // Register as last middleware
 * router.use(errorHandler());
 * // Or with options:
 * router.use(errorHandler({ includeStack: process.env.NODE_ENV !== 'production' }));
 * ```
 */
export function errorHandler(options?: { includeStack?: boolean; version?: string }): ErrorMiddleware {
  const includeStack = options?.includeStack || false;
  const version = options?.version || '1.0.0';

  return (error: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Don't send if headers already sent
    if (res.headersSent) {
      return;
    }

    // Calculate request duration
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const requestId = req.requestId || 'unknown';

    // Handle operational AppError instances
    if (error instanceof AppError) {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        },
        metadata: {
          requestId,
          timestamp: Date.now(),
          duration,
          version,
        },
      };

      res.status(error.statusCode).json(response);
      return;
    }

    // Handle non-operational (unexpected) errors
    console.error(`[ERROR] Unhandled error in ${req.method} ${req.path}:`, {
      error: error.message,
      stack: error.stack,
      requestId,
      userId: req.userId,
      path: req.path,
      method: req.method,
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
        details: includeStack ? { stack: error.stack } : undefined,
      },
      metadata: {
        requestId,
        timestamp: Date.now(),
        duration,
        version,
      },
    };

    res.status(500).json(response);
  };
}

// ----------------------------------------------------------------------------
// Async Handler Wrapper
// ----------------------------------------------------------------------------

/**
 * Wrap an async route handler to automatically catch rejected promises
 * and pass errors to the error handling middleware.
 *
 * Without this, unhandled promise rejections in route handlers would
 * crash the process instead of returning a 500 response.
 *
 * Usage:
 * ```typescript
 * router.get('/users/:id', asyncHandler(async (req, res, next) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw notFound('User');
 *   res.json({ success: true, data: user });
 * }));
 * ```
 */
export function asyncHandler(fn: Middleware): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ----------------------------------------------------------------------------
// Not Found Handler
// ----------------------------------------------------------------------------

/**
 * Catch-all 404 handler for unmatched routes
 * Register this after all other routes
 */
export function notFoundHandler(): Middleware {
  return (req: Request, res: Response, _next: NextFunction): void => {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        statusCode: 404,
      },
      metadata: {
        requestId: req.requestId || 'unknown',
        timestamp: Date.now(),
        duration: req.startTime ? Date.now() - req.startTime : 0,
        version: '1.0.0',
      },
    };
    res.status(404).json(response);
  };
}
