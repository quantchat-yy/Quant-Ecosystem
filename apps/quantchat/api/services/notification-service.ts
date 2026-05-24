// ============================================================================
// QuantChat - Notification Service
// Push notifications for messages, calls, stories, streaks
// ============================================================================

import type { Notification, NotificationType } from '../../src/types';

// ============================================================================
// Types
// ============================================================================

interface DeviceRegistration {
  userId: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  pushToken: string;
  registeredAt: Date;
  isActive: boolean;
}

interface NotificationPreference {
  userId: string;
  messages: boolean;
  calls: boolean;
  stories: boolean;
  streaks: boolean;
  groupInvites: boolean;
  friendRequests: boolean;
  mentions: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
  mutedConversations: string[];
}

interface PushPayload {
  title: string;
  body: string;
  data: Record<string, unknown>;
  badge?: number;
  sound?: string;
  imageUrl?: string;
  actionUrl?: string;
  priority: 'high' | 'normal' | 'low';
  ttl: number; // seconds
}

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private userNotifications: Map<string, string[]> = new Map();
  private devices: Map<string, DeviceRegistration[]> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();
  private pushQueue: PushPayload[] = [];
  private sentCount: number = 0;

  // --------------------------------------------------------------------------
  // Device Registration
  // --------------------------------------------------------------------------

  async registerDevice(userId: string, deviceId: string, platform: 'ios' | 'android' | 'web', pushToken: string): Promise<DeviceRegistration> {
    const registration: DeviceRegistration = {
      userId,
      deviceId,
      platform,
      pushToken,
      registeredAt: new Date(),
      isActive: true,
    };

    const devices = this.devices.get(userId) || [];
    // Replace if same device
    const existingIdx = devices.findIndex(d => d.deviceId === deviceId);
    if (existingIdx >= 0) {
      devices[existingIdx] = registration;
    } else {
      devices.push(registration);
    }
    this.devices.set(userId, devices);

    return registration;
  }

  async unregisterDevice(userId: string, deviceId: string): Promise<void> {
    const devices = this.devices.get(userId) || [];
    this.devices.set(userId, devices.filter(d => d.deviceId !== deviceId));
  }

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  async getPreferences(userId: string): Promise<NotificationPreference> {
    return this.preferences.get(userId) || {
      userId,
      messages: true,
      calls: true,
      stories: true,
      streaks: true,
      groupInvites: true,
      friendRequests: true,
      mentions: true,
      mutedConversations: [],
    };
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...prefs, userId };
    this.preferences.set(userId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Send Notifications
  // --------------------------------------------------------------------------

  async sendNotification(userId: string, type: NotificationType, title: string, body: string, data: Record<string, unknown> = {}): Promise<Notification | null> {
    // Check preferences
    const prefs = await this.getPreferences(userId);
    if (!this.shouldSend(type, prefs, data)) return null;

    // Check quiet hours
    if (this.isQuietHours(prefs)) return null;

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const notification: Notification = {
      id: notifId,
      userId,
      type,
      title,
      body,
      data,
      isRead: false,
      senderId: data['senderId'] as string | undefined,
      imageUrl: data['imageUrl'] as string | undefined,
      actionUrl: data['actionUrl'] as string | undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(notifId, notification);
    const userNotifs = this.userNotifications.get(userId) || [];
    userNotifs.push(notifId);
    this.userNotifications.set(userId, userNotifs);

    // Queue push notification
    await this.queuePush(userId, {
      title,
      body,
      data: { ...data, notificationId: notifId, type },
      sound: type === 'call' ? 'ringtone' : 'default',
      priority: type === 'call' ? 'high' : 'normal',
      ttl: type === 'call' ? 30 : 3600,
      imageUrl: data['imageUrl'] as string | undefined,
      actionUrl: data['actionUrl'] as string | undefined,
    });

    return notification;
  }

  async sendMessageNotification(recipientId: string, senderName: string, content: string, conversationId: string): Promise<Notification | null> {
    return this.sendNotification(recipientId, 'message', senderName, content, {
      conversationId,
      actionUrl: `/chat/${conversationId}`,
    });
  }

  async sendCallNotification(recipientId: string, callerName: string, callId: string, callType: 'voice' | 'video'): Promise<Notification | null> {
    return this.sendNotification(recipientId, 'call', `Incoming ${callType} call`, `${callerName} is calling...`, {
      callId,
      callType,
      actionUrl: `/calls/${callId}`,
    });
  }

  async sendStreakWarning(userId: string, friendName: string, streakCount: number, hoursLeft: number): Promise<Notification | null> {
    return this.sendNotification(userId, 'streak_warning', 'Streak about to expire!', `Your ${streakCount}-day streak with ${friendName} expires in ${hoursLeft}h! Send a snap now.`, {
      friendName,
      streakCount,
      hoursLeft,
    });
  }

  async sendSnapNotification(recipientId: string, senderName: string, snapId: string): Promise<Notification | null> {
    return this.sendNotification(recipientId, 'snap', 'New Snap', `${senderName} sent you a snap`, {
      snapId,
      actionUrl: `/snaps/${snapId}`,
    });
  }

  // --------------------------------------------------------------------------
  // Read & List
  // --------------------------------------------------------------------------

  async getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false): Promise<Notification[]> {
    const notifIds = this.userNotifications.get(userId) || [];
    let notifications: Notification[] = [];

    for (const id of notifIds.slice(-limit).reverse()) {
      const notif = this.notifications.get(id);
      if (notif) {
        if (unreadOnly && notif.isRead) continue;
        notifications.push(notif);
      }
    }

    return notifications;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.userId === userId) {
      notification.isRead = true;
      notification.updatedAt = new Date();
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const notifIds = this.userNotifications.get(userId) || [];
    let count = 0;
    for (const id of notifIds) {
      const notif = this.notifications.get(id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        notif.updatedAt = new Date();
        count++;
      }
    }
    return count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifIds = this.userNotifications.get(userId) || [];
    let count = 0;
    for (const id of notifIds) {
      const notif = this.notifications.get(id);
      if (notif && !notif.isRead) count++;
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private shouldSend(type: NotificationType, prefs: NotificationPreference, data: Record<string, unknown>): boolean {
    // Check muted conversations
    if (data['conversationId'] && prefs.mutedConversations.includes(data['conversationId'] as string)) {
      return false;
    }

    switch (type) {
      case 'message': return prefs.messages;
      case 'call': return prefs.calls;
      case 'story_reply': return prefs.stories;
      case 'streak_warning': return prefs.streaks;
      case 'group_invite': return prefs.groupInvites;
      case 'friend_request': return prefs.friendRequests;
      case 'mention': return prefs.mentions;
      default: return true;
    }
  }

  private isQuietHours(prefs: NotificationPreference): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    // Overnight quiet hours (e.g., 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  private async queuePush(userId: string, payload: PushPayload): Promise<void> {
    const devices = this.devices.get(userId) || [];
    for (const device of devices) {
      if (device.isActive) {
        this.pushQueue.push(payload);
        this.sentCount++;
      }
    }
  }

  getStats(): { totalNotifications: number; sentPushes: number; registeredDevices: number } {
    let deviceCount = 0;
    for (const devices of this.devices.values()) {
      deviceCount += devices.length;
    }
    return {
      totalNotifications: this.notifications.size,
      sentPushes: this.sentCount,
      registeredDevices: deviceCount,
    };
  }
}

export const notificationService = new NotificationService();
