// ============================================================================
// QuantChat - Spotlight Service
// Video submission, content moderation, recommendation, engagement, revenue
// ============================================================================
interface SpotlightVideo { id: string; creatorId: string; videoUrl: string; thumbnailUrl: string; caption: string; soundId: string; duration: number; status: 'pending' | 'approved' | 'rejected' | 'removed'; moderationNotes?: string; likes: number; comments: number; shares: number; views: number; engagementScore: number; revenueEarned: number; createdAt: Date; publishedAt?: Date; tags: string[]; isMonetized: boolean; }
interface SpotlightStats { totalViews: number; totalLikes: number; totalShares: number; totalRevenue: number; videoCount: number; avgEngagement: number; }

const videos = new Map<string, SpotlightVideo>();
const userLikes = new Map<string, Set<string>>();
const userBookmarks = new Map<string, Set<string>>();
const generateId = (): string => `spot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class SpotlightService {
  static async submitVideo(creatorId: string, data: { videoUrl: string; thumbnailUrl: string; caption: string; soundId: string; duration: number; tags: string[] }): Promise<SpotlightVideo> {
    if (data.duration < 5 || data.duration > 60) throw new Error('Video must be 5-60 seconds');
    const video: SpotlightVideo = { id: generateId(), creatorId, ...data, status: 'pending', likes: 0, comments: 0, shares: 0, views: 0, engagementScore: 0, revenueEarned: 0, createdAt: new Date(), isMonetized: false };
    videos.set(video.id, video); return video;
  }

  static async moderateVideo(videoId: string, action: 'approve' | 'reject', notes?: string): Promise<SpotlightVideo> {
    const video = videos.get(videoId); if (!video) throw new Error('Video not found');
    video.status = action === 'approve' ? 'approved' : 'rejected';
    video.moderationNotes = notes;
    if (action === 'approve') { video.publishedAt = new Date(); video.isMonetized = true; }
    return video;
  }

  static async getFeed(userId: string, limit: number = 20, offset: number = 0): Promise<SpotlightVideo[]> {
    const approved = Array.from(videos.values()).filter(v => v.status === 'approved');
    approved.sort((a, b) => b.engagementScore - a.engagementScore + (Math.random() - 0.5) * 0.3);
    return approved.slice(offset, offset + limit);
  }

  static async recordView(videoId: string, userId: string): Promise<void> { const v = videos.get(videoId); if (v) { v.views++; v.engagementScore = SpotlightService.calculateEngagement(v); } }
  static async toggleLike(videoId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
    const v = videos.get(videoId); if (!v) throw new Error('Video not found');
    const likes = userLikes.get(userId) || new Set(); const liked = !likes.has(videoId);
    if (liked) { likes.add(videoId); v.likes++; } else { likes.delete(videoId); v.likes--; }
    userLikes.set(userId, likes); v.engagementScore = SpotlightService.calculateEngagement(v);
    return { liked, totalLikes: v.likes };
  }

  static async toggleBookmark(videoId: string, userId: string): Promise<boolean> {
    const bookmarks = userBookmarks.get(userId) || new Set();
    const bookmarked = !bookmarks.has(videoId);
    if (bookmarked) bookmarks.add(videoId); else bookmarks.delete(videoId);
    userBookmarks.set(userId, bookmarks); return bookmarked;
  }

  static async recordShare(videoId: string): Promise<void> { const v = videos.get(videoId); if (v) { v.shares++; v.engagementScore = SpotlightService.calculateEngagement(v); } }

  static async getCreatorStats(creatorId: string): Promise<SpotlightStats> {
    const creatorVids = Array.from(videos.values()).filter(v => v.creatorId === creatorId && v.status === 'approved');
    const totalViews = creatorVids.reduce((s, v) => s + v.views, 0);
    const totalLikes = creatorVids.reduce((s, v) => s + v.likes, 0);
    const totalShares = creatorVids.reduce((s, v) => s + v.shares, 0);
    const totalRevenue = creatorVids.reduce((s, v) => s + v.revenueEarned, 0);
    const avgEngagement = creatorVids.length > 0 ? creatorVids.reduce((s, v) => s + v.engagementScore, 0) / creatorVids.length : 0;
    return { totalViews, totalLikes, totalShares, totalRevenue, videoCount: creatorVids.length, avgEngagement };
  }

  static async calculateRevenue(videoId: string): Promise<number> {
    const v = videos.get(videoId); if (!v || !v.isMonetized) return 0;
    const cpm = 2.50; const revenue = (v.views / 1000) * cpm * (v.engagementScore / 100);
    v.revenueEarned = Math.round(revenue * 100) / 100; return v.revenueEarned;
  }

  private static calculateEngagement(v: SpotlightVideo): number {
    if (v.views === 0) return 0;
    return Math.round(((v.likes * 3 + v.comments * 5 + v.shares * 8) / v.views) * 100);
  }

  static async getTrending(limit: number = 10): Promise<SpotlightVideo[]> {
    return Array.from(videos.values()).filter(v => v.status === 'approved').sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit);
  }
}

export default SpotlightService;
