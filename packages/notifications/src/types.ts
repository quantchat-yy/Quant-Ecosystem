// ============================================================================
// Notifications Package - Type Definitions
// ============================================================================

/** Notification type categories */
export type NotificationType =
  | 'message'
  | 'mention'
  | 'comment'
  | 'like'
  | 'follow'
  | 'share'
  | 'system'
  | 'alert'
  | 'reminder'
  | 'promotion'
  | 'update'
  | 'security'
  | 'billing'
  | 'achievement'
  | 'invitation';

/** Priority levels for notification delivery */
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

/** Delivery channels */
export type DeliveryChannel = 'push' | 'in_app' | 'email' | 'sms' | 'webhook';

/** Notification delivery status */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read';

/** Push notification platform */
export type PushPlatform = 'fcm' | 'apns' | 'web_push';

/** Core notification payload */
export interface NotificationPayload {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  recipientId: string;
  senderId?: string;
  channels: DeliveryChannel[];
  data?: Record<string, unknown>;
  richMedia?: RichMedia;
  actions?: NotificationAction[];
  deepLink?: DeepLinkAction;
  groupId?: string;
  threadId?: string;
  expiresAt?: number;
  createdAt: number;
  scheduledFor?: number;
}

/** Rich media attachment */
export interface RichMedia {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  alt?: string;
}

/** Notification action button */
export interface NotificationAction {
  id: string;
  label: string;
  type: 'open_url' | 'deep_link' | 'dismiss' | 'reply' | 'custom';
  value: string;
  icon?: string;
}

/** Deep link action */
export interface DeepLinkAction {
  screen: string;
  params: Record<string, unknown>;
  fallbackUrl?: string;
}

/** Device registration for push notifications */
export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  deviceId: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  registeredAt: number;
  lastActiveAt: number;
  isActive: boolean;
}

/** Push notification send request */
export interface PushSendRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  badge?: number;
  sound?: string;
  image?: string;
  ttl?: number;
  collapseKey?: string;
}

/** Push delivery result */
export interface PushDeliveryResult {
  id: string;
  userId: string;
  deviceId: string;
  platform: PushPlatform;
  status: DeliveryStatus;
  sentAt: number;
  deliveredAt?: number;
  error?: string;
  messageId?: string;
}

/** In-app notification */
export interface InAppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  recipientId: string;
  senderId?: string;
  read: boolean;
  readAt?: number;
  dismissed: boolean;
  dismissedAt?: number;
  richMedia?: RichMedia;
  actions?: NotificationAction[];
  deepLink?: DeepLinkAction;
  groupId?: string;
  createdAt: number;
  expiresAt?: number;
}

/** Email digest configuration */
export interface DigestConfig {
  id: string;
  userId: string;
  frequency: DigestFrequency;
  enabledTypes: NotificationType[];
  preferredTime: string; // HH:mm format
  timezone: string;
  lastSentAt?: number;
  nextScheduledAt?: number;
  isActive: boolean;
}

/** Digest frequency options */
export type DigestFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'never';

/** Digest content */
export interface DigestContent {
  id: string;
  userId: string;
  frequency: DigestFrequency;
  period: { start: number; end: number };
  notifications: InAppNotification[];
  summary: DigestSummary;
  generatedAt: number;
}

/** Digest summary */
export interface DigestSummary {
  totalNotifications: number;
  byType: Record<string, number>;
  highlights: string[];
  unreadCount: number;
}

/** Scheduled notification */
export interface ScheduledNotification {
  id: string;
  payload: NotificationPayload;
  scheduledFor: number;
  timezone: string;
  recurrence?: RecurrenceRule;
  status: 'scheduled' | 'processing' | 'sent' | 'cancelled' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttemptAt?: number;
}

/** Recurrence rule for scheduled notifications */
export interface RecurrenceRule {
  pattern: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endAfterOccurrences?: number;
  endDate?: number;
}

/** Notification group for batching */
export interface NotificationGroup {
  id: string;
  type: NotificationType;
  recipientId: string;
  notifications: InAppNotification[];
  count: number;
  lastUpdatedAt: number;
  summary: string;
  collapsed: boolean;
}

/** User notification preferences */
export interface NotificationPreferences {
  userId: string;
  globalEnabled: boolean;
  channels: ChannelPreferences;
  typePreferences: Map<NotificationType, TypePreference>;
  quietHours: QuietHoursConfig;
  digest: DigestConfig;
  updatedAt: number;
}

/** Per-channel preference */
export interface ChannelPreferences {
  push: { enabled: boolean; sound: boolean; badge: boolean; vibrate: boolean };
  in_app: { enabled: boolean; popup: boolean; sound: boolean };
  email: { enabled: boolean; frequency: DigestFrequency };
  sms: { enabled: boolean; criticalOnly: boolean };
  webhook: { enabled: boolean; url?: string };
}

/** Per-type notification preference */
export interface TypePreference {
  enabled: boolean;
  channels: DeliveryChannel[];
  priority: NotificationPriority;
  muted: boolean;
  muteUntil?: number;
}

/** Quiet hours configuration */
export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  allowCritical: boolean;
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
}

/** Notification service configuration */
export interface NotificationServiceConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  rateLimitPerUser: number;
  rateLimitWindowMs: number;
  defaultTtlMs: number;
  enableDigest: boolean;
  enableScheduling: boolean;
}
