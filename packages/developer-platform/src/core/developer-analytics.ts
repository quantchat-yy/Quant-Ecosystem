// ============================================================================
// Quant Developer Platform - Developer Analytics
// ============================================================================

import { z } from 'zod';
import type {
  AnalyticsEvent,
  UsageOverview,
  ErrorRateData,
  LatencyData,
  TrendData,
  CostProjection,
  AnalyticsDashboard,
} from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

const trackEventSchema = z.object({
  appId: z.string().min(1),
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  statusCode: z.number().int().min(100).max(599),
  latencyMs: z.number().min(0),
  requestBytes: z.number().min(0).optional(),
  responseBytes: z.number().min(0).optional(),
  userId: z.string().optional(),
  region: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// DeveloperAnalytics Class
// ============================================================================

export class DeveloperAnalytics {
  private events: Map<string, AnalyticsEvent[]> = new Map();
  private costPerRequest: number;
  private costPerGB: number;

  constructor(config?: { costPerRequest?: number; costPerGB?: number }) {
    this.costPerRequest = config?.costPerRequest ?? 0.0001;
    this.costPerGB = config?.costPerGB ?? 0.1;
  }

  /**
   * Track an API call event
   */
  public trackAPICall(params: {
    appId: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    statusCode: number;
    latencyMs: number;
    requestBytes?: number;
    responseBytes?: number;
    userId?: string;
    region?: string;
    metadata?: Record<string, unknown>;
  }): { success: boolean; eventId: string; message: string } {
    const parsed = trackEventSchema.safeParse(params);
    if (!parsed.success) {
      return {
        success: false,
        eventId: '',
        message: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    const eventId = generateId();
    const event: AnalyticsEvent = {
      id: eventId,
      appId: params.appId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      latencyMs: params.latencyMs,
      requestBytes: params.requestBytes ?? 0,
      responseBytes: params.responseBytes ?? 0,
      userId: params.userId ?? null,
      region: params.region ?? 'us-east-1',
      timestamp: Date.now(),
      metadata: params.metadata ?? {},
    };

    const appEvents = this.events.get(params.appId) ?? [];
    appEvents.push(event);
    this.events.set(params.appId, appEvents);

    return {
      success: true,
      eventId,
      message: `Tracked ${params.method} ${params.endpoint} (${params.statusCode})`,
    };
  }

  /**
   * Get overall usage statistics for an app
   */
  public getUsageOverview(
    appId: string,
    timeRange?: {
      startTime?: number;
      endTime?: number;
    },
  ): UsageOverview | null {
    const appEvents = this.getFilteredEvents(appId, timeRange);
    if (appEvents.length === 0) return null;

    const totalRequests = appEvents.length;
    const successfulRequests = appEvents.filter(
      (e) => e.statusCode >= 200 && e.statusCode < 300,
    ).length;
    const failedRequests = appEvents.filter((e) => e.statusCode >= 400).length;
    const totalLatency = appEvents.reduce((sum, e) => sum + e.latencyMs, 0);
    const totalRequestBytes = appEvents.reduce((sum, e) => sum + e.requestBytes, 0);
    const totalResponseBytes = appEvents.reduce((sum, e) => sum + e.responseBytes, 0);

    const uniqueEndpoints = new Set(appEvents.map((e) => `${e.method} ${e.endpoint}`));
    const uniqueUsers = new Set(appEvents.filter((e) => e.userId).map((e) => e.userId));

    return {
      appId,
      totalRequests,
      successfulRequests,
      failedRequests,
      avgLatencyMs: Math.round(totalLatency / totalRequests),
      totalRequestBytes,
      totalResponseBytes,
      uniqueEndpoints: uniqueEndpoints.size,
      uniqueUsers: uniqueUsers.size,
      successRate: Math.round((successfulRequests / totalRequests) * 10000) / 100,
      period: {
        start: timeRange?.startTime ?? appEvents[0]?.timestamp ?? 0,
        end: timeRange?.endTime ?? Date.now(),
      },
    };
  }

  /**
   * Get error rates and breakdown for an app
   */
  public getErrorRates(
    appId: string,
    timeRange?: {
      startTime?: number;
      endTime?: number;
    },
  ): ErrorRateData | null {
    const appEvents = this.getFilteredEvents(appId, timeRange);
    if (appEvents.length === 0) return null;

    const totalRequests = appEvents.length;
    const errors = appEvents.filter((e) => e.statusCode >= 400);
    const clientErrors = errors.filter((e) => e.statusCode >= 400 && e.statusCode < 500);
    const serverErrors = errors.filter((e) => e.statusCode >= 500);

    const byStatusCode: Record<number, number> = {};
    for (const error of errors) {
      byStatusCode[error.statusCode] = (byStatusCode[error.statusCode] ?? 0) + 1;
    }

    const byEndpoint: Record<string, number> = {};
    for (const error of errors) {
      const key = `${error.method} ${error.endpoint}`;
      byEndpoint[key] = (byEndpoint[key] ?? 0) + 1;
    }

    const topErrorEndpoints = Object.entries(byEndpoint)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count, rate: count / totalRequests }));

    return {
      appId,
      totalErrors: errors.length,
      errorRate: Math.round((errors.length / totalRequests) * 10000) / 100,
      clientErrors: clientErrors.length,
      serverErrors: serverErrors.length,
      byStatusCode,
      topErrorEndpoints,
      period: {
        start: timeRange?.startTime ?? appEvents[0]?.timestamp ?? 0,
        end: timeRange?.endTime ?? Date.now(),
      },
    };
  }

  /**
   * Get latency percentiles for an app
   */
  public getLatencyPercentiles(
    appId: string,
    options?: {
      endpoint?: string;
      timeRange?: { startTime?: number; endTime?: number };
    },
  ): LatencyData | null {
    let appEvents = this.getFilteredEvents(appId, options?.timeRange);
    if (options?.endpoint) {
      appEvents = appEvents.filter((e) => e.endpoint === options.endpoint);
    }
    if (appEvents.length === 0) return null;

    const latencies = appEvents.map((e) => e.latencyMs).sort((a, b) => a - b);
    const count = latencies.length;

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * count) - 1;
      return latencies[Math.max(0, index)] ?? 0;
    };

    return {
      appId,
      endpoint: options?.endpoint ?? '*',
      sampleCount: count,
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      min: latencies[0] ?? 0,
      max: latencies[count - 1] ?? 0,
      mean: Math.round(latencies.reduce((s, v) => s + v, 0) / count),
    };
  }

  /**
   * Get usage trends over time
   */
  public getTrends(
    appId: string,
    options?: {
      granularity?: 'minute' | 'hour' | 'day';
      timeRange?: { startTime?: number; endTime?: number };
    },
  ): TrendData | null {
    const appEvents = this.getFilteredEvents(appId, options?.timeRange);
    if (appEvents.length === 0) return null;

    const granularity = options?.granularity ?? 'hour';
    const bucketSize =
      granularity === 'minute' ? 60000 : granularity === 'hour' ? 3600000 : 86400000;

    const buckets: Record<number, { requests: number; errors: number; latencySum: number }> = {};

    for (const event of appEvents) {
      const bucketKey = Math.floor(event.timestamp / bucketSize) * bucketSize;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { requests: 0, errors: 0, latencySum: 0 };
      }
      const bucket = buckets[bucketKey];
      if (bucket) {
        bucket.requests += 1;
        if (event.statusCode >= 400) bucket.errors += 1;
        bucket.latencySum += event.latencyMs;
      }
    }

    const dataPoints = Object.entries(buckets)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([timestamp, data]) => ({
        timestamp: Number(timestamp),
        requests: data.requests,
        errors: data.errors,
        avgLatencyMs: Math.round(data.latencySum / data.requests),
      }));

    return {
      appId,
      granularity,
      dataPoints,
      totalDataPoints: dataPoints.length,
    };
  }

  /**
   * Get cost projection based on current usage
   */
  public getCostProjection(appId: string, projectionDays?: number): CostProjection | null {
    const appEvents = this.events.get(appId);
    if (!appEvents || appEvents.length === 0) return null;

    const days = projectionDays ?? 30;
    const now = Date.now();
    const dayMs = 86400000;

    // Calculate daily averages from existing data
    const oldestEvent = appEvents[0];
    const dataSpanDays = Math.max(1, Math.ceil((now - (oldestEvent?.timestamp ?? now)) / dayMs));

    const totalRequests = appEvents.length;
    const totalBytes = appEvents.reduce((sum, e) => sum + e.requestBytes + e.responseBytes, 0);

    const dailyRequests = totalRequests / dataSpanDays;
    const dailyBytes = totalBytes / dataSpanDays;
    const dailyGB = dailyBytes / (1024 * 1024 * 1024);

    const projectedRequests = Math.round(dailyRequests * days);
    const projectedGB = dailyGB * days;

    const requestCost = projectedRequests * this.costPerRequest;
    const bandwidthCost = projectedGB * this.costPerGB;
    const totalCost = requestCost + bandwidthCost;

    return {
      appId,
      projectionDays: days,
      currentDailyRequests: Math.round(dailyRequests),
      projectedRequests,
      projectedBandwidthGB: Math.round(projectedGB * 1000) / 1000,
      estimatedCost: {
        requests: Math.round(requestCost * 100) / 100,
        bandwidth: Math.round(bandwidthCost * 100) / 100,
        total: Math.round(totalCost * 100) / 100,
        currency: 'USD',
      },
      confidence: dataSpanDays >= 7 ? 'high' : dataSpanDays >= 3 ? 'medium' : 'low',
    };
  }

  /**
   * Generate a dashboard summary with key metrics
   */
  public generateDashboard(appId: string): AnalyticsDashboard | null {
    const overview = this.getUsageOverview(appId);
    if (!overview) return null;

    const errorRates = this.getErrorRates(appId);
    const latency = this.getLatencyPercentiles(appId);
    const trends = this.getTrends(appId, { granularity: 'hour' });
    const costProjection = this.getCostProjection(appId);

    return {
      appId,
      generatedAt: Date.now(),
      overview,
      errorRates,
      latency,
      trends,
      costProjection,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getFilteredEvents(
    appId: string,
    timeRange?: {
      startTime?: number;
      endTime?: number;
    },
  ): AnalyticsEvent[] {
    let appEvents = this.events.get(appId) ?? [];

    if (timeRange?.startTime) {
      appEvents = appEvents.filter((e) => e.timestamp >= (timeRange.startTime ?? 0));
    }
    if (timeRange?.endTime) {
      appEvents = appEvents.filter((e) => e.timestamp <= (timeRange.endTime ?? Infinity));
    }

    return appEvents;
  }
}
