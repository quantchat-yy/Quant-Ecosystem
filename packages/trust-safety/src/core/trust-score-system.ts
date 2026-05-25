// ============================================================================
// Trust & Safety - Trust Score System
// Multi-dimensional trust scoring, Bayesian updating, trust decay,
// trust recovery, cross-app transfer, privilege mapping
// ============================================================================

import type {
  TrustScore,
  TrustDimension,
  TrustLevel,
  TrustDecayConfig,
  ReputationEvent,
} from '../types';

/** Trust dimension weight configuration */
interface DimensionWeights {
  content_quality: number;
  community_standing: number;
  account_age: number;
  verification: number;
  violation_history: number;
}

/** Trust level threshold */
interface TrustThreshold {
  level: TrustLevel;
  minScore: number;
  privileges: string[];
}

/** Bayesian update parameters */
interface BayesianUpdate {
  prior: number;
  likelihood: number;
  evidence: number;
  posterior: number;
}

/** Trust transfer record */
interface TrustTransfer {
  fromApp: string;
  toApp: string;
  originalScore: number;
  transferredScore: number;
  similarity: number;
  timestamp: number;
}

/**
 * TrustScoreSystem implements multi-dimensional trust scoring with Bayesian
 * updating, logarithmic decay over inactivity, sigmoid-based recovery after
 * violations, and cross-app trust transfer within the ecosystem.
 */
export class TrustScoreSystem {
  private readonly scores: Map<string, TrustScore>;
  private readonly events: Map<string, ReputationEvent[]>;
  private readonly transfers: TrustTransfer[];
  private readonly decayConfig: TrustDecayConfig;
  private readonly weights: DimensionWeights;
  private readonly thresholds: TrustThreshold[];
  private eventCounter: number;

  constructor(config?: {
    decayConfig?: Partial<TrustDecayConfig>;
    weights?: Partial<DimensionWeights>;
  }) {
    this.scores = new Map();
    this.events = new Map();
    this.transfers = [];
    this.eventCounter = 0;

    this.decayConfig = {
      decayHalflifeDays: 90,
      minScore: 0.1,
      inactivityThresholdDays: 30,
      ...config?.decayConfig,
    };

    this.weights = {
      content_quality: 0.3,
      community_standing: 0.25,
      account_age: 0.2,
      verification: 0.15,
      violation_history: 0.1,
      ...config?.weights,
    };

    this.thresholds = [
      {
        level: 'elder',
        minScore: 0.95,
        privileges: ['moderate', 'mentor', 'feature_preview', 'unlimited_uploads', 'custom_badges'],
      },
      {
        level: 'leader',
        minScore: 0.85,
        privileges: ['moderate', 'mentor', 'feature_preview', 'extended_uploads'],
      },
      {
        level: 'trusted',
        minScore: 0.7,
        privileges: ['flag_content', 'extended_replies', 'group_create'],
      },
      { level: 'member', minScore: 0.5, privileges: ['post', 'comment', 'react', 'report'] },
      { level: 'basic', minScore: 0.25, privileges: ['post', 'comment', 'react'] },
      { level: 'new', minScore: 0, privileges: ['comment', 'react'] },
    ];
  }

  /**
   * Initialize a trust score for a new user
   */
  initializeUser(
    userId: string,
    accountAgeDays: number = 0,
    verified: boolean = false,
  ): TrustScore {
    const dimensions: Record<TrustDimension, number> = {
      content_quality: 0.5,
      community_standing: 0.5,
      account_age: this.calculateAgeFactor(accountAgeDays),
      verification: verified ? 1.0 : 0.0,
      violation_history: 1.0, // Starts clean (1 = no violations)
    };

    const overallScore = this.calculateOverallScore(dimensions);
    const level = this.determineLevel(overallScore);

    const score: TrustScore = {
      userId,
      overallScore,
      dimensions,
      lastUpdatedAt: Date.now(),
      level: level.level,
      privileges: level.privileges,
    };

    this.scores.set(userId, score);
    this.events.set(userId, []);
    return score;
  }

  /**
   * Calculate overall trust score as weighted sum of dimensions.
   * score = content_quality*0.3 + community_standing*0.25 + account_age_factor*0.2
   *         + verification*0.15 + violation_penalty*0.1
   */
  calculateOverallScore(dimensions: Record<TrustDimension, number>): number {
    return (
      dimensions.content_quality * this.weights.content_quality +
      dimensions.community_standing * this.weights.community_standing +
      dimensions.account_age * this.weights.account_age +
      dimensions.verification * this.weights.verification +
      dimensions.violation_history * this.weights.violation_history
    );
  }

  /**
   * Calculate account age factor using asymptotic function.
   * factor = 1 - e^(-age_days / 180)
   * Approaches 1 as account ages, with diminishing returns.
   */
  calculateAgeFactor(ageDays: number): number {
    return 1 - Math.exp(-ageDays / 180);
  }

  /**
   * Apply trust decay due to inactivity.
   * score = score * e^(-inactivity_days / decay_halflife)
   */
  applyDecay(userId: string, inactivityDays: number): TrustScore | null {
    const score = this.scores.get(userId);
    if (!score) return null;

    if (inactivityDays <= this.decayConfig.inactivityThresholdDays) {
      return score; // No decay within threshold
    }

    const effectiveInactivity = inactivityDays - this.decayConfig.inactivityThresholdDays;
    const decayFactor = Math.exp(-effectiveInactivity / this.decayConfig.decayHalflifeDays);

    score.overallScore = Math.max(this.decayConfig.minScore, score.overallScore * decayFactor);

    // Decay individual dimensions proportionally
    for (const dim of Object.keys(score.dimensions) as TrustDimension[]) {
      if (dim !== 'account_age' && dim !== 'verification') {
        score.dimensions[dim] = Math.max(
          this.decayConfig.minScore,
          score.dimensions[dim] * decayFactor,
        );
      }
    }

    const level = this.determineLevel(score.overallScore);
    score.level = level.level;
    score.privileges = level.privileges;
    score.lastUpdatedAt = Date.now();

    return score;
  }

  /**
   * Calculate trust recovery after a violation using sigmoid curve.
   * recovery = base_score * sigmoid((days_since_violation - recovery_midpoint) / steepness)
   * Where sigmoid(x) = 1 / (1 + e^(-x))
   */
  calculateRecovery(
    baseScore: number,
    daysSinceViolation: number,
    recoveryMidpointDays: number = 90,
    steepness: number = 15,
  ): number {
    const x = (daysSinceViolation - recoveryMidpointDays) / steepness;
    const sigmoid = 1 / (1 + Math.exp(-x));
    return baseScore * sigmoid;
  }

  /**
   * Apply a violation penalty to a user's trust score
   */
  applyViolation(userId: string, severity: number): TrustScore | null {
    const score = this.scores.get(userId);
    if (!score) return null;

    // Reduce violation_history dimension based on severity (0-1)
    const penalty = Math.min(1, severity);
    score.dimensions.violation_history = Math.max(0, score.dimensions.violation_history - penalty);

    // Also reduce community_standing
    score.dimensions.community_standing = Math.max(
      0,
      score.dimensions.community_standing - penalty * 0.5,
    );

    score.overallScore = this.calculateOverallScore(score.dimensions);
    const level = this.determineLevel(score.overallScore);
    score.level = level.level;
    score.privileges = level.privileges;
    score.lastUpdatedAt = Date.now();

    this.recordEvent(userId, {
      type: 'negative',
      action: 'violation',
      scoreDelta: -penalty,
      source: 'moderation',
    });

    return score;
  }

  /**
   * Apply recovery to a user's violation history based on time elapsed
   */
  applyRecovery(userId: string, daysSinceViolation: number): TrustScore | null {
    const score = this.scores.get(userId);
    if (!score) return null;

    const recoveredValue = this.calculateRecovery(
      1.0, // Max violation_history score
      daysSinceViolation,
    );

    score.dimensions.violation_history = Math.max(
      score.dimensions.violation_history,
      recoveredValue,
    );

    score.overallScore = this.calculateOverallScore(score.dimensions);
    const level = this.determineLevel(score.overallScore);
    score.level = level.level;
    score.privileges = level.privileges;
    score.lastUpdatedAt = Date.now();

    return score;
  }

  /**
   * Transfer trust between ecosystem apps, weighted by app similarity.
   * transferredScore = originalScore * similarity * transferFactor
   */
  transferTrust(
    userId: string,
    fromApp: string,
    toApp: string,
    similarity: number,
    transferFactor: number = 0.7,
  ): number {
    const score = this.scores.get(userId);
    if (!score) return 0;

    const clampedSimilarity = Math.max(0, Math.min(1, similarity));
    const transferredScore = score.overallScore * clampedSimilarity * transferFactor;

    this.transfers.push({
      fromApp,
      toApp,
      originalScore: score.overallScore,
      transferredScore,
      similarity: clampedSimilarity,
      timestamp: Date.now(),
    });

    return transferredScore;
  }

  /**
   * Bayesian trust updating: posterior = (prior * likelihood) / evidence
   * Used to update trust based on new behavioral evidence.
   */
  bayesianUpdate(
    userId: string,
    dimension: TrustDimension,
    likelihood: number,
    evidence: number,
  ): BayesianUpdate | null {
    const score = this.scores.get(userId);
    if (!score) return null;

    const prior = score.dimensions[dimension];

    // Avoid division by zero
    const safeEvidence = Math.max(evidence, 0.001);
    let posterior = (prior * likelihood) / safeEvidence;

    // Clamp to [0, 1]
    posterior = Math.max(0, Math.min(1, posterior));

    score.dimensions[dimension] = posterior;
    score.overallScore = this.calculateOverallScore(score.dimensions);

    const level = this.determineLevel(score.overallScore);
    score.level = level.level;
    score.privileges = level.privileges;
    score.lastUpdatedAt = Date.now();

    return { prior, likelihood, evidence: safeEvidence, posterior };
  }

  /**
   * Update a specific dimension with a new value (clamped 0-1)
   */
  updateDimension(userId: string, dimension: TrustDimension, value: number): TrustScore | null {
    const score = this.scores.get(userId);
    if (!score) return null;

    score.dimensions[dimension] = Math.max(0, Math.min(1, value));
    score.overallScore = this.calculateOverallScore(score.dimensions);

    const level = this.determineLevel(score.overallScore);
    score.level = level.level;
    score.privileges = level.privileges;
    score.lastUpdatedAt = Date.now();

    return score;
  }

  /**
   * Determine trust level from score
   */
  private determineLevel(score: number): TrustThreshold {
    for (const threshold of this.thresholds) {
      if (score >= threshold.minScore) {
        return threshold;
      }
    }
    // Always returns the last threshold (lowest minScore = 0)
    return this.thresholds[this.thresholds.length - 1]!;
  }

  /**
   * Record a reputation event
   */
  private recordEvent(
    userId: string,
    event: Omit<ReputationEvent, 'id' | 'userId' | 'timestamp'>,
  ): void {
    const events = this.events.get(userId) ?? [];
    events.push({
      id: `event_${++this.eventCounter}`,
      userId,
      timestamp: Date.now(),
      ...event,
    });
    this.events.set(userId, events);
  }

  /**
   * Get a user's trust score
   */
  getScore(userId: string): TrustScore | null {
    return this.scores.get(userId) ?? null;
  }

  /**
   * Get event history for a user
   */
  getEvents(userId: string): ReputationEvent[] {
    return this.events.get(userId) ?? [];
  }

  /**
   * Check if a user has a specific privilege
   */
  hasPrivilege(userId: string, privilege: string): boolean {
    const score = this.scores.get(userId);
    if (!score) return false;
    return score.privileges.includes(privilege);
  }

  /**
   * Get all users at or above a trust level
   */
  getUsersByLevel(minLevel: TrustLevel): string[] {
    const minThreshold = this.thresholds.find((t) => t.level === minLevel);
    if (!minThreshold) return [];

    const result: string[] = [];
    for (const [userId, score] of this.scores) {
      if (score.overallScore >= minThreshold.minScore) {
        result.push(userId);
      }
    }
    return result;
  }
}
