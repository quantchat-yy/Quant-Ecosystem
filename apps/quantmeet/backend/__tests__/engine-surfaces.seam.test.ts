// @vitest-environment node
// ============================================================================
// quantmeet — Stage-3 engine seam tests (Task 11.3 / DoD-2 & DoD-4)
// ============================================================================
//
// Traverses the real integration seam for the two Stage-3 engines wired into
// quantmeet — `@quant/quant-live` (Task 11.1) and `@quant/encryption` (Task
// 11.2) — using Fastify `inject()` against the app's REAL `buildApp()`. No
// network, no mocked server-core: the global auth hook from `createApp()` and
// the decorated engines (`fastify.quantLive`, `fastify.e2ee`) are exercised
// exactly as in production.
//
// buildApp() loads cleanly for quantmeet (every `@quant/*` it imports —
// quant-live, encryption, ai, storage, webrtc, server-core — is a real
// workspace package declared in apps/quantmeet/package.json), so unlike the
// quantai harness this test builds the app via its own `buildApp()` and does
// NOT need to replicate the wiring on a bare `createApp()`. Confirmed by the
// `buildApp loads` assertion below.
//
// For each scoped surface we assert the states the design's Testing Strategy
// requires (DoD-2 / Requirement 5.2 & 5.6 / Property P7):
//   - unauthenticated (no Bearer)           -> 401 UNAUTHORIZED
//   - valid JWT WITHOUT the required scope   -> 403 FORBIDDEN
//   - valid JWT WITH the required scope       -> 2xx and the engine is reached
//
// JWTs are HS256-signed with Node's built-in `crypto` (matching the quantai
// seam-test template `agent-surfaces.seam.test.ts` and server-core's
// identity-permissions test), so this adds no new dependency. The signed claims
// match the test AppConfig's jwtSecret/issuer/audience (env:'test').
//
// ---------------------------------------------------------------------------
// FIXED (Task 15.3): the `/live` PUBLIC_PATHS auth-bypass collision.
//
//   Previously quant-live's routes were registered under the `/live` prefix,
//   but `/live` is also a Kubernetes-liveness entry in createApp()'s
//   PUBLIC_PATHS allowlist. The global `onRequest` auth hook matches
//   `path.startsWith('/live/')` and BYPASSED auth for every `/live/*` route, so
//   GET /live/sessions reached the handler with `request.auth` undefined (500 /
//   unauthenticated read) — a violation of Requirement 7.1 / Property P2.
//
//   The fix (Req 7.3-compliant: PUBLIC_PATHS is left UNCHANGED at its original
//   7 entries) moves quant-live to the non-colliding `/quant-live` prefix
//   (apps/quantmeet/backend/app.ts), with the Next proxies, api-client hooks and
//   these tests updated to match. The global auth hook now protects EVERY
//   quant-live route: GET /quant-live/sessions is 401 unauthenticated and 200
//   with a valid JWT. The GET block below now asserts that fixed behavior.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp, getConfig } from '../app';
import type { AppConfig } from '@quant/server-core';

const testConfig: AppConfig = {
  ...getConfig(),
  port: 3006,
  host: '0.0.0.0',
  logLevel: 'silent',
  jwtSecret: 'test-secret-key-that-is-long-enough-for-hs256',
  jwtIssuer: 'quant-test',
  jwtAudience: 'quant-test-audience',
  env: 'test',
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

let jtiCounter = 0;
// Hand-roll an HS256 JWT the auth plugin's
// `jose.jwtVerify(token, secret, { issuer, audience })` accepts.
function signToken(scopes: string[], sub = 'user-123'): string {
  jtiCounter += 1;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: testConfig.jwtIssuer,
      aud: testConfig.jwtAudience,
      sub,
      jti: `seam-${jtiCounter}`,
      iat: now,
      exp: now + 3600,
      email: 'meet@example.com',
      username: 'meetuser',
      role: 'user',
      scopes,
      app: 'quantmeet',
    }),
  );
  const signature = base64url(
    createHmac('sha256', testConfig.jwtSecret).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

// PUBLIC pre-key bundle (engine `PreKeyBundle`) — public material only.
const publicBundle = {
  identityKey: 'ik-public',
  signedPreKey: 'spk-public',
  signedPreKeySignature: 'sig-public',
  oneTimePreKey: 'otpk-public',
  registrationId: 42,
};

// Opaque CIPHERTEXT envelope (engine `EncryptedPayload` JSON projection).
const ciphertextEnvelope = {
  ciphertext: 'BASE64_CIPHERTEXT',
  nonce: 'BASE64_NONCE',
  tag: 'BASE64_TAG',
  algorithm: 'aes-256-gcm' as const,
  senderFingerprint: 'fp-sender',
  recipientFingerprint: 'fp-recipient',
  timestamp: '2024-01-01T00:00:00.000Z',
  version: 1,
};

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(testConfig);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ===========================================================================
// Harness sanity: confirm the app builds via its own buildApp() (no
// phantom-package breakage) and the two engines are decorated.
// ===========================================================================
describe('quantmeet buildApp() seam harness', () => {
  it('buildApp loads and decorates the Stage-3 engines', () => {
    expect(app).toBeTruthy();
    expect(app.quantLive).toBeTruthy();
    expect(app.e2ee).toBeTruthy();
  });
});

// ===========================================================================
// quant-live (voice) — POST /quant-live/sessions full auth/scope matrix (DoD-2/4).
// This is quant-live's DoD-bearing surface: it owns a `requireAuth` preHandler.
// After the Task 15.3 prefix fix it is also no longer at risk from the old
// `/live` PUBLIC_PATHS collision (see header note).
// ===========================================================================
describe('seam: quant-live POST /quant-live/sessions', () => {
  const url = '/quant-live/sessions';

  it('unauthenticated request -> 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'POST', url, payload: {} });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('valid JWT lacking `live:write` -> 403 FORBIDDEN', async () => {
    const token = signToken(['profile:read']);
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('valid JWT with `live:write` -> 201 and reaches the engine', async () => {
    const token = signToken(['live:write']);
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: { config: { language: 'en' } },
    });
    expect(res.statusCode).toBe(201);
    // Engine reached: the route returns the engine-produced session + store
    // entry only after `fastify.quantLive.sessions.create` + `store.create`.
    const body = res.json();
    expect(body).toMatchObject({ success: true });
    expect(body.data.session).toHaveProperty('id');
    expect(body.data.session).toHaveProperty('state');
    expect(body.data.entry).toMatchObject({ userId: 'user-123' });
  });
});

// ===========================================================================
// quant-live GET /quant-live/sessions — FIXED behavior (Task 15.3).
// This route has no own preHandler and relies on the global auth hook. After
// moving off the colliding `/live` prefix to `/quant-live`, the global hook is
// no longer bypassed: unauthenticated -> 401, valid JWT -> 200 (engine reached).
// (Was previously a characterization test for the auth-bypass bug.)
// ===========================================================================
describe('seam: quant-live GET /quant-live/sessions [FIXED: no PUBLIC_PATHS collision]', () => {
  const url = '/quant-live/sessions';

  it('unauthenticated GET -> 401 UNAUTHORIZED (global auth hook now enforced)', async () => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('valid JWT -> 200 and reaches the engine store (request.auth populated)', async () => {
    const token = signToken([]);
    const res = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ success: true });
    // Engine reached: the route returns the store's list result for the user.
    expect(body.data).toBeTruthy();
  });
});

// ===========================================================================
// encryption (E2EE) — every /e2ee route declares its own scope preHandler and
// `/e2ee` does NOT collide with PUBLIC_PATHS, so the full matrix works.
// ===========================================================================
describe('seam: encryption POST /e2ee/keys (publish PUBLIC pre-key bundle)', () => {
  const url = '/e2ee/keys';
  const body = { deviceId: 'device-1', bundle: publicBundle };

  it('unauthenticated request -> 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'POST', url, payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('valid JWT lacking `encryption:write` -> 403 FORBIDDEN', async () => {
    const token = signToken(['encryption:read']);
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('valid JWT with `encryption:write` -> 201 and reaches the relay', async () => {
    const token = signToken(['encryption:write']);
    const res = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json).toMatchObject({ success: true });
    // Engine reached: the relay stamped + echoed the published bundle.
    expect(json.data.bundle).toMatchObject({ userId: 'user-123', deviceId: 'device-1' });
    expect(json.data.bundle.bundle).toMatchObject({ identityKey: 'ik-public' });
  });
});

describe('seam: encryption GET /e2ee/keys/:userId (fetch PUBLIC bundles)', () => {
  it('unauthenticated request -> 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'GET', url: '/e2ee/keys/peer-1' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('valid JWT with `encryption:read` -> 200 and reaches the relay', async () => {
    const token = signToken(['encryption:read']);
    const res = await app.inject({
      method: 'GET',
      url: '/e2ee/keys/peer-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toMatchObject({ success: true, data: { userId: 'peer-1' } });
    expect(Array.isArray(json.data.bundles)).toBe(true);
  });
});

describe('seam: encryption POST /e2ee/messages (relay CIPHERTEXT) + GET inbox', () => {
  it('unauthenticated relay -> 401 UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/e2ee/messages',
      payload: { recipientId: 'peer-2', payload: ciphertextEnvelope },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('valid JWT lacking `encryption:write` -> 403 FORBIDDEN', async () => {
    const token = signToken(['encryption:read']);
    const res = await app.inject({
      method: 'POST',
      url: '/e2ee/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { recipientId: 'peer-2', payload: ciphertextEnvelope },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('relays an opaque ciphertext envelope -> 202, then the recipient drains it -> 200', async () => {
    const senderToken = signToken(['encryption:write'], 'sender-1');
    const relay = await app.inject({
      method: 'POST',
      url: '/e2ee/messages',
      headers: { authorization: `Bearer ${senderToken}` },
      payload: { recipientId: 'recipient-1', sessionId: 'conv-1', payload: ciphertextEnvelope },
    });
    expect(relay.statusCode).toBe(202);
    const relayJson = relay.json();
    expect(relayJson).toMatchObject({ success: true });
    expect(relayJson.data.envelope).toMatchObject({
      senderId: 'sender-1',
      recipientId: 'recipient-1',
    });
    // The relay stores ONLY the opaque ciphertext payload (no plaintext/keys).
    expect(relayJson.data.envelope.payload).toMatchObject({ ciphertext: 'BASE64_CIPHERTEXT' });

    const recipientToken = signToken(['encryption:read'], 'recipient-1');
    const inbox = await app.inject({
      method: 'GET',
      url: '/e2ee/messages',
      headers: { authorization: `Bearer ${recipientToken}` },
    });
    expect(inbox.statusCode).toBe(200);
    const inboxJson = inbox.json();
    expect(inboxJson).toMatchObject({ success: true });
    expect(inboxJson.data.count).toBeGreaterThanOrEqual(1);
    expect(inboxJson.data.envelopes[0]).toMatchObject({ senderId: 'sender-1' });
  });

  it('unauthenticated inbox drain -> 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'GET', url: '/e2ee/messages' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });
});

// ===========================================================================
// SECURITY (Req 7.5): the `.strict()` wire schemas must REJECT any body that
// smuggles a forbidden secret field — proving the ciphertext-only / public-only
// contract is enforced at the HTTP boundary, not just by convention.
// ===========================================================================
describe('security: encryption .strict() schemas reject forbidden secret fields (Req 7.5)', () => {
  it('POST /e2ee/keys with a `privateKey` in the bundle -> 400 VALIDATION_ERROR', async () => {
    const token = signToken(['encryption:write']);
    const res = await app.inject({
      method: 'POST',
      url: '/e2ee/keys',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        deviceId: 'device-1',
        // `privateKey` is NOT in the public PreKeyBundle schema; `.strict()`
        // must reject it so private key material can never cross the boundary.
        bundle: { ...publicBundle, privateKey: 'LEAKED_PRIVATE_KEY' },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('POST /e2ee/messages with a `plaintext` field -> 400 VALIDATION_ERROR', async () => {
    const token = signToken(['encryption:write']);
    const res = await app.inject({
      method: 'POST',
      url: '/e2ee/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        recipientId: 'peer-2',
        // `plaintext` is forbidden — the relay transports ciphertext only.
        plaintext: 'the cleartext message',
        payload: ciphertextEnvelope,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('POST /e2ee/messages payload carrying a ratchet `rootKey` secret -> 400 VALIDATION_ERROR', async () => {
    const token = signToken(['encryption:write']);
    const res = await app.inject({
      method: 'POST',
      url: '/e2ee/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        recipientId: 'peer-2',
        // Even nested inside the envelope, a ratchet secret is rejected because
        // the ciphertext envelope schema is `.strict()` too.
        payload: { ...ciphertextEnvelope, rootKey: 'LEAKED_ROOT_KEY' },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });
});
