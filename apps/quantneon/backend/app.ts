import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import postsRoutes from './routes/posts';
import profilesRoutes from './routes/profiles';
import reelsRoutes from './routes/reels';
import exploreRoutes from './routes/explore';
import notificationsRoutes from './routes/notifications';
import messagesRoutes from './routes/messages';
import photosRoutes from './routes/photos';
import storiesRoutes from './routes/stories';
import filtersRoutes from './routes/filters';
import aiRoutes from './routes/ai';
import arLensesRoutes, { createArLensesService } from './routes/ar-lenses';
import federationRoutes, { createFederationService } from './routes/federation';
import feedRoutes from './routes/feed';
import { createFeedEngines } from './lib/feed-engines';

export function getConfig(): AppConfig {
  const env = (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development';

  if (env === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    port: Number(process.env['PORT'] ?? 3012),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantneon',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env,
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  await app.register(postsRoutes, { prefix: '/posts' });
  await app.register(profilesRoutes, { prefix: '/profiles' });
  await app.register(reelsRoutes, { prefix: '/reels' });
  await app.register(exploreRoutes, { prefix: '/explore' });
  await app.register(notificationsRoutes, { prefix: '/notifications' });
  await app.register(messagesRoutes, { prefix: '/messages' });
  await app.register(photosRoutes, { prefix: '/photos' });
  await app.register(storiesRoutes, { prefix: '/stories' });
  await app.register(filtersRoutes, { prefix: '/filters' });
  await app.register(aiRoutes, { prefix: '/ai' });

  // ar-lenses engine — per-app lane (Stage 4), SHARED DECORATOR approach
  // (design.md Open Question 2). The engine construction and route logic are
  // app-agnostic and reusable (see ./routes/ar-lenses.ts); quantneon only
  // supplies the app-specific bits — the `/ar-lenses` route prefix here and the
  // backend URL/port in the Next proxy (`src/app/api/_lib/ar-lenses-proxy.ts`).
  // quantchat (Task 14.2) reuses the same module with its own prefix/URL. The
  // engine is in-memory (no prisma, no new schema — Req 9.5) and decorated once
  // at boot, never per-request. The global auth hook from createApp() stays
  // intact; the routes sit behind it.
  app.decorate('arLenses', createArLensesService());
  await app.register(arLensesRoutes, { prefix: '/ar-lenses' });

  // federation engine — per-app lane (Stage 4), SCOPED routes (Req 7.4).
  // `@quant/federation` is a SENSITIVE engine: the composite service
  // (FederationModeration + APIKeyManager) is decorated once at boot as a
  // singleton, and every route under `/federation` declares a fine-grained
  // `federation:read`/`federation:write` scope ON TOP of the global auth hook
  // installed by createApp(). The engine is in-memory (no prisma, no new
  // schema — Req 9.5) and wired exactly as shipped (no rewrite).
  app.decorate('federation', createFederationService());
  await app.register(federationRoutes, { prefix: '/federation' });

  // feed stack — per-app lane (Stage 4). Composes the FIVE real, as-shipped
  // feed engines (recommendations → ranking → ml-pipeline → ml-runtime →
  // triton-client) honouring their dependsOn ordering (see lib/feed-engines.ts).
  // Several wrap @simulated/external inference cores; per Req 9.1 they are wired
  // AS-IS and NOT de-simulated. Decorated once at boot as a singleton; routes
  // under `/feed` sit behind the global auth hook, with `feed:write` scopes on
  // mutating routes.
  app.decorate('feed', createFeedEngines());
  await app.register(feedRoutes, { prefix: '/feed' });

  return app;
}
