// ============================================================================
// Notifications Package - Barrel Export
// ============================================================================

export { PushNotificationService } from './services/push-service';
export { InAppNotificationService } from './services/in-app-service';
export { EmailDigestService } from './services/email-digest-service';
export { SchedulerService } from './services/scheduler-service';
export { PreferenceService } from './services/preference-service';

export type {
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  DeliveryStatus,
  PushPlatform,
  NotificationPayload,
  RichMedia,
  NotificationAction,
  DeepLinkAction,
  DeviceToken,
  PushSendRequest,
  PushDeliveryResult,
  InAppNotification,
  DigestConfig,
  DigestFrequency,
  DigestContent,
  DigestSummary,
  ScheduledNotification,
  RecurrenceRule,
  NotificationGroup,
  NotificationPreferences,
  ChannelPreferences,
  TypePreference,
  QuietHoursConfig,
  NotificationServiceConfig,
} from './types';
