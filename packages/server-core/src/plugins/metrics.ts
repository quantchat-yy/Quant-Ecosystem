import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface MetricsBucket {
  le: number;
  count: number;
}

interface RouteMetrics {
  count: Map<string, number>;
  duration: Map<string, MetricsBucket[]>;
  durationSum: Map<string, number>;
  durationCount: Map<string, number>;
}

const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function createBuckets(): MetricsBucket[] {
  return HISTOGRAM_BUCKETS.map((le) => ({ le, count: 0 }));
}

async function metricsPlugin(fastify: FastifyInstance) {
  const metrics: RouteMetrics = {
    count: new Map(),
    duration: new Map(),
    durationSum: new Map(),
    durationCount: new Map(),
  };

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as unknown as Record<string, number>).__startTime = performance.now();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as unknown as Record<string, number>).__startTime;
    if (startTime === undefined) return;

    const duration = (performance.now() - startTime) / 1000;
    const method = request.method;
    const route = request.routeOptions?.url ?? request.url;
    const statusCode = reply.statusCode.toString();

    // Increment counter
    const countKey = `${method}|${route}|${statusCode}`;
    metrics.count.set(countKey, (metrics.count.get(countKey) ?? 0) + 1);

    // Record histogram
    const durationKey = `${method}|${route}`;
    if (!metrics.duration.has(durationKey)) {
      metrics.duration.set(durationKey, createBuckets());
      metrics.durationSum.set(durationKey, 0);
      metrics.durationCount.set(durationKey, 0);
    }

    const buckets = metrics.duration.get(durationKey)!;
    for (const bucket of buckets) {
      if (duration <= bucket.le) {
        bucket.count++;
      }
    }
    metrics.durationSum.set(durationKey, (metrics.durationSum.get(durationKey) ?? 0) + duration);
    metrics.durationCount.set(durationKey, (metrics.durationCount.get(durationKey) ?? 0) + 1);
  });

  fastify.get('/metrics', async (_request, reply) => {
    const lines: string[] = [];

    // http_requests_total counter
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, value] of metrics.count) {
      const [method, route, status_code] = key.split('|');
      lines.push(
        `http_requests_total{method="${method}",route="${route}",status_code="${status_code}"} ${value}`,
      );
    }

    // http_request_duration_seconds histogram
    lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const [key, buckets] of metrics.duration) {
      const [method, route] = key.split('|');
      for (const bucket of buckets) {
        lines.push(
          `http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${bucket.le}"} ${bucket.count}`,
        );
      }
      lines.push(
        `http_request_duration_seconds_bucket{method="${method}",route="${route}",le="+Inf"} ${metrics.durationCount.get(key)}`,
      );
      lines.push(
        `http_request_duration_seconds_sum{method="${method}",route="${route}"} ${metrics.durationSum.get(key)}`,
      );
      lines.push(
        `http_request_duration_seconds_count{method="${method}",route="${route}"} ${metrics.durationCount.get(key)}`,
      );
    }

    lines.push('');
    return reply.type('text/plain; charset=utf-8').send(lines.join('\n'));
  });
}

export default fp(metricsPlugin, {
  name: 'metrics',
});
