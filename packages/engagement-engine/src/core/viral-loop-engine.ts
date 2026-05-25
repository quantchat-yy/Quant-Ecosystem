// ============================================================================
// Engagement Engine - Viral Loop Engine
// ============================================================================

import {
  ViralLoop,
  ViralCoefficient,
  ReferralChain,
  ReferralNode,
  IncentiveConfig,
  ViralLoopStage,
  EngagementEvent,
} from '../types';

interface ViralLoopConfig {
  maxChainDepth: number;
  cycleDetectionWindow: number;
  incentiveExplorationRate: number;
  conversionDecayFactor: number;
  minSampleSize: number;
  kFactorSmoothingWindow: number;
}

interface IncentiveArm {
  config: IncentiveConfig;
  successes: number;
  failures: number;
  totalReward: number;
  pulls: number;
}

interface FunnelStage {
  stage: ViralLoopStage;
  enteredCount: number;
  completedCount: number;
  avgTimeMs: number;
  dropoffRate: number;
}

export class ViralLoopEngine {
  private config: ViralLoopConfig;
  private loops: Map<string, ViralLoop> = new Map();
  private referralChains: Map<string, ReferralChain> = new Map();
  private userReferrals: Map<string, string[]> = new Map();
  private incentiveArms: Map<string, IncentiveArm> = new Map();
  private funnelData: Map<string, FunnelStage[]> = new Map();
  private kFactorHistory: number[] = [];
  private inviteEvents: Map<string, EngagementEvent[]> = new Map();
  private conversionEvents: Map<string, number> = new Map();

  constructor(config: Partial<ViralLoopConfig> = {}) {
    this.config = {
      maxChainDepth: config.maxChainDepth ?? 10,
      cycleDetectionWindow: config.cycleDetectionWindow ?? 86400000,
      incentiveExplorationRate: config.incentiveExplorationRate ?? 0.1,
      conversionDecayFactor: config.conversionDecayFactor ?? 0.95,
      minSampleSize: config.minSampleSize ?? 30,
      kFactorSmoothingWindow: config.kFactorSmoothingWindow ?? 7,
    };
  }

  registerLoop(loop: ViralLoop): void {
    this.loops.set(loop.id, loop);
    this.funnelData.set(
      loop.id,
      loop.stages.map((stage) => ({
        stage,
        enteredCount: 0,
        completedCount: 0,
        avgTimeMs: 0,
        dropoffRate: 0,
      })),
    );
  }

  calculateKFactor(loopId: string): ViralCoefficient {
    const loop = this.loops.get(loopId);
    if (!loop) {
      return {
        kFactor: 0,
        invitesSent: 0,
        conversionRate: 0,
        cycleTimeMs: 0,
        effectiveK: 0,
        trend: 'stable',
        projectedGrowth: 0,
      };
    }

    const inviteRate = loop.conversionRates['invite'] ?? 0;
    const signupRate = loop.conversionRates['signup'] ?? 0;
    const activateRate = loop.conversionRates['activate'] ?? 1;

    // K-factor = invites_sent_per_user * conversion_rate_per_invite
    const invitesSent = inviteRate;
    const conversionRate = signupRate * activateRate;
    const kFactor = invitesSent * conversionRate;

    // Track history for trend detection
    this.kFactorHistory.push(kFactor);
    if (this.kFactorHistory.length > 100) {
      this.kFactorHistory.shift();
    }

    // Effective K accounts for time decay in the viral cycle
    const cycleTime = loop.cycleTime;
    const decayPerCycle = Math.pow(this.config.conversionDecayFactor, cycleTime / 86400000);
    const effectiveK = kFactor * decayPerCycle;

    // Trend detection using linear regression on recent K-factor values
    const trend = this.detectKFactorTrend();

    // Projected growth: sum of geometric series if K < 1, exponential if K >= 1
    const projectedGrowth =
      effectiveK >= 1
        ? Math.pow(effectiveK, 30) // 30-day projection
        : 1 / (1 - effectiveK); // Converging series sum

    return {
      kFactor,
      invitesSent,
      conversionRate,
      cycleTimeMs: cycleTime,
      effectiveK,
      trend,
      projectedGrowth: Math.min(projectedGrowth, 1e9),
    };
  }

  private detectKFactorTrend(): 'growing' | 'stable' | 'declining' {
    const window = this.config.kFactorSmoothingWindow;
    if (this.kFactorHistory.length < window * 2) return 'stable';

    const recent = this.kFactorHistory.slice(-window);
    const previous = this.kFactorHistory.slice(-window * 2, -window);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    const changeRate = (recentAvg - previousAvg) / (previousAvg || 1);

    if (changeRate > 0.05) return 'growing';
    if (changeRate < -0.05) return 'declining';
    return 'stable';
  }

  trackReferral(referrerId: string, referredUserId: string, value: number = 0): ReferralNode {
    const existingReferrals = this.userReferrals.get(referrerId) ?? [];
    existingReferrals.push(referredUserId);
    this.userReferrals.set(referrerId, existingReferrals);

    // Find the chain this referrer belongs to
    let chain = this.findChainForUser(referrerId);
    const depth = chain ? chain.depth + 1 : 1;

    if (depth > this.config.maxChainDepth) {
      // Create a new chain root to prevent infinite depth
      chain = null;
    }

    const node: ReferralNode = {
      userId: referredUserId,
      referredBy: referrerId,
      convertedAt: Date.now(),
      depth,
      childCount: 0,
      value,
    };

    if (!chain) {
      // Start a new chain
      const newChain: ReferralChain = {
        rootUserId: referrerId,
        chain: [node],
        depth: 1,
        totalConversions: 1,
        totalValue: value,
        createdAt: Date.now(),
      };
      this.referralChains.set(referrerId, newChain);
    } else {
      chain.chain.push(node);
      chain.depth = Math.max(chain.depth, depth);
      chain.totalConversions += 1;
      chain.totalValue += value;

      // Update parent's child count
      const parent = chain.chain.find((n) => n.userId === referrerId);
      if (parent) {
        parent.childCount += 1;
      }
    }

    this.conversionEvents.set(referredUserId, Date.now());
    return node;
  }

  private findChainForUser(userId: string): ReferralChain | null {
    for (const [, chain] of this.referralChains) {
      if (chain.rootUserId === userId) return chain;
      if (chain.chain.some((n) => n.userId === userId)) return chain;
    }
    return null;
  }

  getReferralChain(rootUserId: string): ReferralChain | null {
    return this.referralChains.get(rootUserId) ?? null;
  }

  detectCycle(userId: string): boolean {
    // Detect if a user has re-entered the viral loop within the detection window
    const now = Date.now();
    const events = this.inviteEvents.get(userId) ?? [];
    const recentEvents = events.filter((e) => now - e.timestamp < this.config.cycleDetectionWindow);

    // Check if user has both invited and been invited in the window
    const hasInvited = recentEvents.some((e) => e.type === 'invite');
    const wasReferred = this.conversionEvents.has(userId);

    return hasInvited && wasReferred;
  }

  trackInviteEvent(event: EngagementEvent): void {
    const events = this.inviteEvents.get(event.userId) ?? [];
    events.push(event);
    this.inviteEvents.set(event.userId, events);
  }

  // Thompson Sampling for incentive optimization
  registerIncentive(config: IncentiveConfig): void {
    this.incentiveArms.set(config.id, {
      config,
      successes: 1, // Beta prior alpha = 1
      failures: 1, // Beta prior beta = 1
      totalReward: 0,
      pulls: 0,
    });
  }

  selectBestIncentive(): IncentiveConfig | null {
    const arms = Array.from(this.incentiveArms.values());
    if (arms.length === 0) return null;

    // Thompson Sampling: sample from Beta distribution for each arm
    let bestSample = -Infinity;
    let bestArm: IncentiveArm | null = null;

    for (const arm of arms) {
      // Sample from Beta(successes, failures) distribution
      const sample = this.sampleBeta(arm.successes, arm.failures);

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    }

    if (bestArm) {
      bestArm.pulls += 1;
    }

    return bestArm?.config ?? null;
  }

  recordIncentiveOutcome(incentiveId: string, converted: boolean, reward: number = 0): void {
    const arm = this.incentiveArms.get(incentiveId);
    if (!arm) return;

    if (converted) {
      arm.successes += 1;
      arm.totalReward += reward;
    } else {
      arm.failures += 1;
    }
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Approximation of Beta distribution sampling using the Joehnk method
    // For alpha, beta >= 1, use gamma-based method
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  private sampleGamma(shape: number): number {
    // Marsaglia and Tsang's method for gamma distribution
    if (shape < 1) {
      const u = Math.random();
      return this.sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
    }

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
    // Box-Muller transform for standard normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  optimizeConversionFunnel(loopId: string): FunnelStage[] {
    const funnel = this.funnelData.get(loopId);
    if (!funnel) return [];

    // Calculate dropoff rates and identify bottlenecks
    for (let i = 0; i < funnel.length; i++) {
      const stage = funnel[i]!;
      if (stage.enteredCount > 0) {
        stage.dropoffRate = 1 - stage.completedCount / stage.enteredCount;
      }
    }

    return funnel;
  }

  recordFunnelEvent(
    loopId: string,
    stage: ViralLoopStage,
    entered: boolean,
    completed: boolean,
  ): void {
    const funnel = this.funnelData.get(loopId);
    if (!funnel) return;

    const stageData = funnel.find((s) => s.stage === stage);
    if (!stageData) return;

    if (entered) stageData.enteredCount += 1;
    if (completed) stageData.completedCount += 1;
  }

  // Gradient ascent on conversion funnel
  optimizeIncentiveValue(incentiveId: string, learningRate: number = 0.01): number {
    const arm = this.incentiveArms.get(incentiveId);
    if (!arm || arm.pulls === 0) return arm?.config.value ?? 0;

    // Compute gradient: marginal conversion improvement per unit of incentive value
    const conversionRate = arm.successes / (arm.successes + arm.failures);
    const avgReward = arm.totalReward / arm.pulls;

    // ROI-based gradient: we want to maximize (conversions * LTV - cost)
    // Gradient approximation: d(ROI)/d(value) ~ (conversionRate * avgReward - value) / value
    const currentValue = arm.config.value;
    const gradient = (conversionRate * avgReward - currentValue) / (currentValue || 1);

    // Update incentive value using gradient ascent with clipping
    const newValue = currentValue + learningRate * gradient;
    arm.config.value = Math.max(0.01, Math.min(newValue, currentValue * 2));

    return arm.config.value;
  }

  getIncentiveStats(
    incentiveId: string,
  ): { conversionRate: number; avgReward: number; pulls: number } | null {
    const arm = this.incentiveArms.get(incentiveId);
    if (!arm) return null;

    return {
      conversionRate: arm.successes / (arm.successes + arm.failures),
      avgReward: arm.pulls > 0 ? arm.totalReward / arm.pulls : 0,
      pulls: arm.pulls,
    };
  }

  calculateViralReach(rootUserId: string, generations: number): number {
    // Calculate expected reach over N generations using branching process theory
    const chain = this.referralChains.get(rootUserId);
    if (!chain) return 1;

    const avgBranchingFactor =
      chain.chain.length > 0
        ? chain.chain.reduce((sum, n) => sum + n.childCount, 0) / chain.chain.length
        : 0;

    // Expected total reach = sum of geometric series: 1 + k + k^2 + ... + k^n
    if (avgBranchingFactor <= 0) return 1;
    if (avgBranchingFactor === 1) return generations + 1;

    return (Math.pow(avgBranchingFactor, generations + 1) - 1) / (avgBranchingFactor - 1);
  }

  getLoopMetrics(loopId: string): { kFactor: ViralCoefficient; funnel: FunnelStage[] } | null {
    const loop = this.loops.get(loopId);
    if (!loop) return null;

    return {
      kFactor: this.calculateKFactor(loopId),
      funnel: this.optimizeConversionFunnel(loopId),
    };
  }

  getChainDepthDistribution(): Map<number, number> {
    const distribution = new Map<number, number>();
    for (const [, chain] of this.referralChains) {
      for (const node of chain.chain) {
        const count = distribution.get(node.depth) ?? 0;
        distribution.set(node.depth, count + 1);
      }
    }
    return distribution;
  }

  getTotalReferrals(): number {
    let total = 0;
    for (const [, chain] of this.referralChains) {
      total += chain.totalConversions;
    }
    return total;
  }
}
