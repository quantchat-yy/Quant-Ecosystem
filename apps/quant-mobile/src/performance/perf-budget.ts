// App Size Budget - Performance budget enforcement

export interface SizeBudgetConfig {
  maxAppSizeBytes: number;
  maxColdStartMs: number;
  maxAssetSizeBytes: number;
}

export interface AssetInfo {
  name: string;
  path: string;
  sizeBytes: number;
  type: 'image' | 'font' | 'script' | 'style' | 'other';
}

export interface ColdStartMetrics {
  passes: boolean;
  durationMs: number;
  budgetMs: number;
}

export interface PerformanceReport {
  bundleSize: { passes: boolean; actualMB: number; budgetMB: number };
  coldStart: ColdStartMetrics | null;
  assets: { oversized: AssetInfo[]; totalSizeBytes: number } | null;
  timestamp: number;
  overallPass: boolean;
}

export const MAX_APP_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
export const MAX_COLD_START_MS = 2000;

export class AppSizeBudget {
  private readonly config: SizeBudgetConfig;

  constructor(config?: Partial<SizeBudgetConfig>) {
    this.config = {
      maxAppSizeBytes: config?.maxAppSizeBytes ?? MAX_APP_SIZE_BYTES,
      maxColdStartMs: config?.maxColdStartMs ?? MAX_COLD_START_MS,
      maxAssetSizeBytes: config?.maxAssetSizeBytes ?? 2 * 1024 * 1024, // 2MB per asset
    };
  }

  checkBundleSize(sizeBytes: number): { passes: boolean; actualMB: number; budgetMB: number } {
    const actualMB = sizeBytes / (1024 * 1024);
    const budgetMB = this.config.maxAppSizeBytes / (1024 * 1024);
    return {
      passes: sizeBytes <= this.config.maxAppSizeBytes,
      actualMB: Math.round(actualMB * 100) / 100,
      budgetMB: Math.round(budgetMB * 100) / 100,
    };
  }

  measureColdStart(startTimestamp: number, readyTimestamp: number): ColdStartMetrics {
    const durationMs = readyTimestamp - startTimestamp;
    return {
      passes: durationMs <= this.config.maxColdStartMs,
      durationMs,
      budgetMs: this.config.maxColdStartMs,
    };
  }

  auditAssets(assets: AssetInfo[]): { oversized: AssetInfo[]; totalSizeBytes: number } {
    const oversized = assets.filter((a) => a.sizeBytes > this.config.maxAssetSizeBytes);
    const totalSizeBytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0);
    return { oversized, totalSizeBytes };
  }

  generateReport(
    sizeBytes: number,
    coldStart?: { startTimestamp: number; readyTimestamp: number },
    assets?: AssetInfo[],
  ): PerformanceReport {
    const bundleSize = this.checkBundleSize(sizeBytes);
    const coldStartMetrics = coldStart
      ? this.measureColdStart(coldStart.startTimestamp, coldStart.readyTimestamp)
      : null;
    const assetAudit = assets ? this.auditAssets(assets) : null;

    const overallPass =
      bundleSize.passes &&
      (coldStartMetrics?.passes ?? true) &&
      (assetAudit?.oversized.length ?? 0) === 0;

    return {
      bundleSize,
      coldStart: coldStartMetrics,
      assets: assetAudit,
      timestamp: Date.now(),
      overallPass,
    };
  }

  getConfig(): SizeBudgetConfig {
    return { ...this.config };
  }
}
