// ============================================================================
// Quant Ecosystem Bridge - Cross-App Notifications Service
// Unified notification routing and management across all 9 Quant apps
// ============================================================================

import {
  AppName,
  NotificationType,
  NotificationPayload,
  NotificationPreferences,
  AppNotificationPrefs,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface NotificationGroup {
  id: string;
  type: NotificationType;
  sourceApp: AppName;
  count: number;
  notifications: NotificationPayload[];
  summary: string;
  latestTimestamp: number;
}

interface UnifiedInbox {
  userId: string;
  totalCount: number;
  unreadCount: number;
  perApp: Record<string, { total: number; unread: number }>;
  notifications: NotificationPayload[];
  groups: NotificationGroup[];
}

interface NotificationStats {
  totalSent: number;
  totalRead: number;
  readRate: number;
  averageReadTime: number;
  byType: Record<string, number>;
  byApp: Record<string, number>;
}

export class CrossAppNotifications {
  private notifications: Map<string, NotificationPayload> = new Map();
  private userNotifications: Map<string, NotificationPayload[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private notificationCounter: number = 0;
  private routingRules: Map<string, (n: NotificationPayload) => boolean> = new Map();

  constructor() {
    this.setupRoutingRules();
  }

  private setupRoutingRules(): void {
    this.routingRules.set('message', (n: NotificationPayload) =>
      n.type === 'message' && n.source !== n.target
    );
    this.routingRules.set('mention', (n: NotificationPayload) =>
      n.type === 'mention'
    );
    this.routingRules.set('system', (n: NotificationPayload) =>
      n.type === 'system'
    );
    this.routingRules.set('achievement', (n: NotificationPayload) =>
      n.type === 'achievement'
    );
  }

  async notify(event: {
    type: NotificationType;
    source: AppName;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
    targetApps?: AppName[];
  }): Promise<NotificationPayload[]> {
    const targetApps = event.targetApps || this.determineTargetApps(event.type, event.source);
    const deliveredNotifications: NotificationPayload[] = [];

    for (const targetApp of targetApps) {
      if (this.isAllowed(event.userId, event.source, targetApp, event.type)) {
        const notification: NotificationPayload = {
          id: this.generateId(),
          type: event.type,
          source: event.source,
          target: targetApp,
          userId: event.userId,
          title: event.title,
          body: event.body,
          data: event.data || {},
          actionUrl: event.actionUrl,
          timestamp: Date.now(),
          read: false,
          grouped: false
        };

        this.notifications.set(notification.id, notification);
        const userNotifs = this.userNotifications.get(event.userId) || [];
        userNotifs.push(notification);
        this.userNotifications.set(event.userId, userNotifs);
        deliveredNotifications.push(notification);
      }
    }

    return deliveredNotifications;
  }

  routeToApp(notification: NotificationPayload, targetApp: AppName): NotificationPayload {
    const appInfo = APP_REGISTRY[targetApp];
    const routedNotification: NotificationPayload = {
      ...notification,
      target: targetApp,
      data: {
        ...notification.data,
        routedFrom: notification.source,
        routedAt: Date.now(),
        targetAppName: appInfo.displayName,
        deepLink: `${appInfo.urlScheme}notification/${notification.id}`
      }
    };
    return routedNotification;
  }

  aggregate(notifications: NotificationPayload[]): NotificationGroup[] {
    const groupMap: Map<string, NotificationPayload[]> = new Map();

    for (const notification of notifications) {
      const groupKey = `${notification.source}_${notification.type}`;
      const group = groupMap.get(groupKey) || [];
      group.push(notification);
      groupMap.set(groupKey, group);
    }

    const groups: NotificationGroup[] = [];
    for (const [key, notifs] of groupMap.entries()) {
      if (notifs.length < 2) continue;

      const sorted = notifs.sort((a, b) => b.timestamp - a.timestamp);
      const sourceApp = sorted[0].source;
      const type = sorted[0].type;
      const appName = APP_REGISTRY[sourceApp].displayName;

      let summary: string;
      if (notifs.length === 2) {
        summary = `${notifs[0].title} and ${notifs[1].title}`;
      } else {
        summary = `${notifs[0].title} and ${notifs.length - 1} more from ${appName}`;
      }

      groups.push({
        id: `group_${key}_${Date.now()}`,
        type,
        sourceApp,
        count: notifs.length,
        notifications: sorted,
        summary,
        latestTimestamp: sorted[0].timestamp
      });

      for (const n of notifs) {
        n.grouped = true;
        n.groupId = groups[groups.length - 1].id;
      }
    }

    return groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }

  getUnifiedInbox(userId: string, limit: number = 100): UnifiedInbox {
    const userNotifs = this.userNotifications.get(userId) || [];
    const sorted = [...userNotifs].sort((a, b) => b.timestamp - a.timestamp);
    const limited = sorted.slice(0, limit);

    const perApp: Record<string, { total: number; unread: number }> = {};
    for (const app of ALL_APPS) {
      const appNotifs = userNotifs.filter(n => n.source === app || n.target === app);
      perApp[app] = {
        total: appNotifs.length,
        unread: appNotifs.filter(n => !n.read).length
      };
    }

    const unreadCount = userNotifs.filter(n => !n.read).length;
    const groups = this.aggregate(limited.filter(n => !n.read));

    return {
      userId,
      totalCount: userNotifs.length,
      unreadCount,
      perApp,
      notifications: limited,
      groups
    };
  }

  setPreferences(userId: string, prefs: NotificationPreferences): void {
    this.preferences.set(userId, prefs);
  }

  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.getDefaultPreferences();
  }

  muteApp(userId: string, app: AppName): void {
    const prefs = this.getPreferences(userId);
    if (!prefs.perApp[app]) {
      prefs.perApp[app] = this.getDefaultAppPrefs();
    }
    prefs.perApp[app].enabled = false;
    this.preferences.set(userId, prefs);
  }

  muteUntil(userId: string, app: AppName, until: number): void {
    const prefs = this.getPreferences(userId);
    if (!prefs.perApp[app]) {
      prefs.perApp[app] = this.getDefaultAppPrefs();
    }
    prefs.perApp[app].mutedUntil = until;
    this.preferences.set(userId, prefs);
  }

  unmuteApp(userId: string, app: AppName): void {
    const prefs = this.getPreferences(userId);
    if (prefs.perApp[app]) {
      prefs.perApp[app].enabled = true;
      prefs.perApp[app].mutedUntil = undefined;
    }
    this.preferences.set(userId, prefs);
  }

  getUnreadCount(userId: string): Record<string, number> {
    const userNotifs = this.userNotifications.get(userId) || [];
    const counts: Record<string, number> = { total: 0 };

    for (const app of ALL_APPS) {
      const count = userNotifs.filter(n => !n.read && (n.source === app || n.target === app)).length;
      counts[app] = count;
      counts.total += count;
    }

    return counts;
  }

  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    notification.read = true;
    notification.readAt = Date.now();
    return true;
  }

  markAllAsRead(userId: string, app?: AppName): number {
    const userNotifs = this.userNotifications.get(userId) || [];
    let count = 0;
    for (const n of userNotifs) {
      if (!n.read && (!app || n.source === app || n.target === app)) {
        n.read = true;
        n.readAt = Date.now();
        count++;
      }
    }
    return count;
  }

  deleteNotification(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;
    this.notifications.delete(notificationId);
    const userNotifs = this.userNotifications.get(userId) || [];
    const index = userNotifs.findIndex(n => n.id === notificationId);
    if (index >= 0) userNotifs.splice(index, 1);
    return true;
  }

  getStats(userId: string): NotificationStats {
    const userNotifs = this.userNotifications.get(userId) || [];
    const readNotifs = userNotifs.filter(n => n.read);
    const readTimes = readNotifs
      .filter(n => n.readAt)
      .map(n => (n.readAt as number) - n.timestamp);

    const byType: Record<string, number> = {};
    const byApp: Record<string, number> = {};
    for (const n of userNotifs) {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byApp[n.source] = (byApp[n.source] || 0) + 1;
    }

    return {
      totalSent: userNotifs.length,
      totalRead: readNotifs.length,
      readRate: userNotifs.length > 0 ? readNotifs.length / userNotifs.length : 0,
      averageReadTime: readTimes.length > 0
        ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length
        : 0,
      byType,
      byApp
    };
  }

  private isAllowed(userId: string, source: AppName, target: AppName, type: NotificationType): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs) return true;
    if (!prefs.enabled) return false;

    const appPrefs = prefs.perApp[source];
    if (appPrefs) {
      if (!appPrefs.enabled) return false;
      if (appPrefs.mutedUntil && appPrefs.mutedUntil > Date.now()) return false;
      if (appPrefs.types.length > 0 && !appPrefs.types.includes(type)) return false;
    }

    if (prefs.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime >= prefs.quietHours.start && currentTime <= prefs.quietHours.end) {
        return type === 'system';
      }
    }

    return true;
  }

  private determineTargetApps(type: NotificationType, source: AppName): AppName[] {
    switch (type) {
      case 'mention':
      case 'follow':
        return ALL_APPS.filter(a => a !== source);
      case 'message':
        return ['quantchat'];
      case 'system':
        return ALL_APPS;
      case 'achievement':
        return ALL_APPS.filter(a => a !== source);
      default:
        return [source];
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    const perApp: Record<string, AppNotificationPrefs> = {};
    for (const app of ALL_APPS) {
      perApp[app as string] = this.getDefaultAppPrefs();
    }
    return {
      enabled: true,
      perApp: perApp as Record<AppName, AppNotificationPrefs>,
      quietHours: { start: '22:00', end: '07:00', enabled: false },
      channels: { push: true, email: true, inApp: true, sms: false }
    };
  }

  private getDefaultAppPrefs(): AppNotificationPrefs {
    return {
      enabled: true,
      types: ['message', 'mention', 'follow', 'like', 'comment', 'system', 'share', 'achievement'],
      frequency: 'instant',
      mutedUntil: undefined
    };
  }

  private generateId(): string {
    this.notificationCounter++;
    return `notif_${Date.now()}_${this.notificationCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
