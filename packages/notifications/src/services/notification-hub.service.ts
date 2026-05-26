// ============================================================================
// Notifications - Cross-App Notification Hub
// Unified notification dispatch from any app with priority routing
// ============================================================================

import type {
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  DeliveryStatus,
} from '../types';

/** Configuration for a registered app source */
export interface AppSourceConfig {
  appId: string;
  displayName: string;
  icon?: string;
  defaultPriority: NotificationPriority;
  defaultChannels: DeliveryChannel[];
  enabled: boolean;
}

/** A notification dispatched through the hub */
export interface HubNotification {
  id: string;
  appId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: DeliveryChannel[];
  status: DeliveryStatus;
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
}

/** Filters for the unified inbox */
export interface InboxFilters {
  appIds?: string[];
  types?: NotificationType[];
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** Routing rule for notification priority configuration */
export interface RoutingRule {
  appId: string;
  action: 'mute' | 'priority' | 'channel_override';
  schedule?: { startHour: number; endHour: number };
  overridePriority?: NotificationPriority;
  overrideChannels?: DeliveryChannel[];
}

/** Per-app unread counts */
export interface UnreadCounts {
  total: number;
  byApp: Record<string, number>;
}

/** Batch dispatch input item */
export interface BatchNotificationInput {
  appId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
}

/**
 * NotificationHub - Cross-app unified notification dispatch
 *
 * Centralizes notification delivery from all apps (quantchat, quantmail,
 * quantmeet, etc.) into a single hub. Supports priority routing, delivery
 * tracking, unified inbox, and per-app unread counts.
 */
export class NotificationHub {
  private apps: Map<string, AppSourceConfig> = new Map();
  private notifications: Map<string, HubNotification> = new Map();
  private userNotifications: Map<string, string[]> = new Map();
  private userRoutingRules: Map<string, RoutingRule[]> = new Map();
  private idCounter = 0;

  /**
   * Register an app as a notification source
   */
  registerApp(appId: string, config: Omit<AppSourceConfig, 'appId'>): void {
    if (!appId || !config.displayName) {
      throw new Error('appId and displayName are required');
    }
    this.apps.set(appId, { appId, ...config });
  }

  /**
   * Get a registered app configuration
   */
  getApp(appId: string): AppSourceConfig | undefined {
    return this.apps.get(appId);
  }

  /**
   * Get all registered apps
   */
  getRegisteredApps(): AppSourceConfig[] {
    return Array.from(this.apps.values());
  }

  /**
   * Dispatch a notification from a specific app
   */
  dispatchNotification(
    appId: string,
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      body: string;
      priority?: NotificationPriority;
      data?: Record<string, unknown>;
    },
  ): HubNotification {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App '${appId}' is not registered`);
    }
    if (!app.enabled) {
      throw new Error(`App '${appId}' is disabled`);
    }

    const priority = notification.priority || app.defaultPriority;
    const channels = [...app.defaultChannels];

    // Apply routing rules
    const routingResult = this.applyRoutingRules(userId, appId, priority, channels);
    if (routingResult.muted) {
      // Still create the notification but mark as muted (delivered)
      const hubNotif = this.createNotification(
        appId,
        userId,
        notification,
        priority,
        channels,
        'delivered',
      );
      return hubNotif;
    }

    const hubNotif = this.createNotification(
      appId,
      userId,
      notification,
      routingResult.priority,
      routingResult.channels,
      'sent',
    );

    // Simulate delivery
    hubNotif.status = 'delivered';
    hubNotif.deliveredAt = Date.now();

    return hubNotif;
  }

  /**
   * Get unified inbox for a user across all apps
   */
  getUnifiedInbox(userId: string, filters?: InboxFilters): HubNotification[] {
    const notifIds = this.userNotifications.get(userId);
    if (!notifIds || notifIds.length === 0) return [];

    let results: HubNotification[] = [];

    for (const id of notifIds) {
      const notif = this.notifications.get(id);
      if (!notif) continue;

      if (filters?.appIds && !filters.appIds.includes(notif.appId)) continue;
      if (filters?.types && !filters.types.includes(notif.type)) continue;
      if (filters?.priority && notif.priority !== filters.priority) continue;
      if (filters?.unreadOnly && notif.readAt !== undefined) continue;

      results.push(notif);
    }

    // Sort by time descending (newest first)
    results.sort((a, b) => b.createdAt - a.createdAt);

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const notif = this.notifications.get(notificationId);
    if (!notif || notif.userId !== userId) return false;

    if (!notif.readAt) {
      notif.readAt = Date.now();
      notif.status = 'read';
    }
    return true;
  }

  /**
   * Get unread notification counts per app
   */
  getUnreadCounts(userId: string): UnreadCounts {
    const notifIds = this.userNotifications.get(userId);
    if (!notifIds) return { total: 0, byApp: {} };

    const byApp: Record<string, number> = {};
    let total = 0;

    for (const id of notifIds) {
      const notif = this.notifications.get(id);
      if (!notif || notif.readAt !== undefined) continue;

      total++;
      byApp[notif.appId] = (byApp[notif.appId] || 0) + 1;
    }

    return { total, byApp };
  }

  /**
   * Set routing rules for a user (priority overrides, muting, etc.)
   */
  setRoutingRules(userId: string, rules: RoutingRule[]): void {
    this.userRoutingRules.set(userId, rules);
  }

  /**
   * Get routing rules for a user
   */
  getRoutingRules(userId: string): RoutingRule[] {
    return this.userRoutingRules.get(userId) || [];
  }

  /**
   * Batch dispatch multiple notifications efficiently
   */
  batchDispatch(notifications: BatchNotificationInput[]): HubNotification[] {
    const results: HubNotification[] = [];

    for (const input of notifications) {
      try {
        const result = this.dispatchNotification(input.appId, input.userId, {
          type: input.type,
          title: input.title,
          body: input.body,
          priority: input.priority,
          data: input.data,
        });
        results.push(result);
      } catch {
        // Skip invalid notifications in batch
      }
    }

    return results;
  }

  /**
   * Get delivery status for a notification
   */
  getDeliveryStatus(notificationId: string): DeliveryStatus | null {
    const notif = this.notifications.get(notificationId);
    return notif ? notif.status : null;
  }

  // ---- Private Methods ----

  private createNotification(
    appId: string,
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      body: string;
      priority?: NotificationPriority;
      data?: Record<string, unknown>;
    },
    priority: NotificationPriority,
    channels: DeliveryChannel[],
    status: DeliveryStatus,
  ): HubNotification {
    const id = this.generateId();

    const hubNotif: HubNotification = {
      id,
      appId,
      userId,
      type: notification.type,
      priority,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      channels,
      status,
      createdAt: Date.now(),
    };

    this.notifications.set(id, hubNotif);

    if (!this.userNotifications.has(userId)) {
      this.userNotifications.set(userId, []);
    }
    this.userNotifications.get(userId)!.push(id);

    return hubNotif;
  }

  private applyRoutingRules(
    userId: string,
    appId: string,
    priority: NotificationPriority,
    channels: DeliveryChannel[],
  ): { muted: boolean; priority: NotificationPriority; channels: DeliveryChannel[] } {
    const rules = this.userRoutingRules.get(userId);
    if (!rules) return { muted: false, priority, channels };

    let muted = false;
    let resultPriority = priority;
    let resultChannels = [...channels];
    const currentHour = new Date().getHours();

    for (const rule of rules) {
      if (rule.appId !== appId) continue;

      // Check time schedule
      if (rule.schedule) {
        const { startHour, endHour } = rule.schedule;
        const inSchedule =
          startHour <= endHour
            ? currentHour >= startHour && currentHour < endHour
            : currentHour >= startHour || currentHour < endHour;
        if (!inSchedule) continue;
      }

      switch (rule.action) {
        case 'mute':
          muted = true;
          break;
        case 'priority':
          if (rule.overridePriority) {
            resultPriority = rule.overridePriority;
          }
          break;
        case 'channel_override':
          if (rule.overrideChannels) {
            resultChannels = rule.overrideChannels;
          }
          break;
      }
    }

    return { muted, priority: resultPriority, channels: resultChannels };
  }

  private generateId(): string {
    this.idCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.idCounter.toString(36);
    return `hub_${timestamp}_${counter}`;
  }
}
