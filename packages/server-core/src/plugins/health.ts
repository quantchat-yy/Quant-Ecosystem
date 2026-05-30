import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

interface HealthPluginOptions {
  redisClient?: Redis;
}

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unavailable';
  uptime: number;
  timestamp: string;
  version: string;
}

interface ReadinessCheckResponse {
  status: 'ok' | 'unavailable';
  checks: {
    database: 'ok' | 'fail' | 'n/a';
    redis: 'ok' | 'fail' | 'n/a';
  };
}

interface PrismaLike {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
}

const startTime = Date.now();

async function healthPlugin(fastify: FastifyInstance, opts: HealthPluginOptions) {
  fastify.get('/healthz', async (_request, reply) => {
    const response: HealthCheckResponse = {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env['APP_VERSION'] || '1.0.0',
    };
    return reply.status(200).send(response);
  });

  fastify.get('/livez', async (_request, reply) => {
    const response: HealthCheckResponse = {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env['APP_VERSION'] || '1.0.0',
    };
    return reply.status(200).send(response);
  });

  fastify.get('/readyz', async (_request, reply) => {
    const checks: ReadinessCheckResponse['checks'] = {
      database: 'n/a',
      redis: 'n/a',
    };

    const prisma = (fastify as unknown as { prisma?: PrismaLike }).prisma;
    if (prisma) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        checks.database = 'ok';
      } catch {
        checks.database = 'fail';
      }
    }

    if (opts.redisClient) {
      try {
        const pong = await opts.redisClient.ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'fail';
      } catch {
        checks.redis = 'fail';
      }
    }

    const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'n/a');
    const response: ReadinessCheckResponse = {
      status: allOk ? 'ok' : 'unavailable',
      checks,
    };

    return reply.status(allOk ? 200 : 503).send(response);
  });
}

export default fp(healthPlugin, {
  name: 'health',
});
