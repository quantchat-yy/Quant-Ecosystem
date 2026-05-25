import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import wellknownRoutes from './routes/wellknown';

export function getConfig(): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3001),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantmail',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env: (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development',
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  // Register route plugins
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(oauthRoutes);
  await app.register(wellknownRoutes);

  return app;
}

// Start server if run directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const config = getConfig();
  buildApp(config).then((app) => {
    app.listen({ port: config.port, host: config.host }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  });
}
