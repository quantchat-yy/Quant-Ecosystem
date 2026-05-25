// ============================================================================
// Performance Package - Service Mesh
// Service registry, client-side load balancing, retry budgets, request hedging,
// traffic shaping, mTLS cert rotation, request tracing propagation
// ============================================================================

import type { ServiceEndpoint, LoadBalancerConfig } from '../types';

/** Service registration */
interface ServiceRegistration {
  name: string;
  endpoints: Map<string, ServiceEndpoint>;
  loadBalancer: LoadBalancerConfig;
  retryBudget: RetryBudget;
  rateLimiter: ServiceRateLimiter;
}

/** Retry budget tracking */
interface RetryBudget {
  maxRetryRatio: number;
  windowMs: number;
  totalRequests: number[];
  retryRequests: number[];
}

/** Per-service rate limiter using token bucket */
interface ServiceRateLimiter {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefillAt: number;
}

/** Request trace context for propagation */
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  sampled: boolean;
  baggage: Map<string, string>;
}

/** mTLS certificate metadata */
interface CertificateInfo {
  serviceId: string;
  fingerprint: string;
  issuedAt: number;
  expiresAt: number;
  rotationScheduledAt: number;
  rotated: boolean;
}

/** Hedged request result */
interface HedgedResult<T = unknown> {
  value: T;
  endpointId: string;
  latencyMs: number;
  hedgeIndex: number;
}

/** Connection count tracker for least-connections */
interface ConnectionTracker {
  endpointId: string;
  activeConnections: number;
  totalCompleted: number;
}

/**
 * ServiceMesh provides service discovery with health-aware endpoint selection,
 * client-side load balancing (round-robin, weighted, least-connections, P2C),
 * retry budget management, request hedging, traffic shaping, and mTLS scheduling.
 */
export class ServiceMesh {
  private readonly services: Map<string, ServiceRegistration>;
  private readonly certificates: Map<string, CertificateInfo>;
  private readonly connectionTrackers: Map<string, ConnectionTracker>;
  private readonly roundRobinCounters: Map<string, number>;
  private readonly traceContexts: Map<string, TraceContext>;
  private traceIdCounter: number;
  private spanIdCounter: number;

  constructor() {
    this.services = new Map();
    this.certificates = new Map();
    this.connectionTrackers = new Map();
    this.roundRobinCounters = new Map();
    this.traceContexts = new Map();
    this.traceIdCounter = 0;
    this.spanIdCounter = 0;
  }

  /**
   * Register a service in the mesh
   */
  registerService(
    name: string,
    loadBalancer: LoadBalancerConfig,
    rateLimitConfig?: { maxTokens: number; refillRate: number },
  ): void {
    this.services.set(name, {
      name,
      endpoints: new Map(),
      loadBalancer,
      retryBudget: {
        maxRetryRatio: 0.2, // Max 20% of requests can be retries
        windowMs: 10000,
        totalRequests: [],
        retryRequests: [],
      },
      rateLimiter: {
        tokens: rateLimitConfig?.maxTokens ?? 100,
        maxTokens: rateLimitConfig?.maxTokens ?? 100,
        refillRate: rateLimitConfig?.refillRate ?? 10,
        lastRefillAt: Date.now(),
      },
    });
  }

  /**
   * Add an endpoint to a service
   */
  addEndpoint(serviceName: string, endpoint: ServiceEndpoint): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.endpoints.set(endpoint.id, endpoint);
    this.connectionTrackers.set(endpoint.id, {
      endpointId: endpoint.id,
      activeConnections: 0,
      totalCompleted: 0,
    });
  }

  /**
   * Remove an endpoint from a service
   */
  removeEndpoint(serviceName: string, endpointId: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;
    this.connectionTrackers.delete(endpointId);
    return service.endpoints.delete(endpointId);
  }

  /**
   * Select an endpoint using the configured load balancing strategy.
   * Only healthy endpoints are considered.
   */
  selectEndpoint(serviceName: string): ServiceEndpoint | null {
    const service = this.services.get(serviceName);
    if (!service) return null;

    const healthyEndpoints = Array.from(service.endpoints.values()).filter(
      (ep) => ep.healthy && ep.isActive,
    );

    if (healthyEndpoints.length === 0) return null;

    switch (service.loadBalancer.algorithm) {
      case 'round_robin':
        return this.roundRobin(serviceName, healthyEndpoints);
      case 'weighted_random':
        return this.weightedRandom(healthyEndpoints);
      case 'least_connections':
        return this.leastConnections(healthyEndpoints);
      case 'power_of_two_choices':
        return this.powerOfTwoChoices(healthyEndpoints);
      default:
        return healthyEndpoints[0];
    }
  }

  /**
   * Round-robin load balancing
   */
  private roundRobin(serviceName: string, endpoints: ServiceEndpoint[]): ServiceEndpoint {
    const counter = this.roundRobinCounters.get(serviceName) ?? 0;
    const selected = endpoints[counter % endpoints.length];
    this.roundRobinCounters.set(serviceName, counter + 1);
    return selected;
  }

  /**
   * Weighted random selection - higher weight = higher probability
   */
  private weightedRandom(endpoints: ServiceEndpoint[]): ServiceEndpoint {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) return endpoint;
    }

    return endpoints[endpoints.length - 1];
  }

  /**
   * Least connections - select endpoint with fewest active connections
   */
  private leastConnections(endpoints: ServiceEndpoint[]): ServiceEndpoint {
    let minConnections = Infinity;
    let selected = endpoints[0];

    for (const endpoint of endpoints) {
      const tracker = this.connectionTrackers.get(endpoint.id);
      const connections = tracker?.activeConnections ?? 0;
      if (connections < minConnections) {
        minConnections = connections;
        selected = endpoint;
      }
    }

    return selected;
  }

  /**
   * Power of Two Choices (P2C) - pick two random endpoints, choose the one
   * with fewer connections. Provides near-optimal load distribution with
   * minimal coordination overhead.
   */
  private powerOfTwoChoices(endpoints: ServiceEndpoint[]): ServiceEndpoint {
    if (endpoints.length === 1) return endpoints[0];

    const idx1 = Math.floor(Math.random() * endpoints.length);
    let idx2 = Math.floor(Math.random() * (endpoints.length - 1));
    if (idx2 >= idx1) idx2++;

    const ep1 = endpoints[idx1];
    const ep2 = endpoints[idx2];

    const conn1 = this.connectionTrackers.get(ep1.id)?.activeConnections ?? 0;
    const conn2 = this.connectionTrackers.get(ep2.id)?.activeConnections ?? 0;

    return conn1 <= conn2 ? ep1 : ep2;
  }

  /**
   * Track connection start for an endpoint
   */
  startConnection(endpointId: string): void {
    const tracker = this.connectionTrackers.get(endpointId);
    if (tracker) {
      tracker.activeConnections++;
    }
  }

  /**
   * Track connection end for an endpoint
   */
  endConnection(endpointId: string): void {
    const tracker = this.connectionTrackers.get(endpointId);
    if (tracker) {
      tracker.activeConnections = Math.max(0, tracker.activeConnections - 1);
      tracker.totalCompleted++;
    }
  }

  /**
   * Check if a retry is allowed within the retry budget.
   * Max 20% of requests in the window can be retries.
   */
  canRetry(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    const now = Date.now();
    const windowMs = service.retryBudget.windowMs;

    // Clean old entries
    service.retryBudget.totalRequests = service.retryBudget.totalRequests.filter(
      (t) => now - t < windowMs,
    );
    service.retryBudget.retryRequests = service.retryBudget.retryRequests.filter(
      (t) => now - t < windowMs,
    );

    const totalCount = service.retryBudget.totalRequests.length;
    const retryCount = service.retryBudget.retryRequests.length;

    if (totalCount === 0) return true;

    const retryRatio = retryCount / totalCount;
    return retryRatio < service.retryBudget.maxRetryRatio;
  }

  /**
   * Record a request (total or retry) for budget tracking
   */
  recordRequest(serviceName: string, isRetry: boolean): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    const now = Date.now();
    service.retryBudget.totalRequests.push(now);
    if (isRetry) {
      service.retryBudget.retryRequests.push(now);
    }
  }

  /**
   * Send hedged requests to multiple backends for latency-sensitive paths.
   * Returns the first successful response.
   */
  hedge<T>(
    serviceName: string,
    requestFn: (endpoint: ServiceEndpoint) => { value: T; latencyMs: number },
    hedgeCount: number = 2,
  ): HedgedResult<T> | null {
    const service = this.services.get(serviceName);
    if (!service) return null;

    const healthyEndpoints = Array.from(service.endpoints.values()).filter(
      (ep) => ep.healthy && ep.isActive,
    );

    if (healthyEndpoints.length === 0) return null;

    const numToSend = Math.min(hedgeCount, healthyEndpoints.length);
    const results: HedgedResult<T>[] = [];

    // Select random subset of endpoints for hedging
    const shuffled = [...healthyEndpoints].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numToSend);

    for (let i = 0; i < selected.length; i++) {
      try {
        const result = requestFn(selected[i]);
        results.push({
          value: result.value,
          endpointId: selected[i].id,
          latencyMs: result.latencyMs,
          hedgeIndex: i,
        });
      } catch {
        // Ignore failed hedges
      }
    }

    if (results.length === 0) return null;

    // Return fastest response
    results.sort((a, b) => a.latencyMs - b.latencyMs);
    return results[0];
  }

  /**
   * Check if a request is allowed by the per-service rate limiter (token bucket).
   */
  allowRequest(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    this.refillTokens(service.rateLimiter);

    if (service.rateLimiter.tokens >= 1) {
      service.rateLimiter.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(limiter: ServiceRateLimiter): void {
    const now = Date.now();
    const elapsed = now - limiter.lastRefillAt;
    const tokensToAdd = (elapsed / 1000) * limiter.refillRate;

    limiter.tokens = Math.min(limiter.maxTokens, limiter.tokens + tokensToAdd);
    limiter.lastRefillAt = now;
  }

  /**
   * Schedule mTLS certificate rotation for a service
   */
  scheduleCertRotation(
    serviceId: string,
    currentFingerprint: string,
    validityDurationMs: number,
  ): CertificateInfo {
    const now = Date.now();
    const expiresAt = now + validityDurationMs;
    // Schedule rotation at 80% of validity period
    const rotationAt = now + validityDurationMs * 0.8;

    const cert: CertificateInfo = {
      serviceId,
      fingerprint: currentFingerprint,
      issuedAt: now,
      expiresAt,
      rotationScheduledAt: rotationAt,
      rotated: false,
    };

    this.certificates.set(serviceId, cert);
    return cert;
  }

  /**
   * Check which certificates need rotation
   */
  getCertificatesNeedingRotation(): CertificateInfo[] {
    const now = Date.now();
    return Array.from(this.certificates.values()).filter(
      (cert) => !cert.rotated && now >= cert.rotationScheduledAt,
    );
  }

  /**
   * Mark a certificate as rotated
   */
  markCertRotated(serviceId: string, newFingerprint: string): void {
    const cert = this.certificates.get(serviceId);
    if (cert) {
      cert.rotated = true;
    }
    // Issue new certificate
    this.scheduleCertRotation(
      serviceId,
      newFingerprint,
      cert?.expiresAt ? cert.expiresAt - cert.issuedAt : 86400000,
    );
  }

  /**
   * Create a new trace context for distributed tracing propagation
   */
  createTraceContext(sampled: boolean = true): TraceContext {
    const traceId = `trace_${++this.traceIdCounter}_${Date.now()}`;
    const spanId = `span_${++this.spanIdCounter}`;

    const ctx: TraceContext = {
      traceId,
      spanId,
      parentSpanId: null,
      sampled,
      baggage: new Map(),
    };

    this.traceContexts.set(traceId, ctx);
    return ctx;
  }

  /**
   * Create a child span from an existing trace context
   */
  createChildSpan(parentCtx: TraceContext): TraceContext {
    const childSpanId = `span_${++this.spanIdCounter}`;

    const ctx: TraceContext = {
      traceId: parentCtx.traceId,
      spanId: childSpanId,
      parentSpanId: parentCtx.spanId,
      sampled: parentCtx.sampled,
      baggage: new Map(parentCtx.baggage),
    };

    return ctx;
  }

  /**
   * Propagate trace context as headers (W3C trace context format)
   */
  propagateAsHeaders(ctx: TraceContext): Record<string, string> {
    const headers: Record<string, string> = {
      traceparent: `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? '01' : '00'}`,
    };

    if (ctx.baggage.size > 0) {
      const baggageEntries: string[] = [];
      for (const [key, value] of ctx.baggage) {
        baggageEntries.push(`${key}=${value}`);
      }
      headers['baggage'] = baggageEntries.join(',');
    }

    return headers;
  }

  /**
   * Get registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get endpoint count for a service
   */
  getEndpointCount(serviceName: string): number {
    return this.services.get(serviceName)?.endpoints.size ?? 0;
  }

  /**
   * Get health status summary for a service
   */
  getServiceHealth(serviceName: string): { total: number; healthy: number; unhealthy: number } {
    const service = this.services.get(serviceName);
    if (!service) return { total: 0, healthy: 0, unhealthy: 0 };

    let healthy = 0;
    let unhealthy = 0;
    for (const ep of service.endpoints.values()) {
      if (ep.healthy) healthy++;
      else unhealthy++;
    }

    return { total: service.endpoints.size, healthy, unhealthy };
  }
}
