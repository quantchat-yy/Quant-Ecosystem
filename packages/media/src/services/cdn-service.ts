// ============================================================================
// Media - CDN Service
// CDN URL generation with signed URLs and edge selection
// ============================================================================

import type {
  CDNConfig,
  CDNEdge,
  ImageFormat,
  ResponsiveImageSet,
} from '../types';

/** CDN service configuration */
interface CDNServiceConfig {
  baseUrl: string;
  signatureSecret: string;
  signatureExpiryMs: number;
  cacheDurationSeconds: number;
  defaultFormat: ImageFormat;
  responsiveSizes: number[];
}

const DEFAULT_CONFIG: CDNServiceConfig = {
  baseUrl: 'https://cdn.quant.media',
  signatureSecret: 'quant-cdn-secret-key-2024',
  signatureExpiryMs: 86400000, // 24 hours
  cacheDurationSeconds: 31536000, // 1 year
  defaultFormat: 'webp',
  responsiveSizes: [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560],
};

/** Cache entry */
interface CacheEntry {
  url: string;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
  edgeId: string;
}

/**
 * CDNService - Content Delivery Network management
 *
 * Generates optimized CDN URLs with transformations,
 * signed URL authentication, edge server selection
 * based on geographic proximity, cache invalidation,
 * and responsive image set generation.
 */
export class CDNService {
  private config: CDNServiceConfig;
  private edges: Map<string, CDNEdge>;
  private cacheEntries: Map<string, CacheEntry>;
  private invalidationLog: Array<{ pattern: string; timestamp: number; affectedUrls: number }>;

  constructor(config: Partial<CDNServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.edges = new Map();
    this.cacheEntries = new Map();
    this.invalidationLog = [];
    this.initEdges();
  }

  /**
   * Generate a CDN URL for a media asset
   */
  public generateUrl(
    path: string,
    options: {
      width?: number;
      height?: number;
      format?: ImageFormat;
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill';
      blur?: number;
      signed?: boolean;
      edge?: string;
    } = {}
  ): string {
    const edge = options.edge
      ? this.edges.get(options.edge)
      : this.getClosestEdge();

    const baseUrl = edge ? edge.url : this.config.baseUrl;
    const transforms: string[] = [];

    if (options.width) transforms.push(`w=${options.width}`);
    if (options.height) transforms.push(`h=${options.height}`);
    if (options.format) transforms.push(`f=${options.format}`);
    if (options.quality) transforms.push(`q=${options.quality}`);
    if (options.fit) transforms.push(`fit=${options.fit}`);
    if (options.blur) transforms.push(`blur=${options.blur}`);

    const transformString = transforms.length > 0 ? `/${transforms.join(',')}` : '';
    let url = `${baseUrl}${transformString}/${path.replace(/^\//, '')}`;

    if (options.signed) {
      url = this.appendSignature(url);
    }

    return url;
  }

  /**
   * Generate a signed URL with expiration
   */
  public signUrl(url: string, expiryMs?: number): string {
    const expiry = Date.now() + (expiryMs || this.config.signatureExpiryMs);
    const signature = this.generateSignature(url, expiry);

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}expires=${expiry}&sig=${signature}`;
  }

  /**
   * Verify a signed URL
   */
  public verifySignedUrl(url: string): { valid: boolean; expired: boolean; reason?: string } {
    const urlObj = this.parseUrl(url);
    const expires = urlObj.params.get('expires');
    const sig = urlObj.params.get('sig');

    if (!expires || !sig) {
      return { valid: false, expired: false, reason: 'Missing signature parameters' };
    }

    const expiryTime = parseInt(expires, 10);
    if (Date.now() > expiryTime) {
      return { valid: false, expired: true, reason: 'URL has expired' };
    }

    // Remove signature params to verify
    const baseUrl = url.replace(/[?&](expires=[^&]+|sig=[^&]+)/g, '').replace(/[?&]$/, '');
    const expectedSig = this.generateSignature(baseUrl, expiryTime);

    if (sig !== expectedSig) {
      return { valid: false, expired: false, reason: 'Invalid signature' };
    }

    return { valid: true, expired: false };
  }

  /**
   * Invalidate cache for a URL pattern
   */
  public invalidateCache(pattern: string): { invalidated: number; pattern: string } {
    let invalidated = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const [key, entry] of this.cacheEntries) {
      if (regex.test(entry.url) || regex.test(key)) {
        this.cacheEntries.delete(key);
        invalidated++;
      }
    }

    this.invalidationLog.push({
      pattern,
      timestamp: Date.now(),
      affectedUrls: invalidated,
    });

    return { invalidated, pattern };
  }

  /**
   * Get the optimal edge server based on client location
   */
  public getOptimalEdge(clientLat?: number, clientLon?: number): CDNEdge {
    if (!clientLat || !clientLon) {
      // Return edge with lowest load
      let bestEdge: CDNEdge | null = null;
      let lowestLoad = Infinity;

      for (const [, edge] of this.edges) {
        if (!edge.healthy) continue;
        const loadRatio = edge.currentLoad / edge.capacity;
        if (loadRatio < lowestLoad) {
          lowestLoad = loadRatio;
          bestEdge = edge;
        }
      }

      return bestEdge || Array.from(this.edges.values())[0];
    }

    // Find closest healthy edge
    let closestEdge: CDNEdge | null = null;
    let minDistance = Infinity;

    for (const [, edge] of this.edges) {
      if (!edge.healthy) continue;
      if (edge.currentLoad >= edge.capacity) continue;

      const distance = this.haversineDistance(
        clientLat, clientLon, edge.latitude, edge.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestEdge = edge;
      }
    }

    return closestEdge || Array.from(this.edges.values())[0];
  }

  /**
   * Build a responsive image set with multiple sizes
   */
  public buildResponsiveSet(
    path: string,
    options: {
      sizes?: number[];
      format?: ImageFormat;
      quality?: number;
      signed?: boolean;
    } = {}
  ): ResponsiveImageSet {
    const sizes = options.sizes || this.config.responsiveSizes;
    const format = options.format || this.config.defaultFormat;
    const quality = options.quality || 80;

    const sizeEntries = sizes.map(width => {
      const height = Math.round(width * 0.5625); // 16:9 default
      const url = this.generateUrl(path, {
        width,
        height,
        format,
        quality,
        fit: 'cover',
        signed: options.signed,
      });

      // Estimate file size based on width
      const estimatedSize = Math.round(width * height * 0.15); // Rough estimate

      return { width, height, url, format, size: estimatedSize };
    });

    const srcSet = sizeEntries
      .map(s => `${s.url} ${s.width}w`)
      .join(', ');

    const defaultSize = sizeEntries.find(s => s.width === 1024)?.url
      || sizeEntries[Math.floor(sizeEntries.length / 2)]?.url
      || '';

    return {
      original: this.generateUrl(path),
      sizes: sizeEntries,
      srcSet,
      defaultSize,
    };
  }

  /**
   * Purge all cached content for a path
   */
  public purge(path: string): { purged: number } {
    let purged = 0;

    for (const [key] of this.cacheEntries) {
      if (key.includes(path)) {
        this.cacheEntries.delete(key);
        purged++;
      }
    }

    return { purged };
  }

  /**
   * Get edge servers
   */
  public getEdges(): CDNEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get healthy edges
   */
  public getHealthyEdges(): CDNEdge[] {
    return Array.from(this.edges.values()).filter(e => e.healthy);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    invalidations: number;
  } {
    let totalSize = 0;
    let totalHits = 0;

    for (const [, entry] of this.cacheEntries) {
      totalSize += entry.size;
      totalHits += entry.hits;
    }

    const hitRate = this.cacheEntries.size > 0 ? totalHits / this.cacheEntries.size : 0;

    return {
      totalEntries: this.cacheEntries.size,
      totalSize,
      hitRate,
      invalidations: this.invalidationLog.length,
    };
  }

  /**
   * Add a cache entry (for tracking)
   */
  public addCacheEntry(url: string, size: number, edgeId?: string): void {
    this.cacheEntries.set(url, {
      url,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.cacheDurationSeconds * 1000),
      hits: 0,
      size,
      edgeId: edgeId || 'origin',
    });
  }

  /**
   * Record a cache hit
   */
  public recordHit(url: string): void {
    const entry = this.cacheEntries.get(url);
    if (entry) {
      entry.hits++;
    }
  }

  // ---- Private Methods ----

  private appendSignature(url: string): string {
    const expiry = Date.now() + this.config.signatureExpiryMs;
    const signature = this.generateSignature(url, expiry);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}expires=${expiry}&sig=${signature}`;
  }

  private generateSignature(url: string, expiry: number): string {
    // HMAC-like signature using simple hash
    const payload = `${url}:${expiry}:${this.config.signatureSecret}`;
    let hash = 0;

    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // XOR with expiry for additional security
    hash = hash ^ (expiry & 0xffffffff);

    return Math.abs(hash).toString(36) + Math.abs(hash >> 16).toString(36);
  }

  private parseUrl(url: string): { base: string; params: Map<string, string> } {
    const [base, queryString] = url.split('?');
    const params = new Map<string, string>();

    if (queryString) {
      for (const param of queryString.split('&')) {
        const [key, value] = param.split('=');
        if (key && value) params.set(key, value);
      }
    }

    return { base, params };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getClosestEdge(): CDNEdge | undefined {
    // Default: return edge with lowest load
    let best: CDNEdge | undefined;
    let lowestLoad = Infinity;

    for (const [, edge] of this.edges) {
      if (!edge.healthy) continue;
      if (edge.currentLoad < lowestLoad) {
        lowestLoad = edge.currentLoad;
        best = edge;
      }
    }
    return best;
  }

  private initEdges(): void {
    const edgeData: Array<Omit<CDNEdge, 'id'> & { id: string }> = [
      { id: 'us-east', region: 'US East', url: 'https://us-east.cdn.quant.media', latitude: 39.0, longitude: -77.5, capacity: 10000, currentLoad: 3500, healthy: true },
      { id: 'us-west', region: 'US West', url: 'https://us-west.cdn.quant.media', latitude: 37.4, longitude: -122.0, capacity: 10000, currentLoad: 4200, healthy: true },
      { id: 'eu-west', region: 'EU West', url: 'https://eu-west.cdn.quant.media', latitude: 48.9, longitude: 2.3, capacity: 8000, currentLoad: 2800, healthy: true },
      { id: 'eu-central', region: 'EU Central', url: 'https://eu-central.cdn.quant.media', latitude: 50.1, longitude: 8.7, capacity: 8000, currentLoad: 3100, healthy: true },
      { id: 'asia-east', region: 'Asia East', url: 'https://asia-east.cdn.quant.media', latitude: 35.7, longitude: 139.7, capacity: 8000, currentLoad: 5000, healthy: true },
      { id: 'asia-south', region: 'Asia South', url: 'https://asia-south.cdn.quant.media', latitude: 19.1, longitude: 72.9, capacity: 6000, currentLoad: 2000, healthy: true },
      { id: 'au-east', region: 'Australia East', url: 'https://au-east.cdn.quant.media', latitude: -33.9, longitude: 151.2, capacity: 4000, currentLoad: 1200, healthy: true },
      { id: 'sa-east', region: 'South America East', url: 'https://sa-east.cdn.quant.media', latitude: -23.6, longitude: -46.6, capacity: 4000, currentLoad: 1500, healthy: true },
    ];

    for (const edge of edgeData) {
      this.edges.set(edge.id, edge);
    }
  }
}
