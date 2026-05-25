import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { AppConfig } from './types';
import errorHandler from './plugins/error-handler';
import healthPlugin from './plugins/health';
import authPlugin from './plugins/auth';

export async function createApp(config: AppConfig) {
  const fastify = Fastify({
    logger:
      config.env === 'test'
        ? false
        : {
            level: config.logLevel,
            ...(config.env === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
          },
    genReqId: () => randomUUID(),
    disableRequestLogging: config.env === 'test',
  });

  // Set Zod as the schema validator/serializer
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register helmet for security headers
  const helmet = await import('@fastify/helmet');
  await fastify.register(helmet.default, { global: true });

  // Register CORS
  const cors = await import('@fastify/cors');
  await fastify.register(cors.default, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Register rate limiting with Redis or in-memory fallback
  const rateLimit = await import('@fastify/rate-limit');
  const rateLimitOpts: Record<string, unknown> = {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  };

  let redisClient: import('ioredis').Redis | undefined;

  if (config.redisUrl) {
    try {
      const { default: Redis } = await import('ioredis');
      redisClient = new Redis(config.redisUrl);
      rateLimitOpts['redis'] = redisClient;
    } catch {
      // Fall back to in-memory if Redis connection fails
    }
  }

  await fastify.register(rateLimit.default, rateLimitOpts);

  // Register cookie support
  const cookie = await import('@fastify/cookie');
  await fastify.register(cookie.default);

  // Register error handler
  await fastify.register(errorHandler);

  // Register auth plugin
  await fastify.register(authPlugin, {
    jwtSecret: config.jwtSecret,
    jwtIssuer: config.jwtIssuer,
    jwtAudience: config.jwtAudience,
  });

  // Register health endpoints
  await fastify.register(healthPlugin, {
    redisClient,
  });

  // Graceful shutdown
  const shutdown = async () => {
    await fastify.close();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return fastify;
}
