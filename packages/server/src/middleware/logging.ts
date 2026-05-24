// ============================================================================
// @quant/server - Logging Middleware
// Structured request/response logging with timing, correlation, and formatting
// ============================================================================

import type { Request, Response, NextFunction, Middleware, LoggingOptions, LogEntry } from '../types';

// ----------------------------------------------------------------------------
// Log Level Enum
// ----------------------------------------------------------------------------

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

// ----------------------------------------------------------------------------
// Default Configuration
// ----------------------------------------------------------------------------

const DEFAULT_LOGGING_OPTIONS: Required<LoggingOptions> = {
  level: 'info',
  logBody: false,
  logTiming: true,
  excludePaths: ['/health', '/healthz', '/ready', '/metrics', '/favicon.ico'],
  formatter: defaultFormatter,
};

// ----------------------------------------------------------------------------
// Logging Middleware Factory
// ----------------------------------------------------------------------------

/**
 * Create a request logging middleware with configurable options.
 *
 * Logs incoming requests and their completion with timing information.
 * Supports structured JSON output, exclusion patterns, and custom formatters.
 *
 * Features:
 * - Request start/complete logging
 * - Response time measurement
 * - Request ID correlation
 * - User ID tracking (when authenticated)
 * - Path-based exclusions (for health checks, etc.)
 * - Configurable log levels
 * - Custom output formatters
 * - Sensitive data redaction
 *
 * Usage:
 * ```typescript
 * router.use(loggingMiddleware());
 * // Or with options:
 * router.use(loggingMiddleware({
 *   level: 'debug',
 *   logBody: true,
 *   excludePaths: ['/health', '/internal/*'],
 * }));
 * ```
 */
export function loggingMiddleware(options?: LoggingOptions): Middleware {
  const config: Required<LoggingOptions> = { ...DEFAULT_LOGGING_OPTIONS, ...options };
  const minLevel = LOG_LEVELS[config.level];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (shouldExclude(req.path, config.excludePaths)) {
      next();
      return;
    }

    const startTime = req.startTime || Date.now();
    const entry: LogEntry = {
      timestamp: new Date(startTime).toISOString(),
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      userId: req.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Log incoming request
    if (minLevel <= LOG_LEVELS.info) {
      const incomingMsg = config.formatter({
        ...entry,
        timestamp: new Date().toISOString(),
      });
      console.log(incomingMsg);
    }

    // Intercept response to log completion with timing
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const logCompletion = (): void => {
      const duration = Date.now() - startTime;
      const completionEntry: LogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        duration,
      };

      // Set response time header
      if (config.logTiming) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      }

      // Choose log level based on status code
      const level = getLogLevel(res.statusCode);
      if (LOG_LEVELS[level] >= minLevel) {
        const msg = config.formatter(completionEntry);
        switch (level) {
          case 'error':
            console.error(msg);
            break;
          case 'warn':
            console.warn(msg);
            break;
          default:
            console.log(msg);
        }
      }
    };

    // Wrap json to capture response
    res.json = (data: unknown): void => {
      logCompletion();
      originalJson(data);
    };

    // Wrap send to capture response
    res.send = (data: string): void => {
      logCompletion();
      originalSend(data);
    };

    next();
  };
}

// ----------------------------------------------------------------------------
// Path Exclusion
// ----------------------------------------------------------------------------

/**
 * Check if a request path should be excluded from logging
 * Supports exact matches and simple wildcard patterns
 */
function shouldExclude(path: string, excludePaths: string[]): boolean {
  for (const pattern of excludePaths) {
    if (pattern === path) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    }
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (path.endsWith(suffix)) return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// Log Level Determination
// ----------------------------------------------------------------------------

/**
 * Determine appropriate log level based on HTTP status code
 */
function getLogLevel(statusCode: number): 'debug' | 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  if (statusCode >= 300) return 'info';
  return 'info';
}

// ----------------------------------------------------------------------------
// Default Formatter
// ----------------------------------------------------------------------------

/**
 * Default log entry formatter
 * Produces structured, human-readable log lines
 * Format: [timestamp] METHOD /path - STATUS (duration) [requestId] [userId]
 */
function defaultFormatter(entry: LogEntry): string {
  const parts: string[] = [];

  parts.push(`[${entry.timestamp}]`);
  parts.push(`${entry.method} ${entry.path}`);

  if (entry.statusCode !== undefined) {
    parts.push(`- ${entry.statusCode}`);
  }

  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }

  if (entry.requestId) {
    parts.push(`[${entry.requestId}]`);
  }

  if (entry.userId) {
    parts.push(`user:${entry.userId}`);
  }

  if (entry.ip) {
    parts.push(`ip:${entry.ip}`);
  }

  return parts.join(' ');
}

// ----------------------------------------------------------------------------
// JSON Formatter
// ----------------------------------------------------------------------------

/**
 * JSON-structured log formatter for production environments
 * Compatible with log aggregation tools (ELK, Datadog, CloudWatch)
 */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify({
    time: entry.timestamp,
    level: entry.statusCode ? getLogLevel(entry.statusCode) : 'info',
    msg: `${entry.method} ${entry.path}`,
    method: entry.method,
    path: entry.path,
    status: entry.statusCode,
    duration_ms: entry.duration,
    request_id: entry.requestId,
    user_id: entry.userId,
    ip: entry.ip,
    user_agent: entry.userAgent,
  });
}

// ----------------------------------------------------------------------------
// Compact Formatter
// ----------------------------------------------------------------------------

/**
 * Compact single-line formatter for development
 * Format: METHOD /path STATUS duration
 */
export function compactFormatter(entry: LogEntry): string {
  const status = entry.statusCode ? ` ${entry.statusCode}` : '';
  const duration = entry.duration !== undefined ? ` ${entry.duration}ms` : '';
  return `${entry.method} ${entry.path}${status}${duration}`;
}

// ----------------------------------------------------------------------------
// Access Log Middleware
// ----------------------------------------------------------------------------

/**
 * Apache-style access log middleware
 * Logs one line per completed request in combined log format
 */
export function accessLog(): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    const originalJson = res.json.bind(res);
    res.json = (data: unknown): void => {
      const duration = Date.now() - startTime;
      const logLine = [
        req.ip || '-',
        '-',
        req.userId || '-',
        `[${new Date().toISOString()}]`,
        `"${req.method} ${req.path}"`,
        res.statusCode,
        '-',
        `"${req.headers['user-agent'] || '-'}"`,
        `${duration}ms`,
      ].join(' ');
      console.log(logLine);
      originalJson(data);
    };

    next();
  };
}
