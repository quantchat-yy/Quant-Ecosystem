// ============================================================================
// Developer Platform - Webhook Delivery
// Reliable delivery with exponential backoff, HMAC-SHA256 signing, delivery
// status tracking, dead letter queue, event replay, rate limiting, filtering
// ============================================================================

/** Webhook subscription */
interface WebhookSubscription {
  id: string;
  endpointUrl: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  ownerId: string;
  createdAt: number;
  metadata: Record<string, string>;
}

/** Webhook event in the store */
interface StoredEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source: string;
}

/** Delivery attempt record */
interface DeliveryAttemptRecord {
  attemptNumber: number;
  timestamp: number;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number;
}

/** Delivery record with full status tracking */
interface DeliveryRecord {
  id: string;
  subscriptionId: string;
  eventId: string;
  status: 'pending' | 'delivering' | 'delivered' | 'failed' | 'dead_letter';
  attempts: DeliveryAttemptRecord[];
  createdAt: number;
  completedAt: number | null;
  nextRetryAt: number | null;
  scheduledAt: number;
}

/** Dead letter entry */
interface DeadLetterEntry {
  deliveryId: string;
  subscriptionId: string;
  eventId: string;
  totalAttempts: number;
  lastError: string;
  deadLetteredAt: number;
  canReplay: boolean;
}

/** Rate limiter per endpoint (token bucket) */
interface EndpointRateLimiter {
  subscriptionId: string;
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefillAt: number;
}

/** Delivery metrics per endpoint */
interface EndpointMetrics {
  subscriptionId: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageLatencyMs: number;
  totalLatencyMs: number;
  lastDeliveryAt: number;
}

/** HMAC signature for webhook verification */
interface WebhookSignature {
  algorithm: 'sha256';
  timestamp: number;
  signature: string;
  header: string;
}

/**
 * WebhookDelivery provides reliable webhook delivery with exponential backoff,
 * HMAC-SHA256 payload signing, delivery status tracking with retry history,
 * dead letter queue, event replay, per-endpoint rate limiting, event type
 * filtering, and delivery metrics.
 */
export class WebhookDelivery {
  private readonly subscriptions: Map<string, WebhookSubscription>;
  private readonly eventStore: Map<string, StoredEvent>;
  private readonly deliveries: Map<string, DeliveryRecord>;
  private readonly deadLetterQueue: Map<string, DeadLetterEntry>;
  private readonly rateLimiters: Map<string, EndpointRateLimiter>;
  private readonly metrics: Map<string, EndpointMetrics>;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private subscriptionCounter: number;
  private deliveryCounter: number;
  private eventCounter: number;

  constructor(config?: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number }) {
    this.subscriptions = new Map();
    this.eventStore = new Map();
    this.deliveries = new Map();
    this.deadLetterQueue = new Map();
    this.rateLimiters = new Map();
    this.metrics = new Map();
    this.maxRetries = config?.maxRetries ?? 8;
    this.baseDelayMs = config?.baseDelayMs ?? 1000;
    this.maxDelayMs = config?.maxDelayMs ?? 21600000; // 6 hours max
    this.subscriptionCounter = 0;
    this.deliveryCounter = 0;
    this.eventCounter = 0;
  }

  /**
   * Register a webhook subscription with event type filtering
   */
  subscribe(
    endpointUrl: string,
    secret: string,
    eventTypes: string[],
    ownerId: string,
    rateLimit?: { maxTokens: number; refillRate: number },
  ): WebhookSubscription {
    const id = `sub_${++this.subscriptionCounter}`;

    const subscription: WebhookSubscription = {
      id,
      endpointUrl,
      secret,
      eventTypes,
      isActive: true,
      ownerId,
      createdAt: Date.now(),
      metadata: {},
    };

    this.subscriptions.set(id, subscription);

    // Initialize rate limiter
    this.rateLimiters.set(id, {
      subscriptionId: id,
      tokens: rateLimit?.maxTokens ?? 50,
      maxTokens: rateLimit?.maxTokens ?? 50,
      refillRate: rateLimit?.refillRate ?? 10,
      lastRefillAt: Date.now(),
    });

    // Initialize metrics
    this.metrics.set(id, {
      subscriptionId: id,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      averageLatencyMs: 0,
      totalLatencyMs: 0,
      lastDeliveryAt: 0,
    });

    return subscription;
  }

  /**
   * Unsubscribe (deactivate) a webhook
   */
  unsubscribe(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return false;
    sub.isActive = false;
    return true;
  }

  /**
   * Store an event and create deliveries for all matching subscriptions
   */
  publishEvent(
    type: string,
    payload: Record<string, unknown>,
    source: string,
  ): { eventId: string; deliveryIds: string[] } {
    const eventId = `evt_${++this.eventCounter}_${Date.now()}`;
    const now = Date.now();

    const event: StoredEvent = {
      id: eventId,
      type,
      payload,
      timestamp: now,
      source,
    };
    this.eventStore.set(eventId, event);

    const deliveryIds: string[] = [];

    // Find matching subscriptions
    for (const sub of this.subscriptions.values()) {
      if (!sub.isActive) continue;
      if (!this.matchesEventFilter(sub.eventTypes, type)) continue;

      const deliveryId = this.createDelivery(sub.id, eventId);
      deliveryIds.push(deliveryId);
    }

    return { eventId, deliveryIds };
  }

  /**
   * Create a delivery record for an event/subscription pair
   */
  private createDelivery(subscriptionId: string, eventId: string): string {
    const id = `dlv_${++this.deliveryCounter}`;
    const now = Date.now();

    const delivery: DeliveryRecord = {
      id,
      subscriptionId,
      eventId,
      status: 'pending',
      attempts: [],
      createdAt: now,
      completedAt: null,
      nextRetryAt: now,
      scheduledAt: now,
    };

    this.deliveries.set(id, delivery);
    return id;
  }

  /**
   * Attempt to deliver a webhook. Returns success/failure.
   * On failure, schedules retry with exponential backoff.
   */
  attemptDelivery(
    deliveryId: string,
    deliverFn: (
      url: string,
      payload: Record<string, unknown>,
      headers: Record<string, string>,
    ) => { statusCode: number; body: string; durationMs: number },
  ): { success: boolean; status: DeliveryRecord['status'] } {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return { success: false, status: 'failed' };

    const subscription = this.subscriptions.get(delivery.subscriptionId);
    if (!subscription) return { success: false, status: 'failed' };

    const event = this.eventStore.get(delivery.eventId);
    if (!event) return { success: false, status: 'failed' };

    // Check rate limit
    if (!this.checkRateLimit(delivery.subscriptionId)) {
      // Reschedule for later
      delivery.nextRetryAt = Date.now() + 5000;
      return { success: false, status: delivery.status };
    }

    delivery.status = 'delivering';
    const attemptNumber = delivery.attempts.length + 1;

    // Sign the payload
    const signature = this.signPayload(event.payload, subscription.secret);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': delivery.id,
      'X-Webhook-Timestamp': signature.timestamp.toString(),
      'X-Webhook-Signature': signature.header,
      'X-Event-Type': event.type,
    };

    try {
      const result = deliverFn(subscription.endpointUrl, event.payload, headers);

      const attempt: DeliveryAttemptRecord = {
        attemptNumber,
        timestamp: Date.now(),
        statusCode: result.statusCode,
        responseBody: result.body.substring(0, 500),
        error: null,
        durationMs: result.durationMs,
      };
      delivery.attempts.push(attempt);

      // Success: 2xx status codes
      if (result.statusCode >= 200 && result.statusCode < 300) {
        delivery.status = 'delivered';
        delivery.completedAt = Date.now();
        delivery.nextRetryAt = null;
        this.updateMetrics(delivery.subscriptionId, true, result.durationMs);
        return { success: true, status: 'delivered' };
      }

      // Non-retryable errors: 4xx (except 429)
      if (result.statusCode >= 400 && result.statusCode < 500 && result.statusCode !== 429) {
        delivery.status = 'failed';
        delivery.completedAt = Date.now();
        this.updateMetrics(delivery.subscriptionId, false, result.durationMs);
        return { success: false, status: 'failed' };
      }

      // Retryable: schedule next attempt
      return this.scheduleRetry(delivery);
    } catch (err) {
      const attempt: DeliveryAttemptRecord = {
        attemptNumber,
        timestamp: Date.now(),
        statusCode: null,
        responseBody: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        durationMs: 0,
      };
      delivery.attempts.push(attempt);

      return this.scheduleRetry(delivery);
    }
  }

  /**
   * Schedule a retry with exponential backoff.
   * delay = min(base * 2^attempt, max_delay)
   */
  private scheduleRetry(delivery: DeliveryRecord): {
    success: boolean;
    status: DeliveryRecord['status'];
  } {
    const attemptCount = delivery.attempts.length;

    if (attemptCount >= this.maxRetries) {
      // Move to dead letter queue
      delivery.status = 'dead_letter';
      delivery.completedAt = Date.now();
      delivery.nextRetryAt = null;

      const lastAttempt = delivery.attempts[delivery.attempts.length - 1];
      this.deadLetterQueue.set(delivery.id, {
        deliveryId: delivery.id,
        subscriptionId: delivery.subscriptionId,
        eventId: delivery.eventId,
        totalAttempts: attemptCount,
        lastError: lastAttempt?.error ?? `Status: ${lastAttempt?.statusCode}`,
        deadLetteredAt: Date.now(),
        canReplay: true,
      });

      this.updateMetrics(delivery.subscriptionId, false, 0);
      return { success: false, status: 'dead_letter' };
    }

    // Exponential backoff: delay = min(base * 2^attempt, max_delay)
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attemptCount), this.maxDelayMs);

    delivery.status = 'pending';
    delivery.nextRetryAt = Date.now() + delay;
    return { success: false, status: 'pending' };
  }

  /**
   * Sign a webhook payload with HMAC-SHA256 simulation.
   * Creates a signature header for verification by the receiver.
   */
  signPayload(payload: Record<string, unknown>, secret: string): WebhookSignature {
    const timestamp = Date.now();
    const payloadStr = JSON.stringify(payload);
    const signatureInput = `${timestamp}.${payloadStr}`;

    // HMAC-SHA256 simulation using iterative hashing
    let hash = 0;
    const combined = `${secret}:${signatureInput}`;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
      hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 13;

    const signature = hash.toString(16).padStart(8, '0');
    const header = `v1=${timestamp}.${signature}`;

    return {
      algorithm: 'sha256',
      timestamp,
      signature,
      header,
    };
  }

  /**
   * Verify a webhook signature
   */
  verifySignature(
    payload: Record<string, unknown>,
    secret: string,
    signatureHeader: string,
  ): boolean {
    // Parse header: v1=timestamp.signature
    const match = signatureHeader.match(/^v1=(\d+)\.([a-f0-9]+)$/);
    if (!match) return false;

    const timestamp = parseInt(match[1]!, 10);
    const receivedSig = match[2]!;

    // Replay protection: reject if timestamp too old (5 min)
    if (Date.now() - timestamp > 300000) return false;

    // Recompute signature
    const payloadStr = JSON.stringify(payload);
    const signatureInput = `${timestamp}.${payloadStr}`;

    let hash = 0;
    const combined = `${secret}:${signatureInput}`;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
      hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 13;

    const expectedSig = hash.toString(16).padStart(8, '0');
    return expectedSig === receivedSig;
  }

  /**
   * Replay events from the event store to a specific subscription
   */
  replay(
    subscriptionId: string,
    fromTimestamp: number,
    toTimestamp: number,
    eventTypes?: string[],
  ): string[] {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return [];

    const deliveryIds: string[] = [];

    for (const event of this.eventStore.values()) {
      if (event.timestamp < fromTimestamp || event.timestamp > toTimestamp) continue;
      if (eventTypes && !eventTypes.includes(event.type)) continue;
      if (!this.matchesEventFilter(subscription.eventTypes, event.type)) continue;

      const deliveryId = this.createDelivery(subscriptionId, event.id);
      deliveryIds.push(deliveryId);
    }

    return deliveryIds;
  }

  /**
   * Get all entries in the dead letter queue
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Retry a dead-lettered delivery
   */
  retryDeadLetter(deliveryId: string): boolean {
    const dlEntry = this.deadLetterQueue.get(deliveryId);
    if (!dlEntry || !dlEntry.canReplay) return false;

    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return false;

    // Reset delivery for retry
    delivery.status = 'pending';
    delivery.completedAt = null;
    delivery.nextRetryAt = Date.now();
    delivery.attempts = []; // Reset attempts

    this.deadLetterQueue.delete(deliveryId);
    return true;
  }

  /**
   * Check rate limit for an endpoint (token bucket)
   */
  private checkRateLimit(subscriptionId: string): boolean {
    const limiter = this.rateLimiters.get(subscriptionId);
    if (!limiter) return true;

    this.refillTokens(limiter);

    if (limiter.tokens >= 1) {
      limiter.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Refill rate limiter tokens based on elapsed time
   */
  private refillTokens(limiter: EndpointRateLimiter): void {
    const now = Date.now();
    const elapsed = now - limiter.lastRefillAt;
    const tokensToAdd = (elapsed / 1000) * limiter.refillRate;
    limiter.tokens = Math.min(limiter.maxTokens, limiter.tokens + tokensToAdd);
    limiter.lastRefillAt = now;
  }

  /**
   * Update delivery metrics for an endpoint
   */
  private updateMetrics(subscriptionId: string, success: boolean, latencyMs: number): void {
    const m = this.metrics.get(subscriptionId);
    if (!m) return;

    m.totalDeliveries++;
    if (success) {
      m.successfulDeliveries++;
    } else {
      m.failedDeliveries++;
    }
    m.successRate = m.totalDeliveries > 0 ? m.successfulDeliveries / m.totalDeliveries : 0;
    m.totalLatencyMs += latencyMs;
    m.averageLatencyMs = m.totalDeliveries > 0 ? m.totalLatencyMs / m.totalDeliveries : 0;
    m.lastDeliveryAt = Date.now();
  }

  /**
   * Check if an event type matches a subscription's filter
   */
  private matchesEventFilter(subscribedTypes: string[], eventType: string): boolean {
    if (subscribedTypes.includes('*')) return true;
    if (subscribedTypes.includes(eventType)) return true;

    // Support wildcard patterns like "user.*"
    for (const pattern of subscribedTypes) {
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -1);
        if (eventType.startsWith(prefix)) return true;
      }
    }

    return false;
  }

  /**
   * Get delivery status for a specific delivery
   */
  getDelivery(deliveryId: string): DeliveryRecord | null {
    return this.deliveries.get(deliveryId) ?? null;
  }

  /**
   * Get all deliveries for a subscription
   */
  getDeliveriesForSubscription(subscriptionId: string): DeliveryRecord[] {
    return Array.from(this.deliveries.values()).filter((d) => d.subscriptionId === subscriptionId);
  }

  /**
   * Get metrics for a subscription
   */
  getMetrics(subscriptionId: string): EndpointMetrics | null {
    return this.metrics.get(subscriptionId) ?? null;
  }

  /**
   * Get pending deliveries that are ready for retry
   */
  getPendingDeliveries(): DeliveryRecord[] {
    const now = Date.now();
    return Array.from(this.deliveries.values()).filter(
      (d) => d.status === 'pending' && d.nextRetryAt !== null && d.nextRetryAt <= now,
    );
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get event store size
   */
  getEventStoreSize(): number {
    return this.eventStore.size;
  }
}
