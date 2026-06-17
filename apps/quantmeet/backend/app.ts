import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import roomsRoutes from './routes/rooms';
import recordingsRoutes from './routes/recordings';
import webhooksRoutes from './routes/webhooks';
import { signalingRoutes } from './routes/signaling';
import aiRoutes from './routes/ai';
import quantLiveRoutes from './routes/quant-live';
import encryptionRoutes from './routes/encryption';
import { SessionManager, InMemorySessionStore, SessionSearch } from '@quant/quant-live';
import { InMemoryE2EERelay } from './lib/e2ee-relay';

export function getConfig(): AppConfig {
  const env = (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development';

  if (env === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    port: Number(process.env['PORT'] ?? 3006),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantmeet',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env,
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  // quant-live (voice) engine — per-app lane, Stage 3. Construct the engine's
  // real, as-shipped collaborators once at boot and decorate them as a single
  // `quantLive` singleton (never per-request):
  //   - SessionManager:      the live-session state machine.
  //   - InMemorySessionStore: the engine's `SessionStore` implementation.
  //   - SessionSearch:       transcript search, given the store as a collaborator.
  // quant-live's persistence layer is in-memory and does not require database
  // access, so Req 1.3 (construct from `app.prisma` when the engine needs the
  // DB) does not apply here — `app.prisma` remains available for collaborators
  // that do. No new persistent schema is introduced (Req 9.5). The global auth
  // hook installed by createApp() stays intact; the routes below sit behind it.
  const liveStore = new InMemorySessionStore();
  app.decorate('quantLive', {
    sessions: new SessionManager(),
    store: liveStore,
    search: new SessionSearch(liveStore),
  });

  await app.register(signalingRoutes, { prefix: '/signaling' });
  await app.register(roomsRoutes, { prefix: '/rooms' });
  await app.register(recordingsRoutes, { prefix: '/recordings' });
  await app.register(webhooksRoutes, { prefix: '/webhooks' });
  await app.register(aiRoutes, { prefix: '/ai' });
  await app.register(quantLiveRoutes, { prefix: '/quant-live' });

  // encryption (E2EE) engine — per-app lane, Stage 3. SECURITY CONTRACT (Req
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
  // Req 7.4).
  const e2eeRelay = new InMemoryE2EERelay();
  app.decorate('e2ee', e2eeRelay);
  app.addHook('onClose', async () => {
    e2eeRelay.shutdown();
  });
  await app.register(encryptionRoutes, { prefix: '/e2ee' });

  return app;
}
