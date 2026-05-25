// ============================================================================
// Notifications - Push Notification Service
// FCM/APNs abstraction layer with retry logic and delivery tracking
// ============================================================================

import type {
  DeviceToken,
  PushSendRequest,
  PushDeliveryResult,
  PushPlatform,
  DeliveryStatus,
  NotificationPriority,
} from '../types';

/** Push service configuration */
interface PushServiceConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  rateLimitPerDevice: number;
  rateLimitWindowMs: number;
  defaultTtlMs: number;
}

const DEFAULT_CONFIG: PushServiceConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 500,
  rateLimitPerDevice: 10,
  rateLimitWindowMs: 60000,
  defaultTtlMs: 86400000, // 24 hours
};

/**
 * PushNotificationService - Cross-platform push notification delivery
 *
 * Abstracts FCM and APNs for unified push delivery. Handles device
 * registration, token validation, delivery tracking, retry logic,
 * and rate limiting per device.
 */
export class PushNotificationService {
  private config: PushServiceConfig;
  private devices: Map<string, DeviceToken>;
  private userDevices: Map<string, Set<string>>; // userId -> deviceIds
  private deliveryLog: Map<string, PushDeliveryResult>;
  private rateLimitTracker: Map<string, { count: number; windowStart: number }>;
  private pendingRetries: Map<string, { request: PushSendRequest; attempts: number; nextRetryAt: number }>;
  private deviceCounter: number = 0;
  private deliveryCounter: number = 0;

  constructor(config: Partial<PushServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.devices = new Map();
    this.userDevices = new Map();
    this.deliveryLog = new Map();
    this.rateLimitTracker = new Map();
    this.pendingRetries = new Map();
  }

  /**
   * Send a push notification to a user (all registered devices)
   */
  public async send(request: PushSendRequest): Promise<PushDeliveryResult[]> {
    const userDeviceIds = this.userDevices.get(request.userId);
    if (!userDeviceIds || userDeviceIds.size === 0) {
      throw new Error(`No registered devices for user: ${request.userId}`);
    }

    const results: PushDeliveryResult[] = [];

    for (const deviceId of userDeviceIds) {
      const device = this.devices.get(deviceId);
      if (!device || !device.isActive) continue;

      // Check rate limit
      if (this.isRateLimited(deviceId)) {
        results.push(this.createDeliveryResult(request.userId, deviceId, device.platform, 'failed', 'Rate limit exceeded'));
        continue;
      }

      // Validate token
      if (!this.isTokenValid(device.token, device.platform)) {
        device.isActive = false;
        results.push(this.createDeliveryResult(request.userId, deviceId, device.platform, 'failed', 'Invalid token'));
        continue;
      }

      // Simulate sending to platform
      const result = await this.sendToDevice(device, request);
      results.push(result);

      // Track rate limit
      this.incrementRateLimit(deviceId);
    }

    return results;
  }

  /**
   * Send push notifications to multiple users
   */
  public async sendBulk(requests: PushSendRequest[]): Promise<Map<string, PushDeliveryResult[]>> {
    const results = new Map<string, PushDeliveryResult[]>();

    // Process in batches
    for (let i = 0; i < requests.length; i += this.config.batchSize) {
      const batch = requests.slice(i, i + this.config.batchSize);
      const batchPromises = batch.map(async (request) => {
        try {
          const deliveryResults = await this.send(request);
          results.set(request.userId, deliveryResults);
        } catch (error) {
          results.set(request.userId, [
            this.createDeliveryResult(request.userId, 'unknown', 'fcm', 'failed', (error as Error).message),
          ]);
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Register a device for push notifications
   */
  public registerDevice(
    userId: string,
    token: string,
    platform: PushPlatform,
    options: { deviceId?: string; deviceName?: string; osVersion?: string; appVersion?: string } = {}
  ): DeviceToken {
    const deviceId = options.deviceId || this.generateId('device');
    const now = Date.now();

    // Check for existing token to avoid duplicates
    for (const [existingId, existingDevice] of this.devices) {
      if (existingDevice.token === token && existingDevice.platform === platform) {
        // Update existing registration
        existingDevice.userId = userId;
        existingDevice.lastActiveAt = now;
        existingDevice.isActive = true;
        return existingDevice;
      }
    }

    const device: DeviceToken = {
      id: deviceId,
      userId,
      token,
      platform,
      deviceId,
      deviceName: options.deviceName,
      osVersion: options.osVersion,
      appVersion: options.appVersion,
      registeredAt: now,
      lastActiveAt: now,
      isActive: true,
    };

    this.devices.set(deviceId, device);

    // Map user to device
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Set());
    }
    this.userDevices.get(userId)!.add(deviceId);

    return device;
  }

  /**
   * Unregister a device
   */
  public unregisterDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.isActive = false;

    // Remove from user mapping
    const userDeviceSet = this.userDevices.get(device.userId);
    if (userDeviceSet) {
      userDeviceSet.delete(deviceId);
    }

    this.devices.delete(deviceId);
    return true;
  }

  /**
   * Validate a push token format
   */
  public validateToken(token: string, platform: PushPlatform): { valid: boolean; reason?: string } {
    if (!token || token.length === 0) {
      return { valid: false, reason: 'Token is empty' };
    }

    switch (platform) {
      case 'fcm':
        // FCM tokens are typically 150+ chars
        if (token.length < 100) {
          return { valid: false, reason: 'FCM token too short' };
        }
        if (!/^[A-Za-z0-9_:-]+$/.test(token)) {
          return { valid: false, reason: 'FCM token contains invalid characters' };
        }
        return { valid: true };

      case 'apns':
        // APNs tokens are 64 hex characters
        if (token.length !== 64) {
          return { valid: false, reason: 'APNs token must be 64 characters' };
        }
        if (!/^[a-f0-9]+$/.test(token)) {
          return { valid: false, reason: 'APNs token must be hexadecimal' };
        }
        return { valid: true };

      case 'web_push':
        // Web Push subscription URLs
        if (!token.startsWith('https://')) {
          return { valid: false, reason: 'Web push endpoint must be HTTPS URL' };
        }
        return { valid: true };

      default:
        return { valid: false, reason: 'Unknown platform' };
    }
  }

  /**
   * Get delivery status for a notification
   */
  public getDeliveryStatus(deliveryId: string): PushDeliveryResult | undefined {
    return this.deliveryLog.get(deliveryId);
  }

  /**
   * Get all delivery results for a user
   */
  public getUserDeliveryHistory(userId: string, limit: number = 50): PushDeliveryResult[] {
    const results: PushDeliveryResult[] = [];
    for (const [, result] of this.deliveryLog) {
      if (result.userId === userId) {
        results.push(result);
      }
    }
    return results
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, limit);
  }

  /**
   * Get registered devices for a user
   */
  public getUserDevices(userId: string): DeviceToken[] {
    const deviceIds = this.userDevices.get(userId);
    if (!deviceIds) return [];

    return Array.from(deviceIds)
      .map(id => this.devices.get(id))
      .filter((d): d is DeviceToken => d !== undefined && d.isActive);
  }

  /**
   * Process pending retries
   */
  public async processRetries(): Promise<number> {
    const now = Date.now();
    let processed = 0;

    for (const [retryId, retry] of this.pendingRetries) {
      if (retry.nextRetryAt > now) continue;

      if (retry.attempts >= this.config.maxRetries) {
        this.pendingRetries.delete(retryId);
        continue;
      }

      try {
        await this.send(retry.request);
        this.pendingRetries.delete(retryId);
        processed++;
      } catch {
        retry.attempts++;
        retry.nextRetryAt = now + (this.config.retryDelayMs * Math.pow(2, retry.attempts));
      }
    }

    return processed;
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    totalDevices: number;
    activeDevices: number;
    totalDeliveries: number;
    pendingRetries: number;
    platformBreakdown: Record<PushPlatform, number>;
  } {
    let activeDevices = 0;
    const platformBreakdown: Record<PushPlatform, number> = { fcm: 0, apns: 0, web_push: 0 };

    for (const [, device] of this.devices) {
      if (device.isActive) activeDevices++;
      platformBreakdown[device.platform]++;
    }

    return {
      totalDevices: this.devices.size,
      activeDevices,
      totalDeliveries: this.deliveryLog.size,
      pendingRetries: this.pendingRetries.size,
      platformBreakdown,
    };
  }

  // ---- Private Methods ----

  private async sendToDevice(device: DeviceToken, request: PushSendRequest): Promise<PushDeliveryResult> {
    // Simulate platform-specific delivery
    const payload = this.buildPlatformPayload(device.platform, request);
    const deliveryId = this.generateId('delivery');
    const now = Date.now();

    // Simulate delivery success/failure (in production, this calls FCM/APNs APIs)
    const success = this.simulateDelivery(device);

    const result: PushDeliveryResult = {
      id: deliveryId,
      userId: request.userId,
      deviceId: device.id,
      platform: device.platform,
      status: success ? 'delivered' : 'failed',
      sentAt: now,
      deliveredAt: success ? now + 100 : undefined,
      error: success ? undefined : 'Delivery failed - device unreachable',
      messageId: success ? `msg_${deliveryId}` : undefined,
    };

    this.deliveryLog.set(deliveryId, result);

    // Queue for retry if failed
    if (!success && !this.pendingRetries.has(deliveryId)) {
      this.pendingRetries.set(deliveryId, {
        request,
        attempts: 1,
        nextRetryAt: now + this.config.retryDelayMs,
      });
    }

    // Update device last active
    device.lastActiveAt = now;

    return result;
  }

  private buildPlatformPayload(platform: PushPlatform, request: PushSendRequest): Record<string, unknown> {
    const base = {
      title: request.title,
      body: request.body,
      data: request.data || {},
    };

    switch (platform) {
      case 'fcm':
        return {
          ...base,
          android: {
            priority: this.mapPriorityToAndroid(request.priority),
            ttl: `${(request.ttl || this.config.defaultTtlMs) / 1000}s`,
            notification: { sound: request.sound || 'default', image: request.image },
          },
          collapse_key: request.collapseKey,
        };

      case 'apns':
        return {
          ...base,
          aps: {
            alert: { title: request.title, body: request.body },
            badge: request.badge,
            sound: request.sound || 'default',
            'mutable-content': 1,
          },
          headers: { 'apns-priority': request.priority === 'critical' ? '10' : '5' },
        };

      case 'web_push':
        return {
          ...base,
          icon: request.image,
          badge: request.badge,
          requireInteraction: request.priority === 'critical' || request.priority === 'high',
        };

      default:
        return base;
    }
  }

  private mapPriorityToAndroid(priority?: NotificationPriority): string {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      default:
        return 'normal';
    }
  }

  private simulateDelivery(device: DeviceToken): boolean {
    // Simulate 95% success rate
    const timeSinceActive = Date.now() - device.lastActiveAt;
    const inactivityPenalty = Math.min(timeSinceActive / 86400000, 0.3); // Up to 30% penalty for inactive devices
    return Math.random() > (0.05 + inactivityPenalty);
  }

  private isTokenValid(token: string, platform: PushPlatform): boolean {
    return this.validateToken(token, platform).valid;
  }

  private isRateLimited(deviceId: string): boolean {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(deviceId);

    if (!tracker || (now - tracker.windowStart) > this.config.rateLimitWindowMs) {
      return false;
    }

    return tracker.count >= this.config.rateLimitPerDevice;
  }

  private incrementRateLimit(deviceId: string): void {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(deviceId);

    if (!tracker || (now - tracker.windowStart) > this.config.rateLimitWindowMs) {
      this.rateLimitTracker.set(deviceId, { count: 1, windowStart: now });
    } else {
      tracker.count++;
    }
  }

  private createDeliveryResult(
    userId: string,
    deviceId: string,
    platform: PushPlatform,
    status: DeliveryStatus,
    error?: string
  ): PushDeliveryResult {
    const id = this.generateId('delivery');
    const result: PushDeliveryResult = {
      id,
      userId,
      deviceId,
      platform,
      status,
      sentAt: Date.now(),
      error,
    };
    this.deliveryLog.set(id, result);
    return result;
  }

  private generateId(prefix: string): string {
    this.deliveryCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.deliveryCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
