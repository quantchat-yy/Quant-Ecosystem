import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../core/http-client';
import { createQueryHook } from '../hooks/useQuery';
import { createMutationHook } from '../hooks/useMutation';
import { createInfiniteQueryHook } from '../hooks/useInfiniteQuery';

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options) => ({
    data: undefined,
    isLoading: true,
    error: null,
    queryKey: options.queryKey,
    queryFn: options.queryFn,
  })),
  useMutation: vi.fn((options) => ({
    mutate: vi.fn(),
    mutateAsync: options.mutationFn,
    isLoading: false,
    error: null,
  })),
  useInfiniteQuery: vi.fn((options) => ({
    data: undefined,
    isLoading: true,
    error: null,
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
  })),
}));

// Mock react
vi.mock('react', () => ({
  useEffect: vi.fn(),
  useRef: vi.fn(() => ({ current: null })),
  useCallback: vi.fn((fn) => fn),
  useState: vi.fn((initial) => [initial, vi.fn()]),
}));

describe('HttpClient', () => {
  let client: HttpClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://api.quant.ai' });
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('builds GET request URLs correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [] } }),
    });

    await client.get('/users', { page: '1', limit: '10' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.quant.ai/users?page=1&limit=10',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('includes auth token in headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });

    client.setAuthToken('my-token-123');
    await client.get('/protected');

    const callArgs = mockFetch.mock.calls[0]!;
    const options = callArgs[1] as RequestInit;
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-token-123',
    );
  });

  it('handles error responses correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ code: 'NOT_FOUND', message: 'Resource not found' }),
    });

    const result = await client.get('/missing');

    expect(result.success).toBe(false);
    expect(result.error?.statusCode).toBe(404);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: '123' } }),
    });

    await client.post('/users', { name: 'John', email: 'john@example.com' });

    const callArgs = mockFetch.mock.calls[0]!;
    const options = callArgs[1] as RequestInit;
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ name: 'John', email: 'john@example.com' }));
  });
});

describe('createQueryHook', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://api.quant.ai' });
  });

  it('creates a hook function', () => {
    const useHook = createQueryHook<Record<string, string>, { items: string[] }>(
      client,
      '/api/items',
    );

    expect(typeof useHook).toBe('function');
  });

  it('creates a hook with dynamic path', () => {
    const useHook = createQueryHook<{ id: string }, { name: string }>(
      client,
      (params) => `/api/users/${params.id}`,
    );

    expect(typeof useHook).toBe('function');
  });
});

describe('createMutationHook', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://api.quant.ai' });
  });

  it('creates a mutation hook function', () => {
    const useMutation = createMutationHook<{ name: string }, { id: string }>(client, '/api/items');

    expect(typeof useMutation).toBe('function');
  });
});

describe('createInfiniteQueryHook', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://api.quant.ai' });
  });

  it('creates an infinite query hook function', () => {
    const useInfinite = createInfiniteQueryHook<
      { category: string },
      { id: string; title: string }
    >(client, '/api/posts');

    expect(typeof useInfinite).toBe('function');
  });
});
