import type {
  GeoRouteRule,
  ABTestConfig,
  BotPattern,
  EdgeRateLimitConfig,
  EdgeMiddlewareConfig,
} from './types.js';

export interface CreateEdgeMiddlewareOptions {
  geoRouting?: GeoRouteRule[];
  abTests?: ABTestConfig[];
  botDetection?: BotPattern[];
  rateLimit?: Partial<EdgeRateLimitConfig>;
}

const DEFAULT_BOT_PATTERNS: BotPattern[] = [
  { name: 'Googlebot', pattern: 'Googlebot', action: 'allow' },
  { name: 'Bingbot', pattern: 'bingbot', action: 'allow' },
  { name: 'GPTBot', pattern: 'GPTBot', action: 'block' },
  { name: 'CCBot', pattern: 'CCBot', action: 'block' },
  { name: 'AhrefsBot', pattern: 'AhrefsBot', action: 'throttle' },
  { name: 'SemrushBot', pattern: 'SemrushBot', action: 'throttle' },
  { name: 'MJ12bot', pattern: 'MJ12bot', action: 'block' },
  { name: 'DotBot', pattern: 'DotBot', action: 'block' },
];

const DEFAULT_RATE_LIMIT: EdgeRateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
  slidingWindow: true,
  headerPrefix: 'X-RateLimit',
};

export function createEdgeMiddleware(
  options: CreateEdgeMiddlewareOptions = {},
): EdgeMiddlewareConfig {
  const {
    geoRouting = [],
    abTests = [],
    botDetection = DEFAULT_BOT_PATTERNS,
    rateLimit = {},
  } = options;

  return {
    geoRouting,
    abTests,
    botDetection,
    rateLimit: {
      ...DEFAULT_RATE_LIMIT,
      ...rateLimit,
    },
  };
}

export function createGeoRouteRule(rule: GeoRouteRule): GeoRouteRule {
  return rule;
}

export function createABTest(config: ABTestConfig): ABTestConfig {
  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    throw new Error(`A/B test variant weights must sum to 1, got ${totalWeight}`);
  }
  return config;
}
