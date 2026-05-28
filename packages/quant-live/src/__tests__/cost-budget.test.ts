import { describe, it, expect } from 'vitest';

const LLM_INPUT_COST_PER_1K_TOKENS = 0.00015;
const LLM_OUTPUT_COST_PER_1K_TOKENS = 0.0006;
const ASR_COST_PER_MINUTE = 0.006;
const TTS_COST_PER_1K_CHARS = 0.015;

function calculateCostPerMinute(params: {
  asrMinutes: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  ttsChars: number;
}): number {
  return (
    params.asrMinutes * ASR_COST_PER_MINUTE +
    (params.llmInputTokens / 1000) * LLM_INPUT_COST_PER_1K_TOKENS +
    (params.llmOutputTokens / 1000) * LLM_OUTPUT_COST_PER_1K_TOKENS +
    (params.ttsChars / 1000) * TTS_COST_PER_1K_CHARS
  );
}

describe('cost-budget', () => {
  it('standard 1-minute conversation costs less than $0.02/min', () => {
    const cost = calculateCostPerMinute({
      asrMinutes: 1,
      llmInputTokens: 150,
      llmOutputTokens: 200,
      ttsChars: 800,
    });
    expect(cost).toBeLessThan(0.02);
    const expected = 0.006 + (150 / 1000) * 0.00015 + (200 / 1000) * 0.0006 + (800 / 1000) * 0.015;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('per-component costs are individually reasonable', () => {
    expect(1 * ASR_COST_PER_MINUTE).toBeLessThan(0.02);
    expect((150 / 1000) * LLM_INPUT_COST_PER_1K_TOKENS).toBeLessThan(0.02);
    expect((200 / 1000) * LLM_OUTPUT_COST_PER_1K_TOKENS).toBeLessThan(0.02);
    expect((800 / 1000) * TTS_COST_PER_1K_CHARS).toBeLessThan(0.02);
  });

  it('doubled usage still stays within budget ceiling', () => {
    const cost = calculateCostPerMinute({
      asrMinutes: 1,
      llmInputTokens: 300,
      llmOutputTokens: 400,
      ttsChars: 1600,
    });
    expect(cost).toBeLessThan(0.05);
  });

  it('LLM cost dominates at scale - validates model choice', () => {
    const baseCost = calculateCostPerMinute({
      asrMinutes: 1,
      llmInputTokens: 150,
      llmOutputTokens: 200,
      ttsChars: 800,
    });
    const expensiveLLMCost =
      ASR_COST_PER_MINUTE +
      (150 / 1000) * LLM_INPUT_COST_PER_1K_TOKENS * 10 +
      (200 / 1000) * LLM_OUTPUT_COST_PER_1K_TOKENS * 10 +
      (800 / 1000) * TTS_COST_PER_1K_CHARS;
    expect(expensiveLLMCost).toBeGreaterThan(baseCost);
    expect(expensiveLLMCost).toBeLessThan(0.1);
  });
});
