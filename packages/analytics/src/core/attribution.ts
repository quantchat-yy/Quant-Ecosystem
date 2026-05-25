// ============================================================================
// Analytics - Attribution Engine
// Multi-touch attribution with weighted credit distribution models
// ============================================================================

import type {
  AttributionModelType,
  AttributionModel,
  AttributionTouch,
  AttributionReport,
  ChannelAttribution,
} from '../types';

/** User journey with touchpoints */
interface UserJourney {
  userId: string;
  touchpoints: AttributionTouch[];
  converted: boolean;
  conversionValue: number;
  conversionTimestamp?: number;
}

/**
 * AttributionEngine - Multi-touch attribution modeling
 *
 * Implements first-touch, last-touch, linear, time-decay,
 * position-based, and custom attribution models. Distributes
 * conversion credit across marketing touchpoints.
 */
export class AttributionEngine {
  private journeys: Map<string, UserJourney>;
  private touchpoints: Map<string, AttributionTouch[]>;
  private models: Map<string, AttributionModel>;
  private defaultLookbackMs: number;
  private touchCounter: number = 0;

  constructor(options: { lookbackWindowMs?: number } = {}) {
    this.journeys = new Map();
    this.touchpoints = new Map();
    this.models = new Map();
    this.defaultLookbackMs = options.lookbackWindowMs || 2592000000; // 30 days default
  }

  /**
   * Record a touchpoint for a user
   */
  public recordTouch(
    userId: string,
    channel: string,
    options: { campaign?: string; source?: string; medium?: string; timestamp?: number; revenue?: number } = {}
  ): AttributionTouch {
    const touch: AttributionTouch = {
      id: this.generateId('touch'),
      userId,
      channel,
      campaign: options.campaign,
      source: options.source,
      medium: options.medium,
      timestamp: options.timestamp || Date.now(),
      isConversion: false,
      revenue: options.revenue,
    };

    // Add to user journey
    let journey = this.journeys.get(userId);
    if (!journey) {
      journey = {
        userId,
        touchpoints: [],
        converted: false,
        conversionValue: 0,
      };
      this.journeys.set(userId, journey);
    }
    journey.touchpoints.push(touch);

    // Index by channel
    const channelTouches = this.touchpoints.get(channel) || [];
    channelTouches.push(touch);
    this.touchpoints.set(channel, channelTouches);

    return touch;
  }

  /**
   * Record a conversion event
   */
  public recordConversion(userId: string, value: number = 1, timestamp?: number): void {
    const journey = this.journeys.get(userId);
    if (!journey) {
      throw new Error(`No journey found for user: ${userId}`);
    }

    journey.converted = true;
    journey.conversionValue = value;
    journey.conversionTimestamp = timestamp || Date.now();
  }

  /**
   * First-touch attribution - all credit to first touchpoint
   */
  public firstTouch(lookbackMs?: number): AttributionReport {
    return this.calculateAttribution('first_touch', (touchpoints, value) => {
      const credits = new Map<string, number>();
      if (touchpoints.length > 0) {
        const sorted = [...touchpoints].sort((a, b) => a.timestamp - b.timestamp);
        credits.set(sorted[0].channel, value);
      }
      return credits;
    }, lookbackMs);
  }

  /**
   * Last-touch attribution - all credit to last touchpoint before conversion
   */
  public lastTouch(lookbackMs?: number): AttributionReport {
    return this.calculateAttribution('last_touch', (touchpoints, value) => {
      const credits = new Map<string, number>();
      if (touchpoints.length > 0) {
        const sorted = [...touchpoints].sort((a, b) => a.timestamp - b.timestamp);
        credits.set(sorted[sorted.length - 1].channel, value);
      }
      return credits;
    }, lookbackMs);
  }

  /**
   * Linear attribution - equal credit to all touchpoints
   */
  public linear(lookbackMs?: number): AttributionReport {
    return this.calculateAttribution('linear', (touchpoints, value) => {
      const credits = new Map<string, number>();
      if (touchpoints.length === 0) return credits;

      const creditPerTouch = value / touchpoints.length;
      for (const touch of touchpoints) {
        const existing = credits.get(touch.channel) || 0;
        credits.set(touch.channel, existing + creditPerTouch);
      }
      return credits;
    }, lookbackMs);
  }

  /**
   * Time-decay attribution - more credit to touchpoints closer to conversion
   */
  public timeDecay(halfLifeMs: number = 604800000, lookbackMs?: number): AttributionReport {
    return this.calculateAttribution('time_decay', (touchpoints, value, conversionTime) => {
      const credits = new Map<string, number>();
      if (touchpoints.length === 0) return credits;

      const refTime = conversionTime || Date.now();

      // Calculate decay weights
      let totalWeight = 0;
      const weights: number[] = touchpoints.map(touch => {
        const timeDiff = refTime - touch.timestamp;
        const weight = Math.pow(2, -(timeDiff / halfLifeMs));
        totalWeight += weight;
        return weight;
      });

      // Distribute credit based on weights
      for (let i = 0; i < touchpoints.length; i++) {
        const normalizedWeight = totalWeight > 0 ? weights[i] / totalWeight : 0;
        const credit = value * normalizedWeight;
        const channel = touchpoints[i].channel;
        const existing = credits.get(channel) || 0;
        credits.set(channel, existing + credit);
      }

      return credits;
    }, lookbackMs);
  }

  /**
   * Position-based attribution (U-shaped) - 40% first, 40% last, 20% middle
   */
  public positionBased(
    weights: { first: number; middle: number; last: number } = { first: 0.4, middle: 0.2, last: 0.4 },
    lookbackMs?: number
  ): AttributionReport {
    return this.calculateAttribution('position_based', (touchpoints, value) => {
      const credits = new Map<string, number>();
      if (touchpoints.length === 0) return credits;

      const sorted = [...touchpoints].sort((a, b) => a.timestamp - b.timestamp);

      if (sorted.length === 1) {
        credits.set(sorted[0].channel, value);
        return credits;
      }

      if (sorted.length === 2) {
        const firstCredit = value * (weights.first / (weights.first + weights.last));
        const lastCredit = value - firstCredit;
        const ch1 = credits.get(sorted[0].channel) || 0;
        credits.set(sorted[0].channel, ch1 + firstCredit);
        const ch2 = credits.get(sorted[sorted.length - 1].channel) || 0;
        credits.set(sorted[sorted.length - 1].channel, ch2 + lastCredit);
        return credits;
      }

      // First touch gets first weight
      const firstCredit = value * weights.first;
      const ch1 = credits.get(sorted[0].channel) || 0;
      credits.set(sorted[0].channel, ch1 + firstCredit);

      // Last touch gets last weight
      const lastCredit = value * weights.last;
      const chLast = credits.get(sorted[sorted.length - 1].channel) || 0;
      credits.set(sorted[sorted.length - 1].channel, chLast + lastCredit);

      // Middle touches split the middle weight
      const middleCount = sorted.length - 2;
      const middleCreditEach = (value * weights.middle) / middleCount;

      for (let i = 1; i < sorted.length - 1; i++) {
        const chMid = credits.get(sorted[i].channel) || 0;
        credits.set(sorted[i].channel, chMid + middleCreditEach);
      }

      return credits;
    }, lookbackMs);
  }

  /**
   * Custom model attribution with user-defined channel weights
   */
  public customModel(
    channelWeights: Record<string, number>,
    lookbackMs?: number
  ): AttributionReport {
    return this.calculateAttribution('custom', (touchpoints, value) => {
      const credits = new Map<string, number>();
      if (touchpoints.length === 0) return credits;

      let totalWeight = 0;
      const touchWeights: number[] = touchpoints.map(touch => {
        const weight = channelWeights[touch.channel] || 1;
        totalWeight += weight;
        return weight;
      });

      for (let i = 0; i < touchpoints.length; i++) {
        const normalizedWeight = totalWeight > 0 ? touchWeights[i] / totalWeight : 0;
        const credit = value * normalizedWeight;
        const channel = touchpoints[i].channel;
        const existing = credits.get(channel) || 0;
        credits.set(channel, existing + credit);
      }

      return credits;
    }, lookbackMs);
  }

  /**
   * Get attribution report for a specific model
   */
  public getAttributionReport(modelType: AttributionModelType): AttributionReport {
    switch (modelType) {
      case 'first_touch': return this.firstTouch();
      case 'last_touch': return this.lastTouch();
      case 'linear': return this.linear();
      case 'time_decay': return this.timeDecay();
      case 'position_based': return this.positionBased();
      case 'custom': return this.customModel({});
      default: return this.linear();
    }
  }

  /**
   * Get all user journeys
   */
  public getJourneys(): UserJourney[] {
    return Array.from(this.journeys.values());
  }

  /**
   * Get journey for a specific user
   */
  public getUserJourney(userId: string): UserJourney | undefined {
    return this.journeys.get(userId);
  }

  /**
   * Get total conversions
   */
  public getTotalConversions(): number {
    let count = 0;
    for (const [, journey] of this.journeys) {
      if (journey.converted) count++;
    }
    return count;
  }

  /**
   * Get channel summary
   */
  public getChannelSummary(): Array<{ channel: string; touchpoints: number; uniqueUsers: number }> {
    const summary: Map<string, { touchpoints: number; users: Set<string> }> = new Map();

    for (const [channel, touches] of this.touchpoints) {
      const users = new Set<string>();
      for (const touch of touches) {
        users.add(touch.userId);
      }
      summary.set(channel, { touchpoints: touches.length, users });
    }

    return Array.from(summary.entries()).map(([channel, data]) => ({
      channel,
      touchpoints: data.touchpoints,
      uniqueUsers: data.users.size,
    }));
  }

  // ---- Private Methods ----

  private calculateAttribution(
    modelType: AttributionModelType,
    creditFn: (touchpoints: AttributionTouch[], value: number, conversionTime?: number) => Map<string, number>,
    lookbackMs?: number
  ): AttributionReport {
    const lookback = lookbackMs || this.defaultLookbackMs;
    const channelCredits: Map<string, { credit: number; conversions: number; revenue: number; touchpoints: number; positions: number[] }> = new Map();
    let totalConversions = 0;
    let totalRevenue = 0;

    for (const [, journey] of this.journeys) {
      if (!journey.converted) continue;

      totalConversions++;
      totalRevenue += journey.conversionValue;

      // Filter touchpoints within lookback window
      const convTime = journey.conversionTimestamp || Date.now();
      const validTouchpoints = journey.touchpoints.filter(
        t => (convTime - t.timestamp) <= lookback && t.timestamp <= convTime
      );

      if (validTouchpoints.length === 0) continue;

      const credits = creditFn(validTouchpoints, journey.conversionValue, journey.conversionTimestamp);

      for (const [channel, credit] of credits) {
        const existing = channelCredits.get(channel) || { credit: 0, conversions: 0, revenue: 0, touchpoints: 0, positions: [] };
        existing.credit += credit;
        existing.conversions++;
        existing.revenue += credit;
        existing.touchpoints++;
        channelCredits.set(channel, existing);
      }

      // Track positions
      const sorted = [...validTouchpoints].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 0; i < sorted.length; i++) {
        const ch = channelCredits.get(sorted[i].channel);
        if (ch) {
          ch.positions.push(i / Math.max(sorted.length - 1, 1));
        }
      }
    }

    const totalCredit = Array.from(channelCredits.values()).reduce((sum, c) => sum + c.credit, 0);

    const channels: ChannelAttribution[] = Array.from(channelCredits.entries()).map(([channel, data]) => ({
      channel,
      credit: data.credit,
      creditPercentage: totalCredit > 0 ? data.credit / totalCredit : 0,
      conversions: data.conversions,
      revenue: data.revenue,
      touchpoints: data.touchpoints,
      averagePosition: data.positions.length > 0
        ? data.positions.reduce((s, p) => s + p, 0) / data.positions.length
        : 0,
    }));

    channels.sort((a, b) => b.credit - a.credit);

    return {
      modelType,
      channels,
      totalConversions,
      totalRevenue,
      generatedAt: Date.now(),
    };
  }

  private generateId(prefix: string): string {
    this.touchCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.touchCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
