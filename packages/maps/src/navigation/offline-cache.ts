import { type Route, type OfflineRoute } from '../types.js';

export class OfflineRouteCache {
  private cache = new Map<string, OfflineRoute>();
  private readonly maxSize: number;
  private accessCounter = 0;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  store(id: string, route: Route): void {
    if (this.cache.has(id)) {
      this.cache.delete(id);
    }
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [key, entry] of this.cache) {
        if (entry.cachedAt < oldestTime) {
          oldestTime = entry.cachedAt;
          oldestKey = key;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(id, { id, route, cachedAt: ++this.accessCounter });
  }

  get(id: string): OfflineRoute | null {
    const entry = this.cache.get(id);
    if (entry) {
      entry.cachedAt = ++this.accessCounter;
    }
    return entry ?? null;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  remove(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
