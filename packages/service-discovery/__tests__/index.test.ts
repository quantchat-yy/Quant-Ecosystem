import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getServiceUrl, SERVICE_REGISTRY, getAllServiceUrls } from '../src/index';

describe('service-discovery', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getServiceUrl', () => {
    it('returns default localhost URL for a known service', () => {
      const url = getServiceUrl('quantmail');
      expect(url).toBe('http://localhost:3001');
    });

    it('returns correct default port for each service', () => {
      expect(getServiceUrl('quantchat')).toBe('http://localhost:3002');
      expect(getServiceUrl('quantai')).toBe('http://localhost:3003');
      expect(getServiceUrl('git-server')).toBe('http://localhost:3020');
    });

    it('uses port from environment variable override', () => {
      process.env['QUANTCHAT_PORT'] = '4002';
      expect(getServiceUrl('quantchat')).toBe('http://localhost:4002');
    });

    it('uses full URL override from environment variable', () => {
      process.env['QUANTCHAT_URL'] = 'http://chat-service:8080';
      expect(getServiceUrl('quantchat')).toBe('http://chat-service:8080');
    });

    it('uses SERVICE_HOST env var for host override', () => {
      process.env['SERVICE_HOST'] = '10.0.0.5';
      expect(getServiceUrl('quantmail')).toBe('http://10.0.0.5:3001');
    });
  });

  describe('SERVICE_REGISTRY', () => {
    it('contains all expected services', () => {
      expect(Object.keys(SERVICE_REGISTRY)).toContain('quantmail');
      expect(Object.keys(SERVICE_REGISTRY)).toContain('quantchat');
      expect(Object.keys(SERVICE_REGISTRY)).toContain('git-server');
      expect(Object.keys(SERVICE_REGISTRY)).toContain('cdc-relay');
    });
  });

  describe('getAllServiceUrls', () => {
    it('returns URLs for all services', () => {
      const urls = getAllServiceUrls();
      expect(Object.keys(urls).length).toBe(Object.keys(SERVICE_REGISTRY).length);
      expect(urls.quantmail).toBe('http://localhost:3001');
    });
  });
});
