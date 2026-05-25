import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

interface HealthPluginOptions {
  redisClient?: Redis;
}

async function healthPlugin(fastify: FastifyInstance, opts: HealthPluginOptions) {
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/readyz', async (_request, reply) => {
    if (opts.redisClient) {
      const status = opts.redisClient.status;
      if (status === 'ready') {
        return reply.status(200).send({ status: 'ok', redis: 'connected' });
      }
      return reply.status(503).send({ status: 'unavailable', redis: 'disconnected' });
    }
    return reply.status(200).send({ status: 'ok' });
  });
}

export default fp(healthPlugin, {
  name: 'health',
});
