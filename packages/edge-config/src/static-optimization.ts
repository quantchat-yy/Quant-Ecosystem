import type {
  ImageOptimizationConfig,
  FontOptimizationConfig,
  BundleAnalyzerConfig,
} from './types.js';

export function getImageOptimizationConfig(): ImageOptimizationConfig {
  return {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  };
}

export function getFontOptimizationConfig(): FontOptimizationConfig {
  return {
    display: 'swap',
    preload: true,
    fallback: ['system-ui', 'arial'],
    adjustFontFallback: true,
  };
}

export function getBundleAnalyzerConfig(enabled = false): BundleAnalyzerConfig {
  return {
    enabled,
    openAnalyzer: false,
    analyzerMode: 'static',
  };
}
