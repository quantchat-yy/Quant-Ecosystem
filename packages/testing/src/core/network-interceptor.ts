// ============================================================================
// Quant Ecosystem - Testing Framework: Network Interceptor
// Request matching, response stubbing, recording, replay, error simulation
// ============================================================================

import type {
  InterceptedRequest,
  InterceptRule,
  InterceptResponse,
  RecordedExchange,
} from '../types';

type InterceptMode = 'intercept' | 'passthrough' | 'record' | 'replay';

interface RequestMatcher {
  urlPattern: string | RegExp;
  method?: string;
  headers?: Record<string, string>;
}

/**
 * NetworkInterceptor - Intercepts and controls network requests for testing
 */
export class NetworkInterceptor {
  private rules: InterceptRule[] = [];
  private interceptedRequests: InterceptedRequest[] = [];
  private recordings: RecordedExchange[] = [];
  private mode: InterceptMode = 'intercept';
  private passthrough: boolean = false;
  private defaultResponse: InterceptResponse;
  private beforeRequestHooks: ((req: InterceptedRequest) => InterceptedRequest | null)[] = [];
  private afterResponseHooks: ((req: InterceptedRequest, res: InterceptResponse) => void)[] = [];

  constructor() {
    this.defaultResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: null,
    };
  }

  /**
   * Stubs a request matching pattern with a response
   */
  stub(matcher: RequestMatcher, response: Partial<InterceptResponse>): this {
    this.rules.push({
      urlPattern: matcher.urlPattern,
      method: matcher.method,
      headers: matcher.headers,
      response: { ...this.defaultResponse, ...response },
    });
    return this;
  }

  /**
   * Convenience: stub a GET request
   */
  stubGet(urlPattern: string | RegExp, response: Partial<InterceptResponse>): this {
    return this.stub({ urlPattern, method: 'GET' }, response);
  }

  /**
   * Convenience: stub a POST request
   */
  stubPost(urlPattern: string | RegExp, response: Partial<InterceptResponse>): this {
    return this.stub({ urlPattern, method: 'POST' }, response);
  }

  /**
   * Convenience: stub a PUT request
   */
  stubPut(urlPattern: string | RegExp, response: Partial<InterceptResponse>): this {
    return this.stub({ urlPattern, method: 'PUT' }, response);
  }

  /**
   * Convenience: stub a DELETE request
   */
  stubDelete(urlPattern: string | RegExp, response: Partial<InterceptResponse>): this {
    return this.stub({ urlPattern, method: 'DELETE' }, response);
  }

  /**
   * Simulates a network error for matching requests
   */
  simulateError(
    matcher: RequestMatcher,
    errorType: 'timeout' | 'dns' | 'connection_refused' | 'network_error',
  ): this {
    this.rules.push({
      urlPattern: matcher.urlPattern,
      method: matcher.method,
      headers: matcher.headers,
      response: {
        status: 0,
        headers: {},
        body: null,
        error: errorType,
      },
    });
    return this;
  }

  /**
   * Simulates a delayed response
   */
  delay(matcher: RequestMatcher, delayMs: number, response: Partial<InterceptResponse> = {}): this {
    return this.stub(matcher, { ...response, delay: delayMs });
  }

  /**
   * Sets mode to passthrough (allow real requests)
   */
  enablePassthrough(): void {
    this.mode = 'passthrough';
    this.passthrough = true;
  }

  /**
   * Sets mode to record (capture requests for replay)
   */
  enableRecording(): void {
    this.mode = 'record';
    this.recordings = [];
  }

  /**
   * Sets mode to replay (serve from recordings)
   */
  enableReplay(recordings?: RecordedExchange[]): void {
    this.mode = 'replay';
    if (recordings) {
      this.recordings = recordings;
    }
  }

  /**
   * Intercepts a request and returns the matching response
   */
  async intercept(request: InterceptedRequest): Promise<InterceptResponse> {
    // Run before-request hooks
    let processedRequest: InterceptedRequest | null = request;
    for (const hook of this.beforeRequestHooks) {
      processedRequest = hook(processedRequest!);
      if (!processedRequest) {
        return { status: 0, headers: {}, body: null, error: 'network_error' };
      }
    }

    this.interceptedRequests.push(processedRequest);

    let response: InterceptResponse;

    switch (this.mode) {
      case 'passthrough':
        response = this.defaultResponse;
        break;

      case 'record': {
        // In record mode, return default and store exchange
        response = this.findMatchingResponse(processedRequest) ?? this.defaultResponse;
        const startTime = Date.now();
        this.recordings.push({
          request: processedRequest,
          response,
          duration: Date.now() - startTime,
        });
        break;
      }

      case 'replay': {
        // Find matching recording
        const recording = this.findRecording(processedRequest);
        if (recording) {
          response = recording.response;
        } else {
          response = { status: 404, headers: {}, body: { error: 'No matching recording' } };
        }
        break;
      }

      case 'intercept':
      default: {
        const matched = this.findMatchingResponse(processedRequest);
        if (matched) {
          response = matched;
        } else if (this.passthrough) {
          response = this.defaultResponse;
        } else {
          response = {
            status: 404,
            headers: {},
            body: { error: `No stub for ${request.method} ${request.url}` },
          };
        }
        break;
      }
    }

    // Simulate delay if specified
    if (response.delay && response.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, response.delay));
    }

    // Handle error simulation
    if (response.error) {
      const errorResponse = this.createNetworkError(response.error);

      // Run after-response hooks
      for (const hook of this.afterResponseHooks) {
        hook(processedRequest, errorResponse);
      }

      return errorResponse;
    }

    // Run after-response hooks
    for (const hook of this.afterResponseHooks) {
      hook(processedRequest, response);
    }

    return response;
  }

  /**
   * Finds a matching rule for the request
   */
  private findMatchingResponse(request: InterceptedRequest): InterceptResponse | null {
    for (const rule of this.rules) {
      if (this.matchesRule(request, rule)) {
        return rule.response;
      }
    }
    return null;
  }

  /**
   * Checks if a request matches a rule
   */
  private matchesRule(request: InterceptedRequest, rule: InterceptRule): boolean {
    // Check URL pattern
    if (rule.urlPattern instanceof RegExp) {
      if (!rule.urlPattern.test(request.url)) return false;
    } else {
      if (!this.matchUrlPattern(request.url, rule.urlPattern)) return false;
    }

    // Check method
    if (rule.method && rule.method.toUpperCase() !== request.method.toUpperCase()) {
      return false;
    }

    // Check headers
    if (rule.headers) {
      for (const [key, value] of Object.entries(rule.headers)) {
        if (request.headers[key.toLowerCase()] !== value) return false;
      }
    }

    return true;
  }

  /**
   * Matches a URL against a pattern (supports wildcards)
   */
  private matchUrlPattern(url: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === url) return true;

    // Convert glob-like pattern to regex
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexStr}$`).test(url);
  }

  /**
   * Finds a matching recording for replay
   */
  private findRecording(request: InterceptedRequest): RecordedExchange | null {
    return (
      this.recordings.find(
        (r) => r.request.url === request.url && r.request.method === request.method,
      ) ?? null
    );
  }

  /**
   * Creates a network error response
   */
  private createNetworkError(
    type: 'timeout' | 'dns' | 'connection_refused' | 'network_error',
  ): InterceptResponse {
    const errors: Record<string, InterceptResponse> = {
      timeout: { status: 0, headers: {}, body: null, error: 'timeout' },
      dns: { status: 0, headers: {}, body: null, error: 'dns' },
      connection_refused: { status: 0, headers: {}, body: null, error: 'connection_refused' },
      network_error: { status: 0, headers: {}, body: null, error: 'network_error' },
    };
    return errors[type] ?? errors['network_error']!;
  }

  /**
   * Adds a before-request hook
   */
  beforeRequest(hook: (req: InterceptedRequest) => InterceptedRequest | null): void {
    this.beforeRequestHooks.push(hook);
  }

  /**
   * Adds an after-response hook
   */
  afterResponse(hook: (req: InterceptedRequest, res: InterceptResponse) => void): void {
    this.afterResponseHooks.push(hook);
  }

  // --- Assertion helpers ---

  /**
   * Gets all intercepted requests
   */
  getRequests(): InterceptedRequest[] {
    return [...this.interceptedRequests];
  }

  /**
   * Gets requests matching a pattern
   */
  getRequestsTo(urlPattern: string | RegExp): InterceptedRequest[] {
    return this.interceptedRequests.filter((r) => {
      if (urlPattern instanceof RegExp) return urlPattern.test(r.url);
      return this.matchUrlPattern(r.url, urlPattern);
    });
  }

  /**
   * Asserts that a URL was requested
   */
  assertRequested(urlPattern: string | RegExp, method?: string): void {
    const matching = this.getRequestsTo(urlPattern).filter(
      (r) => !method || r.method.toUpperCase() === method.toUpperCase(),
    );
    if (matching.length === 0) {
      const methodStr = method ? `${method} ` : '';
      throw new Error(`Expected ${methodStr}${urlPattern} to have been requested`);
    }
  }

  /**
   * Asserts that a URL was NOT requested
   */
  assertNotRequested(urlPattern: string | RegExp, method?: string): void {
    const matching = this.getRequestsTo(urlPattern).filter(
      (r) => !method || r.method.toUpperCase() === method.toUpperCase(),
    );
    if (matching.length > 0) {
      const methodStr = method ? `${method} ` : '';
      throw new Error(
        `Expected ${methodStr}${urlPattern} not to have been requested, but it was called ${matching.length} times`,
      );
    }
  }

  /**
   * Gets recordings (for export/import)
   */
  getRecordings(): RecordedExchange[] {
    return [...this.recordings];
  }

  /**
   * Loads recordings for replay
   */
  loadRecordings(recordings: RecordedExchange[]): void {
    this.recordings = [...recordings];
  }

  /**
   * Resets the interceptor
   */
  reset(): void {
    this.rules = [];
    this.interceptedRequests = [];
    this.recordings = [];
    this.mode = 'intercept';
    this.passthrough = false;
    this.beforeRequestHooks = [];
    this.afterResponseHooks = [];
  }

  /**
   * Clears only request history
   */
  clearHistory(): void {
    this.interceptedRequests = [];
  }
}
