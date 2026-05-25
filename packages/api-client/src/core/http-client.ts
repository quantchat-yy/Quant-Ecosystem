// ============================================================================
// API Client SDK - HTTP Client
// ============================================================================

import type { APIResponse, APIError, RequestConfig } from './types';

/**
 * Type-safe HTTP client with auth token injection, error parsing, and configurable base URL.
 */
export class HttpClient {
  private config: RequestConfig;

  constructor(config: RequestConfig) {
    this.config = config;
  }

  /**
   * Set the auth token for subsequent requests
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<APIResponse<T>> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<APIResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown): Promise<APIResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body);
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<APIResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('DELETE', url);
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const fullPath = `${base}${path}`;

    if (!params) return fullPath;

    const searchParams = new URLSearchParams(params);
    return `${fullPath}?${searchParams.toString()}`;
  }

  /**
   * Execute an HTTP request with error handling
   */
  private async request<T>(method: string, url: string, body?: unknown): Promise<APIResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    init.signal = controller.signal;

    try {
      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as Partial<APIError>;
        const apiError: APIError = {
          code: errorBody.code || 'UNKNOWN_ERROR',
          message: errorBody.message || response.statusText,
          statusCode: response.status,
          details: errorBody.details,
        };

        return {
          success: false,
          data: undefined as unknown as T,
          error: apiError,
        };
      }

      const data = (await response.json()) as APIResponse<T>;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          data: undefined as unknown as T,
          error: {
            code: 'TIMEOUT',
            message: `Request timed out after ${timeout}ms`,
            statusCode: 408,
          },
        };
      }

      return {
        success: false,
        data: undefined as unknown as T,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
          statusCode: 0,
        },
      };
    }
  }
}
