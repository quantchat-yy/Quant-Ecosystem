// ============================================================================
// Quant Ecosystem Bridge - Type Definitions
// Cross-app integration types for the entire Quant platform
// ============================================================================

export type AppName =
  | 'quantchat'
  | 'quantmail'
  | 'quantsync'
  | 'quantads'
  | 'quantube'
  | 'quantneon'
  | 'quantedits'
  | 'quantmax'
  | 'quantai';

export type ContentType =
  | 'video'
  | 'image'
  | 'text'
  | 'audio'
  | 'document'
  | 'link'
  | 'code'
  | 'presentation'
  | 'spreadsheet'
  | 'design'
  | 'ad_creative'
  | 'email_template'
  | 'social_post';

export type NotificationType =
  | 'message'
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'system'
  | 'share'
  | 'invite'
  | 'achievement'
  | 'alert';

export type ActivityType =
  | 'post'
  | 'upload'
  | 'share'
  | 'comment'
  | 'achievement'
  | 'follow'
  | 'like'
  | 'create'
  | 'edit'
  | 'publish';

export type DisplayMode = 'compact' | 'standard' | 'expanded' | 'fullscreen' | 'minimal';

export type Visibility = 'public' | 'friends' | 'private' | 'app_only';

export interface SharedContent {
  id: string;
  sourceApp: AppName;
  contentType: ContentType;
  data: Record<string, unknown>;
  metadata: ContentMetadata;
  sharedAt: number;
  sharedBy: string;
  recipients: string[];
  targetApps: AppName[];
  expiresAt?: number;
  permissions: ContentPermissions;
}

export interface ContentMetadata {
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  tags: string[];
  language?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContentPermissions {
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canEmbed: boolean;
  canDownload: boolean;
  canComment: boolean;
}

export interface DeepLink {
  scheme: string;
  app: AppName;
  path: string;
  params: Record<string, string>;
  fallbackUrl: string;
  expiresAt?: number;
  clickCount: number;
  createdAt: number;
  createdBy: string;
}

export interface ActivityFeedItem {
  id: string;
  app: AppName;
  userId: string;
  action: ActivityType;
  content: ActivityContent;
  timestamp: number;
  seen: boolean;
  seenAt?: number;
  relevanceScore: number;
  engagementCount: number;
  reactions: Record<string, number>;
}

export interface ActivityContent {
  title: string;
  body: string;
  preview?: string;
  media?: MediaReference[];
  link?: string;
  mentions?: string[];
}

export interface MediaReference {
  id: string;
  type: ContentType;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface EmbedConfig {
  sourceApp: AppName;
  contentId: string;
  displayMode: DisplayMode;
  interactive: boolean;
  autoplay: boolean;
  showControls: boolean;
  maxWidth?: number;
  maxHeight?: number;
  theme: 'light' | 'dark' | 'auto';
  permissions: ContentPermissions;
}

export interface EmbedReference {
  id: string;
  config: EmbedConfig;
  targetApp: AppName;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  status: 'active' | 'expired' | 'removed';
}

export interface UniversalProfile {
  userId: string;
  displayName: string;
  avatar: string;
  bio: string;
  linkedApps: LinkedApp[];
  preferences: UserPreferences;
  stats: ProfileStats;
  badges: Badge[];
  visibility: Record<string, Visibility>;
  createdAt: number;
  updatedAt: number;
  completenessScore: number;
}

export interface LinkedApp {
  app: AppName;
  username: string;
  linkedAt: number;
  verified: boolean;
  permissions: string[];
  lastActive: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  enabled: boolean;
  perApp: Record<AppName, AppNotificationPrefs>;
  quietHours: { start: string; end: string; enabled: boolean };
  channels: { push: boolean; email: boolean; inApp: boolean; sms: boolean };
}

export interface AppNotificationPrefs {
  enabled: boolean;
  types: NotificationType[];
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  mutedUntil?: number;
}

export interface PrivacyPreferences {
  profileVisibility: Visibility;
  activityVisibility: Visibility;
  searchable: boolean;
  showOnlineStatus: boolean;
  allowCrossAppTracking: boolean;
}

export interface ProfileStats {
  totalFollowers: number;
  totalFollowing: number;
  totalContent: number;
  totalEngagement: number;
  perApp: Record<AppName, AppStats>;
}

export interface AppStats {
  posts: number;
  followers: number;
  engagement: number;
  lastActive: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
  app: AppName;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface CrossAppEvent {
  id: string;
  source: AppName;
  target: AppName | 'all';
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: number;
  processed: boolean;
  processedAt?: number;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CacheEntry {
  key: string;
  data: unknown;
  sourceApp: AppName;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  tags: string[];
}

export interface CachePolicy {
  maxSize: number;
  defaultTTL: number;
  evictionStrategy: 'lru' | 'lfu' | 'ttl';
  preloadEnabled: boolean;
  compressionThreshold: number;
}

export interface AIContextEntry {
  id: string;
  app: AppName;
  userId: string;
  action: string;
  content: string;
  timestamp: number;
  relevanceScore: number;
  category: string;
  entities: string[];
  sentiment: number;
  processed: boolean;
}

export interface AppRegistryEntry {
  name: AppName;
  displayName: string;
  urlScheme: string;
  baseUrl: string;
  capabilities: string[];
  supportedContentTypes: ContentType[];
  icon: string;
  color: string;
  version: string;
  status: 'active' | 'maintenance' | 'deprecated';
}

export const APP_REGISTRY: Record<AppName, AppRegistryEntry> = {
  quantchat: {
    name: 'quantchat',
    displayName: 'QuantChat',
    urlScheme: 'quantchat://',
    baseUrl: 'https://chat.quant.app',
    capabilities: ['messaging', 'video_call', 'voice_call', 'file_sharing', 'group_chat'],
    supportedContentTypes: ['text', 'image', 'video', 'audio', 'document', 'link'],
    icon: 'chat-bubble',
    color: '#4A90D9',
    version: '3.0.0',
    status: 'active'
  },
  quantmail: {
    name: 'quantmail',
    displayName: 'QuantMail',
    urlScheme: 'quantmail://',
    baseUrl: 'https://mail.quant.app',
    capabilities: ['email', 'attachments', 'calendar', 'contacts', 'templates'],
    supportedContentTypes: ['text', 'document', 'image', 'link', 'email_template'],
    icon: 'envelope',
    color: '#E74C3C',
    version: '2.5.0',
    status: 'active'
  },
  quantsync: {
    name: 'quantsync',
    displayName: 'QuantSync',
    urlScheme: 'quantsync://',
    baseUrl: 'https://sync.quant.app',
    capabilities: ['social_feed', 'stories', 'reels', 'live_streaming', 'groups'],
    supportedContentTypes: ['image', 'video', 'text', 'link', 'social_post'],
    icon: 'sync-arrows',
    color: '#9B59B6',
    version: '4.0.0',
    status: 'active'
  },
  quantads: {
    name: 'quantads',
    displayName: 'QuantAds',
    urlScheme: 'quantads://',
    baseUrl: 'https://ads.quant.app',
    capabilities: ['ad_campaigns', 'analytics', 'targeting', 'creative_studio', 'bidding'],
    supportedContentTypes: ['image', 'video', 'text', 'ad_creative'],
    icon: 'megaphone',
    color: '#F39C12',
    version: '2.0.0',
    status: 'active'
  },
  quantube: {
    name: 'quantube',
    displayName: 'QuantTube',
    urlScheme: 'quantube://',
    baseUrl: 'https://tube.quant.app',
    capabilities: ['video_hosting', 'live_streaming', 'shorts', 'playlists', 'monetization'],
    supportedContentTypes: ['video', 'audio', 'image', 'text', 'link'],
    icon: 'play-circle',
    color: '#E74C3C',
    version: '5.0.0',
    status: 'active'
  },
  quantneon: {
    name: 'quantneon',
    displayName: 'QuantNeon',
    urlScheme: 'quantneon://',
    baseUrl: 'https://neon.quant.app',
    capabilities: ['photo_sharing', 'filters', 'stories', 'reels', 'ar_effects'],
    supportedContentTypes: ['image', 'video', 'text', 'design'],
    icon: 'camera',
    color: '#E91E63',
    version: '3.5.0',
    status: 'active'
  },
  quantedits: {
    name: 'quantedits',
    displayName: 'QuantEdits',
    urlScheme: 'quantedits://',
    baseUrl: 'https://edits.quant.app',
    capabilities: ['video_editing', 'audio_editing', 'effects', 'collaboration', 'export'],
    supportedContentTypes: ['video', 'audio', 'image', 'text', 'presentation'],
    icon: 'film',
    color: '#2ECC71',
    version: '2.0.0',
    status: 'active'
  },
  quantmax: {
    name: 'quantmax',
    displayName: 'QuantMax',
    urlScheme: 'quantmax://',
    baseUrl: 'https://max.quant.app',
    capabilities: ['workspace', 'documents', 'spreadsheets', 'presentations', 'collaboration'],
    supportedContentTypes: ['document', 'spreadsheet', 'presentation', 'text', 'code'],
    icon: 'layers',
    color: '#3498DB',
    version: '1.5.0',
    status: 'active'
  },
  quantai: {
    name: 'quantai',
    displayName: 'QuantAI',
    urlScheme: 'quantai://',
    baseUrl: 'https://ai.quant.app',
    capabilities: ['ai_chat', 'code_generation', 'image_generation', 'analysis', 'automation'],
    supportedContentTypes: ['text', 'code', 'image', 'document', 'link'],
    icon: 'brain',
    color: '#8E44AD',
    version: '2.0.0',
    status: 'active'
  }
};

export const ALL_APPS: AppName[] = [
  'quantchat', 'quantmail', 'quantsync', 'quantads', 'quantube',
  'quantneon', 'quantedits', 'quantmax', 'quantai'
];

export interface ShareEvent {
  id: string;
  content: SharedContent;
  source: AppName;
  targets: AppName[];
  userId: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  source: AppName;
  target: AppName;
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  actionUrl?: string;
  timestamp: number;
  read: boolean;
  readAt?: number;
  grouped: boolean;
  groupId?: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  app: AppName;
  token: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  device: string;
  ipAddress: string;
  active: boolean;
}
