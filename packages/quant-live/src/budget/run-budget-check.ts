import { checkBudget } from './latency-budget.js';
import type { BudgetStage, LatencyProfile } from './latency-budget.js';

export function runBudgetCheck(
  metrics: Record<BudgetStage, number>,
  profile: LatencyProfile,
): { json: string; passed: boolean } {
  const result = checkBudget(metrics, profile);
  const json = JSON.stringify(result, null, 2);
  return { json, passed: result.passed };
}

export function main(): void {
  const sampleMetrics: Record<BudgetStage, number> = {
    asr_partial: 150,
    llm_first_token: 300,
    tts_first_audio: 400,
    total_first_response: 450,
  };

  const profiles: LatencyProfile[] = ['broadband', 'mobile_4g'];
  let allPassed = true;

  for (const profile of profiles) {
    const { json, passed } = runBudgetCheck(sampleMetrics, profile);
    process.stdout.write(`${profile}: ${json}\n`);
    if (!passed) {
      allPassed = false;
    }
  }

  if (!allPassed) {
    process.exit(1);
  }
}
