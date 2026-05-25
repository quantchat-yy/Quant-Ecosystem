// ============================================================================
// Analytics - Funnel Analyzer
// Tracks user journeys through defined funnel steps with conversion metrics
// ============================================================================

import type {
  FunnelDefinition,
  FunnelStep,
  FunnelConversionData,
  StepConversion,
  FunnelCondition,
  EventType,
} from '../types';

/** User progress through a funnel */
interface UserFunnelProgress {
  userId: string;
  funnelId: string;
  completedSteps: string[];
  stepTimestamps: Map<string, number>;
  startedAt: number;
  completedAt?: number;
  abandoned: boolean;
}

/**
 * FunnelAnalyzer - Tracks and analyzes user conversion funnels
 *
 * Defines multi-step funnels, tracks user progress through steps,
 * calculates conversion rates, identifies dropoff points, and
 * compares funnel performance across segments.
 */
export class FunnelAnalyzer {
  private funnels: Map<string, FunnelDefinition>;
  private userProgress: Map<string, UserFunnelProgress[]>;
  private stepEvents: Map<string, { userId: string; timestamp: number; properties: Record<string, unknown> }[]>;
  private funnelCounter: number = 0;

  constructor() {
    this.funnels = new Map();
    this.userProgress = new Map();
    this.stepEvents = new Map();
  }

  /**
   * Define a new funnel with ordered steps
   */
  public defineFunnel(
    name: string,
    description: string,
    steps: Array<{ name: string; eventType: EventType; conditions?: FunnelCondition[]; timeoutMs?: number }>,
    maxDurationMs: number = 604800000 // 7 days default
  ): FunnelDefinition {
    if (steps.length < 2) {
      throw new Error('A funnel must have at least 2 steps');
    }

    const funnelId = this.generateId('funnel');
    const now = Date.now();

    const funnelSteps: FunnelStep[] = steps.map((step, index) => ({
      id: this.generateId('step'),
      name: step.name,
      eventType: step.eventType,
      conditions: step.conditions || [],
      order: index,
      timeoutMs: step.timeoutMs,
    }));

    const funnel: FunnelDefinition = {
      id: funnelId,
      name,
      description,
      steps: funnelSteps,
      maxDurationMs,
      createdAt: now,
      updatedAt: now,
    };

    this.funnels.set(funnelId, funnel);
    return funnel;
  }

  /**
   * Track a user completing a step in a funnel
   */
  public trackStep(
    funnelId: string,
    userId: string,
    stepId: string,
    properties: Record<string, unknown> = {}
  ): boolean {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    const step = funnel.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    // Check step conditions
    if (step.conditions && step.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(step.conditions, properties);
      if (!conditionsMet) {
        return false;
      }
    }

    // Get or create user progress
    let progress = this.getUserProgress(funnelId, userId);
    const now = Date.now();

    if (!progress) {
      // Only allow starting from step 0
      if (step.order !== 0) {
        return false;
      }

      progress = {
        userId,
        funnelId,
        completedSteps: [stepId],
        stepTimestamps: new Map([[stepId, now]]),
        startedAt: now,
        abandoned: false,
      };

      const userProgressList = this.userProgress.get(userId) || [];
      userProgressList.push(progress);
      this.userProgress.set(userId, userProgressList);
    } else {
      // Verify step order (must complete previous step first)
      const previousStepIndex = step.order - 1;
      if (previousStepIndex >= 0) {
        const previousStep = funnel.steps[previousStepIndex];
        if (!progress.completedSteps.includes(previousStep.id)) {
          return false;
        }
      }

      // Check timeout
      if (step.timeoutMs) {
        const previousTimestamp = progress.stepTimestamps.get(funnel.steps[step.order - 1]?.id || '');
        if (previousTimestamp && (now - previousTimestamp) > step.timeoutMs) {
          progress.abandoned = true;
          return false;
        }
      }

      // Check funnel max duration
      if ((now - progress.startedAt) > funnel.maxDurationMs) {
        progress.abandoned = true;
        return false;
      }

      if (!progress.completedSteps.includes(stepId)) {
        progress.completedSteps.push(stepId);
        progress.stepTimestamps.set(stepId, now);
      }
    }

    // Check if funnel is complete
    if (progress.completedSteps.length === funnel.steps.length) {
      progress.completedAt = now;
    }

    // Record step event
    const events = this.stepEvents.get(stepId) || [];
    events.push({ userId, timestamp: now, properties });
    this.stepEvents.set(stepId, events);

    return true;
  }

  /**
   * Get conversion rate for a funnel
   */
  public getConversionRate(funnelId: string): FunnelConversionData {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    const allProgress = this.getAllProgressForFunnel(funnelId);
    const totalEntered = allProgress.length;
    const totalCompleted = allProgress.filter(p => p.completedAt !== undefined).length;
    const conversionRate = totalEntered > 0 ? totalCompleted / totalEntered : 0;

    const stepConversions = this.calculateStepConversions(funnel, allProgress);
    const durations = allProgress
      .filter(p => p.completedAt !== undefined)
      .map(p => (p.completedAt as number) - p.startedAt);

    const averageDurationMs = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDurationMs = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : 0;

    return {
      funnelId,
      totalEntered,
      totalCompleted,
      conversionRate,
      stepConversions,
      averageDurationMs,
      medianDurationMs,
    };
  }

  /**
   * Get dropoff analysis for each step
   */
  public getDropoff(funnelId: string): Array<{ stepId: string; stepName: string; dropoffRate: number; dropoffCount: number }> {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    const allProgress = this.getAllProgressForFunnel(funnelId);
    const dropoffs: Array<{ stepId: string; stepName: string; dropoffRate: number; dropoffCount: number }> = [];

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const reachedThisStep = allProgress.filter(p => p.completedSteps.includes(step.id)).length;
      const reachedNextStep = i < funnel.steps.length - 1
        ? allProgress.filter(p => p.completedSteps.includes(funnel.steps[i + 1].id)).length
        : reachedThisStep;

      const dropped = reachedThisStep - reachedNextStep;
      const dropoffRate = reachedThisStep > 0 ? dropped / reachedThisStep : 0;

      dropoffs.push({
        stepId: step.id,
        stepName: step.name,
        dropoffRate,
        dropoffCount: dropped,
      });
    }

    return dropoffs;
  }

  /**
   * Get average duration to complete each step
   */
  public getAverageDuration(funnelId: string): Array<{ stepId: string; stepName: string; averageMs: number }> {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    const allProgress = this.getAllProgressForFunnel(funnelId);
    const durations: Array<{ stepId: string; stepName: string; averageMs: number }> = [];

    for (let i = 1; i < funnel.steps.length; i++) {
      const currentStep = funnel.steps[i];
      const previousStep = funnel.steps[i - 1];

      const stepDurations: number[] = [];
      for (const progress of allProgress) {
        const prevTime = progress.stepTimestamps.get(previousStep.id);
        const currTime = progress.stepTimestamps.get(currentStep.id);
        if (prevTime && currTime) {
          stepDurations.push(currTime - prevTime);
        }
      }

      const average = stepDurations.length > 0
        ? stepDurations.reduce((sum, d) => sum + d, 0) / stepDurations.length
        : 0;

      durations.push({
        stepId: currentStep.id,
        stepName: currentStep.name,
        averageMs: average,
      });
    }

    return durations;
  }

  /**
   * Compare conversion rates between two funnels
   */
  public compareFunnels(funnelIdA: string, funnelIdB: string): {
    funnelA: FunnelConversionData;
    funnelB: FunnelConversionData;
    winner: string;
    improvement: number;
  } {
    const funnelA = this.getConversionRate(funnelIdA);
    const funnelB = this.getConversionRate(funnelIdB);

    const winner = funnelA.conversionRate >= funnelB.conversionRate ? funnelIdA : funnelIdB;
    const improvement = funnelA.conversionRate > 0
      ? Math.abs(funnelB.conversionRate - funnelA.conversionRate) / funnelA.conversionRate
      : 0;

    return { funnelA, funnelB, winner, improvement };
  }

  /**
   * Identify the biggest bottleneck step in a funnel
   */
  public getBottleneck(funnelId: string): { stepId: string; stepName: string; dropoffRate: number } | null {
    const dropoffs = this.getDropoff(funnelId);
    if (dropoffs.length === 0) return null;

    let maxDropoff = dropoffs[0];
    for (const dropoff of dropoffs) {
      if (dropoff.dropoffRate > maxDropoff.dropoffRate) {
        maxDropoff = dropoff;
      }
    }

    return {
      stepId: maxDropoff.stepId,
      stepName: maxDropoff.stepName,
      dropoffRate: maxDropoff.dropoffRate,
    };
  }

  /**
   * Get all defined funnels
   */
  public getFunnels(): FunnelDefinition[] {
    return Array.from(this.funnels.values());
  }

  /**
   * Delete a funnel
   */
  public deleteFunnel(funnelId: string): boolean {
    return this.funnels.delete(funnelId);
  }

  // ---- Private Methods ----

  private getUserProgress(funnelId: string, userId: string): UserFunnelProgress | null {
    const progressList = this.userProgress.get(userId) || [];
    return progressList.find(p => p.funnelId === funnelId && !p.abandoned && !p.completedAt) || null;
  }

  private getAllProgressForFunnel(funnelId: string): UserFunnelProgress[] {
    const result: UserFunnelProgress[] = [];
    for (const [, progressList] of this.userProgress) {
      for (const progress of progressList) {
        if (progress.funnelId === funnelId) {
          result.push(progress);
        }
      }
    }
    return result;
  }

  private calculateStepConversions(funnel: FunnelDefinition, allProgress: UserFunnelProgress[]): StepConversion[] {
    const conversions: StepConversion[] = [];
    const totalEntered = allProgress.length;

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const reached = allProgress.filter(p => p.completedSteps.includes(step.id)).length;
      const nextReached = i < funnel.steps.length - 1
        ? allProgress.filter(p => p.completedSteps.includes(funnel.steps[i + 1].id)).length
        : reached;

      const dropped = reached - nextReached;
      const conversionRate = totalEntered > 0 ? reached / totalEntered : 0;
      const dropoffRate = reached > 0 ? dropped / reached : 0;

      // Calculate average time for this step
      const times: number[] = [];
      if (i > 0) {
        for (const progress of allProgress) {
          const prevTime = progress.stepTimestamps.get(funnel.steps[i - 1].id);
          const currTime = progress.stepTimestamps.get(step.id);
          if (prevTime && currTime) {
            times.push(currTime - prevTime);
          }
        }
      }

      const averageTimeMs = times.length > 0
        ? times.reduce((sum, t) => sum + t, 0) / times.length
        : 0;

      conversions.push({
        stepId: step.id,
        stepName: step.name,
        entered: i === 0 ? totalEntered : allProgress.filter(p => p.completedSteps.includes(funnel.steps[i - 1].id)).length,
        completed: reached,
        dropped,
        conversionRate,
        dropoffRate,
        averageTimeMs,
      });
    }

    return conversions;
  }

  private evaluateConditions(conditions: FunnelCondition[], properties: Record<string, unknown>): boolean {
    for (const condition of conditions) {
      const value = properties[condition.property];
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: FunnelCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(condition.value));
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (condition.value as number);
      case 'exists':
        return value !== undefined && value !== null;
      case 'regex':
        return typeof value === 'string' && new RegExp(String(condition.value)).test(value);
      default:
        return false;
    }
  }

  private generateId(prefix: string): string {
    this.funnelCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.funnelCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
