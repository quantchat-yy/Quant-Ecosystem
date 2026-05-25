// ============================================================================
// Performance Package - CDN Optimizer
// Cache key normalization, cache warming, purge propagation, origin shield,
// adaptive TTL, bandwidth optimization, hit rate tracking
// ============================================================================

import type { CDNConfig, CachePolicy, PurgeEvent } from '../types';

/** Normalized cache key */
interface NormalizedCacheKey {
  original: string;
  normalized: string;
  deviceCategory: string;
  queryParams: Record<string, string>;
}

/** Cache warming entry */
interface WarmingEntry {
  url: string;
  priority: number;
  trendingScore: number;
  lastWarmedAt: number;
  warmCount: number;
}

/** Origin shield request */
interface ShieldRequest {
  key: string;
  pending: boolean;
  subscriberCount: number;
  result: unknown | null;
  startedAt: number;
}

/** Content change tracking for adaptive TTL */
interface ContentChangeTracker {
  url: string;
  changeTimestamps: number[];
  currentTtlMs: number;
  averageChangeIntervalMs: number;
}

/** Hit rate statistics */
interface HitRateStats {
  hits: number;
  misses: number;
  staleHits: number;
  totalRequests: number;
  hitRate: number;
  bytesSaved: number;
}

/** Compression recommendation */
interface CompressionRecommendation {
  contentType: string;
  algorithm: 'brotli' | 'gzip' | 'none';
  estimatedSavings: number;
  reason: string;
}

/** Purge propagation status */
interface PurgeStatus {
  id: string;
  key: string;
  status: 'initiated' | 'propagating' | 'complete';
  nodesNotified: number;
  nodesConfirmed: number;
  totalNodes: number;
  initiatedAt: number;
  completedAt: number | null;
}

/**
 * CDNOptimizer provides intelligent CDN cache management including cache key
 * normalization, predictive cache warming, purge propagation tracking, origin
 * shield for request collapsing, adaptive TTL, and bandwidth optimization.
 */
export class CDNOptimizer {
  private readonly config: CDNConfig;
  private readonly cacheKeys: Map<string, NormalizedCacheKey>;
  private readonly warmingQueue: Map<string, WarmingEntry>;
  private readonly shieldRequests: Map<string, ShieldRequest>;
  private readonly changeTrackers: Map<string, ContentChangeTracker>;
  private readonly purgeStatuses: Map<string, PurgeStatus>;
  private readonly hitStats: HitRateStats;
  private readonly policies: Map<string, CachePolicy>;
  private purgeCounter: number;

  constructor(config: CDNConfig) {
    this.config = config;
    this.cacheKeys = new Map();
    this.warmingQueue = new Map();
    this.shieldRequests = new Map();
    this.changeTrackers = new Map();
    this.purgeStatuses = new Map();
    this.policies = new Map();
    this.purgeCounter = 0;
    this.hitStats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      totalRequests: 0,
      hitRate: 0,
      bytesSaved: 0,
    };
  }

  /**
   * Normalize a cache key by sorting query parameters and grouping by device category.
   * This ensures equivalent requests map to the same cache entry.
   */
  normalizeCacheKey(url: string, userAgent: string): NormalizedCacheKey {
    // Parse URL and sort query params
    const [path, queryString] = url.split('?');
    const params: Record<string, string> = {};

    if (queryString) {
      const pairs = queryString.split('&').sort();
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
          params[key] = value ?? '';
        }
      }
    }

    // Determine device category from user-agent
    const deviceCategory = this.categorizeDevice(userAgent);

    // Build normalized key with sorted params
    const sortedQuery = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const normalized = sortedQuery
      ? `${path}?${sortedQuery}:${deviceCategory}`
      : `${path}:${deviceCategory}`;

    const entry: NormalizedCacheKey = {
      original: url,
      normalized,
      deviceCategory,
      queryParams: params,
    };

    this.cacheKeys.set(normalized, entry);
    return entry;
  }

  /**
   * Categorize device from user-agent string into groups for cache variants
   */
  private categorizeDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Add content to the cache warming queue based on trending signals.
   * Higher trending score = warmed sooner.
   */
  addToWarmingQueue(url: string, trendingScore: number): void {
    const existing = this.warmingQueue.get(url);
    if (existing) {
      existing.trendingScore = Math.max(existing.trendingScore, trendingScore);
      existing.priority = this.calculateWarmingPriority(existing);
    } else {
      const entry: WarmingEntry = {
        url,
        priority: trendingScore,
        trendingScore,
        lastWarmedAt: 0,
        warmCount: 0,
      };
      entry.priority = this.calculateWarmingPriority(entry);
      this.warmingQueue.set(url, entry);
    }
  }

  /**
   * Calculate warming priority: trending * recency decay
   */
  private calculateWarmingPriority(entry: WarmingEntry): number {
    const timeSinceWarm =
      entry.lastWarmedAt > 0
        ? (Date.now() - entry.lastWarmedAt) / 60000 // minutes
        : 10; // default boost for never-warmed

    return entry.trendingScore * Math.min(timeSinceWarm / 5, 2);
  }

  /**
   * Get the next batch of URLs to warm, ordered by priority
   */
  getWarmingBatch(batchSize: number): string[] {
    const entries = Array.from(this.warmingQueue.values());
    entries.sort((a, b) => b.priority - a.priority);

    const batch = entries.slice(0, batchSize);
    const now = Date.now();

    for (const entry of batch) {
      entry.lastWarmedAt = now;
      entry.warmCount++;
      entry.priority = this.calculateWarmingPriority(entry);
    }

    return batch.map((e) => e.url);
  }

  /**
   * Initiate a purge with consistency tracking across CDN nodes.
   * Status progresses: initiated -> propagating -> complete
   */
  initiatePurge(key: string, totalNodes: number): PurgeEvent {
    const id = `purge_${++this.purgeCounter}`;
    const now = Date.now();

    const status: PurgeStatus = {
      id,
      key,
      status: 'initiated',
      nodesNotified: 0,
      nodesConfirmed: 0,
      totalNodes,
      initiatedAt: now,
      completedAt: null,
    };

    this.purgeStatuses.set(id, status);

    const event: PurgeEvent = {
      id,
      key,
      initiatedAt: now,
      status: 'initiated',
      totalNodes,
      confirmedNodes: 0,
    };

    return event;
  }

  /**
   * Confirm purge propagation from a node
   */
  confirmPurge(purgeId: string, nodesConfirmed: number): PurgeStatus | null {
    const status = this.purgeStatuses.get(purgeId);
    if (!status) return null;

    status.nodesConfirmed += nodesConfirmed;
    status.nodesNotified = Math.max(status.nodesNotified, status.nodesConfirmed);

    if (status.nodesConfirmed >= status.totalNodes) {
      status.status = 'complete';
      status.completedAt = Date.now();
    } else if (status.nodesConfirmed > 0) {
      status.status = 'propagating';
    }

    return status;
  }

  /**
   * Origin shield: collapse multiple edge requests for the same resource
   * into a single origin fetch.
   */
  shieldRequest(key: string, fetchFn: () => unknown): unknown {
    const existing = this.shieldRequests.get(key);
    if (existing && existing.pending) {
      existing.subscriberCount++;
      return existing.result;
    }

    const shield: ShieldRequest = {
      key,
      pending: true,
      subscriberCount: 1,
      result: null,
      startedAt: Date.now(),
    };
    this.shieldRequests.set(key, shield);

    try {
      const result = fetchFn();
      shield.result = result;
      shield.pending = false;
      return result;
    } finally {
      // Clean up after a short delay to catch late subscribers
      shield.pending = false;
    }
  }

  /**
   * Get the number of collapsed requests for a shield key
   */
  getShieldSubscriberCount(key: string): number {
    return this.shieldRequests.get(key)?.subscriberCount ?? 0;
  }

  /**
   * Calculate adaptive TTL based on content change frequency.
   * High change frequency = shorter TTL, stable content = longer TTL.
   */
  calculateAdaptiveTtl(url: string): number {
    const tracker = this.changeTrackers.get(url);
    if (!tracker || tracker.changeTimestamps.length < 2) {
      return this.config.defaultTtlMs;
    }

    // Calculate average interval between changes
    const timestamps = tracker.changeTimestamps;
    let totalInterval = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalInterval += (timestamps[i] ?? 0) - (timestamps[i - 1] ?? 0);
    }
    const avgInterval = totalInterval / (timestamps.length - 1);
    tracker.averageChangeIntervalMs = avgInterval;

    // TTL should be a fraction of the change interval
    // Fast-changing: TTL = 20% of interval (min: config.minTtlMs)
    // Slow-changing: TTL = 80% of interval (max: config.maxTtlMs)
    const changeRate = 1 / avgInterval; // changes per ms
    const normalizedRate = changeRate * 3600000; // changes per hour

    let ttl: number;
    if (normalizedRate > 10) {
      // Very frequent changes: short TTL
      ttl = avgInterval * 0.2;
    } else if (normalizedRate > 1) {
      // Moderate changes
      ttl = avgInterval * 0.5;
    } else {
      // Stable content: long TTL
      ttl = avgInterval * 0.8;
    }

    ttl = Math.max(this.config.minTtlMs, Math.min(this.config.maxTtlMs, ttl));
    tracker.currentTtlMs = ttl;

    return ttl;
  }

  /**
   * Record a content change for adaptive TTL tracking
   */
  recordContentChange(url: string): void {
    let tracker = this.changeTrackers.get(url);
    if (!tracker) {
      tracker = {
        url,
        changeTimestamps: [],
        currentTtlMs: this.config.defaultTtlMs,
        averageChangeIntervalMs: 0,
      };
      this.changeTrackers.set(url, tracker);
    }

    tracker.changeTimestamps.push(Date.now());

    // Keep only recent history
    const maxHistory = 100;
    if (tracker.changeTimestamps.length > maxHistory) {
      tracker.changeTimestamps = tracker.changeTimestamps.slice(-maxHistory);
    }
  }

  /**
   * Select optimal compression based on content type.
   * - Brotli for text-based content (HTML, CSS, JS, JSON)
   * - None for already-compressed content (images, video, compressed archives)
   */
  selectCompression(contentType: string, contentSize: number): CompressionRecommendation {
    const textTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/javascript',
      'text/plain',
      'text/xml',
      'application/xml',
    ];
    const compressedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'application/zip',
      'application/gzip',
    ];

    const isText = textTypes.some((t) => contentType.includes(t));
    const isAlreadyCompressed = compressedTypes.some((t) => contentType.includes(t));

    if (isAlreadyCompressed) {
      return {
        contentType,
        algorithm: 'none',
        estimatedSavings: 0,
        reason: 'Content is already compressed',
      };
    }

    if (contentSize < this.config.minCompressionSize) {
      return {
        contentType,
        algorithm: 'none',
        estimatedSavings: 0,
        reason: `Content size ${contentSize} below compression threshold ${this.config.minCompressionSize}`,
      };
    }

    if (isText) {
      // Brotli offers ~20% better compression than gzip for text
      const estimatedRatio = 0.25; // ~75% reduction for text with brotli
      return {
        contentType,
        algorithm: 'brotli',
        estimatedSavings: contentSize * (1 - estimatedRatio),
        reason: 'Brotli optimal for text-based content',
      };
    }

    // Default: gzip for unknown content types that might benefit
    return {
      contentType,
      algorithm: 'gzip',
      estimatedSavings: contentSize * 0.5,
      reason: 'Gzip as fallback for non-text content',
    };
  }

  /**
   * Record a cache hit or miss for hit rate tracking
   */
  recordCacheAccess(hit: boolean, bytesSaved: number = 0): void {
    this.hitStats.totalRequests++;
    if (hit) {
      this.hitStats.hits++;
      this.hitStats.bytesSaved += bytesSaved;
    } else {
      this.hitStats.misses++;
    }
    this.hitStats.hitRate =
      this.hitStats.totalRequests > 0 ? this.hitStats.hits / this.hitStats.totalRequests : 0;
  }

  /**
   * Record a stale cache hit
   */
  recordStaleHit(): void {
    this.hitStats.staleHits++;
  }

  /**
   * Get current hit rate statistics
   */
  getHitRateStats(): HitRateStats {
    return { ...this.hitStats };
  }

  /**
   * Generate optimization suggestions based on current cache performance
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.hitStats.hitRate < 0.5 && this.hitStats.totalRequests > 100) {
      suggestions.push('Hit rate below 50% - consider increasing TTL or warming more content');
    }

    if (this.hitStats.hitRate < 0.8 && this.hitStats.hitRate >= 0.5) {
      suggestions.push(
        'Hit rate between 50-80% - review cache key normalization for over-segmentation',
      );
    }

    if (this.warmingQueue.size === 0 && this.hitStats.misses > this.hitStats.hits) {
      suggestions.push('No warming queue entries - add trending content for proactive caching');
    }

    const lowTtlTrackers = Array.from(this.changeTrackers.values()).filter(
      (t) => t.currentTtlMs < this.config.minTtlMs * 2,
    );
    if (lowTtlTrackers.length > 0) {
      suggestions.push(
        `${lowTtlTrackers.length} URLs have very low adaptive TTL - content changing too frequently`,
      );
    }

    return suggestions;
  }

  /**
   * Register a cache policy for a URL pattern
   */
  registerPolicy(pattern: string, policy: CachePolicy): void {
    this.policies.set(pattern, policy);
  }

  /**
   * Get the cache policy matching a URL
   */
  getPolicyForUrl(url: string): CachePolicy | null {
    for (const [pattern, policy] of this.policies) {
      if (url.includes(pattern) || this.matchGlob(url, pattern)) {
        return policy;
      }
    }
    return null;
  }

  /**
   * Simple glob matching for cache policies
   */
  private matchGlob(str: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexStr}$`).test(str);
  }

  /**
   * Get purge status
   */
  getPurgeStatus(purgeId: string): PurgeStatus | null {
    return this.purgeStatuses.get(purgeId) ?? null;
  }

  /**
   * Get all active purges
   */
  getActivePurges(): PurgeStatus[] {
    return Array.from(this.purgeStatuses.values()).filter((p) => p.status !== 'complete');
  }
}
