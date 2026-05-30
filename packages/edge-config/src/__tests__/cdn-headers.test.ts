import { describe, it, expect } from 'vitest';
import { CacheControlPolicies } from '../cdn-headers.js';

describe('CacheControlPolicies', () => {
  describe('staticAssets', () => {
    it('should return immutable long-term cache policy', () => {
      const policy = CacheControlPolicies.staticAssets();
      expect(policy.contentType).toBe('static');
      expect(policy.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(policy.cdnTtl).toBe(31536000);
      expect(policy.browserTtl).toBe(31536000);
    });
  });

  describe('api', () => {
    it('should return no-cache policy for API responses', () => {
      const policy = CacheControlPolicies.api();
      expect(policy.contentType).toBe('api');
      expect(policy.cacheControl).toBe('no-cache, no-store, must-revalidate');
      expect(policy.cdnTtl).toBe(0);
      expect(policy.browserTtl).toBe(0);
    });
  });

  describe('html', () => {
    it('should return short cache with stale-while-revalidate for HTML', () => {
      const policy = CacheControlPolicies.html();
      expect(policy.contentType).toBe('html');
      expect(policy.cacheControl).toBe(
        'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      );
      expect(policy.cdnTtl).toBe(60);
      expect(policy.browserTtl).toBe(0);
      expect(policy.staleWhileRevalidate).toBe(300);
    });
  });

  describe('images', () => {
    it('should return moderate cache for images', () => {
      const policy = CacheControlPolicies.images();
      expect(policy.contentType).toBe('image');
      expect(policy.cacheControl).toContain('max-age=86400');
      expect(policy.cdnTtl).toBe(86400);
    });
  });

  describe('fonts', () => {
    it('should return immutable long-term cache for fonts', () => {
      const policy = CacheControlPolicies.fonts();
      expect(policy.contentType).toBe('font');
      expect(policy.cacheControl).toContain('immutable');
      expect(policy.cdnTtl).toBe(31536000);
    });
  });

  describe('scripts', () => {
    it('should return immutable long-term cache for scripts', () => {
      const policy = CacheControlPolicies.scripts();
      expect(policy.contentType).toBe('script');
      expect(policy.cacheControl).toContain('immutable');
    });
  });

  describe('dynamic', () => {
    it('should return private no-cache for dynamic content', () => {
      const policy = CacheControlPolicies.dynamic();
      expect(policy.contentType).toBe('dynamic');
      expect(policy.cacheControl).toContain('private');
      expect(policy.cacheControl).toContain('no-cache');
      expect(policy.cdnTtl).toBe(0);
    });
  });

  describe('getAllPolicies', () => {
    it('should return all available policies', () => {
      const policies = CacheControlPolicies.getAllPolicies();
      expect(policies).toHaveLength(7);
      const types = policies.map((p) => p.contentType);
      expect(types).toContain('static');
      expect(types).toContain('api');
      expect(types).toContain('html');
      expect(types).toContain('image');
      expect(types).toContain('font');
      expect(types).toContain('script');
      expect(types).toContain('dynamic');
    });
  });
});
