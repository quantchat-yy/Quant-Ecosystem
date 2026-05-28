import { checkBudget } from './latency-budget.js';
import type { BudgetStage, BudgetViolation, LatencyProfile } from './latency-budget.js';

export interface BudgetReport {
  timestamp: number;
  profile: LatencyProfile;
  results: BudgetViolation[];
  passed: boolean;
}

function formatViolation(v: BudgetViolation, tolerance: number): string {
  const tolerancePct = Math.round(tolerance * 100);
  return (
    `BUDGET VIOLATION: ${v.stage} took ${v.actual}ms ` +
    `(budget: ${v.budget}ms, over by ${v.overBy}ms, tolerance: ${tolerancePct}%)`
  );
}

export function assertBudget(
  metrics: Record<BudgetStage, number>,
  profile: LatencyProfile,
  tolerance = 0.1,
): void {
  const result = checkBudget(metrics, profile, tolerance);

  if (result.violations.length > 0) {
    const messages = result.violations.map((v) => formatViolation(v, tolerance));
    throw new Error(messages.join('\n'));
  }
}

export function generateReport(
  metrics: Record<BudgetStage, number>,
  profile: LatencyProfile,
  tolerance = 0.1,
): BudgetReport {
  const result = checkBudget(metrics, profile, tolerance);

  return {
    timestamp: Date.now(),
    profile,
    results: result.violations,
    passed: result.passed,
  };
}
