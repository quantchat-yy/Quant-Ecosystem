// ============================================================================
// Engagement Engine - Retention Predictor
// ============================================================================

import {
  RetentionCohort,
  ChurnPrediction,
  RiskFactor,
  LifecycleStage,
  WinBackScore,
  SurvivalCurvePoint,
  NotificationChannel,
  IncentiveConfig,
} from '../types';

interface RetentionConfig {
  churnThreshold: number;
  atRiskThreshold: number;
  dormantDays: number;
  churnedDays: number;
  survivalBucketDays: number;
  reengagementCooldownMs: number;
  minDataPointsForPrediction: number;
}

interface UserActivity {
  userId: string;
  firstSeenAt: number;
  lastActiveAt: number;
  sessionCount: number;
  totalActions: number;
  actionsPerSession: number;
  daysSinceLastActive: number;
  weeklyFrequency: number[];
  featureUsage: Map<string, number>;
  monetizationEvents: number;
}

interface CohortData {
  cohortId: string;
  startDate: number;
  users: Set<string>;
  retentionByDay: Map<number, number>;
  retentionByWeek: Map<number, number>;
  survivalCurve: SurvivalCurvePoint[];
}

interface HazardModel {
  baseHazard: number[];
  coefficients: Map<string, number>;
  baselineMedian: number;
}

export class RetentionPredictor {
  private config: RetentionConfig;
  private userActivities: Map<string, UserActivity> = new Map();
  private cohorts: Map<string, CohortData> = new Map();
  private hazardModel: HazardModel;
  private lifecycleStages: Map<string, LifecycleStage> = new Map();

  constructor(config: Partial<RetentionConfig> = {}) {
    this.config = {
      churnThreshold: config.churnThreshold ?? 0.7,
      atRiskThreshold: config.atRiskThreshold ?? 0.4,
      dormantDays: config.dormantDays ?? 14,
      churnedDays: config.churnedDays ?? 30,
      survivalBucketDays: config.survivalBucketDays ?? 7,
      reengagementCooldownMs: config.reengagementCooldownMs ?? 604800000, // 7 days
      minDataPointsForPrediction: config.minDataPointsForPrediction ?? 5,
    };

    // Initialize proportional hazards model with default coefficients
    this.hazardModel = {
      baseHazard: this.generateBaselineHazard(),
      coefficients: new Map([
        ['days_inactive', 0.15],
        ['session_frequency', -0.3],
        ['actions_per_session', -0.2],
        ['feature_diversity', -0.25],
        ['monetization', -0.4],
        ['week_over_week_decline', 0.35],
        ['session_duration_trend', -0.15],
      ]),
      baselineMedian: 60, // Days
    };
  }

  private generateBaselineHazard(): number[] {
    // Weibull-based baseline hazard: h(t) = (k/lambda) * (t/lambda)^(k-1)
    // With shape k=0.8 (decreasing hazard - early churn more likely)
    const k = 0.8;
    const lambda = 60; // Scale parameter (median ~ 60 days)
    const buckets: number[] = [];

    for (let day = 1; day <= 365; day += this.config.survivalBucketDays) {
      const t = day;
      const hazard = (k / lambda) * Math.pow(t / lambda, k - 1);
      buckets.push(Math.min(hazard, 1));
    }

    return buckets;
  }

  recordUserActivity(
    userId: string,
    sessionCount: number,
    totalActions: number,
    features: string[],
  ): void {
    const now = Date.now();
    let activity = this.userActivities.get(userId);

    if (!activity) {
      activity = {
        userId,
        firstSeenAt: now,
        lastActiveAt: now,
        sessionCount: 0,
        totalActions: 0,
        actionsPerSession: 0,
        daysSinceLastActive: 0,
        weeklyFrequency: [],
        featureUsage: new Map(),
        monetizationEvents: 0,
      };
    }

    activity.lastActiveAt = now;
    activity.sessionCount += sessionCount;
    activity.totalActions += totalActions;
    activity.actionsPerSession =
      activity.sessionCount > 0 ? activity.totalActions / activity.sessionCount : 0;
    activity.daysSinceLastActive = 0;

    // Update feature usage
    for (const feature of features) {
      const count = activity.featureUsage.get(feature) ?? 0;
      activity.featureUsage.set(feature, count + 1);
    }

    // Update weekly frequency (keep last 12 weeks)
    const currentWeek = Math.floor((now - activity.firstSeenAt) / 604800000);
    while (activity.weeklyFrequency.length <= currentWeek) {
      activity.weeklyFrequency.push(0);
    }
    activity.weeklyFrequency[currentWeek] =
      (activity.weeklyFrequency[currentWeek] ?? 0) + sessionCount;

    if (activity.weeklyFrequency.length > 12) {
      activity.weeklyFrequency = activity.weeklyFrequency.slice(-12);
    }

    this.userActivities.set(userId, activity);

    // Update lifecycle stage
    this.updateLifecycleStage(userId);
  }

  recordMonetization(userId: string): void {
    const activity = this.userActivities.get(userId);
    if (activity) {
      activity.monetizationEvents += 1;
    }
  }

  predictChurn(userId: string): ChurnPrediction {
    const activity = this.userActivities.get(userId);

    if (!activity) {
      return {
        userId,
        churnProbability: 0.5,
        riskFactors: [],
        lifecycleStage: 'new',
        confidenceInterval: [0.3, 0.7],
      };
    }

    const now = Date.now();
    const daysSinceLastActive = (now - activity.lastActiveAt) / 86400000;
    activity.daysSinceLastActive = daysSinceLastActive;

    // Compute risk factors using Cox Proportional Hazards model
    const riskFactors = this.computeRiskFactors(activity);

    // Calculate hazard ratio: exp(sum of beta_i * x_i)
    let linearPredictor = 0;
    for (const factor of riskFactors) {
      const coefficient = this.hazardModel.coefficients.get(factor.name) ?? 0;
      linearPredictor += coefficient * factor.currentValue;
    }
    const hazardRatio = Math.exp(linearPredictor);

    // Survival probability at current time: S(t) = S0(t)^(hazardRatio)
    const timeIndex = Math.min(
      Math.floor(daysSinceLastActive / this.config.survivalBucketDays),
      this.hazardModel.baseHazard.length - 1,
    );

    // Cumulative baseline hazard
    let cumulativeBaseHazard = 0;
    for (let i = 0; i <= timeIndex; i++) {
      cumulativeBaseHazard += this.hazardModel.baseHazard[i] ?? 0;
    }

    // Survival probability
    const survivalProb = Math.exp(-cumulativeBaseHazard * hazardRatio);
    const churnProbability = 1 - survivalProb;

    // Confidence interval using delta method approximation
    const se = Math.sqrt(
      (churnProbability * (1 - churnProbability)) / Math.max(activity.sessionCount, 1),
    );
    const z = 1.96; // 95% CI
    const lower = Math.max(0, churnProbability - z * se);
    const upper = Math.min(1, churnProbability + z * se);

    // Predicted churn date: median survival time for this user
    const predictedDaysToChurn = this.hazardModel.baselineMedian / hazardRatio;
    const predictedChurnDate = activity.lastActiveAt + predictedDaysToChurn * 86400000;

    const lifecycleStage = this.getLifecycleStage(userId);

    return {
      userId,
      churnProbability: Math.min(1, Math.max(0, churnProbability)),
      riskFactors,
      predictedChurnDate: churnProbability > 0.5 ? predictedChurnDate : undefined,
      lifecycleStage,
      confidenceInterval: [lower, upper],
    };
  }

  private computeRiskFactors(activity: UserActivity): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Days inactive
    factors.push({
      name: 'days_inactive',
      impact: activity.daysSinceLastActive * 0.15,
      direction: 'negative',
      currentValue: activity.daysSinceLastActive / 30, // Normalized
      threshold: this.config.dormantDays,
    });

    // Session frequency (lower = more risk)
    const recentWeeks = activity.weeklyFrequency.slice(-4);
    const avgWeeklyFreq =
      recentWeeks.length > 0 ? recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length : 0;
    factors.push({
      name: 'session_frequency',
      impact: Math.max(0, (3 - avgWeeklyFreq) * 0.3),
      direction: avgWeeklyFreq < 2 ? 'negative' : 'positive',
      currentValue: avgWeeklyFreq / 7, // Normalized
      threshold: 2,
    });

    // Actions per session
    factors.push({
      name: 'actions_per_session',
      impact: Math.max(0, (5 - activity.actionsPerSession) * 0.2),
      direction: activity.actionsPerSession < 5 ? 'negative' : 'positive',
      currentValue: activity.actionsPerSession / 10, // Normalized
      threshold: 5,
    });

    // Feature diversity
    const featureDiversity = activity.featureUsage.size / 10; // Normalized by expected features
    factors.push({
      name: 'feature_diversity',
      impact: Math.max(0, (0.5 - featureDiversity) * 0.25),
      direction: featureDiversity < 0.3 ? 'negative' : 'positive',
      currentValue: featureDiversity,
      threshold: 0.3,
    });

    // Monetization
    const hasMonetized = activity.monetizationEvents > 0;
    factors.push({
      name: 'monetization',
      impact: hasMonetized ? -0.4 : 0.1,
      direction: hasMonetized ? 'positive' : 'negative',
      currentValue: hasMonetized ? 1 : 0,
      threshold: 1,
    });

    // Week-over-week decline
    const wowDecline = this.calculateWoWDecline(activity.weeklyFrequency);
    factors.push({
      name: 'week_over_week_decline',
      impact: Math.max(0, wowDecline * 0.35),
      direction: wowDecline > 0.2 ? 'negative' : 'positive',
      currentValue: wowDecline,
      threshold: 0.2,
    });

    return factors;
  }

  private calculateWoWDecline(weeklyFrequency: number[]): number {
    if (weeklyFrequency.length < 2) return 0;

    const recent = weeklyFrequency.slice(-4);
    if (recent.length < 2) return 0;

    // Linear regression slope on weekly frequency
    const n = recent.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i] ?? 0;
      sumXY += i * (recent[i] ?? 0);
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const avgFreq = sumY / n;

    // Normalized decline rate (negative slope = decline)
    return avgFreq > 0 ? Math.max(0, -slope / avgFreq) : 0;
  }

  private updateLifecycleStage(userId: string): void {
    const activity = this.userActivities.get(userId);
    if (!activity) return;

    const now = Date.now();
    const daysSinceFirst = (now - activity.firstSeenAt) / 86400000;
    const daysSinceLastActive = (now - activity.lastActiveAt) / 86400000;

    let stage: LifecycleStage;

    if (daysSinceFirst < 7) {
      stage = activity.sessionCount > 2 ? 'activated' : 'new';
    } else if (daysSinceLastActive > this.config.churnedDays) {
      // Check if they were previously churned and came back
      const previousStage = this.lifecycleStages.get(userId);
      stage = previousStage === 'churned' ? 'resurrected' : 'churned';
    } else if (daysSinceLastActive > this.config.dormantDays) {
      stage = 'dormant';
    } else if (
      daysSinceLastActive > 7 ||
      this.calculateWoWDecline(activity.weeklyFrequency) > 0.3
    ) {
      stage = 'at_risk';
    } else {
      stage = 'active';
    }

    this.lifecycleStages.set(userId, stage);
  }

  getLifecycleStage(userId: string): LifecycleStage {
    return this.lifecycleStages.get(userId) ?? 'new';
  }

  // Kaplan-Meier survival curve estimation
  computeSurvivalCurve(cohortId: string): SurvivalCurvePoint[] {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return [];

    const now = Date.now();
    const users = Array.from(cohort.users);

    // Collect event times (time to churn or censored time)
    const eventTimes: { time: number; censored: boolean }[] = [];

    for (const userId of users) {
      const activity = this.userActivities.get(userId);
      if (!activity) continue;

      const daysSinceJoin = (now - activity.firstSeenAt) / 86400000;
      const isChurned = (now - activity.lastActiveAt) / 86400000 > this.config.churnedDays;

      eventTimes.push({
        time: isChurned ? (activity.lastActiveAt - activity.firstSeenAt) / 86400000 : daysSinceJoin,
        censored: !isChurned,
      });
    }

    // Sort by time
    eventTimes.sort((a, b) => a.time - b.time);

    // Kaplan-Meier estimator
    const curve: SurvivalCurvePoint[] = [];
    let survivalRate = 1.0;
    let atRisk = eventTimes.length;
    let currentBucket = 0;

    const maxDays = Math.max(...eventTimes.map((e) => e.time), 1);
    const numBuckets = Math.ceil(maxDays / this.config.survivalBucketDays);

    for (let bucket = 0; bucket <= numBuckets; bucket++) {
      const bucketStart = bucket * this.config.survivalBucketDays;
      const bucketEnd = (bucket + 1) * this.config.survivalBucketDays;

      // Count events and censored in this bucket
      let events = 0;
      let censored = 0;

      while (currentBucket < eventTimes.length && eventTimes[currentBucket]!.time < bucketEnd) {
        if (eventTimes[currentBucket]!.censored) {
          censored += 1;
        } else {
          events += 1;
        }
        currentBucket += 1;
      }

      // Kaplan-Meier step: S(t) = S(t-1) * (1 - d_i / n_i)
      if (atRisk > 0 && events > 0) {
        survivalRate *= 1 - events / atRisk;
      }

      // Hazard rate: h(t) = d_i / (n_i * interval_width)
      const hazardRate = atRisk > 0 ? events / (atRisk * this.config.survivalBucketDays) : 0;

      curve.push({
        time: bucketStart,
        survivalRate: Math.max(0, survivalRate),
        hazardRate,
        censoredCount: censored,
        atRiskCount: atRisk,
      });

      atRisk -= events + censored;
      if (atRisk <= 0) break;
    }

    // Store in cohort
    cohort.survivalCurve = curve;

    return curve;
  }

  createCohort(cohortId: string, userIds: string[]): void {
    this.cohorts.set(cohortId, {
      cohortId,
      startDate: Date.now(),
      users: new Set(userIds),
      retentionByDay: new Map(),
      retentionByWeek: new Map(),
      survivalCurve: [],
    });
  }

  getCohortRetention(cohortId: string): RetentionCohort | null {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return null;

    const now = Date.now();
    const daysSinceStart = Math.floor((now - cohort.startDate) / 86400000);

    // Calculate retention at each day
    const retentionByDay: Record<number, number> = {};
    const retentionByWeek: Record<number, number> = {};
    let activeCount = 0;

    for (const userId of cohort.users) {
      const activity = this.userActivities.get(userId);
      if (!activity) continue;

      const daysActive = Math.floor((activity.lastActiveAt - cohort.startDate) / 86400000);
      for (let day = 0; day <= Math.min(daysActive, daysSinceStart); day++) {
        retentionByDay[day] = (retentionByDay[day] ?? 0) + 1;
      }

      if ((now - activity.lastActiveAt) / 86400000 < this.config.churnedDays) {
        activeCount += 1;
      }
    }

    // Normalize by cohort size
    const size = cohort.users.size;
    for (const day of Object.keys(retentionByDay)) {
      retentionByDay[Number(day)] = (retentionByDay[Number(day)] ?? 0) / size;
    }

    // Weekly aggregation
    for (let week = 0; week <= Math.floor(daysSinceStart / 7); week++) {
      const dayKey = week * 7;
      retentionByWeek[week] = retentionByDay[dayKey] ?? 0;
    }

    // Median lifespan estimation from survival curve
    const curve = this.computeSurvivalCurve(cohortId);
    let medianLifespan = daysSinceStart;
    for (const point of curve) {
      if (point.survivalRate <= 0.5) {
        medianLifespan = point.time;
        break;
      }
    }

    return {
      cohortId,
      startDate: cohort.startDate,
      size,
      retentionByDay,
      retentionByWeek,
      medianLifespan,
      avgRevenue: 0,
    };
  }

  // Win-back scoring for churned/dormant users
  scoreWinBack(userId: string): WinBackScore | null {
    const activity = this.userActivities.get(userId);
    if (!activity) return null;

    const stage = this.getLifecycleStage(userId);
    if (stage !== 'dormant' && stage !== 'churned') return null;

    const daysSinceActive = (Date.now() - activity.lastActiveAt) / 86400000;

    // Win-back score factors:
    // 1. Previous engagement intensity (higher = more likely to return)
    const engagementScore = Math.min(1, activity.actionsPerSession / 10);

    // 2. Recency of churn (more recent = easier to win back)
    const recencyScore = Math.exp(-daysSinceActive / 60);

    // 3. Historical monetization (paying users more valuable to win back)
    const monetizationScore = activity.monetizationEvents > 0 ? 0.8 : 0.2;

    // 4. Feature diversity (sticky users more likely to return)
    const stickinessScore = Math.min(1, activity.featureUsage.size / 8);

    // Combined win-back score
    const score =
      engagementScore * 0.3 +
      recencyScore * 0.3 +
      monetizationScore * 0.25 +
      stickinessScore * 0.15;

    // Predicted reactivation probability based on historical data
    const predictedReactivation = score * recencyScore;

    // Best channel selection based on previous activity patterns
    const bestChannel: NotificationChannel = activity.monetizationEvents > 0 ? 'email' : 'push';

    // Best incentive based on user value
    const bestIncentive: IncentiveConfig = {
      id: `winback_${userId}`,
      name: activity.monetizationEvents > 0 ? 'Premium discount' : 'Feature unlock',
      type: activity.monetizationEvents > 0 ? 'discount' : 'feature_unlock',
      value: activity.monetizationEvents > 0 ? 25 : 1,
      maxRedemptions: 1,
      expiresAt: Date.now() + 7 * 86400000,
    };

    return {
      userId,
      score,
      bestChannel,
      bestIncentive,
      predictedReactivation,
      lastActiveAt: activity.lastActiveAt,
    };
  }

  getAtRiskUsers(limit: number = 50): ChurnPrediction[] {
    const predictions: ChurnPrediction[] = [];

    for (const userId of this.userActivities.keys()) {
      const stage = this.getLifecycleStage(userId);
      if (stage === 'at_risk' || stage === 'dormant') {
        predictions.push(this.predictChurn(userId));
      }
    }

    // Sort by churn probability descending
    predictions.sort((a, b) => b.churnProbability - a.churnProbability);
    return predictions.slice(0, limit);
  }

  getLifecycleDistribution(): Record<LifecycleStage, number> {
    const distribution: Record<LifecycleStage, number> = {
      new: 0,
      activated: 0,
      active: 0,
      at_risk: 0,
      dormant: 0,
      churned: 0,
      resurrected: 0,
    };

    for (const [, stage] of this.lifecycleStages) {
      distribution[stage] += 1;
    }

    return distribution;
  }

  getUserCount(): number {
    return this.userActivities.size;
  }

  getCohortCount(): number {
    return this.cohorts.size;
  }
}
