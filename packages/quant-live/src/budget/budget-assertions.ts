import { checkBudget, LATENCY_BUDGETS } from './latency-budget.js';
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
  const budgets = LATENCY_BUDGETS[profile];
  const violations: BudgetViolation[] = [];

  for (const stage of Object.keys(budgets) as BudgetStage[]) {
    const budget = budgets[stage];
    const threshold = budget * (1 + tolerance);
    const actual = metrics[stage];
    if (actual > threshold) {
      violations.push({ stage, budget, actual, overBy: actual - budget });
    }
  }

  if (violations.length > 0) {
    const messages = violations.map((v) => formatViolation(v, tolerance));
    throw new Error(messages.join('\n'));
  }
}

export function generateReport(
  metrics: Record<BudgetStage, number>,
  profile: LatencyProfile,
  tolerance = 0.1,
): BudgetReport {
  const result = checkBudget(metrics, profile);
  const budgets = LATENCY_BUDGETS[profile];

  // Filter violations that exceed tolerance
  const toleratedViolations: BudgetViolation[] = [];
  for (const stage of Object.keys(budgets) as BudgetStage[]) {
    const budget = budgets[stage];
    const threshold = budget * (1 + tolerance);
    const actual = metrics[stage];
    if (actual > threshold) {
      toleratedViolations.push({ stage, budget, actual, overBy: actual - budget });
    }
  }

  return {
    timestamp: Date.now(),
    profile,
    results: result.violations,
    passed: toleratedViolations.length === 0,
  };
}
