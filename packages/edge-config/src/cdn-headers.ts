import type { CachePolicy } from './types.js';

export class CacheControlPolicies {
  static staticAssets(): CachePolicy {
    return {
      contentType: 'static',
      cacheControl: 'public, max-age=31536000, immutable',
      cdnTtl: 31536000,
      browserTtl: 31536000,
    };
  }

  static api(): CachePolicy {
    return {
      contentType: 'api',
      cacheControl: 'no-cache, no-store, must-revalidate',
      cdnTtl: 0,
      browserTtl: 0,
    };
  }

  static html(): CachePolicy {
    return {
      contentType: 'html',
      cacheControl: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      cdnTtl: 60,
      browserTtl: 0,
      staleWhileRevalidate: 300,
    };
  }

  static images(): CachePolicy {
    return {
      contentType: 'image',
      cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
      cdnTtl: 86400,
      browserTtl: 86400,
      staleWhileRevalidate: 604800,
    };
  }

  static fonts(): CachePolicy {
    return {
      contentType: 'font',
      cacheControl: 'public, max-age=31536000, immutable',
      cdnTtl: 31536000,
      browserTtl: 31536000,
    };
  }

  static scripts(): CachePolicy {
    return {
      contentType: 'script',
      cacheControl: 'public, max-age=31536000, immutable',
      cdnTtl: 31536000,
      browserTtl: 31536000,
    };
  }

  static dynamic(): CachePolicy {
    return {
      contentType: 'dynamic',
      cacheControl: 'private, no-cache, no-store, must-revalidate',
      cdnTtl: 0,
      browserTtl: 0,
    };
  }

  static getAllPolicies(): CachePolicy[] {
    return [
      CacheControlPolicies.staticAssets(),
      CacheControlPolicies.api(),
      CacheControlPolicies.html(),
      CacheControlPolicies.images(),
      CacheControlPolicies.fonts(),
      CacheControlPolicies.scripts(),
      CacheControlPolicies.dynamic(),
    ];
  }
}
