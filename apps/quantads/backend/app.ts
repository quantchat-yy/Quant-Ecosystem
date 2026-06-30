import { createApp } from '@quant/server-core';
import type { AppConfig } from '@quant/server-core';
import campaignsRoutes from './routes/campaigns';
import adSetsRoutes from './routes/ad-sets';
import creativesRoutes from './routes/creatives';
import aiRoutes from './routes/ai';
import biddingRoutes from './routes/bidding';
import analyticsRoutes from './routes/analytics';
import servingRoutes from './routes/serving';
import economyRoutes from './routes/economy';
import storeRoutes from './routes/store';
import boostRoutes from './routes/boost';
import giftingRoutes from './routes/gifting';
import creatorEconomyRoutes from './routes/creator-economy';
import subscriptionsRoutes from './routes/subscriptions';
import privacyAdsRoutes from './routes/privacy-ads';

export function getConfig(): AppConfig {
  const env = (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development';

  if (env === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    port: Number(process.env['PORT'] ?? 3010),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    rateLimitMax: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    rateLimitWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    jwtIssuer: process.env['JWT_ISSUER'] ?? 'quantads',
    jwtAudience: process.env['JWT_AUDIENCE'] ?? 'quant-ecosystem',
    env,
  };
}

export async function buildApp(config?: AppConfig) {
  const appConfig = config ?? getConfig();
  const app = await createApp(appConfig);

  await app.register(campaignsRoutes, { prefix: '/campaigns' });
  // Ad set routes declare absolute paths (/campaigns/:campaignId/ad-sets, /ad-sets/:id),
  // so they mount with an empty prefix to avoid colliding with the campaigns plugin.
  await app.register(adSetsRoutes, { prefix: '' });
  await app.register(creativesRoutes, { prefix: '/creatives' });
  await app.register(aiRoutes, { prefix: '/ai' });
  await app.register(biddingRoutes, { prefix: '/bidding' });
  await app.register(analyticsRoutes, { prefix: '/analytics' });
  await app.register(servingRoutes, { prefix: '/serving' });
  await app.register(economyRoutes, { prefix: '/economy' });
  await app.register(storeRoutes, { prefix: '/store' });
  await app.register(boostRoutes, { prefix: '/boost' });
  await app.register(giftingRoutes, { prefix: '/gifting' });
  await app.register(creatorEconomyRoutes, { prefix: '/creator-economy' });
  await app.register(subscriptionsRoutes, { prefix: '/subscriptions' });
  await app.register(privacyAdsRoutes, { prefix: '/privacy-ads' });

  return app;
}
