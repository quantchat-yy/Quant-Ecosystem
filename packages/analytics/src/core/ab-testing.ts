// ============================================================================
// Analytics - A/B Testing Engine
// Statistical significance testing with chi-square implementation
// ============================================================================

import type {
  ABTest,
  ABTestVariant,
  ABTestStatus,
  ABTestResult,
  VariantResult,
} from '../types';

/** Configuration for the A/B testing engine */
interface ABTestingConfig {
  defaultConfidenceLevel: number;
  defaultMinSampleSize: number;
  defaultTrafficAllocation: number;
}

const DEFAULT_CONFIG: ABTestingConfig = {
  defaultConfidenceLevel: 0.95,
  defaultMinSampleSize: 100,
  defaultTrafficAllocation: 1.0,
};

/**
 * ABTestingEngine - Statistical A/B testing with chi-square significance
 *
 * Creates and manages experiments, assigns users to variants,
 * tracks conversions, and determines statistical significance
 * using the chi-square test with configurable confidence levels.
 */
export class ABTestingEngine {
  private config: ABTestingConfig;
  private experiments: Map<string, ABTest>;
  private userAssignments: Map<string, Map<string, string>>; // userId -> testId -> variantId
  private conversionEvents: Map<string, Array<{ userId: string; variantId: string; value: number; timestamp: number }>>;
  private experimentCounter: number = 0;

  constructor(config: Partial<ABTestingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.experiments = new Map();
    this.userAssignments = new Map();
    this.conversionEvents = new Map();
  }

  /**
   * Create a new A/B test experiment
   */
  public createExperiment(
    name: string,
    description: string,
    hypothesis: string,
    variants: Array<{ name: string; description: string; weight: number; isControl?: boolean }>,
    options: {
      targetMetric?: string;
      secondaryMetrics?: string[];
      trafficAllocation?: number;
      minimumSampleSize?: number;
      confidenceLevel?: number;
    } = {}
  ): ABTest {
    if (variants.length < 2) {
      throw new Error('An experiment must have at least 2 variants');
    }

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error('Variant weights must sum to 1.0');
    }

    const hasControl = variants.some(v => v.isControl);
    if (!hasControl) {
      throw new Error('At least one variant must be marked as control');
    }

    const testId = this.generateId('test');
    const now = Date.now();

    const testVariants: ABTestVariant[] = variants.map(v => ({
      id: this.generateId('variant'),
      name: v.name,
      description: v.description,
      weight: v.weight,
      isControl: v.isControl || false,
      conversions: 0,
      impressions: 0,
      revenue: 0,
    }));

    const test: ABTest = {
      id: testId,
      name,
      description,
      hypothesis,
      variants: testVariants,
      status: 'draft',
      targetMetric: options.targetMetric || 'conversion_rate',
      secondaryMetrics: options.secondaryMetrics || [],
      trafficAllocation: options.trafficAllocation || this.config.defaultTrafficAllocation,
      startDate: now,
      minimumSampleSize: options.minimumSampleSize || this.config.defaultMinSampleSize,
      confidenceLevel: options.confidenceLevel || this.config.defaultConfidenceLevel,
    };

    this.experiments.set(testId, test);
    this.conversionEvents.set(testId, []);
    return test;
  }

  /**
   * Start an experiment
   */
  public startExperiment(testId: string): ABTest {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }
    if (test.status !== 'draft' && test.status !== 'paused') {
      throw new Error(`Cannot start experiment in status: ${test.status}`);
    }

    test.status = 'running';
    test.startDate = Date.now();
    return test;
  }

  /**
   * Assign a user to a variant using deterministic hashing
   */
  public assignVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }

    if (test.status !== 'running') {
      return null;
    }

    // Check if user is already assigned
    const userTests = this.userAssignments.get(userId);
    if (userTests?.has(testId)) {
      const variantId = userTests.get(testId)!;
      return test.variants.find(v => v.id === variantId) || null;
    }

    // Check traffic allocation
    const userHash = this.hashString(`${userId}:${testId}:traffic`);
    if (userHash > test.trafficAllocation) {
      return null;
    }

    // Assign variant based on weights using deterministic hash
    const variantHash = this.hashString(`${userId}:${testId}:variant`);
    let cumulativeWeight = 0;
    let assignedVariant: ABTestVariant | null = null;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (variantHash <= cumulativeWeight) {
        assignedVariant = variant;
        break;
      }
    }

    if (!assignedVariant) {
      assignedVariant = test.variants[test.variants.length - 1];
    }

    // Record assignment
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(testId, assignedVariant.id);

    // Increment impressions
    assignedVariant.impressions++;

    return assignedVariant;
  }

  /**
   * Track a conversion event for a user in an experiment
   */
  public trackConversion(testId: string, userId: string, value: number = 1): boolean {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }

    if (test.status !== 'running') {
      return false;
    }

    const userTests = this.userAssignments.get(userId);
    const variantId = userTests?.get(testId);
    if (!variantId) {
      return false;
    }

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) {
      return false;
    }

    variant.conversions++;
    variant.revenue += value;

    const events = this.conversionEvents.get(testId) || [];
    events.push({ userId, variantId, value, timestamp: Date.now() });
    this.conversionEvents.set(testId, events);

    return true;
  }

  /**
   * Calculate statistical significance using chi-square test
   */
  public calculateSignificance(testId: string): ABTestResult {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }

    const control = test.variants.find(v => v.isControl)!;
    const treatments = test.variants.filter(v => !v.isControl);

    // Build observed data for chi-square calculation
    const observed: number[][] = [];
    for (const variant of test.variants) {
      const nonConversions = variant.impressions - variant.conversions;
      observed.push([variant.conversions, Math.max(nonConversions, 0)]);
    }

    // Calculate chi-square statistic
    const { chiSquare, degreesOfFreedom } = this.calculateChiSquare(observed);

    // Calculate p-value from chi-square distribution
    const pValue = this.chiSquarePValue(chiSquare, degreesOfFreedom);
    const isSignificant = pValue < (1 - test.confidenceLevel);

    // Determine winner
    let winner: string | null = null;
    let maxConversionRate = 0;

    const variantResults: VariantResult[] = test.variants.map(variant => {
      const conversionRate = variant.impressions > 0
        ? variant.conversions / variant.impressions
        : 0;

      if (conversionRate > maxConversionRate) {
        maxConversionRate = conversionRate;
        winner = variant.id;
      }

      const controlRate = control.impressions > 0
        ? control.conversions / control.impressions
        : 0;

      const improvement = controlRate > 0
        ? (conversionRate - controlRate) / controlRate
        : 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        conversionRate,
        improvement: variant.isControl ? 0 : improvement,
        confidence: 1 - pValue,
        sampleSize: variant.impressions,
      };
    });

    // Only declare winner if significant
    if (!isSignificant) {
      winner = null;
    }

    const recommendedAction = this.getRecommendation(test, isSignificant, winner, variantResults);

    return {
      testId,
      winner,
      isSignificant,
      pValue,
      confidenceLevel: test.confidenceLevel,
      chiSquare,
      degreesOfFreedom,
      variantResults,
      recommendedAction,
    };
  }

  /**
   * Get results summary for an experiment
   */
  public getResults(testId: string): {
    test: ABTest;
    result: ABTestResult;
    totalImpressions: number;
    totalConversions: number;
    runDurationMs: number;
  } {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }

    const result = this.calculateSignificance(testId);
    const totalImpressions = test.variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = test.variants.reduce((sum, v) => sum + v.conversions, 0);
    const runDurationMs = Date.now() - test.startDate;

    return { test, result, totalImpressions, totalConversions, runDurationMs };
  }

  /**
   * Stop an experiment
   */
  public stopExperiment(testId: string): ABTest {
    const test = this.experiments.get(testId);
    if (!test) {
      throw new Error(`Experiment not found: ${testId}`);
    }

    test.status = 'stopped';
    test.endDate = Date.now();
    return test;
  }

  /**
   * Get all experiments
   */
  public getExperiments(status?: ABTestStatus): ABTest[] {
    const experiments = Array.from(this.experiments.values());
    if (status) {
      return experiments.filter(e => e.status === status);
    }
    return experiments;
  }

  /**
   * Get experiment by ID
   */
  public getExperiment(testId: string): ABTest | undefined {
    return this.experiments.get(testId);
  }

  /**
   * Delete an experiment
   */
  public deleteExperiment(testId: string): boolean {
    this.conversionEvents.delete(testId);
    // Clean user assignments
    for (const [, testMap] of this.userAssignments) {
      testMap.delete(testId);
    }
    return this.experiments.delete(testId);
  }

  // ---- Private Methods ----

  /**
   * Calculate chi-square statistic from observed data
   * Uses standard 2xN contingency table
   */
  private calculateChiSquare(observed: number[][]): { chiSquare: number; degreesOfFreedom: number } {
    const rows = observed.length;
    const cols = observed[0].length;

    // Calculate row and column totals
    const rowTotals: number[] = observed.map(row => row.reduce((s, v) => s + v, 0));
    const colTotals: number[] = [];
    for (let j = 0; j < cols; j++) {
      let total = 0;
      for (let i = 0; i < rows; i++) {
        total += observed[i][j];
      }
      colTotals.push(total);
    }
    const grandTotal = rowTotals.reduce((s, v) => s + v, 0);

    if (grandTotal === 0) {
      return { chiSquare: 0, degreesOfFreedom: (rows - 1) * (cols - 1) };
    }

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
        if (expected > 0) {
          const diff = observed[i][j] - expected;
          chiSquare += (diff * diff) / expected;
        }
      }
    }

    const degreesOfFreedom = (rows - 1) * (cols - 1);
    return { chiSquare, degreesOfFreedom };
  }

  /**
   * Approximate p-value from chi-square distribution
   * Uses Wilson-Hilferty approximation for the incomplete gamma function
   */
  private chiSquarePValue(chiSquare: number, df: number): number {
    if (chiSquare <= 0 || df <= 0) return 1.0;

    // Use regularized incomplete gamma function approximation
    const k = df / 2;
    const x = chiSquare / 2;

    // For small values, use series expansion
    if (x < k + 1) {
      return 1 - this.gammaSeries(k, x);
    }

    // For larger values, use continued fraction
    return this.gammaContinuedFraction(k, x);
  }

  /**
   * Lower regularized incomplete gamma function - series expansion
   */
  private gammaSeries(a: number, x: number): number {
    const lnGammaA = this.lnGamma(a);
    let sum = 1.0 / a;
    let term = 1.0 / a;

    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-10) break;
    }

    return sum * Math.exp(-x + a * Math.log(x) - lnGammaA);
  }

  /**
   * Upper regularized incomplete gamma function - continued fraction
   */
  private gammaContinuedFraction(a: number, x: number): number {
    const lnGammaA = this.lnGamma(a);
    let b = x + 1 - a;
    let c = 1e30;
    let d = 1 / b;
    let h = d;

    for (let i = 1; i < 200; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-10) break;
    }

    return Math.exp(-x + a * Math.log(x) - lnGammaA) * h;
  }

  /**
   * Log-gamma function using Stirling's approximation
   */
  private lnGamma(x: number): number {
    const coefficients = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
      y++;
      ser += coefficients[j] / y;
    }

    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  /**
   * Deterministic hash for consistent user assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private getRecommendation(
    test: ABTest,
    isSignificant: boolean,
    winner: string | null,
    results: VariantResult[]
  ): string {
    const totalSamples = results.reduce((sum, r) => sum + r.sampleSize, 0);

    if (totalSamples < test.minimumSampleSize * test.variants.length) {
      return 'Continue collecting data - minimum sample size not yet reached';
    }

    if (!isSignificant) {
      return 'No statistically significant difference detected - consider running longer or increasing traffic';
    }

    if (winner) {
      const winnerResult = results.find(r => r.variantId === winner);
      if (winnerResult) {
        return `Implement variant "${winnerResult.variantName}" - ${(winnerResult.improvement * 100).toFixed(1)}% improvement with ${(winnerResult.confidence * 100).toFixed(1)}% confidence`;
      }
    }

    return 'Review results manually - inconclusive';
  }

  private generateId(prefix: string): string {
    this.experimentCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.experimentCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
