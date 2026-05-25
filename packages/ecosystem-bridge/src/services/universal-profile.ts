// ============================================================================
// Quant Ecosystem Bridge - Universal Profile Service
// Manages unified user profiles across all 9 Quant apps
// ============================================================================

import {
  AppName,
  UniversalProfile,
  LinkedApp,
  UserPreferences,
  ProfileStats,
  AppStats,
  Badge,
  Visibility,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface ProfileUpdate {
  displayName?: string;
  avatar?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
  visibility?: Record<string, Visibility>;
}

interface PublicProfileCard {
  userId: string;
  displayName: string;
  avatar: string;
  bio: string;
  topApps: Array<{ app: AppName; displayName: string; stats: AppStats }>;
  badges: Badge[];
  joinedAt: number;
  followerCount: number;
}

interface ProfileCompleteness {
  score: number;
  total: number;
  completed: number;
  missing: string[];
  suggestions: string[];
}

interface MergeResult {
  success: boolean;
  mergedProfile: UniversalProfile | null;
  conflicts: string[];
  resolvedFields: string[];
}

export class UniversalProfileService {
  private profiles: Map<string, UniversalProfile> = new Map();
  private appProfiles: Map<string, Map<AppName, Record<string, unknown>>> = new Map();
  private fieldVisibility: Map<string, Record<string, Visibility>> = new Map();

  async getProfile(userId: string): Promise<UniversalProfile | null> {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.profiles.set(userId, profile);
    }
    return profile;
  }

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<UniversalProfile | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    if (updates.displayName) profile.displayName = updates.displayName;
    if (updates.avatar) profile.avatar = updates.avatar;
    if (updates.bio) profile.bio = updates.bio;
    if (updates.preferences) {
      profile.preferences = { ...profile.preferences, ...updates.preferences };
    }
    if (updates.visibility) {
      profile.visibility = { ...profile.visibility, ...updates.visibility };
    }

    profile.updatedAt = Date.now();
    profile.completenessScore = this.calculateCompleteness(profile).score;
    this.profiles.set(userId, profile);

    await this.syncAcrossApps(userId);
    return profile;
  }

  async syncAcrossApps(userId: string): Promise<{ synced: AppName[]; failed: AppName[] }> {
    const profile = this.profiles.get(userId);
    if (!profile) return { synced: [], failed: [] };

    const synced: AppName[] = [];
    const failed: AppName[] = [];

    for (const linkedApp of profile.linkedApps) {
      const appProfileMap = this.appProfiles.get(userId) || new Map();
      const syncData = {
        displayName: profile.displayName,
        avatar: profile.avatar,
        bio: profile.bio,
        syncedAt: Date.now(),
        sourceVersion: profile.updatedAt
      };

      appProfileMap.set(linkedApp.app, syncData);
      this.appProfiles.set(userId, appProfileMap);
      synced.push(linkedApp.app);
      linkedApp.lastActive = Date.now();
    }

    return { synced, failed };
  }

  getLinkedApps(userId: string): LinkedApp[] {
    const profile = this.profiles.get(userId);
    if (!profile) return [];
    return profile.linkedApps;
  }

  linkApp(userId: string, app: AppName, username: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    const existing = profile.linkedApps.find(l => l.app === app);
    if (existing) {
      existing.username = username;
      existing.lastActive = Date.now();
      return true;
    }

    profile.linkedApps.push({
      app,
      username,
      linkedAt: Date.now(),
      verified: true,
      permissions: ['read', 'write', 'sync'],
      lastActive: Date.now()
    });

    profile.completenessScore = this.calculateCompleteness(profile).score;
    return true;
  }

  unlinkApp(userId: string, app: AppName): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    const index = profile.linkedApps.findIndex(l => l.app === app);
    if (index < 0) return false;

    profile.linkedApps.splice(index, 1);
    profile.completenessScore = this.calculateCompleteness(profile).score;
    return true;
  }

  async mergeProfiles(primaryId: string, secondaryId: string): Promise<MergeResult> {
    const primary = this.profiles.get(primaryId);
    const secondary = this.profiles.get(secondaryId);

    if (!primary || !secondary) {
      return { success: false, mergedProfile: null, conflicts: ['One or both profiles not found'], resolvedFields: [] };
    }

    const conflicts: string[] = [];
    const resolvedFields: string[] = [];

    if (primary.displayName !== secondary.displayName && secondary.displayName) {
      conflicts.push('displayName');
    } else {
      resolvedFields.push('displayName');
    }

    if (primary.avatar !== secondary.avatar && secondary.avatar) {
      conflicts.push('avatar');
    } else {
      resolvedFields.push('avatar');
    }

    for (const linkedApp of secondary.linkedApps) {
      if (!primary.linkedApps.find(l => l.app === linkedApp.app)) {
        primary.linkedApps.push(linkedApp);
        resolvedFields.push(`linkedApp:${linkedApp.app}`);
      } else {
        conflicts.push(`linkedApp:${linkedApp.app}`);
      }
    }

    for (const badge of secondary.badges) {
      if (!primary.badges.find(b => b.id === badge.id)) {
        primary.badges.push(badge);
        resolvedFields.push(`badge:${badge.id}`);
      }
    }

    primary.stats.totalFollowers += secondary.stats.totalFollowers;
    primary.stats.totalFollowing += secondary.stats.totalFollowing;
    primary.stats.totalContent += secondary.stats.totalContent;
    primary.stats.totalEngagement += secondary.stats.totalEngagement;

    for (const app of ALL_APPS) {
      const primaryAppStats = primary.stats.perApp[app];
      const secondaryAppStats = secondary.stats.perApp[app];
      if (secondaryAppStats) {
        primaryAppStats.posts += secondaryAppStats.posts;
        primaryAppStats.followers += secondaryAppStats.followers;
        primaryAppStats.engagement += secondaryAppStats.engagement;
        primaryAppStats.lastActive = Math.max(primaryAppStats.lastActive, secondaryAppStats.lastActive);
      }
    }

    primary.updatedAt = Date.now();
    primary.completenessScore = this.calculateCompleteness(primary).score;
    this.profiles.set(primaryId, primary);
    this.profiles.delete(secondaryId);

    return { success: true, mergedProfile: primary, conflicts, resolvedFields };
  }

  getPublicCard(userId: string): PublicProfileCard | null {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const topApps = profile.linkedApps
      .map(linked => ({
        app: linked.app,
        displayName: APP_REGISTRY[linked.app].displayName,
        stats: profile.stats.perApp[linked.app]
      }))
      .sort((a, b) => b.stats.engagement - a.stats.engagement)
      .slice(0, 5);

    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      bio: profile.bio,
      topApps,
      badges: profile.badges.slice(0, 6),
      joinedAt: profile.createdAt,
      followerCount: profile.stats.totalFollowers
    };
  }

  setVisibility(userId: string, field: string, visibility: Visibility): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.visibility[field] = visibility;
    const visibilityMap = this.fieldVisibility.get(userId) || {};
    visibilityMap[field] = visibility;
    this.fieldVisibility.set(userId, visibilityMap);
    return true;
  }

  getVisibility(userId: string, field: string): Visibility {
    const profile = this.profiles.get(userId);
    if (!profile) return 'private';
    return profile.visibility[field] || 'public';
  }

  getProfileCompleteness(userId: string): ProfileCompleteness {
    const profile = this.profiles.get(userId);
    if (!profile) return { score: 0, total: 10, completed: 0, missing: ['profile not found'], suggestions: [] };
    return this.calculateCompleteness(profile);
  }

  addBadge(userId: string, badge: Badge): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;
    if (profile.badges.find(b => b.id === badge.id)) return false;
    profile.badges.push(badge);
    return true;
  }

  updateStats(userId: string, app: AppName, stats: Partial<AppStats>): void {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    const appStats = profile.stats.perApp[app];
    if (stats.posts !== undefined) appStats.posts = stats.posts;
    if (stats.followers !== undefined) appStats.followers = stats.followers;
    if (stats.engagement !== undefined) appStats.engagement = stats.engagement;
    appStats.lastActive = Date.now();

    profile.stats.totalFollowers = Object.values(profile.stats.perApp).reduce((sum, s) => sum + s.followers, 0);
    profile.stats.totalContent = Object.values(profile.stats.perApp).reduce((sum, s) => sum + s.posts, 0);
    profile.stats.totalEngagement = Object.values(profile.stats.perApp).reduce((sum, s) => sum + s.engagement, 0);
  }

  searchProfiles(query: string, limit: number = 20): UniversalProfile[] {
    const results: UniversalProfile[] = [];
    const lowerQuery = query.toLowerCase();

    for (const profile of this.profiles.values()) {
      if (results.length >= limit) break;
      if (
        profile.displayName.toLowerCase().includes(lowerQuery) ||
        profile.bio.toLowerCase().includes(lowerQuery) ||
        profile.userId.toLowerCase().includes(lowerQuery)
      ) {
        if (profile.preferences.privacy.searchable) {
          results.push(profile);
        }
      }
    }

    return results;
  }

  private calculateCompleteness(profile: UniversalProfile): ProfileCompleteness {
    const fields = [
      { name: 'displayName', filled: !!profile.displayName },
      { name: 'avatar', filled: !!profile.avatar },
      { name: 'bio', filled: !!profile.bio },
      { name: 'linkedApps', filled: profile.linkedApps.length >= 3 },
      { name: 'preferences', filled: !!profile.preferences.language },
      { name: 'visibility', filled: Object.keys(profile.visibility).length > 0 },
      { name: 'badges', filled: profile.badges.length > 0 },
      { name: 'timezone', filled: !!profile.preferences.timezone },
      { name: 'notifications', filled: profile.preferences.notifications.enabled },
      { name: 'privacy', filled: !!profile.preferences.privacy.profileVisibility }
    ];

    const completed = fields.filter(f => f.filled).length;
    const missing = fields.filter(f => !f.filled).map(f => f.name);
    const suggestions = missing.map(m => `Complete your ${m} to improve profile visibility`);

    return {
      score: Math.round((completed / fields.length) * 100),
      total: fields.length,
      completed,
      missing,
      suggestions
    };
  }

  private createDefaultProfile(userId: string): UniversalProfile {
    const perApp: Record<string, AppStats> = {};
    for (const app of ALL_APPS) {
      perApp[app] = { posts: 0, followers: 0, engagement: 0, lastActive: 0 };
    }

    return {
      userId,
      displayName: '',
      avatar: '',
      bio: '',
      linkedApps: [],
      preferences: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          enabled: true,
          perApp: {} as any,
          quietHours: { start: '22:00', end: '07:00', enabled: false },
          channels: { push: true, email: true, inApp: true, sms: false }
        },
        privacy: {
          profileVisibility: 'public',
          activityVisibility: 'friends',
          searchable: true,
          showOnlineStatus: true,
          allowCrossAppTracking: true
        }
      },
      stats: {
        totalFollowers: 0,
        totalFollowing: 0,
        totalContent: 0,
        totalEngagement: 0,
        perApp: perApp as Record<AppName, AppStats>
      },
      badges: [],
      visibility: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completenessScore: 0
    };
  }
}
