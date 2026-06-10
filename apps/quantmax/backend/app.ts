import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import matchingRoutes from './routes/matching';
import profilesRoutes from './routes/profiles';
import swipesRoutes from './routes/swipes';
import randomChatRoutes from './routes/random-chat';

export function getConfig(): AppConfig {
  const env = (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development';

  if (env === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    port: Number(process.env['PORT'] ?? 3008),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantmax',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env,
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  await app.register(matchingRoutes, { prefix: '/matching' });
  await app.register(profilesRoutes, { prefix: '/profiles' });
  await app.register(swipesRoutes, { prefix: '/swipes' });
  await app.register(randomChatRoutes, { prefix: '/random-chat' });

  return app;
}
