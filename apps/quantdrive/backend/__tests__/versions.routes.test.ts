// @vitest-environment node
// ============================================================================
// quantdrive — /versions route-wiring seam test
// ============================================================================
//
// Asserts the FILE VERSION HISTORY feature is actually reachable over HTTP.
// Boots quantdrive's REAL `buildApp()` and drives the routes via Fastify
// `inject()`. Mirrors the as-shipped quantdrive /trash seam harness: the real
// global `onRequest` auth hook from `createApp()`, the real route-layer
// handlers, and the real `VersionService` (constructed per-request from
// `fastify.prisma`) are all exercised. JWTs are HS256-signed with Node's
// built-in `crypto` (no new dependency).
//
// SEEDING APPROACH: there is no Postgres in the sandbox, so AFTER boot we swap
// ONLY the lowest-level DB driver — `app.prisma` — for a tiny in-memory
// `file` + `fileVersion` store that faithfully models the delegates
// VersionService touches (file.findUnique / file.update, fileVersion.create /
// findUnique / findMany). Everything else stays REAL: the auth seam, the route
// handlers, the { success, data } envelope, the createAppError status mapping,
// and the VersionService class logic.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp, getConfig } from '../app';
import type { AppConfig } from '@quant/server-core';

const testConfig: AppConfig = {
  ...getConfig(),
  port: 3056,
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
      jti: `seam-versions-${jtiCounter}`,
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

// --- in-memory store seam-double (only the DB driver is doubled) -------------
interface FileRow {
  id: string;
  userId: string;
  isDeleted: boolean;
  encryptedContent: string;
  encryptionIV: string;
  encryptionAuthTag: string;
  encryptionKey: string;
  size: number;
  updatedAt: Date | null;
}

interface VersionRow {
  id: string;
  fileId: string;
  versionNumber: number;
  encryptedContent: string;
  encryptionIV: string;
  encryptionAuthTag: string;
  encryptionKey: string;
  size: number;
  createdAt: Date;
}

let fileStore: FileRow[] = [];
let versionStore: VersionRow[] = [];
let versionSeq = 0;

function matchRow(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.keys(where).every((k) => row[k] === where[k]);
}

function installStore(app: FastifyInstance): void {
  (app as unknown as { prisma: unknown }).prisma = {
    file: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const f = fileStore.find((r) => r.id === where.id);
        return f ? { ...f } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FileRow> }) => {
        const row = fileStore.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
    },
    fileVersion: {
      create: async ({ data }: { data: Omit<VersionRow, 'id'> }) => {
        versionSeq += 1;
        const row: VersionRow = { id: `ver-new-${versionSeq}`, ...data };
        versionStore.push(row);
        return { ...row };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const v = versionStore.find((r) => r.id === where.id);
        return v ? { ...v } : null;
      },
      findMany: async ({
        where = {},
        orderBy,
        take,
      }: {
        where?: Record<string, unknown>;
        orderBy?: { versionNumber?: 'asc' | 'desc' };
        take?: number;
      } = {}) => {
        let rows = versionStore
          .filter((r) => matchRow(r as unknown as Record<string, unknown>, where))
          .map((r) => ({ ...r }));
        if (orderBy?.versionNumber) {
          rows = rows.sort((a, b) =>
            orderBy.versionNumber === 'desc'
              ? b.versionNumber - a.versionNumber
              : a.versionNumber - b.versionNumber,
          );
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
        }
        return rows;
      },
    },
  };
}

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(testConfig);
  await app.ready();
  installStore(app);
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  versionSeq = 0;
  fileStore = [
    {
      id: 'file-1',
      userId: 'user-1',
      isDeleted: false,
      encryptedContent: 'current-content',
      encryptionIV: 'current-iv',
      encryptionAuthTag: 'current-tag',
      encryptionKey: 'current-key',
      size: 100,
      updatedAt: null,
    },
    {
      id: 'file-2',
      userId: 'user-2',
      isDeleted: false,
      encryptedContent: 'theirs',
      encryptionIV: 'iv',
      encryptionAuthTag: 'tag',
      encryptionKey: 'key',
      size: 50,
      updatedAt: null,
    },
  ];
  versionStore = [
    {
      id: 'ver-1',
      fileId: 'file-1',
      versionNumber: 1,
      encryptedContent: 'v1-content',
      encryptionIV: 'v1-iv',
      encryptionAuthTag: 'v1-tag',
      encryptionKey: 'v1-key',
      size: 80,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: 'ver-2',
      fileId: 'file-1',
      versionNumber: 2,
      encryptedContent: 'v2-content',
      encryptionIV: 'v2-iv',
      encryptionAuthTag: 'v2-tag',
      encryptionKey: 'v2-key',
      size: 90,
      createdAt: new Date('2024-01-02T00:00:00Z'),
    },
    {
      id: 'ver-other',
      fileId: 'file-2',
      versionNumber: 1,
      encryptedContent: 'other',
      encryptionIV: 'iv',
      encryptionAuthTag: 'tag',
      encryptionKey: 'key',
      size: 10,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
  ];
});

const validBody = {
  encryptedContent: 'new-content',
  encryptionIV: 'new-iv',
  encryptionAuthTag: 'new-tag',
  encryptionKey: 'new-key',
  size: 120,
};

describe('quantdrive /versions routes (wiring seam)', () => {
  it('GET /versions/:fileId without auth -> 401 (service not reached)', async () => {
    const res = await app.inject({ method: 'GET', url: '/versions/file-1' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('GET /versions/:fileId returns versions newest-first in { success, data }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/file-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: VersionRow[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.versionNumber).toBe(2);
    expect(body.data[1]!.versionNumber).toBe(1);
  });

  it("GET /versions/:fileId on another user's file -> 403 (VersionService authz reached)", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/file-2',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('GET /versions/:fileId for a missing file -> 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/does-not-exist',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'FILE_NOT_FOUND' } });
  });

  it('GET /versions/:fileId/:versionId returns a single version', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/file-1/ver-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: VersionRow };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('ver-1');
    expect(body.data.versionNumber).toBe(1);
  });

  it('GET /versions/:fileId/:versionId for a missing version -> 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/file-1/nope',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VERSION_NOT_FOUND' } });
  });

  it("GET /versions/:fileId/:versionId for another user's version -> 403", async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/versions/file-2/ver-other',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('POST /versions/:fileId creates a new version (201) with the next version number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { success: boolean; data: VersionRow };
    expect(body.success).toBe(true);
    expect(body.data.versionNumber).toBe(3);
    expect(body.data.fileId).toBe('file-1');
    expect(versionStore.some((v) => v.id === body.data.id)).toBe(true);
  });

  it('POST /versions/:fileId with an invalid body -> 400 (Zod validation, service not reached)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
      payload: { encryptedContent: 'only-this' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false });
  });

  it("POST /versions/:fileId on another user's file -> 403", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-2',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('POST /versions/:fileId/restore/:versionId restores the file to that version', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-1/restore/ver-1',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: VersionRow };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('ver-1');
    // The live file content was rolled back to ver-1's payload.
    const live = fileStore.find((r) => r.id === 'file-1')!;
    expect(live.encryptedContent).toBe('v1-content');
    expect(live.size).toBe(80);
  });

  it('POST /versions/:fileId/restore/:versionId for a missing version -> 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-1/restore/nope',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VERSION_NOT_FOUND' } });
  });

  it("POST /versions/:fileId/restore/:versionId on another user's version -> 403", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/versions/file-2/restore/ver-other',
      headers: { authorization: `Bearer ${signToken('user-1')}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });
});
