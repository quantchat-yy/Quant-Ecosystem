// ============================================================================
// Quant Ecosystem - Testing Framework: Mock Factory
// Realistic data generation for users, posts, messages, emails, ads, videos, etc.
// ============================================================================

import type { MockEntity, MockUser, MockPost, MockMessage, MockEmail } from '../types';

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Provides deterministic sequences for reproducible tests
 */
class SeededRandom {
  private state: number;

  constructor(seed: number = 12345) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]!;
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

// Data pools for realistic generation
const FIRST_NAMES = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Mason',
  'Isabella',
  'William',
  'Mia',
  'James',
  'Charlotte',
  'Benjamin',
  'Amelia',
  'Lucas',
  'Harper',
  'Henry',
  'Evelyn',
  'Alexander',
];
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
];
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'proton.me', 'icloud.com', 'mail.com'];
const TAGS = [
  'technology',
  'science',
  'health',
  'business',
  'entertainment',
  'sports',
  'politics',
  'travel',
  'food',
  'art',
  'music',
  'gaming',
  'fashion',
  'education',
  'finance',
];
const SUBJECTS = [
  'Meeting tomorrow',
  'Project update',
  'Quick question',
  'Important announcement',
  'Follow up',
  'Invitation',
  'Reminder',
  'FYI',
  'Action required',
  'New opportunity',
];
const VIDEO_TITLES = [
  'Amazing Nature Documentary',
  'How to Cook Perfect Pasta',
  'Tech Review 2024',
  'Travel Vlog: Japan',
  'Workout Routine for Beginners',
  'Guitar Tutorial',
  'Unboxing New Phone',
  'Study Tips for Students',
  'Budget Living Guide',
  'DIY Home Projects',
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
const NOTIFICATION_TYPES = [
  'like',
  'comment',
  'follow',
  'mention',
  'share',
  'message',
  'system',
  'achievement',
  'reminder',
  'warning',
];
const AD_FORMATS = ['banner', 'video', 'native', 'interstitial', 'carousel', 'story'];
const PLATFORMS = ['web', 'ios', 'android', 'desktop', 'tablet'];

/**
 * MockFactory - Generates realistic test data with sequences and relationships
 */
export class MockFactory {
  private random: SeededRandom;
  private sequences: Map<string, number> = new Map();

  constructor(seed: number = 42) {
    this.random = new SeededRandom(seed);
  }

  /**
   * Gets the next value in a named sequence
   */
  private nextSequence(name: string): number {
    const current = this.sequences.get(name) ?? 0;
    this.sequences.set(name, current + 1);
    return current + 1;
  }

  /**
   * Generates a UUID-like string
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(this.random.next() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generates a timestamp within the last N days
   */
  private recentDate(daysBack: number = 30): Date {
    const now = Date.now();
    const offset = this.random.nextInt(0, daysBack * 24 * 60 * 60 * 1000);
    return new Date(now - offset);
  }

  /**
   * Creates a base entity with ID and timestamps
   */
  private createBase(): MockEntity {
    const created = this.recentDate(90);
    return {
      id: this.generateId(),
      createdAt: created,
      updatedAt: new Date(created.getTime() + this.random.nextInt(0, 7 * 24 * 60 * 60 * 1000)),
    };
  }

  /**
   * Creates a realistic user with name, email, avatar, etc.
   */
  createUser(overrides: Partial<MockUser> = {}): MockUser {
    const firstName = this.random.pick(FIRST_NAMES);
    const lastName = this.random.pick(LAST_NAMES);
    const seq = this.nextSequence('user');
    const domain = this.random.pick(DOMAINS);

    return {
      ...this.createBase(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seq}@${domain}`,
      avatar: `https://avatars.example.com/${seq}.jpg`,
      age: this.random.nextInt(18, 65),
      role: this.random.pick(['admin', 'user', 'moderator'] as const),
      verified: this.random.next() > 0.3,
      ...overrides,
    };
  }

  /**
   * Creates a social post with content, reactions, comments
   */
  createPost(overrides: Partial<MockPost> = {}): MockPost {
    const words = this.generateSentence(10, 30);
    const tagCount = this.random.nextInt(1, 4);
    const tags = this.random.shuffle(TAGS).slice(0, tagCount);

    return {
      ...this.createBase(),
      title: this.generateSentence(3, 8),
      content: words,
      authorId: this.generateId(),
      likes: this.random.nextInt(0, 10000),
      comments: this.random.nextInt(0, 500),
      tags,
      published: this.random.next() > 0.2,
      ...overrides,
    };
  }

  /**
   * Creates a chat message with sender, content, timestamp
   */
  createMessage(overrides: Partial<MockMessage> = {}): MockMessage {
    return {
      ...this.createBase(),
      senderId: this.generateId(),
      recipientId: this.generateId(),
      content: this.generateSentence(3, 20),
      read: this.random.next() > 0.4,
      type: this.random.pick(['text', 'image', 'video', 'file'] as const),
      ...overrides,
    };
  }

  /**
   * Creates an email with subject, body, attachments
   */
  createEmail(overrides: Partial<MockEmail> = {}): MockEmail {
    const toCount = this.random.nextInt(1, 3);
    const to: string[] = [];
    for (let i = 0; i < toCount; i++) {
      to.push(`${this.random.pick(FIRST_NAMES).toLowerCase()}@${this.random.pick(DOMAINS)}`);
    }

    const hasAttachments = this.random.next() > 0.7;
    const attachments = hasAttachments
      ? [`document_${this.random.nextInt(1, 99)}.pdf`, `image_${this.random.nextInt(1, 99)}.png`]
      : [];

    return {
      ...this.createBase(),
      from: `${this.random.pick(FIRST_NAMES).toLowerCase()}@${this.random.pick(DOMAINS)}`,
      to,
      subject: this.random.pick(SUBJECTS),
      body: this.generateParagraph(2, 5),
      attachments,
      read: this.random.next() > 0.5,
      starred: this.random.next() > 0.8,
      ...overrides,
    };
  }

  /**
   * Creates an ad campaign with budget, targeting, metrics
   */
  createAd(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const budget = this.random.nextInt(100, 50000);
    const spent = Math.floor(budget * this.random.next());

    return {
      ...this.createBase(),
      name: `Campaign ${this.nextSequence('ad')}`,
      format: this.random.pick(AD_FORMATS),
      budget,
      spent,
      currency: this.random.pick(CURRENCIES),
      impressions: this.random.nextInt(1000, 1000000),
      clicks: this.random.nextInt(50, 50000),
      conversions: this.random.nextInt(5, 5000),
      ctr: parseFloat((this.random.next() * 5).toFixed(2)),
      targetAudience: {
        ageRange: [this.random.nextInt(18, 25), this.random.nextInt(35, 65)],
        platforms: this.random.shuffle(PLATFORMS).slice(0, this.random.nextInt(1, 3)),
        interests: this.random.shuffle(TAGS).slice(0, this.random.nextInt(2, 5)),
      },
      status: this.random.pick(['active', 'paused', 'completed', 'draft']),
      startDate: this.recentDate(60),
      endDate: this.recentDate(-30),
      ...overrides,
    };
  }

  /**
   * Creates a video with title, duration, views, likes
   */
  createVideo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const duration = this.random.nextInt(30, 3600);
    const views = this.random.nextInt(100, 10000000);

    return {
      ...this.createBase(),
      title: this.random.pick(VIDEO_TITLES),
      description: this.generateParagraph(1, 3),
      duration,
      durationFormatted: `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`,
      views,
      likes: Math.floor(views * this.random.next() * 0.1),
      dislikes: Math.floor(views * this.random.next() * 0.01),
      comments: this.random.nextInt(0, Math.floor(views * 0.01)),
      thumbnailUrl: `https://thumbs.example.com/${this.generateId()}.jpg`,
      videoUrl: `https://videos.example.com/${this.generateId()}.mp4`,
      authorId: this.generateId(),
      resolution: this.random.pick(['720p', '1080p', '1440p', '4K']),
      tags: this.random.shuffle(TAGS).slice(0, this.random.nextInt(2, 6)),
      published: this.random.next() > 0.1,
      ...overrides,
    };
  }

  /**
   * Creates a payment transaction with amount, currency, status
   */
  createPayment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const amount = parseFloat((this.random.next() * 9999 + 1).toFixed(2));

    return {
      ...this.createBase(),
      amount,
      currency: this.random.pick(CURRENCIES),
      status: this.random.pick(['pending', 'completed', 'failed', 'refunded', 'cancelled']),
      method: this.random.pick(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto']),
      senderId: this.generateId(),
      recipientId: this.generateId(),
      description: `Payment #${this.nextSequence('payment')}`,
      fee: parseFloat((amount * 0.029 + 0.3).toFixed(2)),
      reference: `TXN-${Date.now()}-${this.random.nextInt(1000, 9999)}`,
      metadata: {
        ip: `${this.random.nextInt(1, 255)}.${this.random.nextInt(0, 255)}.${this.random.nextInt(0, 255)}.${this.random.nextInt(1, 255)}`,
        userAgent: 'Mozilla/5.0',
        platform: this.random.pick(PLATFORMS),
      },
      ...overrides,
    };
  }

  /**
   * Creates a notification with type, content, read status
   */
  createNotification(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const type = this.random.pick(NOTIFICATION_TYPES);
    return {
      ...this.createBase(),
      type,
      title: this.getNotificationTitle(type),
      content: this.generateSentence(5, 15),
      read: this.random.next() > 0.6,
      userId: this.generateId(),
      actionUrl: `/notifications/${this.generateId()}`,
      icon: type,
      priority: this.random.pick(['low', 'medium', 'high', 'urgent']),
      expiresAt: new Date(Date.now() + this.random.nextInt(1, 30) * 86400000),
      ...overrides,
    };
  }

  /**
   * Creates multiple entities with relationships
   */
  createUserWithPosts(postCount: number = 3): { user: MockUser; posts: MockPost[] } {
    const user = this.createUser();
    const posts = Array.from({ length: postCount }, () => this.createPost({ authorId: user.id }));
    return { user, posts };
  }

  /**
   * Creates a conversation between two users
   */
  createConversation(messageCount: number = 5): { users: MockUser[]; messages: MockMessage[] } {
    const user1 = this.createUser();
    const user2 = this.createUser();
    const messages: MockMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
      const isFromUser1 = this.random.next() > 0.5;
      messages.push(
        this.createMessage({
          senderId: isFromUser1 ? user1.id : user2.id,
          recipientId: isFromUser1 ? user2.id : user1.id,
        }),
      );
    }

    return { users: [user1, user2], messages };
  }

  /**
   * Resets all sequences
   */
  resetSequences(): void {
    this.sequences.clear();
  }

  // --- Helper methods ---

  private generateSentence(minWords: number, maxWords: number): string {
    const WORDS = [
      'the',
      'quick',
      'brown',
      'fox',
      'jumps',
      'over',
      'lazy',
      'dog',
      'while',
      'exploring',
      'new',
      'features',
      'and',
      'building',
      'amazing',
      'products',
      'with',
      'great',
      'attention',
      'to',
      'detail',
      'for',
      'users',
      'around',
      'world',
    ];
    const count = this.random.nextInt(minWords, maxWords);
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(this.random.pick(WORDS));
    }
    words[0] = words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1);
    return words.join(' ') + '.';
  }

  private generateParagraph(minSentences: number, maxSentences: number): string {
    const count = this.random.nextInt(minSentences, maxSentences);
    const sentences: string[] = [];
    for (let i = 0; i < count; i++) {
      sentences.push(this.generateSentence(5, 15));
    }
    return sentences.join(' ');
  }

  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      like: 'Someone liked your post',
      comment: 'New comment on your post',
      follow: 'You have a new follower',
      mention: 'You were mentioned',
      share: 'Your post was shared',
      message: 'New message received',
      system: 'System notification',
      achievement: 'Achievement unlocked!',
      reminder: 'Reminder',
      warning: 'Account warning',
    };
    return titles[type] ?? 'Notification';
  }
}
