import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppSizeBudget,
  MAX_APP_SIZE_BYTES,
  MAX_COLD_START_MS,
} from '../performance/perf-budget.js';
import type { AssetInfo } from '../performance/perf-budget.js';

describe('AppSizeBudget', () => {
  let budget: AppSizeBudget;

  beforeEach(() => {
    budget = new AppSizeBudget();
  });

  describe('constants', () => {
    it('should define 30MB max app size', () => {
      expect(MAX_APP_SIZE_BYTES).toBe(30 * 1024 * 1024);
    });

    it('should define 2000ms max cold start', () => {
      expect(MAX_COLD_START_MS).toBe(2000);
    });
  });

  describe('checkBundleSize', () => {
    it('should pass when size is under 30MB', () => {
      const result = budget.checkBundleSize(20 * 1024 * 1024);
      expect(result.passes).toBe(true);
      expect(result.actualMB).toBe(20);
      expect(result.budgetMB).toBe(30);
    });

    it('should fail when size exceeds 30MB', () => {
      const result = budget.checkBundleSize(35 * 1024 * 1024);
      expect(result.passes).toBe(false);
      expect(result.actualMB).toBe(35);
    });

    it('should pass at exactly 30MB', () => {
      const result = budget.checkBundleSize(30 * 1024 * 1024);
      expect(result.passes).toBe(true);
    });

    it('should pass for very small bundles', () => {
      const result = budget.checkBundleSize(1024);
      expect(result.passes).toBe(true);
    });
  });

  describe('measureColdStart', () => {
    it('should pass when cold start is under 2s', () => {
      const result = budget.measureColdStart(0, 1500);
      expect(result.passes).toBe(true);
      expect(result.durationMs).toBe(1500);
      expect(result.budgetMs).toBe(2000);
    });

    it('should fail when cold start exceeds 2s', () => {
      const result = budget.measureColdStart(0, 3000);
      expect(result.passes).toBe(false);
      expect(result.durationMs).toBe(3000);
    });

    it('should pass at exactly 2s', () => {
      const result = budget.measureColdStart(1000, 3000);
      expect(result.passes).toBe(true);
      expect(result.durationMs).toBe(2000);
    });
  });

  describe('auditAssets', () => {
    it('should identify oversized assets', () => {
      const assets: AssetInfo[] = [
        { name: 'big.png', path: '/img/big.png', sizeBytes: 3 * 1024 * 1024, type: 'image' },
        { name: 'small.js', path: '/js/small.js', sizeBytes: 100 * 1024, type: 'script' },
        { name: 'huge.woff2', path: '/fonts/huge.woff2', sizeBytes: 5 * 1024 * 1024, type: 'font' },
      ];
      const result = budget.auditAssets(assets);
      expect(result.oversized).toHaveLength(2);
      expect(result.oversized[0]!.name).toBe('big.png');
      expect(result.oversized[1]!.name).toBe('huge.woff2');
    });

    it('should calculate total size', () => {
      const assets: AssetInfo[] = [
        { name: 'a.js', path: '/a.js', sizeBytes: 1000, type: 'script' },
        { name: 'b.css', path: '/b.css', sizeBytes: 2000, type: 'style' },
      ];
      const result = budget.auditAssets(assets);
      expect(result.totalSizeBytes).toBe(3000);
      expect(result.oversized).toHaveLength(0);
    });

    it('should handle empty assets array', () => {
      const result = budget.auditAssets([]);
      expect(result.oversized).toHaveLength(0);
      expect(result.totalSizeBytes).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should generate overall pass when all checks pass', () => {
      const report = budget.generateReport(
        20 * 1024 * 1024,
        { startTimestamp: 0, readyTimestamp: 1500 },
        [{ name: 'a.js', path: '/a.js', sizeBytes: 100, type: 'script' }],
      );
      expect(report.overallPass).toBe(true);
      expect(report.bundleSize.passes).toBe(true);
      expect(report.coldStart!.passes).toBe(true);
      expect(report.assets!.oversized).toHaveLength(0);
    });

    it('should generate overall fail when bundle too large', () => {
      const report = budget.generateReport(40 * 1024 * 1024);
      expect(report.overallPass).toBe(false);
    });

    it('should generate overall fail when cold start too slow', () => {
      const report = budget.generateReport(10 * 1024 * 1024, {
        startTimestamp: 0,
        readyTimestamp: 5000,
      });
      expect(report.overallPass).toBe(false);
    });

    it('should include timestamp', () => {
      const report = budget.generateReport(10 * 1024 * 1024);
      expect(report.timestamp).toBeGreaterThan(0);
    });
  });

  describe('custom config', () => {
    it('should respect custom max app size', () => {
      const customBudget = new AppSizeBudget({ maxAppSizeBytes: 10 * 1024 * 1024 });
      const result = customBudget.checkBundleSize(15 * 1024 * 1024);
      expect(result.passes).toBe(false);
      expect(result.budgetMB).toBe(10);
    });
  });
});
