import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import messagesRoutes from './routes/messages';
import conversationsRoutes from './routes/conversations';
import encryptionRoutes from './routes/encryption';
import e2eeRoutes from './routes/e2ee';
import federationRoutes, { createFederationService } from './routes/federation';
import arLensesRoutes, { createArLensesService } from './routes/ar-lenses';
import mediaRoutes from './routes/media';
import callsRoutes from './routes/calls';
import aiRoutes from './routes/ai';
import { websocketRoutes } from './routes/websocket';
import { InMemoryE2EERelay } from './lib/e2ee-relay';

export function getConfig(): AppConfig {
  const env = (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development';

  if (env === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    port: Number(process.env['PORT'] ?? 3002),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantchat',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env,
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  // WebSocket real-time routes
  await app.register(websocketRoutes, { prefix: '/ws' });

  await app.register(messagesRoutes, { prefix: '/conversations' });
  await app.register(conversationsRoutes, { prefix: '/conversations' });
  await app.register(encryptionRoutes, { prefix: '/encryption' });
  await app.register(mediaRoutes, { prefix: '/media' });
  await app.register(callsRoutes, { prefix: '/calls' });
  await app.register(aiRoutes, { prefix: '/ai' });

  // encryption (E2EE) engine — per-app lane, Task 14.1. SECURITY CONTRACT (Req
  // 7.5): the `@quant/encryption` engine runs CLIENT-SIDE — all key generation,
  // encryption, and decryption happen in the browser (see
  // `src/features/encryption/`). The backend is a zero-knowledge relay: it only
  // registers PUBLIC pre-key bundles (for key distribution) and relays opaque
  // CIPHERTEXT envelopes between users. Private keys, session/ratchet secrets,
  // and plaintext NEVER reach this server (the `/e2ee` route schemas are
  // `.strict()` and model public/ciphertext fields only). The relay is in-memory
  // (no new persistent schema — Req 9.5) and decorated once at boot, never
  // per-request. The global auth hook from createApp() stays intact; the `/e2ee`
  // routes additionally declare encryption:read/write scopes (sensitive engine,
  // Req 7.4). Mounted at `/e2ee`, separate from the legacy `/encryption` prekey
  // routes above (no prefix collision).
  const e2eeRelay = new InMemoryE2EERelay();
  app.decorate('e2ee', e2eeRelay);
  app.addHook('onClose', async () => {
    e2eeRelay.shutdown();
  });
  await app.register(e2eeRoutes, { prefix: '/e2ee' });

  // federation engine — per-app lane, Task 14.1 (Req 3.1, 3.2, 7.4). Composes
  // the as-shipped `@quant/federation` exports (FederationModeration +
  // APIKeyManager) into a decorated singleton constructed once at boot. Routes
  // under `/federation` are SCOPED (federation:read/write) on top of the global
  // auth hook. In-memory persistence (no new schema — Req 9.5).
  app.decorate('federation', createFederationService());
  await app.register(federationRoutes, { prefix: '/federation' });

  // ar-lenses engine — per-app lane (Stage 6, Task 14.2), SHARED DECORATOR
  // approach (design.md Open Question 2). quantchat is a declared ar-lenses
  // target (inventory: ar-lenses targets quantneon/quantchat/quantmeet). The
  // engine construction + route logic are app-agnostic and mirror quantneon's
  // module shape (see ./routes/ar-lenses.ts), reused here as a REAL app-local
  // importer of `@quant/ar-lenses` so DoD-1 holds for quantchat. quantchat only
  // supplies the app-specific bits — the `/ar-lenses` route prefix here and the
  // backend URL/port in the Next proxy (`src/app/api/_lib/ar-lenses-proxy.ts`).
  // The engine is in-memory (no prisma, no new schema — Req 9.5) and decorated
  // once at boot, never per-request. The global auth hook from createApp() stays
  // intact; mutating routes declare `ar-lenses:write` (Req 7.4).
  app.decorate('arLenses', createArLensesService());
  await app.register(arLensesRoutes, { prefix: '/ar-lenses' });

  return app;
}
