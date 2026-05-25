// ============================================================================
// Quant Ecosystem Bridge - Cross-App Integration Layer
// Connects all 9 Quant apps with shared services and protocols
// ============================================================================

// Types and Interfaces
export {
  AppName,
  ContentType,
  NotificationType,
  ActivityType,
  DisplayMode,
  Visibility,
  SharedContent,
  ContentMetadata,
  ContentPermissions,
  DeepLink,
  ActivityFeedItem,
  ActivityContent,
  MediaReference,
  EmbedConfig,
  EmbedReference,
  UniversalProfile,
  LinkedApp,
  UserPreferences,
  NotificationPreferences,
  AppNotificationPrefs,
  PrivacyPreferences,
  ProfileStats,
  AppStats,
  Badge,
  CrossAppEvent,
  CacheEntry,
  CachePolicy,
  AIContextEntry,
  AppRegistryEntry,
  APP_REGISTRY,
  ALL_APPS,
  ShareEvent,
  NotificationPayload,
  SessionInfo
} from './types';

// Services
export { UniversalShareSheet } from './services/universal-share';
export { CrossAppNotifications } from './services/cross-app-notifications';
export { UnifiedActivityFeed } from './services/activity-feed';
export { ContentEmbedding } from './services/content-embedding';
export { UniversalProfileService } from './services/universal-profile';
export { AuthStateSync } from './services/auth-state-sync';
export { DeepLinkRegistry } from './services/deep-linking';
export { SharedContentCache } from './services/shared-cache';
export { CrossAppAIContext } from './services/cross-app-ai-context';
