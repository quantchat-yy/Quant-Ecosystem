import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

async function healthPlugin(fastify: FastifyInstance, opts: { redisUrl?: string }) {
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/readyz', async (_request, reply) => {
    if (opts.redisUrl) {
      // If Redis is configured, check connectivity
      try {
        const { default: Redis } = await import('ioredis');
        const redis = new Redis(opts.redisUrl, {
          connectTimeout: 2000,
          lazyConnect: true,
        });
        await redis.ping();
        await redis.quit();
        return reply.status(200).send({ status: 'ok', redis: 'connected' });
      } catch {
        return reply.status(503).send({ status: 'unavailable', redis: 'disconnected' });
      }
    }
    return reply.status(200).send({ status: 'ok' });
  });
}

export default fp(healthPlugin, {
  name: 'health',
});
