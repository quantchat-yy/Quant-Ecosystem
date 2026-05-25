// ============================================================================
// Quant Ecosystem Bridge - Shared Content Cache Service
// Cross-app caching layer to reduce redundant data fetching
// ============================================================================

import {
  AppName,
  CacheEntry,
  CachePolicy,
  ContentType,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
  byApp: Record<string, { entries: number; size: number; hitRate: number }>;
}

interface WarmCacheResult {
  preloaded: number;
  skipped: number;
  errors: number;
  totalSize: number;
}

interface MediaCacheEntry {
  mediaId: string;
  sourceApp: AppName;
  type: ContentType;
  url: string;
  thumbnail: string;
  size: number;
  cachedAt: number;
  accessCount: number;
  referencedBy: AppName[];
}

export class SharedContentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private policies: Map<AppName, CachePolicy> = new Map();
  private mediaCache: Map<string, MediaCacheEntry> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;
  private accessPatterns: Map<string, Array<{ key: string; timestamp: number }>> = new Map();
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicy: CachePolicy = {
      maxSize: 10 * 1024 * 1024,
      defaultTTL: 3600000,
      evictionStrategy: 'lru',
      preloadEnabled: true,
      compressionThreshold: 1024
    };

    for (const app of ALL_APPS) {
      this.policies.set(app, { ...defaultPolicy });
    }

    this.policies.set('quantube', { ...defaultPolicy, maxSize: 20 * 1024 * 1024, defaultTTL: 7200000 });
    this.policies.set('quantneon', { ...defaultPolicy, maxSize: 15 * 1024 * 1024, defaultTTL: 3600000 });
    this.policies.set('quantchat', { ...defaultPolicy, maxSize: 5 * 1024 * 1024, defaultTTL: 1800000 });
    this.policies.set('quantai', { ...defaultPolicy, maxSize: 8 * 1024 * 1024, defaultTTL: 600000 });
  }

  get(key: string, app?: AppName): unknown | null {
    const cacheKey = app ? `${app}:${key}` : key;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.missCount++;
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      this.missCount++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;
    return entry.data;
  }

  set(key: string, data: unknown, sourceApp: AppName, ttl?: number): boolean {
    const policy = this.policies.get(sourceApp) || this.getDefaultPolicy();
    const effectiveTTL = ttl || policy.defaultTTL;
    const cacheKey = `${sourceApp}:${key}`;

    const serialized = JSON.stringify(data);
    const size = serialized.length;

    if (size > policy.maxSize) {
      return false;
    }

    this.ensureSpace(size, sourceApp);

    const shouldCompress = size > policy.compressionThreshold;

    const entry: CacheEntry = {
      key: cacheKey,
      data,
      sourceApp,
      expiresAt: Date.now() + effectiveTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      compressed: shouldCompress,
      tags: [sourceApp, key.split(':')[0] || 'default']
    };

    this.cache.set(cacheKey, entry);
    return true;
  }

  preload(contentIds: string[], targetApp: AppName): WarmCacheResult {
    const result: WarmCacheResult = { preloaded: 0, skipped: 0, errors: 0, totalSize: 0 };
    const policy = this.policies.get(targetApp);
    if (!policy || !policy.preloadEnabled) {
      return result;
    }

    for (const contentId of contentIds) {
      const cacheKey = `${targetApp}:${contentId}`;
      if (this.cache.has(cacheKey)) {
        result.skipped++;
        continue;
      }

      const crossAppEntry = this.findInOtherApps(contentId, targetApp);
      if (crossAppEntry) {
        const newEntry: CacheEntry = {
          ...crossAppEntry,
          key: cacheKey,
          lastAccessed: Date.now(),
          accessCount: 0,
          tags: [...crossAppEntry.tags, targetApp]
        };
        this.cache.set(cacheKey, newEntry);
        result.preloaded++;
        result.totalSize += newEntry.size;
      } else {
        result.errors++;
      }
    }

    return result;
  }

  invalidate(key: string, app?: AppName): boolean {
    if (app) {
      const cacheKey = `${app}:${key}`;
      return this.cache.delete(cacheKey);
    }

    let deleted = false;
    for (const [cacheKey] of this.cache.entries()) {
      if (cacheKey.endsWith(`:${key}`) || cacheKey === key) {
        this.cache.delete(cacheKey);
        deleted = true;
      }
    }
    return deleted;
  }

  invalidateByApp(app: AppName): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.sourceApp === app) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  getStats(): CacheStats {
    const totalEntries = this.cache.size;
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    const byApp: Record<string, { entries: number; size: number; hitRate: number }> = {};

    for (const app of ALL_APPS) {
      byApp[app] = { entries: 0, size: 0, hitRate: 0 };
    }

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      const entryCreated = entry.expiresAt - (this.policies.get(entry.sourceApp)?.defaultTTL || 3600000);
      if (entryCreated < oldestEntry) oldestEntry = entryCreated;
      if (entryCreated > newestEntry) newestEntry = entryCreated;

      if (byApp[entry.sourceApp]) {
        byApp[entry.sourceApp].entries++;
        byApp[entry.sourceApp].size += entry.size;
      }
    }

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      totalEntries,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      evictionCount: this.evictionCount,
      oldestEntry: totalEntries > 0 ? oldestEntry : 0,
      newestEntry: totalEntries > 0 ? newestEntry : 0,
      byApp
    };
  }

  setPolicy(app: AppName, policy: Partial<CachePolicy>): void {
    const current = this.policies.get(app) || this.getDefaultPolicy();
    this.policies.set(app, { ...current, ...policy });
  }

  getPolicy(app: AppName): CachePolicy {
    return this.policies.get(app) || this.getDefaultPolicy();
  }

  warmCache(userId: string): WarmCacheResult {
    const patterns = this.accessPatterns.get(userId) || [];
    const recentKeys = patterns
      .filter(p => Date.now() - p.timestamp < 3600000)
      .map(p => p.key)
      .slice(-20);

    const result: WarmCacheResult = { preloaded: 0, skipped: 0, errors: 0, totalSize: 0 };

    const keyFrequency: Map<string, number> = new Map();
    for (const key of recentKeys) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
    }

    const topKeys = Array.from(keyFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key);

    for (const key of topKeys) {
      if (this.cache.has(key)) {
        result.skipped++;
      } else {
        result.preloaded++;
      }
    }

    return result;
  }

  getSharedMedia(mediaId: string): MediaCacheEntry | null {
    return this.mediaCache.get(mediaId) || null;
  }

  setSharedMedia(media: MediaCacheEntry): void {
    this.mediaCache.set(media.mediaId, media);
  }

  getMediaByApp(app: AppName): MediaCacheEntry[] {
    const results: MediaCacheEntry[] = [];
    for (const entry of this.mediaCache.values()) {
      if (entry.sourceApp === app || entry.referencedBy.includes(app)) {
        results.push(entry);
      }
    }
    return results;
  }

  trackAccess(userId: string, key: string): void {
    const patterns = this.accessPatterns.get(userId) || [];
    patterns.push({ key, timestamp: Date.now() });
    if (patterns.length > 500) {
      patterns.splice(0, patterns.length - 500);
    }
    this.accessPatterns.set(userId, patterns);
  }

  clear(): void {
    this.cache.clear();
    this.mediaCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  private ensureSpace(neededSize: number, app: AppName): void {
    const policy = this.policies.get(app) || this.getDefaultPolicy();
    let currentSize = this.getAppCacheSize(app);

    if (currentSize + neededSize <= policy.maxSize) return;

    const appEntries = Array.from(this.cache.entries())
      .filter(([_, e]) => e.sourceApp === app);

    if (policy.evictionStrategy === 'lru') {
      appEntries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    } else if (policy.evictionStrategy === 'lfu') {
      appEntries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    } else {
      appEntries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    }

    for (const [key, entry] of appEntries) {
      if (currentSize + neededSize <= policy.maxSize) break;
      this.cache.delete(key);
      currentSize -= entry.size;
      this.evictionCount++;
    }
  }

  private getAppCacheSize(app: AppName): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      if (entry.sourceApp === app) size += entry.size;
    }
    return size;
  }

  private findInOtherApps(contentId: string, excludeApp: AppName): CacheEntry | null {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.sourceApp !== excludeApp && key.includes(contentId)) {
        return entry;
      }
    }
    return null;
  }

  private getDefaultPolicy(): CachePolicy {
    return {
      maxSize: 10 * 1024 * 1024,
      defaultTTL: 3600000,
      evictionStrategy: 'lru',
      preloadEnabled: true,
      compressionThreshold: 1024
    };
  }
}
