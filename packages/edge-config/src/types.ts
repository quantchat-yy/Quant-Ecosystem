import { z } from 'zod';

export const CachePolicySchema = z.object({
  contentType: z.string(),
  cacheControl: z.string(),
  cdnTtl: z.number().optional(),
  browserTtl: z.number().optional(),
  staleWhileRevalidate: z.number().optional(),
  staleIfError: z.number().optional(),
});

export type CachePolicy = z.infer<typeof CachePolicySchema>;

export const GeoRouteRuleSchema = z.object({
  country: z.string(),
  region: z.string().optional(),
  redirectUrl: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
  blocked: z.boolean().optional(),
});

export type GeoRouteRule = z.infer<typeof GeoRouteRuleSchema>;

export const ABTestConfigSchema = z.object({
  experimentId: z.string(),
  featureFlagKey: z.string(),
  variants: z.array(
    z.object({
      id: z.string(),
      weight: z.number().min(0).max(1),
    }),
  ),
  cookieName: z.string(),
  cookieMaxAge: z.number().default(86400 * 30),
});

export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;

export const BotPatternSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  action: z.enum(['allow', 'block', 'challenge', 'throttle']),
});

export type BotPattern = z.infer<typeof BotPatternSchema>;

export const SecurityHeaderSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type SecurityHeader = z.infer<typeof SecurityHeaderSchema>;

export interface SecurityHeadersConfig {
  headers: SecurityHeader[];
}

export interface EdgeRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  slidingWindow: boolean;
  headerPrefix: string;
}

export interface EdgeMiddlewareConfig {
  geoRouting: GeoRouteRule[];
  abTests: ABTestConfig[];
  botDetection: BotPattern[];
  rateLimit: EdgeRateLimitConfig;
}

export interface EdgeConfig {
  middleware: EdgeMiddlewareConfig;
  cachePolicy: CachePolicy[];
  securityHeaders: SecurityHeader[];
}

export interface ImageOptimizationConfig {
  formats: string[];
  deviceSizes: number[];
  imageSizes: number[];
  minimumCacheTTL: number;
  dangerouslyAllowSVG: boolean;
}

export interface FontOptimizationConfig {
  display: string;
  preload: boolean;
  fallback: string[];
  adjustFontFallback: boolean;
}

export interface BundleAnalyzerConfig {
  enabled: boolean;
  openAnalyzer: boolean;
  analyzerMode: string;
}
