// ============================================================================
// ML Pipeline - Model Serving
// ============================================================================

import {
  ModelServingConfig,
  ServingRoute,
  PredictionRequest,
  PredictionResponse,
  ModelVersionMetrics,
  ServingLatencyStats,
} from '../types';

interface ModelInstance {
  name: string;
  version: string;
  weights: number[];
  bias: number;
  status: 'loading' | 'ready' | 'draining' | 'offline';
  loadedAt: number;
  requestCount: number;
  latencies: number[];
}

interface CacheEntry {
  response: PredictionResponse;
  createdAt: number;
  ttl: number;
  hitCount: number;
}

export class ModelServing {
  private config: ModelServingConfig;
  private models: Map<string, ModelInstance> = new Map();
  private routes: Map<string, ServingRoute> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private latencyHistogram: Map<string, number[]> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private totalRequests: number = 0;
  private totalLatency: number = 0;

  constructor(config: Partial<ModelServingConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 32,
      batchTimeoutMs: config.batchTimeoutMs ?? 50,
      cacheTTLMs: config.cacheTTLMs ?? 60000,
      maxCacheSize: config.maxCacheSize ?? 10000,
      defaultRouting: config.defaultRouting ?? 'weighted',
      latencyBudgetMs: config.latencyBudgetMs ?? 100,
      maxModelsLoaded: config.maxModelsLoaded ?? 10,
      canaryTrafficPercent: config.canaryTrafficPercent ?? 5,
      shadowModeEnabled: config.shadowModeEnabled ?? false,
    };
  }

  registerModel(name: string, version: string, weights: number[], bias: number): void {
    const key = `${name}:${version}`;
    this.models.set(key, {
      name,
      version,
      weights: [...weights],
      bias,
      status: 'ready',
      loadedAt: Date.now(),
      requestCount: 0,
      latencies: [],
    });
    this.latencyHistogram.set(key, []);
    this.requestCounts.set(key, 0);
    this.errorCounts.set(key, 0);
  }

  configureRoute(routeName: string, route: ServingRoute): void {
    this.routes.set(routeName, route);
  }

  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();
    this.totalRequests += 1;

    // Check cache
    const cacheKey = this.computeCacheKey(request);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    // Route to model version
    const route = this.routes.get(request.routeName ?? 'default');
    const modelKey = this.selectModelVersion(route);

    if (!modelKey) {
      return {
        requestId: request.requestId,
        prediction: 0,
        probability: [],
        modelName: 'unknown',
        modelVersion: 'unknown',
        latencyMs: Date.now() - startTime,
        cached: false,
        timestamp: Date.now(),
      };
    }

    const model = this.models.get(modelKey)!;

    // Execute prediction
    const prediction = this.executePrediction(model, request.features);
    const latency = Date.now() - startTime;

    // Record metrics
    this.recordLatency(modelKey, latency);
    model.requestCount += 1;

    // Shadow mode: also predict with shadow model but don't use result
    if (this.config.shadowModeEnabled && route?.shadow) {
      const shadowKey = `${route.shadow.name}:${route.shadow.version}`;
      const shadowModel = this.models.get(shadowKey);
      if (shadowModel) {
        this.executePrediction(shadowModel, request.features);
        shadowModel.requestCount += 1;
      }
    }

    const response: PredictionResponse = {
      requestId: request.requestId,
      prediction: prediction.value,
      probability: prediction.probabilities,
      modelName: model.name,
      modelVersion: model.version,
      latencyMs: latency,
      cached: false,
      timestamp: Date.now(),
    };

    // Cache response
    this.cacheResponse(cacheKey, response);

    this.totalLatency += latency;

    return response;
  }

  predictBatch(requests: PredictionRequest[]): PredictionResponse[] {
    const responses: PredictionResponse[] = [];

    for (const request of requests) {
      const startTime = Date.now();

      const route = this.routes.get(request.routeName ?? 'default');
      const modelKey = this.selectModelVersion(route);

      if (!modelKey) {
        responses.push({
          requestId: request.requestId,
          prediction: 0,
          probability: [],
          modelName: 'unknown',
          modelVersion: 'unknown',
          latencyMs: 0,
          cached: false,
          timestamp: Date.now(),
        });
        continue;
      }

      const model = this.models.get(modelKey)!;
      const prediction = this.executePrediction(model, request.features);
      const latency = Date.now() - startTime;

      this.recordLatency(modelKey, latency);
      model.requestCount += 1;

      responses.push({
        requestId: request.requestId,
        prediction: prediction.value,
        probability: prediction.probabilities,
        modelName: model.name,
        modelVersion: model.version,
        latencyMs: latency,
        cached: false,
        timestamp: Date.now(),
      });
    }

    return responses;
  }

  private selectModelVersion(route: ServingRoute | undefined): string | null {
    if (!route) {
      // Use first available model
      const iter = this.models.entries().next();
      if (iter.done || !iter.value) return null;
      const firstModel = iter.value;
      return `${firstModel[1].name}:${firstModel[1].version}`;
    }

    switch (route.strategy) {
      case 'canary':
        return this.selectCanary(route);
      case 'ab_test':
        return this.selectABTest(route);
      case 'weighted':
        return this.selectWeighted(route);
      case 'shadow':
        return `${route.primary.name}:${route.primary.version}`;
      default:
        return route.primary ? `${route.primary.name}:${route.primary.version}` : null;
    }
  }

  private selectCanary(route: ServingRoute): string {
    // Route canaryTrafficPercent to canary version, rest to primary
    const random = Math.random() * 100;
    if (random < this.config.canaryTrafficPercent && route.canary) {
      return `${route.canary.name}:${route.canary.version}`;
    }
    return `${route.primary.name}:${route.primary.version}`;
  }

  private selectABTest(route: ServingRoute): string {
    // Equal split between primary and canary
    if (Math.random() < 0.5 && route.canary) {
      return `${route.canary.name}:${route.canary.version}`;
    }
    return `${route.primary.name}:${route.primary.version}`;
  }

  private selectWeighted(route: ServingRoute): string {
    // Use configured traffic weights
    const primaryWeight = route.primaryWeight ?? 0.9;
    if (Math.random() < primaryWeight) {
      return `${route.primary.name}:${route.primary.version}`;
    }
    if (route.canary) {
      return `${route.canary.name}:${route.canary.version}`;
    }
    return `${route.primary.name}:${route.primary.version}`;
  }

  private executePrediction(
    model: ModelInstance,
    features: number[],
  ): { value: number; probabilities: number[] } {
    // Linear model prediction with sigmoid for classification
    let sum = model.bias;
    const len = Math.min(features.length, model.weights.length);
    for (let i = 0; i < len; i++) {
      sum += (model.weights[i] ?? 0) * (features[i] ?? 0);
    }

    // Sigmoid for probability
    const probability = 1 / (1 + Math.exp(-sum));

    return {
      value: sum,
      probabilities: [1 - probability, probability],
    };
  }

  private computeCacheKey(request: PredictionRequest): string {
    // Create deterministic cache key from features
    const featuresKey = request.features.map((f) => f.toFixed(6)).join(',');
    return `${request.routeName ?? 'default'}:${featuresKey}`;
  }

  private getCachedResponse(key: string): PredictionResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount += 1;
    return { ...entry.response, cached: true };
  }

  private cacheResponse(key: string, response: PredictionResponse): void {
    if (this.cache.size >= this.config.maxCacheSize) {
      // Evict oldest entries (LRU approximation)
      this.evictCache();
    }

    this.cache.set(key, {
      response,
      createdAt: Date.now(),
      ttl: this.config.cacheTTLMs,
      hitCount: 0,
    });
  }

  private evictCache(): void {
    // Remove entries with lowest hit count (LFU-like)
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }

  private recordLatency(modelKey: string, latencyMs: number): void {
    const latencies = this.latencyHistogram.get(modelKey) ?? [];
    latencies.push(latencyMs);

    // Keep last 1000 measurements
    if (latencies.length > 1000) {
      latencies.shift();
    }
    this.latencyHistogram.set(modelKey, latencies);
  }

  getLatencyStats(modelKey: string): ServingLatencyStats | null {
    const latencies = this.latencyHistogram.get(modelKey);
    if (!latencies || latencies.length === 0) return null;

    const sorted = [...latencies].sort((a, b) => a - b);
    const n = sorted.length;

    return {
      p50: sorted[Math.floor(n * 0.5)] ?? 0,
      p95: sorted[Math.floor(n * 0.95)] ?? 0,
      p99: sorted[Math.floor(n * 0.99)] ?? 0,
      mean: latencies.reduce((a, b) => a + b, 0) / n,
      count: n,
      max: sorted[n - 1] ?? 0,
      min: sorted[0] ?? 0,
    };
  }

  getModelMetrics(name: string, version: string): ModelVersionMetrics | null {
    const key = `${name}:${version}`;
    const model = this.models.get(key);
    if (!model) return null;

    const latencyStats = this.getLatencyStats(key);
    const errors = this.errorCounts.get(key) ?? 0;

    return {
      modelName: name,
      modelVersion: version,
      requestCount: model.requestCount,
      errorCount: errors,
      errorRate: model.requestCount > 0 ? errors / model.requestCount : 0,
      latencyStats: latencyStats ?? { p50: 0, p95: 0, p99: 0, mean: 0, count: 0, max: 0, min: 0 },
      status: model.status,
      loadedAt: model.loadedAt,
      uptime: Date.now() - model.loadedAt,
    };
  }

  // Zero-downtime model swap
  swapModel(name: string, oldVersion: string, newVersion: string): boolean {
    const oldKey = `${name}:${oldVersion}`;
    const newKey = `${name}:${newVersion}`;

    const oldModel = this.models.get(oldKey);
    const newModel = this.models.get(newKey);

    if (!oldModel || !newModel) return false;
    if (newModel.status !== 'ready') return false;

    // Put old model in draining state
    oldModel.status = 'draining';

    // Update all routes pointing to old version
    for (const [_routeName, route] of this.routes) {
      if (route.primary.name === name && route.primary.version === oldVersion) {
        route.primary.version = newVersion;
      }
      if (route.canary && route.canary.name === name && route.canary.version === oldVersion) {
        route.canary.version = newVersion;
      }
    }

    // Mark old model as offline after a brief delay (simulated)
    oldModel.status = 'offline';

    return true;
  }

  drainModel(name: string, version: string): void {
    const key = `${name}:${version}`;
    const model = this.models.get(key);
    if (model) {
      model.status = 'draining';
    }
  }

  unloadModel(name: string, version: string): boolean {
    const key = `${name}:${version}`;
    return this.models.delete(key);
  }

  getCacheStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0;
    for (const [, entry] of this.cache) {
      totalHits += entry.hitCount;
    }
    const hitRate = this.totalRequests > 0 ? totalHits / this.totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate,
      totalHits,
    };
  }

  getLoadedModels(): string[] {
    return Array.from(this.models.keys()).filter((key) => {
      const model = this.models.get(key);
      return model?.status === 'ready';
    });
  }

  getTotalRequests(): number {
    return this.totalRequests;
  }

  getAverageLatency(): number {
    return this.totalRequests > 0 ? this.totalLatency / this.totalRequests : 0;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
