// Push Notification Service - FCM (Android) + APNs (iOS) abstraction

export interface PushToken {
  value: string;
  platform: 'ios' | 'android';
  createdAt: number;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
  channelId?: string;
  scheduledAt?: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: 'none' | 'min' | 'low' | 'default' | 'high';
  sound?: string;
  vibration?: boolean;
}

export interface PushConfig {
  autoRegister: boolean;
  requestPermissionOnStart: boolean;
  channels: NotificationChannel[];
}

export type NotificationHandler = (notification: PushNotification) => void;
export type TokenRefreshHandler = (token: PushToken) => void;

export class PushNotificationService {
  private token: PushToken | null = null;
  private channels: Map<string, NotificationChannel> = new Map();
  private notificationHandlers: NotificationHandler[] = [];
  private tokenRefreshHandlers: TokenRefreshHandler[] = [];
  private permissionGranted = false;

  async register(): Promise<PushToken> {
    if (!this.permissionGranted) {
      throw new Error('Push notification permission not granted');
    }
    this.token = {
      value: this.generateToken(),
      platform: this.detectPlatform(),
      createdAt: Date.now(),
    };
    return this.token;
  }

  getToken(): PushToken | null {
    return this.token;
  }

  onNotificationReceived(handler: NotificationHandler): () => void {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter((h) => h !== handler);
    };
  }

  onTokenRefresh(handler: TokenRefreshHandler): () => void {
    this.tokenRefreshHandlers.push(handler);
    return () => {
      this.tokenRefreshHandlers = this.tokenRefreshHandlers.filter((h) => h !== handler);
    };
  }

  createChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  getChannels(): NotificationChannel[] {
    return [...this.channels.values()];
  }

  async requestPermission(): Promise<boolean> {
    this.permissionGranted = true;
    return true;
  }

  async scheduleLocal(notification: PushNotification): Promise<string> {
    if (!notification.id) {
      throw new Error('Notification must have an id');
    }
    return notification.id;
  }

  /** @internal - for testing */
  _simulateNotification(notification: PushNotification): void {
    for (const handler of this.notificationHandlers) {
      handler(notification);
    }
  }

  /** @internal - for testing */
  _simulateTokenRefresh(token: PushToken): void {
    this.token = token;
    for (const handler of this.tokenRefreshHandlers) {
      handler(token);
    }
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 152; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private detectPlatform(): 'ios' | 'android' {
    return 'ios';
  }
}
