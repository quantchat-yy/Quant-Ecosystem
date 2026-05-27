import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

async function requestIdPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? request.id ?? randomUUID();
    const traceId = (request.headers['x-trace-id'] as string | undefined) ?? randomUUID();

    // Set response headers
    void reply.header('x-request-id', requestId);
    void reply.header('x-trace-id', traceId);

    // Add to Pino log context
    request.log = request.log.child({ request_id: requestId, trace_id: traceId });
  });
}

export default fp(requestIdPlugin, {
  name: 'request-id',
});
