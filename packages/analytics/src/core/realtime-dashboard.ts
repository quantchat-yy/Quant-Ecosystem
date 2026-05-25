// ============================================================================
// Analytics - Realtime Dashboard
// Real-time metrics aggregation with time windows and subscriptions
// ============================================================================

import type {
  DashboardMetrics,
  PageMetric,
  EventMetric,
  TimeSeriesPoint,
  MetricsSubscriber,
  AnalyticsEvent,
} from '../types';

/** Time window configuration */
interface TimeWindow {
  durationMs: number;
  granularityMs: number;
  label: string;
}

/** Active user record */
interface ActiveUser {
  userId: string;
  lastSeenAt: number;
  currentPage: string;
  sessionStart: number;
  pageViews: number;
  events: number;
}

/** Real-time event buffer entry */
interface BufferedEvent {
  event: AnalyticsEvent;
  receivedAt: number;
}

/**
 * RealtimeDashboard - Real-time analytics metrics aggregation
 *
 * Provides live metrics including active users, events per minute,
 * top pages, and time-series data. Supports subscription-based
 * updates with configurable time windows.
 */
export class RealtimeDashboard {
  private activeUsers: Map<string, ActiveUser>;
  private eventBuffer: BufferedEvent[];
  private pageViewCounts: Map<string, { views: number; uniqueVisitors: Set<string>; totalDuration: number; bounces: number }>;
  private eventTypeCounts: Map<string, { count: number; uniqueUsers: Set<string> }>;
  private subscribers: Map<string, MetricsSubscriber>;
  private timeSeries: Map<string, TimeSeriesPoint[]>;
  private errors: number = 0;
  private totalEvents: number = 0;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private bufferMaxAge: number;
  private activeUserTimeout: number;
  private subscriberCounter: number = 0;

  constructor(options: {
    bufferMaxAgeMs?: number;
    activeUserTimeoutMs?: number;
    updateIntervalMs?: number;
  } = {}) {
    this.activeUsers = new Map();
    this.eventBuffer = [];
    this.pageViewCounts = new Map();
    this.eventTypeCounts = new Map();
    this.subscribers = new Map();
    this.timeSeries = new Map();
    this.bufferMaxAge = options.bufferMaxAgeMs || 300000; // 5 minutes
    this.activeUserTimeout = options.activeUserTimeoutMs || 300000; // 5 minutes
    this.startUpdateLoop(options.updateIntervalMs || 5000);
  }

  /**
   * Ingest a real-time event
   */
  public ingestEvent(event: AnalyticsEvent): void {
    const now = Date.now();
    this.totalEvents++;

    // Buffer the event
    this.eventBuffer.push({ event, receivedAt: now });

    // Update active users
    this.updateActiveUser(event.userId, event);

    // Update page view counts
    if (event.type === 'page_view') {
      const path = (event.properties.path as string) || (event.properties.url as string) || '/';
      this.recordPageView(path, event.userId, event.properties.duration as number || 0);
    }

    // Update event type counts
    this.recordEventType(event.type, event.userId);

    // Track errors
    if (event.type === 'error') {
      this.errors++;
    }

    // Update time series
    this.recordTimeSeriesPoint('events_per_minute', now, 1);
    if (event.type === 'page_view') {
      this.recordTimeSeriesPoint('page_views_per_minute', now, 1);
    }
  }

  /**
   * Get current active user count
   */
  public getCurrentUsers(): number {
    this.cleanupExpiredUsers();
    return this.activeUsers.size;
  }

  /**
   * Get list of active users with details
   */
  public getActiveUsersList(): ActiveUser[] {
    this.cleanupExpiredUsers();
    return Array.from(this.activeUsers.values());
  }

  /**
   * Get currently active events (buffered within time window)
   */
  public getActiveEvents(windowMs: number = 60000): AnalyticsEvent[] {
    const cutoff = Date.now() - windowMs;
    return this.eventBuffer
      .filter(b => b.receivedAt >= cutoff)
      .map(b => b.event);
  }

  /**
   * Get a snapshot of current dashboard metrics
   */
  public getMetricsSnapshot(): DashboardMetrics {
    this.cleanupExpiredUsers();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate events per minute
    const recentEvents = this.eventBuffer.filter(b => b.receivedAt >= oneMinuteAgo);
    const eventsPerMinute = recentEvents.length;
    const pageViewsPerMinute = recentEvents.filter(b => b.event.type === 'page_view').length;

    // Calculate error rate
    const recentErrors = recentEvents.filter(b => b.event.type === 'error').length;
    const errorRate = eventsPerMinute > 0 ? recentErrors / eventsPerMinute : 0;

    // Calculate average session duration
    let totalDuration = 0;
    let sessionCount = 0;
    for (const [, user] of this.activeUsers) {
      totalDuration += now - user.sessionStart;
      sessionCount++;
    }
    const averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;

    return {
      timestamp: now,
      activeUsers: this.activeUsers.size,
      pageViewsPerMinute,
      eventsPerMinute,
      topPages: this.getTopPages(10),
      topEvents: this.getTopEvents(10),
      errorRate,
      averageSessionDuration,
    };
  }

  /**
   * Subscribe to real-time metrics updates
   */
  public subscribeToUpdates(callback: MetricsSubscriber): string {
    this.subscriberCounter++;
    const subscriptionId = `sub_${Date.now().toString(36)}_${this.subscriberCounter}`;
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * Unsubscribe from updates
   */
  public unsubscribe(subscriptionId: string): boolean {
    return this.subscribers.delete(subscriptionId);
  }

  /**
   * Get time series data for a metric
   */
  public getTimeSeries(metric: string, windowMs: number = 3600000, granularityMs: number = 60000): TimeSeriesPoint[] {
    const now = Date.now();
    const cutoff = now - windowMs;
    const points = this.timeSeries.get(metric) || [];

    // Aggregate into time buckets
    const buckets: Map<number, number> = new Map();
    const numBuckets = Math.ceil(windowMs / granularityMs);

    for (let i = 0; i < numBuckets; i++) {
      const bucketStart = cutoff + (i * granularityMs);
      buckets.set(bucketStart, 0);
    }

    for (const point of points) {
      if (point.timestamp >= cutoff) {
        const bucketIndex = Math.floor((point.timestamp - cutoff) / granularityMs);
        const bucketStart = cutoff + (bucketIndex * granularityMs);
        const current = buckets.get(bucketStart) || 0;
        buckets.set(bucketStart, current + point.value);
      }
    }

    return Array.from(buckets.entries())
      .map(([timestamp, value]) => ({ timestamp, value, label: metric }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get top pages by view count
   */
  public getTopPages(limit: number = 10): PageMetric[] {
    const pages: PageMetric[] = [];

    for (const [path, data] of this.pageViewCounts) {
      const uniqueVisitors = data.uniqueVisitors.size;
      const averageDuration = data.views > 0 ? data.totalDuration / data.views : 0;
      const bounceRate = data.views > 0 ? data.bounces / data.views : 0;

      pages.push({
        path,
        views: data.views,
        uniqueVisitors,
        averageDuration,
        bounceRate,
      });
    }

    return pages
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Get top events by count
   */
  public getTopEvents(limit: number = 10): EventMetric[] {
    const events: EventMetric[] = [];

    for (const [eventType, data] of this.eventTypeCounts) {
      events.push({
        eventType,
        count: data.count,
        uniqueUsers: data.uniqueUsers.size,
      });
    }

    return events
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get total event count
   */
  public getTotalEvents(): number {
    return this.totalEvents;
  }

  /**
   * Get buffer size
   */
  public getBufferSize(): number {
    return this.eventBuffer.length;
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.activeUsers.clear();
    this.eventBuffer = [];
    this.pageViewCounts.clear();
    this.eventTypeCounts.clear();
    this.timeSeries.clear();
    this.errors = 0;
    this.totalEvents = 0;
  }

  /**
   * Stop the update loop and clean up
   */
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscribers.clear();
  }

  // ---- Private Methods ----

  private updateActiveUser(userId: string, event: AnalyticsEvent): void {
    const existing = this.activeUsers.get(userId);
    const now = Date.now();

    if (existing) {
      existing.lastSeenAt = now;
      existing.events++;
      if (event.type === 'page_view') {
        existing.currentPage = (event.properties.path as string) || existing.currentPage;
        existing.pageViews++;
      }
    } else {
      this.activeUsers.set(userId, {
        userId,
        lastSeenAt: now,
        currentPage: (event.properties.path as string) || '/',
        sessionStart: now,
        pageViews: event.type === 'page_view' ? 1 : 0,
        events: 1,
      });
    }
  }

  private recordPageView(path: string, userId: string, duration: number): void {
    const existing = this.pageViewCounts.get(path);
    if (existing) {
      existing.views++;
      existing.uniqueVisitors.add(userId);
      existing.totalDuration += duration;
      if (duration < 10000) existing.bounces++; // Less than 10s = bounce
    } else {
      this.pageViewCounts.set(path, {
        views: 1,
        uniqueVisitors: new Set([userId]),
        totalDuration: duration,
        bounces: duration < 10000 ? 1 : 0,
      });
    }
  }

  private recordEventType(eventType: string, userId: string): void {
    const existing = this.eventTypeCounts.get(eventType);
    if (existing) {
      existing.count++;
      existing.uniqueUsers.add(userId);
    } else {
      this.eventTypeCounts.set(eventType, {
        count: 1,
        uniqueUsers: new Set([userId]),
      });
    }
  }

  private recordTimeSeriesPoint(metric: string, timestamp: number, value: number): void {
    const points = this.timeSeries.get(metric) || [];
    points.push({ timestamp, value });

    // Keep only last hour of data
    const cutoff = Date.now() - 3600000;
    const filtered = points.filter(p => p.timestamp >= cutoff);
    this.timeSeries.set(metric, filtered);
  }

  private cleanupExpiredUsers(): void {
    const cutoff = Date.now() - this.activeUserTimeout;
    for (const [userId, user] of this.activeUsers) {
      if (user.lastSeenAt < cutoff) {
        this.activeUsers.delete(userId);
      }
    }
  }

  private cleanupBuffer(): void {
    const cutoff = Date.now() - this.bufferMaxAge;
    this.eventBuffer = this.eventBuffer.filter(b => b.receivedAt >= cutoff);
  }

  private startUpdateLoop(intervalMs: number): void {
    this.updateInterval = setInterval(() => {
      this.cleanupBuffer();
      this.cleanupExpiredUsers();
      this.notifySubscribers();
    }, intervalMs);
  }

  private notifySubscribers(): void {
    if (this.subscribers.size === 0) return;
    const metrics = this.getMetricsSnapshot();
    for (const [, callback] of this.subscribers) {
      try {
        callback(metrics);
      } catch {
        // Subscriber error should not crash the dashboard
      }
    }
  }
}
