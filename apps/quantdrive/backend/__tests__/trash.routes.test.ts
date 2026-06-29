// @vitest-environment node
// ============================================================================
// quantdrive — /trash route-wiring seam test
// ============================================================================
//
// Asserts the TRASH feature is actually reachable over HTTP. Boots quantdrive's
// REAL `buildApp()` and drives the routes via Fastify `inject()`. Mirrors the
// as-shipped quantube seam harness: the real global `onRequest` auth hook from
// `createApp()`, the real route-layer handlers, and the real `TrashService`
// (constructed per-request from `fastify.prisma`) are all exercised. JWTs are
// HS256-signed with Node's built-in `crypto` (no new dependency).
//
// SEEDING APPROACH: there is no Postgres in the sandbox, so AFTER boot we swap
// ONLY the lowest-level DB driver — `app.prisma` — for a tiny in-memory
// `file` store that faithfully models the four delegates TrashService touches
// (findUnique / findMany / update / deleteMany). Everything else stays REAL:
// the auth seam, the route handlers, the { success, data } envelope, the
// createAppError status mapping, and the TrashService class logic.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp, getConfig } from '../app';
import type { AppConfig } from '@quant/server-core';

const testConfig: AppConfig = {
  ...getConfig(),
  port: 3055,
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
function signToken(sub = 'user-1'): string {
  jtiCounter += 1;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: testConfig.jwtIssuer,
      aud: testConfig.jwtAudience,
      sub,
      jti: `seam-trash-${jtiCounter}`,
      iat: now,
      exp: now + 3600,
      email: `${sub}@example.com`,
      username: sub,
      role: 'user',
      scopes: [],
      app: 'quantdrive',
    }),
  );
  const signature = base64url(
    createHmac('sha256', testConfig.jwtSecret).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

// --- in-memory file store seam-double (only the DB driver is doubled) --------
interface FileRow {
  id: string;
  userId: string;
  name: string;
  isDeleted: boolean;
  deletedAt: Date | null;
}

let store: FileRow[] = [];

function matchRow(row: FileRow, where: Record<string, unknown> = {}): boolean {
  return Object.keys(where).every(
    (k) => (row as unknown as Record<string, unknown>)[k] === where[k],
  );
}

function installFileStore(app: FastifyInstance): void {
  (app as unknown as { prisma: unknown }).prisma = {
    file: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const f = store.find((r) => r.id === where.id);
        return f ? { ...f } : null;
      },
      findMany: async ({ where = {} }: { where?: Record<string, unknown> } = {}) =>
        store.filter((r) => matchRow(r, where)).map((r) => ({ ...r })),
      update: async ({ where, data }: { where: { id: string }; data: Partial<FileRow> }) => {
        const row = store.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
      deleteMany: async ({ where = {} }: { where?: Record<string, unknown> } = {}) => {
        let count = 0;
        for (let i = store.length - 1; i >= 0; i -= 1) {
          if (matchRow(store[i]!, where)) {
            store.splice(i, 1);
            count += 1;
          }
        }
        return { count };
      },
    },
  };
}

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(testConfig);
  await app.ready();
  installFileStore(app);
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  store = [
    { id: 'live-1', userId: 'user-1', name: 'live.txt', isDeleted: false, deletedAt: null },
    { id: 'trash-1', userId: 'user-1', name: 'gone.txt', isDeleted: true, deletedAt: new Date() },
    { id: 'other-1', userId: 'user-2', name: 'theirs.txt', isDeleted: true, deletedAt: new Date() },
  ];
});

describe('quantdrive /trash routes (wiring seam)', () => {
  it('GET /trash without auth -> 401 (service not reached)', async () => {
    const res = await app.inject({ method: 'GET', url: '/trash' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it("GET /trash returns only the caller's trashed files in { success, data }", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/trash',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: FileRow[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.id).toBe('trash-1');
  });

  it('POST /trash/:fileId moves a live file to trash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/trash/live-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { isDeleted: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.isDeleted).toBe(true);
    expect(store.find((r) => r.id === 'live-1')!.isDeleted).toBe(true);
  });

  it("POST /trash/:fileId on another user's file -> 403 (TrashService authz reached)", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/trash/other-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('POST /trash/:fileId for a missing file -> 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/trash/does-not-exist',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'FILE_NOT_FOUND' } });
  });

  it('POST /trash/:fileId/restore restores a trashed file', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/trash/trash-1/restore',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { isDeleted: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.isDeleted).toBe(false);
    expect(store.find((r) => r.id === 'trash-1')!.isDeleted).toBe(false);
  });

  it("DELETE /trash empties only the caller's trash and returns { purged }", async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/trash',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { purged: number } };
    expect(body.success).toBe(true);
    expect(body.data.purged).toBe(1);
    // user-2's trashed file is untouched.
    expect(store.some((r) => r.id === 'other-1')).toBe(true);
    expect(store.some((r) => r.id === 'trash-1')).toBe(false);
  });
});
