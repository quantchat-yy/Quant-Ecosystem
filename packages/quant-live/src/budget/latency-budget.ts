export type LatencyProfile = 'broadband' | 'mobile_4g';

export type BudgetStage =
  | 'asr_partial'
  | 'llm_first_token'
  | 'tts_first_audio'
  | 'total_first_response';

export const LATENCY_BUDGETS: Record<LatencyProfile, Record<BudgetStage, number>> = {
  broadband: {
    asr_partial: 200,
    llm_first_token: 350,
    tts_first_audio: 500,
    total_first_response: 500,
  },
  mobile_4g: {
    asr_partial: 400,
    llm_first_token: 700,
    tts_first_audio: 1000,
    total_first_response: 1000,
  },
};

export interface BudgetViolation {
  stage: BudgetStage;
  budget: number;
  actual: number;
  overBy: number;
}

export interface BudgetResult {
  passed: boolean;
  violations: BudgetViolation[];
  profile: LatencyProfile;
}

export function checkBudget(
  metrics: Record<BudgetStage, number>,
  profile: LatencyProfile,
): BudgetResult {
  const budgets = LATENCY_BUDGETS[profile];
  const violations: BudgetViolation[] = [];

  for (const stage of Object.keys(budgets) as BudgetStage[]) {
    const budget = budgets[stage];
    const actual = metrics[stage];
    if (actual > budget) {
      violations.push({ stage, budget, actual, overBy: actual - budget });
    }
  }

  return { passed: violations.length === 0, violations, profile };
}
