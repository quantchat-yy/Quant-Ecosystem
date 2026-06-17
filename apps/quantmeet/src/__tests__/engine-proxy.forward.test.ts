// @vitest-environment node
// ============================================================================
// quantmeet — Stage-3 engine proxy forward tests (Task 11.3 / DoD-3, Req 8.5)
// ============================================================================
//
// Verifies the Next App Router proxy handlers (Layer 4 of the integration seam)
// for one quant-live surface and one encryption surface forward method + body to
// the quantmeet backend URL and propagate the `Authorization` bearer + an
// `x-request-id` (minting one when absent), relaying the backend status. Global
// `fetch` is mocked; we assert on the URL/headers/body the shared
// `@quant/api-client` `proxyToBackend` utility passes to the backend.
//
// Subjects under test:
//   - quant-live:  app/api/quant-live/sessions/route.ts POST -> backend /quant-live/sessions
//   - encryption:  app/api/e2ee/messages/route.ts   POST -> backend /e2ee/messages
//
// Both proxy helpers default the backend origin to http://localhost:3006 (the
// quantmeet backend PORT — Requirement 1.6) when NEXT_PUBLIC_QUANTMEET_BACKEND_URL
// is unset. `proxyToBackend` returns 502 unless the backend response is
// application/json, so the fetch mock sets that content-type.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as livePost } from '../app/api/quant-live/sessions/route';
import { POST as e2eePost } from '../app/api/e2ee/messages/route';

const BACKEND = 'http://localhost:3006';

function makeFetchMock(status = 201, payload: unknown = { success: true, data: {} }) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  );
}

function lastFetchCall(fetchMock: ReturnType<typeof makeFetchMock>) {
  const call = fetchMock.mock.calls[0];
  const url = call[0] as string;
  const init = call[1] as RequestInit & { headers: Record<string, string> };
  return { url, init, headers: init.headers as Record<string, string> };
}

describe('quant-live proxy forward: POST /api/quant-live/sessions', () => {
  let fetchMock: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    fetchMock = makeFetchMock(201, { success: true, data: { session: { id: 's1' } } });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('forwards method + body to the backend and propagates bearer + provided x-request-id', async () => {
    const body = { config: { language: 'en' } };
    const req = new NextRequest('http://localhost:3007/api/quant-live/sessions', {
      method: 'POST',
      headers: {
        authorization: 'Bearer live-token-abc',
        'x-request-id': 'req-live-123',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const res = await livePost(req);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, headers } = lastFetchCall(fetchMock);
    expect(url).toBe(`${BACKEND}/quant-live/sessions`);
    expect(init.method).toBe('POST');
    expect(headers['Authorization']).toBe('Bearer live-token-abc');
    expect(headers['x-request-id']).toBe('req-live-123');
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(res.status).toBe(201);
  });

  it('mints an x-request-id when the inbound request has none', async () => {
    const req = new NextRequest('http://localhost:3007/api/quant-live/sessions', {
      method: 'POST',
      headers: { authorization: 'Bearer live-token-abc', 'content-type': 'application/json' },
      body: JSON.stringify({ config: {} }),
    });

    await livePost(req);

    const { headers } = lastFetchCall(fetchMock);
    expect(headers['x-request-id']).toBeDefined();
    expect(headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('relays a non-2xx backend status to the caller', async () => {
    fetchMock = makeFetchMock(403, { success: false, error: { code: 'FORBIDDEN' } });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3007/api/quant-live/sessions', {
      method: 'POST',
      headers: { authorization: 'Bearer live-token-abc', 'content-type': 'application/json' },
      body: JSON.stringify({ config: {} }),
    });

    const res = await livePost(req);
    expect(res.status).toBe(403);
  });
});

describe('encryption proxy forward: POST /api/e2ee/messages', () => {
  let fetchMock: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    fetchMock = makeFetchMock(202, { success: true, data: { envelope: { id: 'env-1' } } });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('forwards the ciphertext relay body to the backend and propagates bearer + provided x-request-id', async () => {
    const body = {
      recipientId: 'peer-2',
      payload: {
        ciphertext: 'BASE64_CIPHERTEXT',
        nonce: 'BASE64_NONCE',
        tag: 'BASE64_TAG',
        algorithm: 'aes-256-gcm',
        senderFingerprint: 'fp-s',
        recipientFingerprint: 'fp-r',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: 1,
      },
    };
    const req = new NextRequest('http://localhost:3007/api/e2ee/messages', {
      method: 'POST',
      headers: {
        authorization: 'Bearer e2ee-token-abc',
        'x-request-id': 'req-e2ee-456',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const res = await e2eePost(req);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, headers } = lastFetchCall(fetchMock);
    expect(url).toBe(`${BACKEND}/e2ee/messages`);
    expect(init.method).toBe('POST');
    expect(headers['Authorization']).toBe('Bearer e2ee-token-abc');
    expect(headers['x-request-id']).toBe('req-e2ee-456');
    // The opaque ciphertext envelope is forwarded verbatim (ciphertext-only seam).
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(res.status).toBe(202);
  });

  it('mints an x-request-id when the inbound request has none', async () => {
    const req = new NextRequest('http://localhost:3007/api/e2ee/messages', {
      method: 'POST',
      headers: { authorization: 'Bearer e2ee-token-abc', 'content-type': 'application/json' },
      body: JSON.stringify({ recipientId: 'peer-2', payload: {} }),
    });

    await e2eePost(req);

    const { headers } = lastFetchCall(fetchMock);
    expect(headers['x-request-id']).toBeDefined();
    expect(headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('relays a non-2xx backend status to the caller', async () => {
    fetchMock = makeFetchMock(403, { success: false, error: { code: 'FORBIDDEN' } });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3007/api/e2ee/messages', {
      method: 'POST',
      headers: { authorization: 'Bearer e2ee-token-abc', 'content-type': 'application/json' },
      body: JSON.stringify({ recipientId: 'peer-2', payload: {} }),
    });

    const res = await e2eePost(req);
    expect(res.status).toBe(403);
  });
});
