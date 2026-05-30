import { describe, it, expect } from 'vitest';
import { createEdgeMiddleware, createABTest, createGeoRouteRule } from '../edge-middleware.js';
import type { ABTestConfig, GeoRouteRule } from '../types.js';

describe('createEdgeMiddleware', () => {
  it('should return default middleware config when no options provided', () => {
    const config = createEdgeMiddleware();
    expect(config.geoRouting).toEqual([]);
    expect(config.abTests).toEqual([]);
    expect(config.botDetection).toHaveLength(8);
    expect(config.rateLimit.windowMs).toBe(60000);
    expect(config.rateLimit.maxRequests).toBe(100);
    expect(config.rateLimit.slidingWindow).toBe(true);
  });

  it('should merge geo routing rules', () => {
    const rules: GeoRouteRule[] = [
      { country: 'DE', locale: 'de', currency: 'EUR' },
      { country: 'JP', locale: 'ja', currency: 'JPY' },
    ];
    const config = createEdgeMiddleware({ geoRouting: rules });
    expect(config.geoRouting).toHaveLength(2);
    const first = config.geoRouting[0];
    const second = config.geoRouting[1];
    if (first && second) {
      expect(first.country).toBe('DE');
      expect(second.locale).toBe('ja');
    }
  });

  it('should compose A/B tests', () => {
    const test: ABTestConfig = {
      experimentId: 'exp-001',
      featureFlagKey: 'new-checkout',
      variants: [
        { id: 'control', weight: 0.5 },
        { id: 'variant-a', weight: 0.5 },
      ],
      cookieName: 'ab-exp-001',
      cookieMaxAge: 2592000,
    };
    const config = createEdgeMiddleware({ abTests: [test] });
    expect(config.abTests).toHaveLength(1);
    const firstTest = config.abTests[0];
    if (firstTest) {
      expect(firstTest.featureFlagKey).toBe('new-checkout');
    }
  });

  it('should include default bot patterns', () => {
    const config = createEdgeMiddleware();
    const googlebot = config.botDetection.find((b) => b.name === 'Googlebot');
    expect(googlebot).toBeDefined();
    if (googlebot) {
      expect(googlebot.action).toBe('allow');
    }

    const gptBot = config.botDetection.find((b) => b.name === 'GPTBot');
    expect(gptBot).toBeDefined();
    if (gptBot) {
      expect(gptBot.action).toBe('block');
    }
  });

  it('should allow custom bot detection patterns', () => {
    const customBots = [{ name: 'CustomBot', pattern: 'CustomBot/1.0', action: 'block' as const }];
    const config = createEdgeMiddleware({ botDetection: customBots });
    expect(config.botDetection).toHaveLength(1);
    const first = config.botDetection[0];
    if (first) {
      expect(first.name).toBe('CustomBot');
    }
  });

  it('should support custom rate limit config', () => {
    const config = createEdgeMiddleware({
      rateLimit: { maxRequests: 50, windowMs: 30000 },
    });
    expect(config.rateLimit.maxRequests).toBe(50);
    expect(config.rateLimit.windowMs).toBe(30000);
    expect(config.rateLimit.slidingWindow).toBe(true);
    expect(config.rateLimit.headerPrefix).toBe('X-RateLimit');
  });
});

describe('createGeoRouteRule', () => {
  it('should return a GeoRouteRule', () => {
    const rule = createGeoRouteRule({ country: 'US', locale: 'en', currency: 'USD' });
    expect(rule.country).toBe('US');
    expect(rule.locale).toBe('en');
  });
});

describe('createABTest', () => {
  it('should validate variant weights sum to 1', () => {
    expect(() =>
      createABTest({
        experimentId: 'exp-bad',
        featureFlagKey: 'bad-test',
        variants: [
          { id: 'a', weight: 0.3 },
          { id: 'b', weight: 0.3 },
        ],
        cookieName: 'ab-bad',
        cookieMaxAge: 86400,
      }),
    ).toThrow('weights must sum to 1');
  });

  it('should return valid config when weights sum to 1', () => {
    const config = createABTest({
      experimentId: 'exp-good',
      featureFlagKey: 'good-test',
      variants: [
        { id: 'control', weight: 0.5 },
        { id: 'variant', weight: 0.5 },
      ],
      cookieName: 'ab-good',
      cookieMaxAge: 86400,
    });
    expect(config.experimentId).toBe('exp-good');
  });
});
