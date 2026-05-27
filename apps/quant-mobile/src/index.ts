// @quant/quant-mobile - Capacitor Mega-Shell

// Plugins
export {
  PushNotificationService,
  ContactsService,
  CameraMediaService,
  FileSystemService,
  ShareExtensionService,
  BiometricAuthService,
  BackgroundFetchService,
  WebRTCService,
  HapticsService,
  InAppBrowserService,
} from './plugins/index.js';

export type {
  PushToken,
  PushNotification,
  NotificationChannel,
  PushConfig,
  NotificationHandler,
  TokenRefreshHandler,
  Contact,
  ContactField,
  ContactPermission,
  Photo,
  MediaItem,
  CameraOptions,
  GalleryOptions,
  FileInfo,
  Directory,
  ReadOptions,
  WriteOptions,
  SharedItem,
  ShareTarget,
  ShareReceivedHandler,
  BiometricType,
  AuthResult,
  BiometricConfig,
  BackgroundTask,
  FetchConfig,
  TaskResult,
  RTCConfig,
  MediaStream,
  PeerConnection,
  IceCandidate,
  SessionDescription,
  MediaConstraints,
  MediaTrack,
  HapticStyle,
  ImpactOptions,
  NotificationType,
  NotificationOptions,
  BrowserOptions,
  BrowserEvent,
  BrowserEventType,
  ToolbarButtonConfig,
  BrowserEventHandler,
} from './plugins/index.js';

// Splash & Icons
export { DEFAULT_SPLASH_CONFIG, DEFAULT_ICON_CONFIG } from './splash-icons/config.js';
export type {
  SplashConfig,
  IOSIconConfig,
  AndroidAdaptiveIcon,
  AppIconSet,
} from './splash-icons/config.js';

// Auth
export { NativeOAuthService } from './auth/oauth.js';
export type {
  OAuthProvider,
  OAuthTokens,
  OAuthConfig,
  AppleSignInResult,
  GoogleSignInResult,
  PKCEChallenge,
} from './auth/oauth.js';

// Deep Linking
export { UniversalLinkHandler } from './deep-linking/deep-link-handler.js';
export type {
  DeepLinkRoute,
  RouteMap,
  LinkConfig,
  AppLinkConfig,
  UniversalLinkConfig,
} from './deep-linking/deep-link-handler.js';

// Widgets
export { WidgetBridge } from './widgets/widget-bridge.js';
export type {
  NativeWidget,
  WidgetTimeline,
  WidgetEntry,
  WidgetConfig,
  WidgetPlatform,
} from './widgets/widget-bridge.js';

// Offline Sync
export { MobileOfflineSync } from './offline/offline-sync.js';
export type {
  NetworkState,
  SyncQueueStatus,
  QueuedMutation,
  NetworkChangeHandler,
  MutationExecutor,
} from './offline/offline-sync.js';

// Crash Reporting
export { CrashReporter } from './crash-reporting/crash-reporter.js';
export type {
  CrashConfig,
  Breadcrumb,
  BreadcrumbType,
  SeverityLevel,
  CrashEvent,
} from './crash-reporting/crash-reporter.js';

// Performance
export { AppSizeBudget, MAX_APP_SIZE_BYTES, MAX_COLD_START_MS } from './performance/perf-budget.js';
export type {
  SizeBudgetConfig,
  PerformanceReport,
  AssetInfo,
  ColdStartMetrics,
} from './performance/perf-budget.js';

// App Launcher
export { AppLauncher, QUANT_APPS } from './app-launcher.js';
export type { QuantApp, AppStatus } from './app-launcher.js';
