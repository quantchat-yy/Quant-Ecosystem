export { PushNotificationService } from './push-notifications.js';
export type {
  PushToken,
  PushNotification,
  NotificationChannel,
  PushConfig,
  NotificationHandler,
  TokenRefreshHandler,
} from './push-notifications.js';

export { ContactsService } from './contacts.js';
export type { Contact, ContactField, ContactPermission } from './contacts.js';

export { CameraMediaService } from './camera-media.js';
export type { Photo, MediaItem, CameraOptions, GalleryOptions } from './camera-media.js';

export { FileSystemService } from './file-system.js';
export type { FileInfo, Directory, ReadOptions, WriteOptions } from './file-system.js';

export { ShareExtensionService } from './share-extension.js';
export type { SharedItem, ShareTarget, ShareReceivedHandler } from './share-extension.js';

export { BiometricAuthService } from './biometric-auth.js';
export type { BiometricType, AuthResult, BiometricConfig } from './biometric-auth.js';

export { BackgroundFetchService } from './background-fetch.js';
export type { BackgroundTask, FetchConfig, TaskResult } from './background-fetch.js';

export { WebRTCService } from './webrtc.js';
export type {
  RTCConfig,
  MediaStream,
  PeerConnection,
  IceCandidate,
  SessionDescription,
  MediaConstraints,
  MediaTrack,
} from './webrtc.js';

export { HapticsService } from './haptics.js';
export type {
  HapticStyle,
  ImpactOptions,
  NotificationType,
  NotificationOptions,
} from './haptics.js';

export { InAppBrowserService } from './in-app-browser.js';
export type {
  BrowserOptions,
  BrowserEvent,
  BrowserEventType,
  ToolbarButtonConfig,
  BrowserEventHandler,
} from './in-app-browser.js';
