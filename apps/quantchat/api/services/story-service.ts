// ============================================================================
// QuantChat - Story Service
// Story creation, expiration, viewer tracking, highlights, close friends
// ============================================================================

import type {
  Story, StoryType, StoryPrivacy, StoryViewer, StoryReply,
  StoryHighlight, CloseFriendsList, StorySticker, TextStyle,
  GeoLocation, MusicTrack, CreateStoryRequest,
} from '../../src/types';

// ============================================================================
// Story Expiration Manager
// ============================================================================

class StoryExpirationManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private onExpire: (storyId: string) => void;

  constructor(onExpire: (storyId: string) => void) {
    this.onExpire = onExpire;
  }

  schedule(story: Story): void {
    const delay = new Date(story.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      this.onExpire(story.id);
      return;
    }

    const timer = setTimeout(() => {
      this.onExpire(story.id);
      this.timers.delete(story.id);
    }, delay);
    this.timers.set(story.id, timer);
  }

  cancel(storyId: string): void {
    const timer = this.timers.get(storyId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(storyId);
    }
  }

  getActiveCount(): number {
    return this.timers.size;
  }
}

// ============================================================================
// Story Service
// ============================================================================

export class StoryService {
  private stories: Map<string, Story> = new Map();
  private highlights: Map<string, StoryHighlight> = new Map();
  private closeFriends: Map<string, CloseFriendsList> = new Map();
  private expiration: StoryExpirationManager;
  private storyDuration: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.expiration = new StoryExpirationManager((storyId) => {
      this.handleExpiry(storyId);
    });
  }

  async createStory(userId: string, request: CreateStoryRequest): Promise<Story> {
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();

    const story: Story = {
      id: storyId,
      userId,
      type: request.type,
      mediaUrl: request.mediaUrl,
      thumbnailUrl: request.type === 'video' ? `${request.mediaUrl}_thumb.jpg` : request.mediaUrl,
      text: request.text,
      textStyle: request.textStyle,
      filters: request.filters || [],
      stickers: request.stickers || [],
      duration: request.duration || (request.type === 'video' ? 15 : 5),
      privacy: request.privacy,
      allowedViewers: request.allowedViewers,
      expiresAt: new Date(now.getTime() + this.storyDuration),
      viewCount: 0,
      viewers: [],
      replies: [],
      isHighlight: false,
      location: request.location,
      music: request.music,
      createdAt: now,
      updatedAt: now,
    };

    this.stories.set(storyId, story);
    this.expiration.schedule(story);

    return story;
  }

  async getStory(storyId: string): Promise<Story | null> {
    return this.stories.get(storyId) || null;
  }

  async getUserStories(userId: string, viewerId?: string): Promise<Story[]> {
    const stories: Story[] = [];
    for (const story of this.stories.values()) {
      if (story.userId !== userId) continue;
      if (!this.canView(story, viewerId)) continue;
      stories.push(story);
    }
    return stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getFeedStories(userId: string, friendIds: string[]): Promise<Map<string, Story[]>> {
    const feed = new Map<string, Story[]>();
    for (const friendId of friendIds) {
      const stories = await this.getUserStories(friendId, userId);
      if (stories.length > 0) {
        feed.set(friendId, stories);
      }
    }
    return feed;
  }

  async viewStory(storyId: string, viewerId: string): Promise<Story | null> {
    const story = this.stories.get(storyId);
    if (!story) return null;
    if (story.userId === viewerId) return story; // Own story

    if (!this.canView(story, viewerId)) return null;

    // Check if already viewed
    const existingView = story.viewers.find(v => v.userId === viewerId);
    if (!existingView) {
      story.viewers.push({
        userId: viewerId,
        viewedAt: new Date(),
        screenshotted: false,
      });
      story.viewCount++;
      story.updatedAt = new Date();
    }

    return story;
  }

  async reportScreenshot(storyId: string, viewerId: string): Promise<void> {
    const story = this.stories.get(storyId);
    if (!story) return;

    const viewer = story.viewers.find(v => v.userId === viewerId);
    if (viewer) {
      viewer.screenshotted = true;
    }
  }

  async replyToStory(storyId: string, userId: string, content: string, type: 'text' | 'emoji' | 'snap' = 'text'): Promise<StoryReply | null> {
    const story = this.stories.get(storyId);
    if (!story) return null;

    const reply: StoryReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      content,
      type,
      timestamp: new Date(),
    };

    story.replies.push(reply);
    story.updatedAt = new Date();
    return reply;
  }

  async deleteStory(storyId: string, userId: string): Promise<boolean> {
    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) return false;

    this.expiration.cancel(storyId);
    this.stories.delete(storyId);
    return true;
  }

  // --------------------------------------------------------------------------
  // Highlights
  // --------------------------------------------------------------------------

  async createHighlight(userId: string, title: string, storyIds: string[], coverUrl?: string): Promise<StoryHighlight> {
    const highlightId = `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Validate stories belong to user
    const validStoryIds = storyIds.filter(id => {
      const story = this.stories.get(id);
      return story && story.userId === userId;
    });

    const firstStory = validStoryIds.length > 0 ? this.stories.get(validStoryIds[0]) : null;

    const highlight: StoryHighlight = {
      id: highlightId,
      userId,
      title,
      coverUrl: coverUrl || firstStory?.thumbnailUrl || '',
      storyIds: validStoryIds,
      orderIndex: this.getUserHighlights(userId).length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.highlights.set(highlightId, highlight);

    // Mark stories as highlights (prevents expiry)
    for (const storyId of validStoryIds) {
      const story = this.stories.get(storyId);
      if (story) {
        story.isHighlight = true;
        story.highlightId = highlightId;
        this.expiration.cancel(storyId);
      }
    }

    return highlight;
  }

  async addToHighlight(highlightId: string, storyId: string, userId: string): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) return false;

    const story = this.stories.get(storyId);
    if (!story || story.userId !== userId) return false;

    if (!highlight.storyIds.includes(storyId)) {
      highlight.storyIds.push(storyId);
      story.isHighlight = true;
      story.highlightId = highlightId;
      this.expiration.cancel(storyId);
      highlight.updatedAt = new Date();
    }

    return true;
  }

  async removeFromHighlight(highlightId: string, storyId: string, userId: string): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) return false;

    highlight.storyIds = highlight.storyIds.filter(id => id !== storyId);
    const story = this.stories.get(storyId);
    if (story) {
      story.isHighlight = false;
      story.highlightId = undefined;
      // Re-schedule expiry if still within window
      if (new Date(story.expiresAt).getTime() > Date.now()) {
        this.expiration.schedule(story);
      }
    }
    highlight.updatedAt = new Date();
    return true;
  }

  async deleteHighlight(highlightId: string, userId: string): Promise<boolean> {
    const highlight = this.highlights.get(highlightId);
    if (!highlight || highlight.userId !== userId) return false;

    for (const storyId of highlight.storyIds) {
      const story = this.stories.get(storyId);
      if (story) {
        story.isHighlight = false;
        story.highlightId = undefined;
      }
    }

    this.highlights.delete(highlightId);
    return true;
  }

  getUserHighlights(userId: string): StoryHighlight[] {
    const highlights: StoryHighlight[] = [];
    for (const h of this.highlights.values()) {
      if (h.userId === userId) highlights.push(h);
    }
    return highlights.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // --------------------------------------------------------------------------
  // Close Friends
  // --------------------------------------------------------------------------

  async setCloseFriends(userId: string, friendIds: string[]): Promise<CloseFriendsList> {
    const list: CloseFriendsList = {
      userId,
      friendIds,
      updatedAt: new Date(),
    };
    this.closeFriends.set(userId, list);
    return list;
  }

  async getCloseFriends(userId: string): Promise<string[]> {
    const list = this.closeFriends.get(userId);
    return list?.friendIds || [];
  }

  async addCloseFriend(userId: string, friendId: string): Promise<void> {
    const list = this.closeFriends.get(userId) || { userId, friendIds: [], updatedAt: new Date() };
    if (!list.friendIds.includes(friendId)) {
      list.friendIds.push(friendId);
      list.updatedAt = new Date();
      this.closeFriends.set(userId, list);
    }
  }

  async removeCloseFriend(userId: string, friendId: string): Promise<void> {
    const list = this.closeFriends.get(userId);
    if (list) {
      list.friendIds = list.friendIds.filter(id => id !== friendId);
      list.updatedAt = new Date();
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private canView(story: Story, viewerId?: string): boolean {
    if (!viewerId) return story.privacy === 'everyone';
    if (story.userId === viewerId) return true;

    switch (story.privacy) {
      case 'everyone':
        return true;
      case 'friends':
        return true; // Simplified - would check friend list
      case 'close_friends':
        const closeFriends = this.closeFriends.get(story.userId);
        return closeFriends?.friendIds.includes(viewerId) || false;
      case 'custom':
        if (story.blockedViewers?.includes(viewerId)) return false;
        if (story.allowedViewers && story.allowedViewers.length > 0) {
          return story.allowedViewers.includes(viewerId);
        }
        return true;
      default:
        return false;
    }
  }

  private handleExpiry(storyId: string): void {
    const story = this.stories.get(storyId);
    if (story && !story.isHighlight) {
      this.stories.delete(storyId);
    }
  }

  getStats(): { activeStories: number; highlights: number; closeFriendsLists: number } {
    return {
      activeStories: this.stories.size,
      highlights: this.highlights.size,
      closeFriendsLists: this.closeFriends.size,
    };
  }
}

export const storyService = new StoryService();
