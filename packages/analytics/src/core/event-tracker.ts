// ============================================================================
// Analytics - Event Tracker
// Tracks user events with batching, queuing, and configurable flush intervals
// ============================================================================

import type {
  AnalyticsEvent,
  EventBatch,
  EventContext,
  EventTrackerConfig,
  EventType,
  PageViewEvent,
  ClickEvent,
  ScrollEvent,
} from '../types';

/** Default tracker configuration */
const DEFAULT_CONFIG: EventTrackerConfig = {
  batchSize: 50,
  flushIntervalMs: 5000,
  maxQueueSize: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
  enableCompression: true,
};

/**
 * EventTracker - Core analytics event tracking engine
 *
 * Provides comprehensive event tracking with automatic batching,
 * queue management, and configurable flush intervals. Supports
 * page views, clicks, scrolls, custom events, and user identification.
 */
export class EventTracker {
  private config: EventTrackerConfig;
  private queue: Map<string, AnalyticsEvent>;
  private batches: Map<string, EventBatch>;
  private sessionMap: Map<string, { userId: string; startedAt: number; lastActivity: number }>;
  private userIdentities: Map<string, { traits: Record<string, unknown>; groups: string[] }>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private eventCounter: number = 0;
  private totalFlushed: number = 0;
  private failedFlushes: number = 0;
  private isProcessing: boolean = false;

  constructor(config: Partial<EventTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new Map();
    this.batches = new Map();
    this.sessionMap = new Map();
    this.userIdentities = new Map();
    this.startFlushInterval();
  }

  /**
   * Track a generic event
   */
  public track(
    eventType: EventType,
    userId: string,
    properties: Record<string, unknown> = {},
    context: Partial<EventContext> = {}
  ): AnalyticsEvent {
    const event = this.createEvent(eventType, userId, properties, context);
    this.enqueue(event);
    this.updateSession(userId);
    return event;
  }

  /**
   * Track a page view event
   */
  public pageView(
    userId: string,
    url: string,
    title: string,
    referrer?: string,
    context: Partial<EventContext> = {}
  ): PageViewEvent {
    const path = this.extractPath(url);
    const event = this.createEvent('page_view', userId, {
      url,
      path,
      title,
      referrer: referrer || '',
      duration: 0,
      scrollDepth: 0,
    }, context) as PageViewEvent;

    this.enqueue(event);
    this.updateSession(userId);
    return event;
  }

  /**
   * Track a click event
   */
  public click(
    userId: string,
    elementTag: string,
    x: number,
    y: number,
    options: { elementId?: string; elementClass?: string; elementText?: string; href?: string } = {},
    context: Partial<EventContext> = {}
  ): ClickEvent {
    const event = this.createEvent('click', userId, {
      elementTag,
      x,
      y,
      elementId: options.elementId || '',
      elementClass: options.elementClass || '',
      elementText: options.elementText || '',
      href: options.href || '',
    }, context) as ClickEvent;

    this.enqueue(event);
    this.updateSession(userId);
    return event;
  }

  /**
   * Track a scroll event
   */
  public scroll(
    userId: string,
    depth: number,
    maxDepth: number,
    direction: 'up' | 'down',
    velocity: number,
    context: Partial<EventContext> = {}
  ): ScrollEvent {
    const event = this.createEvent('scroll', userId, {
      depth: Math.min(Math.max(depth, 0), 100),
      maxDepth: Math.min(Math.max(maxDepth, 0), 100),
      direction,
      velocity: Math.max(velocity, 0),
    }, context) as ScrollEvent;

    this.enqueue(event);
    return event;
  }

  /**
   * Track time spent on a page or section
   */
  public timeSpent(
    userId: string,
    durationMs: number,
    page: string,
    section?: string,
    context: Partial<EventContext> = {}
  ): AnalyticsEvent {
    if (durationMs < 0) {
      throw new Error('Duration cannot be negative');
    }

    const event = this.createEvent('time_spent', userId, {
      durationMs,
      page,
      section: section || 'main',
      durationSeconds: Math.round(durationMs / 1000),
    }, context);

    this.enqueue(event);
    this.updateSession(userId);
    return event;
  }

  /**
   * Identify a user with traits
   */
  public identify(
    userId: string,
    traits: Record<string, unknown> = {}
  ): void {
    const existing = this.userIdentities.get(userId);
    if (existing) {
      existing.traits = { ...existing.traits, ...traits };
    } else {
      this.userIdentities.set(userId, { traits, groups: [] });
    }

    this.track('identify', userId, { traits });
  }

  /**
   * Associate user with a group
   */
  public group(
    userId: string,
    groupId: string,
    groupTraits: Record<string, unknown> = {}
  ): void {
    const identity = this.userIdentities.get(userId);
    if (identity) {
      if (!identity.groups.includes(groupId)) {
        identity.groups.push(groupId);
      }
    } else {
      this.userIdentities.set(userId, { traits: {}, groups: [groupId] });
    }

    this.track('group', userId, { groupId, groupTraits });
  }

  /**
   * Manually flush the event queue
   */
  public async flush(): Promise<EventBatch | null> {
    if (this.queue.size === 0 || this.isProcessing) {
      return null;
    }

    this.isProcessing = true;

    try {
      const events: AnalyticsEvent[] = [];
      const batchSize = Math.min(this.config.batchSize, this.queue.size);
      const entries = Array.from(this.queue.entries());

      for (let i = 0; i < batchSize; i++) {
        const [key, event] = entries[i];
        events.push(event);
        this.queue.delete(key);
      }

      const batch: EventBatch = {
        id: this.generateId('batch'),
        events,
        sentAt: Date.now(),
        source: 'event-tracker',
        size: events.length,
      };

      this.batches.set(batch.id, batch);
      this.totalFlushed += events.length;

      return batch;
    } catch (error) {
      this.failedFlushes++;
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the current event queue
   */
  public getQueue(): AnalyticsEvent[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get all processed batches
   */
  public getBatches(): EventBatch[] {
    return Array.from(this.batches.values());
  }

  /**
   * Get tracker statistics
   */
  public getStats(): {
    queued: number;
    totalTracked: number;
    totalFlushed: number;
    failedFlushes: number;
    activeSessions: number;
    identifiedUsers: number;
  } {
    return {
      queued: this.queue.size,
      totalTracked: this.eventCounter,
      totalFlushed: this.totalFlushed,
      failedFlushes: this.failedFlushes,
      activeSessions: this.sessionMap.size,
      identifiedUsers: this.userIdentities.size,
    };
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): Map<string, { userId: string; startedAt: number; lastActivity: number }> {
    return new Map(this.sessionMap);
  }

  /**
   * Clear expired sessions (inactive for more than 30 minutes)
   */
  public clearExpiredSessions(timeoutMs: number = 1800000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [sessionId, session] of this.sessionMap) {
      if (now - session.lastActivity > timeoutMs) {
        this.sessionMap.delete(sessionId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Stop the flush interval timer
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ---- Private Methods ----

  private createEvent(
    type: EventType,
    userId: string,
    properties: Record<string, unknown>,
    context: Partial<EventContext>
  ): AnalyticsEvent {
    const now = Date.now();
    return {
      id: this.generateId('evt'),
      type,
      userId,
      sessionId: this.getOrCreateSession(userId),
      timestamp: now,
      properties,
      context: {
        ...context,
      },
      metadata: {
        sentAt: now,
        receivedAt: now,
        version: '1.0.0',
        sdk: 'quant-analytics',
      },
    };
  }

  private enqueue(event: AnalyticsEvent): void {
    if (this.queue.size >= this.config.maxQueueSize) {
      // Drop oldest events when queue is full
      const firstKey = this.queue.keys().next().value;
      if (firstKey) {
        this.queue.delete(firstKey);
      }
    }
    this.queue.set(event.id, event);
    this.eventCounter++;
  }

  private getOrCreateSession(userId: string): string {
    for (const [sessionId, session] of this.sessionMap) {
      if (session.userId === userId) {
        return sessionId;
      }
    }

    const sessionId = this.generateId('session');
    this.sessionMap.set(sessionId, {
      userId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
    });
    return sessionId;
  }

  private updateSession(userId: string): void {
    for (const [, session] of this.sessionMap) {
      if (session.userId === userId) {
        session.lastActivity = Date.now();
        return;
      }
    }
  }

  private startFlushInterval(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        this.failedFlushes++;
      });
    }, this.config.flushIntervalMs);
  }

  private extractPath(url: string): string {
    try {
      const parts = url.split('?')[0].split('#')[0];
      const pathMatch = parts.match(/^https?:\/\/[^/]+(\/.*)/);
      return pathMatch ? pathMatch[1] : '/';
    } catch {
      return '/';
    }
  }

  private generateId(prefix: string): string {
    this.eventCounter;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${random}`;
  }
}
