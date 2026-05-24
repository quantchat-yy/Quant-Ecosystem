// ============================================================================
// @quant/server - Router
// Express-like routing with path parameters, middleware chains, and route groups
// ============================================================================

import type { Request, Response, NextFunction, Middleware, HttpMethod, RouteMatch } from './types';

// ----------------------------------------------------------------------------
// Route Entry
// ----------------------------------------------------------------------------

interface RouteEntry {
  method: HttpMethod;
  path: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Middleware;
  middleware: Middleware[];
}

// ----------------------------------------------------------------------------
// Router Class
// ----------------------------------------------------------------------------

/**
 * Router provides Express-like routing for the Quant Ecosystem.
 *
 * Features:
 * - Path parameter extraction (:id, :userId)
 * - Wildcard path matching (*)
 * - Route-specific middleware chains
 * - Route grouping with prefix and shared middleware
 * - Nested router mounting
 * - 404 handling for unmatched routes
 *
 * Usage:
 * ```typescript
 * const router = new Router();
 * router.get('/users', listUsers);
 * router.get('/users/:id', getUser);
 * router.post('/users', authMiddleware, createUser);
 * router.group('/api/v1', [rateLimiter], (group) => {
 *   group.get('/health', healthCheck);
 * });
 * ```
 */
export class Router {
  private routes: RouteEntry[] = [];
  private globalMiddleware: Middleware[] = [];
  private prefix: string = '';
  private notFoundHandler: Middleware | null = null;

  constructor(options?: { prefix?: string }) {
    if (options?.prefix) {
      this.prefix = options.prefix.replace(/\/$/, '');
    }
  }

  // --------------------------------------------------------------------------
  // Middleware Registration
  // --------------------------------------------------------------------------

  /**
   * Add global middleware applied to all routes
   */
  use(...middleware: Middleware[]): this {
    this.globalMiddleware.push(...middleware);
    return this;
  }

  // --------------------------------------------------------------------------
  // Route Registration Methods
  // --------------------------------------------------------------------------

  /**
   * Register a GET route
   */
  get(path: string, ...handlers: Middleware[]): this {
    return this.register('GET', path, handlers);
  }

  /**
   * Register a POST route
   */
  post(path: string, ...handlers: Middleware[]): this {
    return this.register('POST', path, handlers);
  }

  /**
   * Register a PUT route
   */
  put(path: string, ...handlers: Middleware[]): this {
    return this.register('PUT', path, handlers);
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, ...handlers: Middleware[]): this {
    return this.register('DELETE', path, handlers);
  }

  /**
   * Register a PATCH route
   */
  patch(path: string, ...handlers: Middleware[]): this {
    return this.register('PATCH', path, handlers);
  }

  /**
   * Register an OPTIONS route (for CORS preflight)
   */
  options(path: string, ...handlers: Middleware[]): this {
    return this.register('OPTIONS', path, handlers);
  }

  /**
   * Register a HEAD route
   */
  head(path: string, ...handlers: Middleware[]): this {
    return this.register('HEAD', path, handlers);
  }

  /**
   * Register a route for all HTTP methods
   */
  all(path: string, ...handlers: Middleware[]): this {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    for (const method of methods) {
      this.register(method, path, handlers);
    }
    return this;
  }

  // --------------------------------------------------------------------------
  // Route Registration Core
  // --------------------------------------------------------------------------

  /**
   * Register a route with method, path, and handler chain
   * The last handler in the array is the route handler; preceding ones are middleware
   */
  register(method: HttpMethod, path: string, handlers: Middleware[]): this {
    if (handlers.length === 0) {
      throw new Error(`Route ${method} ${path} must have at least one handler`);
    }

    const fullPath = this.prefix + path;
    const { pattern, paramNames } = this.pathToRegex(fullPath);
    const handler = handlers[handlers.length - 1];
    const middleware = handlers.slice(0, -1);

    this.routes.push({
      method,
      path: fullPath,
      pattern,
      paramNames,
      handler,
      middleware,
    });

    return this;
  }

  // --------------------------------------------------------------------------
  // Route Grouping
  // --------------------------------------------------------------------------

  /**
   * Create a route group with shared prefix and middleware
   */
  group(prefix: string, middleware: Middleware[], callback: (router: Router) => void): this {
    const groupRouter = new Router({ prefix: this.prefix + prefix });
    callback(groupRouter);

    // Import routes from group router with additional middleware
    for (const route of groupRouter.routes) {
      this.routes.push({
        ...route,
        middleware: [...middleware, ...route.middleware],
      });
    }

    return this;
  }

  /**
   * Mount a sub-router at a prefix
   */
  mount(prefix: string, router: Router): this {
    const mountPath = this.prefix + prefix;
    for (const route of router.routes) {
      const fullPath = mountPath + route.path;
      const { pattern, paramNames } = this.pathToRegex(fullPath);
      this.routes.push({
        ...route,
        path: fullPath,
        pattern,
        paramNames,
      });
    }
    return this;
  }

  // --------------------------------------------------------------------------
  // Route Matching
  // --------------------------------------------------------------------------

  /**
   * Find a matching route for the given method and path
   * Returns the handler, extracted params, and middleware chain
   */
  match(method: string, path: string): RouteMatch | null {
    const normalizedMethod = method.toUpperCase() as HttpMethod;
    const normalizedPath = this.normalizePath(path);

    for (const route of this.routes) {
      if (route.method !== normalizedMethod) continue;

      const match = normalizedPath.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          params[route.paramNames[i]] = decodeURIComponent(match[i + 1] || '');
        }

        return {
          handler: route.handler,
          params,
          middleware: [...this.globalMiddleware, ...route.middleware],
        };
      }
    }

    return null;
  }

  /**
   * Handle an incoming request through the router
   */
  async handle(req: Request, res: Response): Promise<void> {
    const routeMatch = this.match(req.method, req.path);

    if (!routeMatch) {
      if (this.notFoundHandler) {
        await this.notFoundHandler(req, res, () => {});
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
            statusCode: 404,
          },
        });
      }
      return;
    }

    req.params = routeMatch.params;
    const allMiddleware = [...routeMatch.middleware, routeMatch.handler];
    await this.executeChain(allMiddleware, req, res);
  }

  /**
   * Set a custom 404 handler
   */
  setNotFoundHandler(handler: Middleware): this {
    this.notFoundHandler = handler;
    return this;
  }

  // --------------------------------------------------------------------------
  // Middleware Chain Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a middleware chain sequentially
   * Each middleware must call next() to pass control to the next one
   */
  private async executeChain(chain: Middleware[], req: Request, res: Response): Promise<void> {
    let index = 0;

    const next: NextFunction = async (error?: Error) => {
      if (error) {
        // If there's an error, skip to error handling
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'An unexpected error occurred',
            statusCode: 500,
          },
        });
        return;
      }

      if (index >= chain.length) return;

      const middleware = chain[index++];
      try {
        await middleware(req, res, next);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorObj.message || 'An unexpected error occurred',
            statusCode: 500,
          },
        });
      }
    };

    await next();
  }

  // --------------------------------------------------------------------------
  // Path to Regex Conversion
  // --------------------------------------------------------------------------

  /**
   * Convert a route path pattern to a regex with named parameter extraction
   *
   * Supports:
   * - Static segments: /users/list
   * - Named parameters: /users/:id
   * - Optional parameters: /users/:id?
   * - Wildcards: /files/*
   * - Multiple params: /users/:userId/posts/:postId
   */
  pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];

    // Handle empty or root path
    if (!path || path === '/') {
      return { pattern: /^\/?$/, paramNames };
    }

    let regexStr = '^';
    const segments = path.split('/').filter(Boolean);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      regexStr += '\\/';

      if (segment === '*') {
        // Wildcard - match anything
        paramNames.push('wildcard');
        regexStr += '(.+)';
      } else if (segment.startsWith(':')) {
        // Named parameter
        const isOptional = segment.endsWith('?');
        const paramName = isOptional ? segment.slice(1, -1) : segment.slice(1);
        paramNames.push(paramName);

        if (isOptional) {
          regexStr = regexStr.slice(0, -2); // Remove the \\/ we just added
          regexStr += '(?:\\/([^\\/]+))?';
        } else {
          regexStr += '([^\\/]+)';
        }
      } else {
        // Static segment
        regexStr += segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }

    regexStr += '\\/?$';
    return { pattern: new RegExp(regexStr), paramNames };
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Normalize a URL path (remove query string, double slashes)
   */
  private normalizePath(path: string): string {
    // Remove query string
    const qIndex = path.indexOf('?');
    const cleanPath = qIndex >= 0 ? path.substring(0, qIndex) : path;
    // Remove trailing slash (except for root)
    return cleanPath.length > 1 ? cleanPath.replace(/\/+$/, '') : cleanPath;
  }

  /**
   * Get all registered routes (for debugging/documentation)
   */
  getRoutes(): Array<{ method: string; path: string }> {
    return this.routes.map((r) => ({
      method: r.method,
      path: r.path,
    }));
  }

  /**
   * Get the number of registered routes
   */
  get routeCount(): number {
    return this.routes.length;
  }
}
