// ============================================================================
// Quant Ecosystem Bridge - Universal Share Sheet Service
// Enables content sharing across all 9 Quant apps
// ============================================================================

import {
  AppName,
  ContentType,
  SharedContent,
  ShareEvent,
  APP_REGISTRY,
  ALL_APPS,
  ContentMetadata,
  ContentPermissions
} from '../types';

interface ShareAnalytics {
  totalShares: number;
  byApp: Record<string, number>;
  byContentType: Record<string, number>;
  topRecipients: Array<{ userId: string; count: number }>;
  recentShares: ShareEvent[];
}

interface SharePreview {
  title: string;
  description: string;
  thumbnail: string;
  sourceApp: AppName;
  contentType: ContentType;
  formattedSize: string;
  canInteract: boolean;
}

interface ShareSuggestion {
  app: AppName;
  reason: string;
  confidence: number;
  frequency: number;
}

const CONTENT_TYPE_APP_MAP: Record<ContentType, AppName[]> = {
  video: ['quantube', 'quantneon', 'quantsync', 'quantchat', 'quantedits', 'quantads'],
  image: ['quantneon', 'quantsync', 'quantchat', 'quantmail', 'quantads', 'quantedits'],
  text: ['quantchat', 'quantmail', 'quantsync', 'quantmax', 'quantai'],
  audio: ['quantube', 'quantedits', 'quantchat', 'quantsync'],
  document: ['quantmax', 'quantmail', 'quantchat', 'quantai'],
  link: ['quantchat', 'quantmail', 'quantsync', 'quantmax', 'quantai'],
  code: ['quantai', 'quantmax', 'quantchat'],
  presentation: ['quantmax', 'quantmail', 'quantsync'],
  spreadsheet: ['quantmax', 'quantmail'],
  design: ['quantneon', 'quantedits', 'quantads'],
  ad_creative: ['quantads', 'quantsync', 'quantneon'],
  email_template: ['quantmail', 'quantmax'],
  social_post: ['quantsync', 'quantneon', 'quantchat']
};

export class UniversalShareSheet {
  private shares: Map<string, ShareEvent> = new Map();
  private userShareHistory: Map<string, ShareEvent[]> = new Map();
  private shareCounter: number = 0;
  private formatters: Map<string, (content: SharedContent) => Record<string, unknown>> = new Map();

  constructor() {
    this.registerFormatters();
  }

  private registerFormatters(): void {
    this.formatters.set('quantchat', (content: SharedContent) => ({
      type: 'shared_content',
      message: `Shared ${content.contentType} from ${APP_REGISTRY[content.sourceApp].displayName}`,
      preview: { title: content.metadata.title, thumbnail: content.metadata.thumbnail },
      originalId: content.id,
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantmail', (content: SharedContent) => ({
      subject: `Shared: ${content.metadata.title}`,
      body: content.metadata.description,
      attachments: [{ id: content.id, type: content.contentType, name: content.metadata.title }],
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantsync', (content: SharedContent) => ({
      postType: 'shared',
      caption: content.metadata.description,
      media: content.contentType === 'image' || content.contentType === 'video'
        ? [{ id: content.id, type: content.contentType }] : [],
      tags: content.metadata.tags,
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantads', (content: SharedContent) => ({
      creativeType: content.contentType,
      asset: { id: content.id, metadata: content.metadata },
      suggestedCopy: content.metadata.description,
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantube', (content: SharedContent) => ({
      videoReference: content.contentType === 'video' ? content.id : null,
      title: content.metadata.title,
      description: content.metadata.description,
      tags: content.metadata.tags,
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantneon', (content: SharedContent) => ({
      mediaType: content.contentType,
      mediaId: content.id,
      caption: content.metadata.description,
      filters: [],
      tags: content.metadata.tags,
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantedits', (content: SharedContent) => ({
      projectAsset: { id: content.id, type: content.contentType, duration: content.metadata.duration },
      importSettings: { quality: 'original', format: content.metadata.mimeType },
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantmax', (content: SharedContent) => ({
      documentRef: { id: content.id, title: content.metadata.title },
      embedType: content.contentType,
      insertionPoint: 'cursor',
      sourceApp: content.sourceApp
    }));

    this.formatters.set('quantai', (content: SharedContent) => ({
      contextType: content.contentType,
      contextData: { id: content.id, content: content.data },
      analysisRequest: `Analyze this ${content.contentType}: ${content.metadata.title}`,
      sourceApp: content.sourceApp
    }));
  }

  async share(content: SharedContent, targetApps: AppName[]): Promise<ShareEvent> {
    const validTargets = targetApps.filter(app =>
      this.getTargetApps(content.contentType).includes(app)
    );

    if (validTargets.length === 0) {
      const event: ShareEvent = {
        id: this.generateId(),
        content,
        source: content.sourceApp,
        targets: [],
        userId: content.sharedBy,
        timestamp: Date.now(),
        success: false,
        error: 'No valid target apps for this content type'
      };
      return event;
    }

    const formattedContent: SharedContent = { ...content, targetApps: validTargets };

    const event: ShareEvent = {
      id: this.generateId(),
      content: formattedContent,
      source: content.sourceApp,
      targets: validTargets,
      userId: content.sharedBy,
      timestamp: Date.now(),
      success: true
    };

    this.shares.set(event.id, event);
    this.trackShare(event);

    return event;
  }

  getTargetApps(contentType: ContentType): AppName[] {
    return CONTENT_TYPE_APP_MAP[contentType] || [];
  }

  formatForApp(content: SharedContent, targetApp: AppName): Record<string, unknown> {
    const formatter = this.formatters.get(targetApp);
    if (!formatter) {
      return {
        type: 'generic_share',
        contentId: content.id,
        contentType: content.contentType,
        title: content.metadata.title,
        sourceApp: content.sourceApp
      };
    }
    return formatter(content);
  }

  getPreview(content: SharedContent): SharePreview {
    const sizeStr = content.metadata.size
      ? this.formatSize(content.metadata.size)
      : 'Unknown size';

    return {
      title: content.metadata.title,
      description: content.metadata.description.substring(0, 200),
      thumbnail: content.metadata.thumbnail || this.getDefaultThumbnail(content.contentType),
      sourceApp: content.sourceApp,
      contentType: content.contentType,
      formattedSize: sizeStr,
      canInteract: content.permissions.canView && content.permissions.canShare
    };
  }

  trackShare(shareEvent: ShareEvent): void {
    const history = this.userShareHistory.get(shareEvent.userId) || [];
    history.push(shareEvent);
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }
    this.userShareHistory.set(shareEvent.userId, history);
  }

  getShareAnalytics(userId: string): ShareAnalytics {
    const history = this.userShareHistory.get(userId) || [];
    const byApp: Record<string, number> = {};
    const byContentType: Record<string, number> = {};
    const recipientCounts: Map<string, number> = new Map();

    for (const event of history) {
      for (const target of event.targets) {
        byApp[target] = (byApp[target] || 0) + 1;
      }
      byContentType[event.content.contentType] = (byContentType[event.content.contentType] || 0) + 1;

      for (const recipient of event.content.recipients) {
        recipientCounts.set(recipient, (recipientCounts.get(recipient) || 0) + 1);
      }
    }

    const topRecipients = Array.from(recipientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    return {
      totalShares: history.length,
      byApp,
      byContentType,
      topRecipients,
      recentShares: history.slice(-20).reverse()
    };
  }

  getSuggestedApps(content: SharedContent): ShareSuggestion[] {
    const compatibleApps = this.getTargetApps(content.contentType);
    const history = this.userShareHistory.get(content.sharedBy) || [];

    const appFrequency: Map<string, number> = new Map();
    for (const event of history) {
      if (event.content.contentType === content.contentType) {
        for (const target of event.targets) {
          appFrequency.set(target, (appFrequency.get(target) || 0) + 1);
        }
      }
    }

    const suggestions: ShareSuggestion[] = compatibleApps
      .filter(app => app !== content.sourceApp)
      .map(app => {
        const frequency = appFrequency.get(app) || 0;
        const appInfo = APP_REGISTRY[app];
        let confidence = 0.3;

        if (frequency > 10) confidence = 0.9;
        else if (frequency > 5) confidence = 0.7;
        else if (frequency > 0) confidence = 0.5;

        const contentMatch = appInfo.supportedContentTypes.includes(content.contentType);
        if (contentMatch) confidence += 0.1;

        let reason = `${appInfo.displayName} supports ${content.contentType} content`;
        if (frequency > 0) {
          reason = `You've shared ${content.contentType} to ${appInfo.displayName} ${frequency} times`;
        }

        return { app, reason, confidence: Math.min(confidence, 1.0), frequency };
      })
      .sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 5);
  }

  getShareById(shareId: string): ShareEvent | undefined {
    return this.shares.get(shareId);
  }

  getUserShares(userId: string, limit: number = 50): ShareEvent[] {
    const history = this.userShareHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  revokeShare(shareId: string, userId: string): boolean {
    const share = this.shares.get(shareId);
    if (!share || share.userId !== userId) return false;
    this.shares.delete(shareId);
    return true;
  }

  private generateId(): string {
    this.shareCounter++;
    return `share_${Date.now()}_${this.shareCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  private getDefaultThumbnail(contentType: ContentType): string {
    const defaults: Record<string, string> = {
      video: '/assets/thumbnails/video-default.png',
      image: '/assets/thumbnails/image-default.png',
      audio: '/assets/thumbnails/audio-default.png',
      document: '/assets/thumbnails/doc-default.png',
      text: '/assets/thumbnails/text-default.png',
      link: '/assets/thumbnails/link-default.png',
      code: '/assets/thumbnails/code-default.png',
      presentation: '/assets/thumbnails/presentation-default.png',
      spreadsheet: '/assets/thumbnails/spreadsheet-default.png',
      design: '/assets/thumbnails/design-default.png',
      ad_creative: '/assets/thumbnails/ad-default.png',
      email_template: '/assets/thumbnails/email-default.png',
      social_post: '/assets/thumbnails/social-default.png'
    };
    return defaults[contentType] || '/assets/thumbnails/generic-default.png';
  }
}
