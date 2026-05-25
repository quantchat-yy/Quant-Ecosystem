// ============================================================================
// Quant Ecosystem Bridge - Unified Activity Feed Service
// Aggregates activities from all 9 Quant apps into a single feed
// ============================================================================

import {
  AppName,
  ActivityType,
  ActivityFeedItem,
  ActivityContent,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface FeedOptions {
  limit: number;
  offset: number;
  apps?: AppName[];
  types?: ActivityType[];
  since?: number;
  until?: number;
  includeOwn?: boolean;
}

interface FeedPage {
  items: ActivityFeedItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

interface FeedRankingFactors {
  recency: number;
  engagement: number;
  relevance: number;
  diversity: number;
  relationship: number;
}

export class UnifiedActivityFeed {
  private activities: Map<string, ActivityFeedItem> = new Map();
  private userFeeds: Map<string, ActivityFeedItem[]> = new Map();
  private userFollowing: Map<string, Set<string>> = new Map();
  private seenActivities: Map<string, Set<string>> = new Map();
  private activityCounter: number = 0;

  async addActivity(activity: {
    app: AppName;
    userId: string;
    action: ActivityType;
    content: ActivityContent;
  }): Promise<ActivityFeedItem> {
    const feedItem: ActivityFeedItem = {
      id: this.generateId(),
      app: activity.app,
      userId: activity.userId,
      action: activity.action,
      content: activity.content,
      timestamp: Date.now(),
      seen: false,
      relevanceScore: this.calculateRelevance(activity),
      engagementCount: 0,
      reactions: {}
    };

    this.activities.set(feedItem.id, feedItem);

    const userFeed = this.userFeeds.get(activity.userId) || [];
    userFeed.push(feedItem);
    if (userFeed.length > 2000) {
      userFeed.splice(0, userFeed.length - 2000);
    }
    this.userFeeds.set(activity.userId, userFeed);

    this.distributeToFollowers(feedItem);

    return feedItem;
  }

  async getFeed(userId: string, options: FeedOptions): Promise<FeedPage> {
    const following = this.userFollowing.get(userId) || new Set();
    let allItems: ActivityFeedItem[] = [];

    for (const followedUser of following) {
      const userActivities = this.userFeeds.get(followedUser) || [];
      allItems.push(...userActivities);
    }

    if (options.includeOwn !== false) {
      const ownActivities = this.userFeeds.get(userId) || [];
      allItems.push(...ownActivities);
    }

    if (options.apps && options.apps.length > 0) {
      allItems = allItems.filter(item => options.apps!.includes(item.app));
    }
    if (options.types && options.types.length > 0) {
      allItems = allItems.filter(item => options.types!.includes(item.action));
    }
    if (options.since) {
      allItems = allItems.filter(item => item.timestamp >= options.since!);
    }
    if (options.until) {
      allItems = allItems.filter(item => item.timestamp <= options.until!);
    }

    allItems.sort((a, b) => b.timestamp - a.timestamp);

    const unique = this.deduplicateItems(allItems);
    const total = unique.length;
    const paged = unique.slice(options.offset, options.offset + options.limit);

    return {
      items: paged,
      total,
      hasMore: options.offset + options.limit < total,
      nextOffset: options.offset + options.limit
    };
  }

  filterByApp(feed: ActivityFeedItem[], apps: AppName[]): ActivityFeedItem[] {
    return feed.filter(item => apps.includes(item.app));
  }

  filterByType(feed: ActivityFeedItem[], types: ActivityType[]): ActivityFeedItem[] {
    return feed.filter(item => types.includes(item.action));
  }

  markSeen(activityId: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;

    const seen = this.seenActivities.get(userId) || new Set();
    seen.add(activityId);
    this.seenActivities.set(userId, seen);

    activity.seen = true;
    activity.seenAt = Date.now();
    return true;
  }

  markAllSeen(userId: string, app?: AppName): number {
    const following = this.userFollowing.get(userId) || new Set();
    const seen = this.seenActivities.get(userId) || new Set();
    let count = 0;

    for (const followedUser of following) {
      const activities = this.userFeeds.get(followedUser) || [];
      for (const activity of activities) {
        if (!seen.has(activity.id) && (!app || activity.app === app)) {
          seen.add(activity.id);
          activity.seen = true;
          activity.seenAt = Date.now();
          count++;
        }
      }
    }

    this.seenActivities.set(userId, seen);
    return count;
  }

  getUnseenCount(userId: string): Record<string, number> {
    const following = this.userFollowing.get(userId) || new Set();
    const seen = this.seenActivities.get(userId) || new Set();
    const counts: Record<string, number> = { total: 0 };

    for (const app of ALL_APPS) {
      counts[app] = 0;
    }

    for (const followedUser of following) {
      const activities = this.userFeeds.get(followedUser) || [];
      for (const activity of activities) {
        if (!seen.has(activity.id)) {
          counts[activity.app] = (counts[activity.app] || 0) + 1;
          counts.total++;
        }
      }
    }

    return counts;
  }

  getRankedFeed(userId: string, limit: number = 50): ActivityFeedItem[] {
    const following = this.userFollowing.get(userId) || new Set();
    const seen = this.seenActivities.get(userId) || new Set();
    let allItems: ActivityFeedItem[] = [];

    for (const followedUser of following) {
      const userActivities = this.userFeeds.get(followedUser) || [];
      allItems.push(...userActivities);
    }

    const scored = allItems.map(item => ({
      item,
      score: this.calculateRankingScore(item, userId, seen)
    }));

    scored.sort((a, b) => b.score - a.score);

    const diversified = this.diversifyFeed(scored.map(s => s.item), limit);
    return diversified;
  }

  getMentions(userId: string, limit: number = 50): ActivityFeedItem[] {
    const allActivities = Array.from(this.activities.values());
    return allActivities
      .filter(activity =>
        activity.content.mentions &&
        activity.content.mentions.includes(userId) &&
        activity.userId !== userId
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  addReaction(activityId: string, reaction: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) return false;
    activity.reactions[reaction] = (activity.reactions[reaction] || 0) + 1;
    activity.engagementCount++;
    return true;
  }

  followUser(userId: string, targetUserId: string): void {
    const following = this.userFollowing.get(userId) || new Set();
    following.add(targetUserId);
    this.userFollowing.set(userId, following);
  }

  unfollowUser(userId: string, targetUserId: string): void {
    const following = this.userFollowing.get(userId) || new Set();
    following.delete(targetUserId);
    this.userFollowing.set(userId, following);
  }

  getActivityById(activityId: string): ActivityFeedItem | undefined {
    return this.activities.get(activityId);
  }

  getUserActivities(userId: string, limit: number = 50): ActivityFeedItem[] {
    const activities = this.userFeeds.get(userId) || [];
    return [...activities].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  deleteActivity(activityId: string, userId: string): boolean {
    const activity = this.activities.get(activityId);
    if (!activity || activity.userId !== userId) return false;
    this.activities.delete(activityId);
    const userFeed = this.userFeeds.get(userId) || [];
    const index = userFeed.findIndex(a => a.id === activityId);
    if (index >= 0) userFeed.splice(index, 1);
    return true;
  }

  getTrendingActivities(timeWindow: number = 3600000, limit: number = 20): ActivityFeedItem[] {
    const cutoff = Date.now() - timeWindow;
    const recent = Array.from(this.activities.values())
      .filter(a => a.timestamp >= cutoff);

    return recent
      .sort((a, b) => b.engagementCount - a.engagementCount)
      .slice(0, limit);
  }

  getAppActivity(app: AppName, limit: number = 50): ActivityFeedItem[] {
    return Array.from(this.activities.values())
      .filter(a => a.app === app)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private calculateRelevance(activity: { app: AppName; action: ActivityType }): number {
    const actionWeights: Record<ActivityType, number> = {
      post: 0.7,
      upload: 0.8,
      share: 0.6,
      comment: 0.5,
      achievement: 0.9,
      follow: 0.4,
      like: 0.3,
      create: 0.8,
      edit: 0.4,
      publish: 0.9
    };

    const appWeights: Record<AppName, number> = {
      quantchat: 0.8,
      quantmail: 0.6,
      quantsync: 0.9,
      quantads: 0.5,
      quantube: 0.85,
      quantneon: 0.85,
      quantedits: 0.7,
      quantmax: 0.7,
      quantai: 0.75
    };

    const actionScore = actionWeights[activity.action] || 0.5;
    const appScore = appWeights[activity.app] || 0.5;
    return (actionScore + appScore) / 2;
  }

  private calculateRankingScore(item: ActivityFeedItem, userId: string, seen: Set<string>): number {
    const ageHours = (Date.now() - item.timestamp) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (ageHours / 72));
    const engagementScore = Math.min(1, item.engagementCount / 100);
    const seenPenalty = seen.has(item.id) ? 0.3 : 1.0;
    const relevanceScore = item.relevanceScore;

    return (recencyScore * 0.35 + engagementScore * 0.25 + relevanceScore * 0.3) * seenPenalty;
  }

  private diversifyFeed(items: ActivityFeedItem[], limit: number): ActivityFeedItem[] {
    const result: ActivityFeedItem[] = [];
    const appCounts: Map<string, number> = new Map();
    const maxPerApp = Math.ceil(limit / ALL_APPS.length) + 2;

    for (const item of items) {
      if (result.length >= limit) break;
      const appCount = appCounts.get(item.app) || 0;
      if (appCount < maxPerApp) {
        result.push(item);
        appCounts.set(item.app, appCount + 1);
      }
    }

    if (result.length < limit) {
      for (const item of items) {
        if (result.length >= limit) break;
        if (!result.includes(item)) {
          result.push(item);
        }
      }
    }

    return result;
  }

  private distributeToFollowers(item: ActivityFeedItem): void {
    for (const [userId, following] of this.userFollowing.entries()) {
      if (following.has(item.userId)) {
        // Activity is accessible via the followed user's feed
      }
    }
  }

  private deduplicateItems(items: ActivityFeedItem[]): ActivityFeedItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private generateId(): string {
    this.activityCounter++;
    return `activity_${Date.now()}_${this.activityCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
