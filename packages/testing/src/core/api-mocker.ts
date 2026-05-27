// ============================================================================
// Quant Ecosystem - Testing Framework: API Mocker
// Route registration, response config, request assertion, error injection
// ============================================================================

import type { APIRoute, APIRequest, APIResponse } from '../types';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RouteConfig {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  delay?: number;
  error?: 'timeout' | 'network_error' | '500' | 'connection_refused';
}

interface MiddlewareFunction {
  (req: APIRequest, next: () => APIResponse): APIResponse;
}

/**
 * APIMocker - Simulates HTTP API endpoints for testing
 */
export class APIMocker {
  private routes: Map<string, APIRoute> = new Map();
  private middlewares: MiddlewareFunction[] = [];
  private defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-request-id': 'mock-request-id',
  };
  private latency: number = 0;
  private errorRate: number = 0;
  private callLog: APIRequest[] = [];

  /**
   * Registers a GET route
   */
  get(path: string, config: RouteConfig | ((req: APIRequest) => APIResponse)): this {
    return this.registerRoute('GET', path, config);
  }

  /**
   * Registers a POST route
   */
  post(path: string, config: RouteConfig | ((req: APIRequest) => APIResponse)): this {
    return this.registerRoute('POST', path, config);
  }

  /**
   * Registers a PUT route
   */
  put(path: string, config: RouteConfig | ((req: APIRequest) => APIResponse)): this {
    return this.registerRoute('PUT', path, config);
  }

  /**
   * Registers a DELETE route
   */
  delete(path: string, config: RouteConfig | ((req: APIRequest) => APIResponse)): this {
    return this.registerRoute('DELETE', path, config);
  }

  /**
   * Registers a PATCH route
   */
  patch(path: string, config: RouteConfig | ((req: APIRequest) => APIResponse)): this {
    return this.registerRoute('PATCH', path, config);
  }

  /**
   * Internal route registration
   */
  private registerRoute(
    method: HTTPMethod,
    path: string,
    config: RouteConfig | ((req: APIRequest) => APIResponse),
  ): this {
    const key = `${method}:${path}`;
    let handler: (req: APIRequest) => APIResponse;

    if (typeof config === 'function') {
      handler = config;
    } else {
      handler = (_req: APIRequest) => {
        if (config.error) {
          return this.createErrorResponse(config.error);
        }
        return {
          status: config.status ?? 200,
          headers: { ...this.defaultHeaders, ...config.headers },
          body: config.body ?? null,
          delay: config.delay ?? this.latency,
        };
      };
    }

    this.routes.set(key, {
      method,
      path,
      handler,
      delay: (typeof config === 'object' ? config.delay : undefined) ?? this.latency,
      calls: [],
    });

    return this;
  }

  /**
   * Adds middleware that intercepts all requests
   */
  use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Sets global latency for all routes
   */
  setLatency(ms: number): this {
    this.latency = ms;
    return this;
  }

  /**
   * Sets error injection rate (0-1)
   */
  setErrorRate(rate: number): this {
    this.errorRate = Math.max(0, Math.min(1, rate));
    return this;
  }

  /**
   * Simulates an HTTP request to a registered route
   */
  async request(
    method: HTTPMethod,
    path: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
    } = {},
  ): Promise<APIResponse> {
    const req: APIRequest = {
      method,
      path,
      headers: options.headers ?? {},
      body: options.body ?? null,
      params: options.params ?? {},
      query: options.query ?? {},
    };

    this.callLog.push(req);

    // Random error injection
    if (this.errorRate > 0 && Math.random() < this.errorRate) {
      return this.createErrorResponse('500');
    }

    // Find matching route (exact match first, then pattern match)
    const route = this.findRoute(method, path);

    if (!route) {
      return {
        status: 404,
        headers: this.defaultHeaders,
        body: { error: 'Not Found', message: `No route for ${method} ${path}` },
      };
    }

    route.calls.push(req);

    // Apply middlewares
    let response: APIResponse;
    if (this.middlewares.length > 0) {
      let middlewareIndex = 0;
      const next = (): APIResponse => {
        if (middlewareIndex < this.middlewares.length) {
          const middleware = this.middlewares[middlewareIndex++]!;
          return middleware(req, next);
        }
        return route.handler(req);
      };
      response = next();
    } else {
      response = route.handler(req);
    }

    // Simulate delay
    const delay = response.delay ?? route.delay;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return response;
  }

  /**
   * Finds a route matching the method and path (supports params like :id)
   */
  private findRoute(method: HTTPMethod, path: string): APIRoute | undefined {
    // Exact match
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey)!;
    }

    // Pattern match with path params
    for (const [key, route] of this.routes) {
      if (!key.startsWith(`${method}:`)) continue;
      const routePath = key.slice(method.length + 1);
      if (this.matchPath(routePath, path)) {
        return route;
      }
    }

    return undefined;
  }

  /**
   * Matches a route pattern against an actual path
   */
  private matchPath(pattern: string, actual: string): boolean {
    const patternParts = pattern.split('/');
    const actualParts = actual.split('/');

    if (patternParts.length !== actualParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i]!.startsWith(':')) continue;
      if (patternParts[i] !== actualParts[i]) return false;
    }

    return true;
  }

  /**
   * Creates an error response for injection
   */
  private createErrorResponse(type: string): APIResponse {
    switch (type) {
      case 'timeout':
        return { status: 408, headers: this.defaultHeaders, body: { error: 'Request Timeout' } };
      case 'network_error':
        return { status: 0, headers: {}, body: { error: 'Network Error' } };
      case '500':
        return {
          status: 500,
          headers: this.defaultHeaders,
          body: { error: 'Internal Server Error' },
        };
      case 'connection_refused':
        return { status: 0, headers: {}, body: { error: 'Connection Refused' } };
      default:
        return { status: 500, headers: this.defaultHeaders, body: { error: 'Unknown Error' } };
    }
  }

  // --- Assertion methods ---

  /**
   * Asserts that a route was called
   */
  assertCalled(method: HTTPMethod, path: string): boolean {
    const route = this.findRoute(method, path);
    if (!route || route.calls.length === 0) {
      throw new Error(`Expected ${method} ${path} to have been called, but it was not`);
    }
    return true;
  }

  /**
   * Asserts that a route was called N times
   */
  assertCalledTimes(method: HTTPMethod, path: string, times: number): boolean {
    const route = this.findRoute(method, path);
    const callCount = route?.calls.length ?? 0;
    if (callCount !== times) {
      throw new Error(
        `Expected ${method} ${path} to be called ${times} times, but was called ${callCount} times`,
      );
    }
    return true;
  }

  /**
   * Asserts that a route was called with specific body
   */
  assertCalledWith(method: HTTPMethod, path: string, expectedBody: unknown): boolean {
    const route = this.findRoute(method, path);
    if (!route || route.calls.length === 0) {
      throw new Error(`Expected ${method} ${path} to have been called`);
    }
    const lastCall = route.calls[route.calls.length - 1]!;
    if (JSON.stringify(lastCall.body) !== JSON.stringify(expectedBody)) {
      throw new Error(
        `Expected ${method} ${path} to be called with ${JSON.stringify(expectedBody)}, got ${JSON.stringify(lastCall.body)}`,
      );
    }
    return true;
  }

  /**
   * Asserts a route was NOT called
   */
  assertNotCalled(method: HTTPMethod, path: string): boolean {
    const route = this.findRoute(method, path);
    if (route && route.calls.length > 0) {
      throw new Error(
        `Expected ${method} ${path} not to have been called, but it was called ${route.calls.length} times`,
      );
    }
    return true;
  }

  /**
   * Gets all calls to a specific route
   */
  getCalls(method: HTTPMethod, path: string): APIRequest[] {
    const route = this.findRoute(method, path);
    return route?.calls ?? [];
  }

  /**
   * Gets the entire call log
   */
  getAllCalls(): APIRequest[] {
    return [...this.callLog];
  }

  /**
   * Resets all routes and call history
   */
  reset(): void {
    this.routes.clear();
    this.middlewares = [];
    this.callLog = [];
    this.latency = 0;
    this.errorRate = 0;
  }

  /**
   * Resets only call history (keeps routes)
   */
  resetHistory(): void {
    for (const route of this.routes.values()) {
      route.calls = [];
    }
    this.callLog = [];
  }
}
