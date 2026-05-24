// ============================================================================
// QuantChat API - Discover Controller
// Discover content, featured, trending, publishers, subscriptions
// ============================================================================

import type { Request, Response } from '../middleware';
import type { DiscoverItem, Publisher, Subscription, DiscoverCategory } from '../../src/types';

// ============================================================================
// Discover Store
// ============================================================================

class DiscoverStore {
  private items: Map<string, DiscoverItem> = new Map();
  private publishers: Map<string, Publisher> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();

  constructor() {
    this.initializeContent();
  }

  private initializeContent(): void {
    const samplePublishers: Partial<Publisher>[] = [
      { name: 'Daily News', category: 'news', subscriberCount: 2500000, isVerified: true },
      { name: 'Tech Insider', category: 'technology', subscriberCount: 1800000, isVerified: true },
      { name: 'Game Central', category: 'gaming', subscriberCount: 3200000, isVerified: true },
      { name: 'Music Vibes', category: 'music', subscriberCount: 4100000, isVerified: true },
      { name: 'Fashion Week', category: 'fashion', subscriberCount: 1200000, isVerified: true },
      { name: 'Food Network', category: 'food', subscriberCount: 2800000, isVerified: true },
      { name: 'Comedy Club', category: 'comedy', subscriberCount: 5500000, isVerified: true },
      { name: 'Sports Zone', category: 'sports', subscriberCount: 3800000, isVerified: true },
    ];

    for (const pub of samplePublishers) {
      const pubId = `pub_${pub.name!.toLowerCase().replace(/\s+/g, '_')}`;
      const publisher: Publisher = {
        id: pubId,
        name: pub.name!,
        description: `${pub.name} - your source for the latest ${pub.category} content`,
        avatarUrl: `https://discover.quant.chat/publishers/${pubId}/avatar.png`,
        coverUrl: `https://discover.quant.chat/publishers/${pubId}/cover.jpg`,
        category: pub.category!,
        subscriberCount: pub.subscriberCount!,
        contentCount: Math.floor(Math.random() * 500) + 50,
        isVerified: pub.isVerified!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.publishers.set(pubId, publisher);

      // Create sample content for each publisher
      for (let i = 0; i < 3; i++) {
        const itemId = `disc_${pubId}_${i}`;
        const item: DiscoverItem = {
          id: itemId,
          publisherId: pubId,
          publisherName: publisher.name,
          publisherAvatarUrl: publisher.avatarUrl,
          type: i === 0 ? 'story' : i === 1 ? 'article' : 'show',
          title: `${publisher.name} - ${['Breaking', 'Latest', 'Top'][i]} ${pub.category} Update`,
          description: `Discover the latest ${pub.category} content from ${publisher.name}`,
          thumbnailUrl: `https://discover.quant.chat/content/${itemId}/thumb.jpg`,
          mediaUrl: `https://discover.quant.chat/content/${itemId}/media`,
          category: pub.category!,
          tags: [pub.category!, 'trending', 'featured'],
          viewCount: Math.floor(Math.random() * 1000000),
          shareCount: Math.floor(Math.random() * 50000),
          isFeatured: i === 0,
          isTrending: Math.random() > 0.5,
          duration: i === 2 ? 300 : undefined,
          isSubscribed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.items.set(itemId, item);
      }
    }
  }

  async getFeed(userId: string, options: { category?: DiscoverCategory; limit?: number; offset?: number }): Promise<{ items: DiscoverItem[]; total: number }> {
    let results = Array.from(this.items.values());

    if (options.category) {
      results = results.filter(item => item.category === options.category);
    }

    // Check subscription status
    const userSubs = this.subscriptions.get(userId) || [];
    const subPubIds = new Set(userSubs.map(s => s.publisherId));
    results = results.map(item => ({ ...item, isSubscribed: subPubIds.has(item.publisherId) }));

    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    results = results.slice(offset, offset + limit);

    return { items: results, total };
  }

  async getFeatured(limit: number = 10): Promise<DiscoverItem[]> {
    return Array.from(this.items.values())
      .filter(item => item.isFeatured)
      .slice(0, limit);
  }

  async getTrending(limit: number = 10): Promise<DiscoverItem[]> {
    return Array.from(this.items.values())
      .filter(item => item.isTrending)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }

  async getPublisher(publisherId: string): Promise<Publisher | null> {
    return this.publishers.get(publisherId) || null;
  }

  async getPublishers(category?: DiscoverCategory): Promise<Publisher[]> {
    let pubs = Array.from(this.publishers.values());
    if (category) pubs = pubs.filter(p => p.category === category);
    return pubs.sort((a, b) => b.subscriberCount - a.subscriberCount);
  }

  async getPublisherContent(publisherId: string, limit: number = 20): Promise<DiscoverItem[]> {
    return Array.from(this.items.values())
      .filter(item => item.publisherId === publisherId)
      .slice(0, limit);
  }

  async subscribe(userId: string, publisherId: string): Promise<Subscription> {
    const subs = this.subscriptions.get(userId) || [];

    // Check if already subscribed
    const existing = subs.find(s => s.publisherId === publisherId);
    if (existing) return existing;

    const sub: Subscription = {
      userId,
      publisherId,
      subscribedAt: new Date(),
      notificationsEnabled: true,
    };

    subs.push(sub);
    this.subscriptions.set(userId, subs);

    // Update publisher subscriber count
    const publisher = this.publishers.get(publisherId);
    if (publisher) publisher.subscriberCount++;

    return sub;
  }

  async unsubscribe(userId: string, publisherId: string): Promise<boolean> {
    const subs = this.subscriptions.get(userId) || [];
    const idx = subs.findIndex(s => s.publisherId === publisherId);
    if (idx < 0) return false;

    subs.splice(idx, 1);
    this.subscriptions.set(userId, subs);

    const publisher = this.publishers.get(publisherId);
    if (publisher) publisher.subscriberCount = Math.max(0, publisher.subscriberCount - 1);

    return true;
  }

  async getSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptions.get(userId) || [];
  }

  async search(query: string, limit: number = 20): Promise<{ items: DiscoverItem[]; publishers: Publisher[] }> {
    const q = query.toLowerCase();
    const items = Array.from(this.items.values())
      .filter(item => item.title.toLowerCase().includes(q) || item.tags.some(t => t.includes(q)))
      .slice(0, limit);

    const publishers = Array.from(this.publishers.values())
      .filter(pub => pub.name.toLowerCase().includes(q) || pub.category.includes(q))
      .slice(0, 10);

    return { items, publishers };
  }
}

const discoverStore = new DiscoverStore();

// ============================================================================
// Discover Controller
// ============================================================================

export class DiscoverController {
  async getFeed(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const category = req.query['category'] as DiscoverCategory | undefined;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const result = await discoverStore.getFeed(userId, { category, limit, offset });
    res.status(200).json({ success: true, data: result.items, metadata: { total: result.total, limit, offset } });
  }

  async getFeatured(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const items = await discoverStore.getFeatured(limit);
    res.status(200).json({ success: true, data: items });
  }

  async getTrending(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const items = await discoverStore.getTrending(limit);
    res.status(200).json({ success: true, data: items });
  }

  async getPublisher(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];
    const publisher = await discoverStore.getPublisher(publisherId);

    if (!publisher) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Publisher not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: publisher });
  }

  async getPublishers(req: Request, res: Response): Promise<void> {
    const category = req.query['category'] as DiscoverCategory | undefined;
    const publishers = await discoverStore.getPublishers(category);
    res.status(200).json({ success: true, data: publishers });
  }

  async getPublisherContent(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];
    const limit = parseInt(req.query['limit'] as string) || 20;
    const content = await discoverStore.getPublisherContent(publisherId, limit);
    res.status(200).json({ success: true, data: content });
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const publisherId = req.params['publisherId'];
    const sub = await discoverStore.subscribe(userId, publisherId);
    res.status(201).json({ success: true, data: sub });
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const publisherId = req.params['publisherId'];
    const removed = await discoverStore.unsubscribe(userId, publisherId);

    if (!removed) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Unsubscribed' } });
  }

  async getSubscriptions(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const subs = await discoverStore.getSubscriptions(userId);
    res.status(200).json({ success: true, data: subs });
  }

  async search(req: Request, res: Response): Promise<void> {
    const query = req.query['q'] as string;
    if (!query) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Search query is required', statusCode: 400 } });
      return;
    }

    const results = await discoverStore.search(query);
    res.status(200).json({ success: true, data: results });
  }
}

export const discoverController = new DiscoverController();
