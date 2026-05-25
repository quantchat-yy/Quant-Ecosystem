// ============================================================================
// ML Pipeline - Experiment Framework
// ============================================================================

import {
  ExperimentConfig,
  ExperimentResult,
  ExperimentStatus,
  VariantData,
  PowerAnalysis,
  SequentialTestResult,
  MABConfig,
  MABArm,
  MABAllocation,
} from '../types';

interface ExperimentState {
  config: ExperimentConfig;
  status: ExperimentStatus;
  variants: Map<string, VariantData>;
  startedAt: number;
  endedAt?: number;
  totalSamples: number;
  sequentialCheckpoints: number;
}

interface ArmState {
  arm: MABArm;
  pulls: number;
  totalReward: number;
  meanReward: number;
  variance: number;
  successes: number;
  failures: number;
}

export class ExperimentFramework {
  private experiments: Map<string, ExperimentState> = new Map();
  private mabStates: Map<string, Map<string, ArmState>> = new Map();

  constructor() {}

  // Power analysis: calculate required sample size
  calculateSampleSize(params: PowerAnalysis): number {
    const { baselineRate, minimumDetectableEffect, significance, power } = params;

    // Z-scores for significance and power
    const zAlpha = this.zScore(1 - significance / 2); // Two-tailed
    const zBeta = this.zScore(power);

    // Effect size
    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);

    // Sample size per group (two-proportion z-test)
    const numerator = Math.pow(zAlpha + zBeta, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
    const denominator = Math.pow(p2 - p1, 2);

    if (denominator === 0) return Infinity;

    return Math.ceil(numerator / denominator);
  }

  private zScore(p: number): number {
    // Rational approximation of inverse normal CDF (Abramowitz and Stegun)
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    if (p < 0.5) {
      return -this.zScore(1 - p);
    }

    const t = Math.sqrt(-2 * Math.log(1 - p));

    // Coefficients for rational approximation
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  }

  createExperiment(config: ExperimentConfig): string {
    const state: ExperimentState = {
      config,
      status: 'draft',
      variants: new Map(),
      startedAt: 0,
      totalSamples: 0,
      sequentialCheckpoints: 0,
    };

    // Initialize variants
    for (const variant of config.variants) {
      state.variants.set(variant, {
        name: variant,
        sampleSize: 0,
        successes: 0,
        failures: 0,
        conversionRate: 0,
        revenue: 0,
        meanMetric: 0,
        varianceMetric: 0,
      });
    }

    this.experiments.set(config.id, state);
    return config.id;
  }

  startExperiment(experimentId: string): boolean {
    const state = this.experiments.get(experimentId);
    if (!state || state.status !== 'draft') return false;

    state.status = 'running';
    state.startedAt = Date.now();
    return true;
  }

  recordObservation(
    experimentId: string,
    variant: string,
    converted: boolean,
    metricValue: number = 0,
  ): void {
    const state = this.experiments.get(experimentId);
    if (!state || state.status !== 'running') return;

    const variantData = state.variants.get(variant);
    if (!variantData) return;

    variantData.sampleSize += 1;
    state.totalSamples += 1;

    if (converted) {
      variantData.successes += 1;
    } else {
      variantData.failures += 1;
    }

    // Online mean and variance update (Welford's algorithm)
    const n = variantData.sampleSize;
    const delta = metricValue - variantData.meanMetric;
    variantData.meanMetric += delta / n;
    const delta2 = metricValue - variantData.meanMetric;
    variantData.varianceMetric += delta * delta2;

    variantData.conversionRate = variantData.successes / variantData.sampleSize;

    // Sequential testing check
    if (
      state.config.sequential &&
      state.totalSamples % state.config.sequentialCheckInterval === 0
    ) {
      state.sequentialCheckpoints += 1;
    }
  }

  // Fixed-horizon statistical test
  analyzeExperiment(experimentId: string): ExperimentResult | null {
    const state = this.experiments.get(experimentId);
    if (!state) return null;

    const variants = Array.from(state.variants.values());
    if (variants.length < 2) return null;

    const control = variants[0];
    const treatment = variants[1];
    if (!control || !treatment) return null;

    // Two-proportion z-test
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;
    const n1 = control.sampleSize;
    const n2 = treatment.sampleSize;

    if (n1 === 0 || n2 === 0) return null;

    const pPooled = (control.successes + treatment.successes) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

    const zStat = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zStat)));

    // Confidence interval for the difference
    const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    const z95 = 1.96;
    const liftLower = p2 - p1 - z95 * seDiff;
    const liftUpper = p2 - p1 + z95 * seDiff;

    // Relative lift
    const relativeLift = p1 > 0 ? (p2 - p1) / p1 : 0;

    const significant = pValue < state.config.significance;

    return {
      experimentId,
      status: state.status,
      controlRate: p1,
      treatmentRate: p2,
      absoluteLift: p2 - p1,
      relativeLift,
      confidenceInterval: [liftLower, liftUpper],
      pValue,
      zScore: zStat,
      significant,
      totalSamples: state.totalSamples,
      requiredSamples: this.calculateSampleSize({
        baselineRate: p1 || 0.1,
        minimumDetectableEffect: state.config.minimumDetectableEffect,
        significance: state.config.significance,
        power: state.config.power,
      }),
      winner: significant ? (p2 > p1 ? treatment.name : control.name) : null,
    };
  }

  // Sequential testing with O'Brien-Fleming spending function
  sequentialTest(experimentId: string): SequentialTestResult | null {
    const state = this.experiments.get(experimentId);
    if (!state || !state.config.sequential) return null;

    const variants = Array.from(state.variants.values());
    if (variants.length < 2) return null;

    const control = variants[0];
    const treatment = variants[1];
    if (!control || !treatment) return null;

    const n1 = control.sampleSize;
    const n2 = treatment.sampleSize;
    if (n1 === 0 || n2 === 0) return null;

    // Information fraction: current sample / planned total
    const requiredSamples = this.calculateSampleSize({
      baselineRate: state.config.baselineRate ?? 0.1,
      minimumDetectableEffect: state.config.minimumDetectableEffect,
      significance: state.config.significance,
      power: state.config.power,
    });

    const informationFraction = Math.min(1, state.totalSamples / (requiredSamples * 2));

    // O'Brien-Fleming spending function: alpha(t) = 2 * (1 - Phi(z_alpha/2 / sqrt(t)))
    const nominalAlpha = state.config.significance;
    const zAlphaHalf = this.zScore(1 - nominalAlpha / 2);
    const adjustedZ = zAlphaHalf / Math.sqrt(informationFraction);

    // Current test statistic
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;
    const pPooled = (control.successes + treatment.successes) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
    const zStat = se > 0 ? Math.abs(p2 - p1) / se : 0;

    // Check if we cross the boundary
    const crossedBoundary = zStat > adjustedZ;

    // Spending function value (cumulative alpha spent)
    const alphaSpent = 2 * (1 - this.normalCDF(adjustedZ));

    return {
      experimentId,
      informationFraction,
      currentZScore: zStat,
      boundary: adjustedZ,
      crossedBoundary,
      alphaSpent,
      canStop: crossedBoundary || informationFraction >= 1,
      recommendedAction: crossedBoundary
        ? 'stop_significant'
        : informationFraction >= 1
          ? 'stop_inconclusive'
          : 'continue',
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the normal CDF using the error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + p * absX);
    const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1 + sign * erf);
  }

  concludeExperiment(experimentId: string): boolean {
    const state = this.experiments.get(experimentId);
    if (!state || state.status !== 'running') return false;

    state.status = 'concluded';
    state.endedAt = Date.now();
    return true;
  }

  // Multi-Armed Bandit algorithms
  createMAB(config: MABConfig): string {
    const armStates = new Map<string, ArmState>();
    for (const arm of config.arms) {
      armStates.set(arm.id, {
        arm,
        pulls: 0,
        totalReward: 0,
        meanReward: 0,
        variance: 0,
        successes: 1, // Beta prior
        failures: 1, // Beta prior
      });
    }
    this.mabStates.set(config.id, armStates);
    return config.id;
  }

  selectArm(
    mabId: string,
    algorithm: 'ucb1' | 'thompson_sampling' | 'epsilon_greedy',
    epsilon: number = 0.1,
  ): MABAllocation | null {
    const arms = this.mabStates.get(mabId);
    if (!arms) return null;

    switch (algorithm) {
      case 'ucb1':
        return this.selectUCB1(arms);
      case 'thompson_sampling':
        return this.selectThompsonSampling(arms);
      case 'epsilon_greedy':
        return this.selectEpsilonGreedy(arms, epsilon);
      default:
        return this.selectUCB1(arms);
    }
  }

  private selectUCB1(arms: Map<string, ArmState>): MABAllocation {
    const totalPulls = Array.from(arms.values()).reduce((sum, a) => sum + a.pulls, 0);

    // If any arm has not been pulled, select it
    for (const [id, state] of arms) {
      if (state.pulls === 0) {
        return { armId: id, score: Infinity, algorithm: 'ucb1' };
      }
    }

    let bestArm = '';
    let bestScore = -Infinity;

    for (const [id, state] of arms) {
      // UCB1: mean + sqrt(2 * ln(N) / n_i)
      const exploitation = state.meanReward;
      const exploration = Math.sqrt((2 * Math.log(totalPulls)) / state.pulls);
      const ucbScore = exploitation + exploration;

      if (ucbScore > bestScore) {
        bestScore = ucbScore;
        bestArm = id;
      }
    }

    return { armId: bestArm, score: bestScore, algorithm: 'ucb1' };
  }

  private selectThompsonSampling(arms: Map<string, ArmState>): MABAllocation {
    let bestArm = '';
    let bestSample = -Infinity;

    for (const [id, state] of arms) {
      // Sample from Beta(successes, failures) distribution
      const sample = this.sampleBeta(state.successes, state.failures);

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = id;
      }
    }

    return { armId: bestArm, score: bestSample, algorithm: 'thompson_sampling' };
  }

  private selectEpsilonGreedy(arms: Map<string, ArmState>, epsilon: number): MABAllocation {
    // With probability epsilon, explore randomly
    if (Math.random() < epsilon) {
      const armIds = Array.from(arms.keys());
      const randomIdx = Math.floor(Math.random() * armIds.length);
      return { armId: armIds[randomIdx] ?? '', score: 0, algorithm: 'epsilon_greedy' };
    }

    // Otherwise, exploit best known arm
    let bestArm = '';
    let bestMean = -Infinity;

    for (const [id, state] of arms) {
      if (state.meanReward > bestMean) {
        bestMean = state.meanReward;
        bestArm = id;
      }
    }

    return { armId: bestArm, score: bestMean, algorithm: 'epsilon_greedy' };
  }

  private sampleBeta(alpha: number, beta: number): number {
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  private sampleGamma(shape: number): number {
    if (shape < 1) {
      const u = Math.random();
      return this.sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
    }

    // Marsaglia and Tsang's method
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.standardNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private standardNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  recordMABReward(mabId: string, armId: string, reward: number): void {
    const arms = this.mabStates.get(mabId);
    if (!arms) return;

    const state = arms.get(armId);
    if (!state) return;

    state.pulls += 1;
    state.totalReward += reward;

    // Online mean update
    const delta = reward - state.meanReward;
    state.meanReward += delta / state.pulls;
    const delta2 = reward - state.meanReward;
    state.variance += delta * delta2;

    // Update Beta distribution parameters for Thompson Sampling
    if (reward > 0.5) {
      state.successes += 1;
    } else {
      state.failures += 1;
    }
  }

  getMABStats(
    mabId: string,
  ): Map<string, { pulls: number; meanReward: number; ucb: number }> | null {
    const arms = this.mabStates.get(mabId);
    if (!arms) return null;

    const totalPulls = Array.from(arms.values()).reduce((sum, a) => sum + a.pulls, 0);
    const stats = new Map<string, { pulls: number; meanReward: number; ucb: number }>();

    for (const [id, state] of arms) {
      const ucb =
        state.pulls > 0
          ? state.meanReward + Math.sqrt((2 * Math.log(Math.max(1, totalPulls))) / state.pulls)
          : Infinity;

      stats.set(id, {
        pulls: state.pulls,
        meanReward: state.meanReward,
        ucb,
      });
    }

    return stats;
  }

  getExperiment(experimentId: string): ExperimentState | null {
    return this.experiments.get(experimentId) ?? null;
  }

  getExperimentStatus(experimentId: string): ExperimentStatus | null {
    return this.experiments.get(experimentId)?.status ?? null;
  }

  listExperiments(): string[] {
    return Array.from(this.experiments.keys());
  }

  getRunningExperiments(): string[] {
    return Array.from(this.experiments.entries())
      .filter(([, state]) => state.status === 'running')
      .map(([id]) => id);
  }
}
