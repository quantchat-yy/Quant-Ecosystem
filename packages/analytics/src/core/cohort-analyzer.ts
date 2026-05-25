// ============================================================================
// Analytics - Cohort Analyzer
// Time-based cohort grouping with retention curves and churn analysis
// ============================================================================

import type {
  CohortDefinition,
  CohortMetrics,
  CohortFilter,
  CohortGroupBy,
  PeriodMetric,
} from '../types';

/** User data within a cohort */
interface CohortUser {
  userId: string;
  joinedAt: number;
  lastActiveAt: number;
  totalRevenue: number;
  totalEvents: number;
  properties: Record<string, unknown>;
  activePeriodsSet: Set<number>;
}

/**
 * CohortAnalyzer - Time-based cohort grouping and retention analysis
 *
 * Groups users into cohorts by signup date or first action,
 * tracks retention over time periods, calculates churn rates,
 * and enables cohort-to-cohort comparison.
 */
export class CohortAnalyzer {
  private cohorts: Map<string, CohortDefinition>;
  private cohortUsers: Map<string, Map<string, CohortUser>>; // cohortId -> userId -> user
  private cohortCounter: number = 0;

  constructor() {
    this.cohorts = new Map();
    this.cohortUsers = new Map();
  }

  /**
   * Define a new cohort with grouping criteria
   */
  public defineCohort(
    name: string,
    description: string,
    groupBy: CohortGroupBy,
    options: {
      startDate?: number;
      endDate?: number;
      filters?: CohortFilter[];
      retentionPeriod?: 'day' | 'week' | 'month';
    } = {}
  ): CohortDefinition {
    const cohortId = this.generateId('cohort');
    const now = Date.now();

    const cohort: CohortDefinition = {
      id: cohortId,
      name,
      description,
      groupBy,
      startDate: options.startDate || now,
      endDate: options.endDate,
      filters: options.filters || [],
      retentionPeriod: options.retentionPeriod || 'week',
    };

    this.cohorts.set(cohortId, cohort);
    this.cohortUsers.set(cohortId, new Map());
    return cohort;
  }

  /**
   * Add a user to a cohort
   */
  public addUser(
    cohortId: string,
    userId: string,
    joinedAt: number,
    properties: Record<string, unknown> = {}
  ): boolean {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    const users = this.cohortUsers.get(cohortId)!;

    // Check filters
    if (cohort.filters.length > 0) {
      const passesFilters = this.evaluateFilters(cohort.filters, properties);
      if (!passesFilters) {
        return false;
      }
    }

    // Check date range
    if (joinedAt < cohort.startDate) return false;
    if (cohort.endDate && joinedAt > cohort.endDate) return false;

    const user: CohortUser = {
      userId,
      joinedAt,
      lastActiveAt: joinedAt,
      totalRevenue: 0,
      totalEvents: 0,
      properties,
      activePeriodsSet: new Set([0]),
    };

    users.set(userId, user);
    return true;
  }

  /**
   * Record user activity for retention tracking
   */
  public recordActivity(
    cohortId: string,
    userId: string,
    timestamp: number,
    revenue: number = 0
  ): void {
    const users = this.cohortUsers.get(cohortId);
    if (!users) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    const user = users.get(userId);
    if (!user) return;

    const cohort = this.cohorts.get(cohortId)!;
    const period = this.calculatePeriod(user.joinedAt, timestamp, cohort.retentionPeriod);

    user.lastActiveAt = timestamp;
    user.totalRevenue += revenue;
    user.totalEvents++;
    user.activePeriodsSet.add(period);
  }

  /**
   * Get retention curve for a cohort
   */
  public getRetention(cohortId: string, periods: number = 12): number[] {
    const users = this.cohortUsers.get(cohortId);
    if (!users) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    const totalUsers = users.size;
    if (totalUsers === 0) return [];

    const retentionCurve: number[] = [];

    for (let period = 0; period < periods; period++) {
      let activeInPeriod = 0;
      for (const [, user] of users) {
        if (user.activePeriodsSet.has(period)) {
          activeInPeriod++;
        }
      }
      retentionCurve.push(totalUsers > 0 ? activeInPeriod / totalUsers : 0);
    }

    return retentionCurve;
  }

  /**
   * Compare retention between two cohorts
   */
  public compareCohorts(
    cohortIdA: string,
    cohortIdB: string,
    periods: number = 12
  ): {
    cohortA: { id: string; name: string; retention: number[]; metrics: CohortMetrics };
    cohortB: { id: string; name: string; retention: number[]; metrics: CohortMetrics };
    retentionDifference: number[];
    betterCohort: string;
    overallImprovement: number;
  } {
    const cohortA = this.cohorts.get(cohortIdA);
    const cohortB = this.cohorts.get(cohortIdB);

    if (!cohortA || !cohortB) {
      throw new Error('One or both cohorts not found');
    }

    const retentionA = this.getRetention(cohortIdA, periods);
    const retentionB = this.getRetention(cohortIdB, periods);
    const metricsA = this.getCohortMetrics(cohortIdA, periods);
    const metricsB = this.getCohortMetrics(cohortIdB, periods);

    const retentionDifference: number[] = [];
    for (let i = 0; i < Math.max(retentionA.length, retentionB.length); i++) {
      const a = retentionA[i] || 0;
      const b = retentionB[i] || 0;
      retentionDifference.push(b - a);
    }

    // Calculate average retention to determine better cohort
    const avgA = retentionA.length > 0
      ? retentionA.reduce((s, v) => s + v, 0) / retentionA.length
      : 0;
    const avgB = retentionB.length > 0
      ? retentionB.reduce((s, v) => s + v, 0) / retentionB.length
      : 0;

    const betterCohort = avgA >= avgB ? cohortIdA : cohortIdB;
    const overallImprovement = avgA > 0
      ? Math.abs(avgB - avgA) / avgA
      : 0;

    return {
      cohortA: { id: cohortIdA, name: cohortA.name, retention: retentionA, metrics: metricsA },
      cohortB: { id: cohortIdB, name: cohortB.name, retention: retentionB, metrics: metricsB },
      retentionDifference,
      betterCohort,
      overallImprovement,
    };
  }

  /**
   * Get comprehensive metrics for a cohort
   */
  public getCohortMetrics(cohortId: string, periods: number = 12): CohortMetrics {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    const users = this.cohortUsers.get(cohortId)!;
    const totalUsers = users.size;
    const retentionCurve = this.getRetention(cohortId, periods);
    const churnRate = this.getChurnRate(cohortId);

    // Calculate average lifetime value
    let totalRevenue = 0;
    for (const [, user] of users) {
      totalRevenue += user.totalRevenue;
    }
    const averageLifetimeValue = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    // Build period metrics
    const periodMetrics: PeriodMetric[] = [];
    for (let period = 0; period < periods; period++) {
      let activeUsers = 0;
      let periodRevenue = 0;
      let periodEvents = 0;

      for (const [, user] of users) {
        if (user.activePeriodsSet.has(period)) {
          activeUsers++;
          // Estimate revenue per period
          const totalPeriods = user.activePeriodsSet.size;
          periodRevenue += totalPeriods > 0 ? user.totalRevenue / totalPeriods : 0;
          periodEvents += totalPeriods > 0 ? user.totalEvents / totalPeriods : 0;
        }
      }

      const retentionRate = totalUsers > 0 ? activeUsers / totalUsers : 0;
      const eventsPerUser = activeUsers > 0 ? periodEvents / activeUsers : 0;

      periodMetrics.push({
        period,
        activeUsers,
        retentionRate,
        revenue: periodRevenue,
        eventsPerUser,
      });
    }

    return {
      cohortId,
      cohortName: cohort.name,
      totalUsers,
      retentionCurve,
      churnRate,
      averageLifetimeValue,
      periodMetrics,
    };
  }

  /**
   * Calculate churn rate for a cohort
   */
  public getChurnRate(cohortId: string): number {
    const users = this.cohortUsers.get(cohortId);
    if (!users || users.size === 0) return 0;

    const cohort = this.cohorts.get(cohortId)!;
    const now = Date.now();
    const periodMs = this.getPeriodMs(cohort.retentionPeriod);
    const currentPeriod = Math.floor((now - cohort.startDate) / periodMs);

    let churned = 0;
    for (const [, user] of users) {
      const lastPeriod = this.calculatePeriod(user.joinedAt, user.lastActiveAt, cohort.retentionPeriod);
      if (currentPeriod - lastPeriod > 1) {
        churned++;
      }
    }

    return users.size > 0 ? churned / users.size : 0;
  }

  /**
   * Get users in a cohort
   */
  public getCohortUsers(cohortId: string): Array<{ userId: string; joinedAt: number; lastActiveAt: number }> {
    const users = this.cohortUsers.get(cohortId);
    if (!users) return [];

    return Array.from(users.values()).map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt,
      lastActiveAt: u.lastActiveAt,
    }));
  }

  /**
   * Get all cohorts
   */
  public getCohorts(): CohortDefinition[] {
    return Array.from(this.cohorts.values());
  }

  /**
   * Delete a cohort
   */
  public deleteCohort(cohortId: string): boolean {
    this.cohortUsers.delete(cohortId);
    return this.cohorts.delete(cohortId);
  }

  /**
   * Get N-day retention for a cohort
   */
  public getNDayRetention(cohortId: string, day: number): number {
    const retention = this.getRetention(cohortId, day + 1);
    return retention[day] || 0;
  }

  /**
   * Get cohort size over time
   */
  public getCohortSize(cohortId: string): number {
    const users = this.cohortUsers.get(cohortId);
    return users ? users.size : 0;
  }

  // ---- Private Methods ----

  private calculatePeriod(startTime: number, eventTime: number, periodType: 'day' | 'week' | 'month'): number {
    const diffMs = eventTime - startTime;
    const periodMs = this.getPeriodMs(periodType);
    return Math.floor(diffMs / periodMs);
  }

  private getPeriodMs(periodType: 'day' | 'week' | 'month'): number {
    switch (periodType) {
      case 'day': return 86400000;
      case 'week': return 604800000;
      case 'month': return 2592000000; // 30 days approx
      default: return 604800000;
    }
  }

  private evaluateFilters(filters: CohortFilter[], properties: Record<string, unknown>): boolean {
    for (const filter of filters) {
      const value = properties[filter.property];
      if (!this.evaluateFilter(filter, value)) {
        return false;
      }
    }
    return true;
  }

  private evaluateFilter(filter: CohortFilter, value: unknown): boolean {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(filter.value));
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return false;
    }
  }

  private generateId(prefix: string): string {
    this.cohortCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.cohortCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
