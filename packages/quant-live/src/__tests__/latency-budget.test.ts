import { describe, it, expect } from 'vitest';
import { checkBudget } from '../budget/latency-budget.js';
import { assertBudget, generateReport } from '../budget/budget-assertions.js';
import { runBudgetCheck } from '../budget/run-budget-check.js';
import type { BudgetStage } from '../budget/latency-budget.js';

describe('latency-budget', () => {
  describe('checkBudget', () => {
    it('returns passed: true when all metrics are within budget', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 100,
        llm_first_token: 200,
        tts_first_audio: 300,
        total_first_response: 400,
      };
      const result = checkBudget(metrics, 'broadband');
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.profile).toBe('broadband');
    });

    it('returns passed: false with violations when metrics exceed budgets', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 250,
        llm_first_token: 400,
        tts_first_audio: 300,
        total_first_response: 400,
      };
      const result = checkBudget(metrics, 'broadband');
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0]!.stage).toBe('asr_partial');
      expect(result.violations[0]!.overBy).toBe(50);
      expect(result.violations[1]!.stage).toBe('llm_first_token');
      expect(result.violations[1]!.overBy).toBe(50);
    });

    it('uses mobile_4g profile with relaxed thresholds', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 350,
        llm_first_token: 600,
        tts_first_audio: 900,
        total_first_response: 950,
      };
      const result = checkBudget(metrics, 'mobile_4g');
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('assertBudget', () => {
    it('does not throw when metrics are within budget + tolerance', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 215,
        llm_first_token: 380,
        tts_first_audio: 540,
        total_first_response: 540,
      };
      expect(() => assertBudget(metrics, 'broadband')).not.toThrow();
    });

    it('throws with clear message when metrics exceed budget + tolerance', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 250,
        llm_first_token: 200,
        tts_first_audio: 300,
        total_first_response: 400,
      };
      expect(() => assertBudget(metrics, 'broadband')).toThrow(
        'BUDGET VIOLATION: asr_partial took 250ms (budget: 200ms, over by 50ms, tolerance: 10%)',
      );
    });

    it('respects custom tolerance', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 250,
        llm_first_token: 200,
        tts_first_audio: 300,
        total_first_response: 400,
      };
      expect(() => assertBudget(metrics, 'broadband', 0.5)).not.toThrow();
    });
  });

  describe('generateReport', () => {
    it('produces a report with pass status and timestamp', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 100,
        llm_first_token: 200,
        tts_first_audio: 300,
        total_first_response: 400,
      };
      const report = generateReport(metrics, 'broadband');
      expect(report.passed).toBe(true);
      expect(report.profile).toBe('broadband');
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.results).toHaveLength(0);
    });
  });

  describe('simulated pipeline (broadband)', () => {
    it('completes within broadband budget with simulated delays', async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 50));
      const asrTime = Date.now() - start;
      await new Promise((r) => setTimeout(r, 100));
      const llmTime = Date.now() - start;
      await new Promise((r) => setTimeout(r, 50));
      const ttsTime = Date.now() - start;
      const totalTime = Date.now() - start;

      const metrics: Record<BudgetStage, number> = {
        asr_partial: asrTime,
        llm_first_token: llmTime,
        tts_first_audio: ttsTime,
        total_first_response: totalTime,
      };
      assertBudget(metrics, 'broadband', 0.1);
    });
  });

  describe('simulated pipeline (mobile_4g)', () => {
    it('completes within 4G budget with simulated delays', async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 80));
      const asrTime = Date.now() - start;
      await new Promise((r) => setTimeout(r, 150));
      const llmTime = Date.now() - start;
      await new Promise((r) => setTimeout(r, 70));
      const ttsTime = Date.now() - start;
      const totalTime = Date.now() - start;

      const metrics: Record<BudgetStage, number> = {
        asr_partial: asrTime,
        llm_first_token: llmTime,
        tts_first_audio: ttsTime,
        total_first_response: totalTime,
      };
      assertBudget(metrics, 'mobile_4g', 0.1);
    });
  });

  describe('run-budget-check', () => {
    it('returns passed true for valid metrics', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 150,
        llm_first_token: 300,
        tts_first_audio: 400,
        total_first_response: 450,
      };
      const { json, passed } = runBudgetCheck(metrics, 'broadband');
      expect(passed).toBe(true);
      expect(JSON.parse(json).passed).toBe(true);
    });

    it('returns passed false for violating metrics', () => {
      const metrics: Record<BudgetStage, number> = {
        asr_partial: 500,
        llm_first_token: 800,
        tts_first_audio: 1200,
        total_first_response: 1500,
      };
      const { passed } = runBudgetCheck(metrics, 'broadband');
      expect(passed).toBe(false);
    });
  });
});
