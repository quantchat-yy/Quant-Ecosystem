// ============================================================================
// Quant Ecosystem Bridge - Deep Linking Registry Service
// Manages URL schemes and deep links across all 9 Quant apps
// ============================================================================

import {
  AppName,
  DeepLink,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface LinkPattern {
  app: AppName;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  description: string;
}

interface LinkAnalytics {
  linkId: string;
  clicks: number;
  uniqueClicks: number;
  byPlatform: Record<string, number>;
  byCountry: Record<string, number>;
  byReferrer: Record<string, number>;
  firstClick: number;
  lastClick: number;
  conversionRate: number;
}

interface ResolvedLink {
  app: AppName;
  path: string;
  params: Record<string, string>;
  displayName: string;
  contentType: string;
  valid: boolean;
}

interface UniversalLink {
  id: string;
  shortUrl: string;
  fullUrl: string;
  deepLinks: Record<AppName, string>;
  fallbackUrl: string;
  createdAt: number;
  expiresAt?: number;
  metadata: Record<string, string>;
}

const URL_SCHEMES: Record<AppName, string> = {
  quantchat: 'quantchat://',
  quantmail: 'quantmail://',
  quantsync: 'quantsync://',
  quantads: 'quantads://',
  quantube: 'quantube://',
  quantneon: 'quantneon://',
  quantedits: 'quantedits://',
  quantmax: 'quantmax://',
  quantai: 'quantai://'
};

const WEB_URLS: Record<AppName, string> = {
  quantchat: 'https://chat.quant.app',
  quantmail: 'https://mail.quant.app',
  quantsync: 'https://sync.quant.app',
  quantads: 'https://ads.quant.app',
  quantube: 'https://tube.quant.app',
  quantneon: 'https://neon.quant.app',
  quantedits: 'https://edits.quant.app',
  quantmax: 'https://max.quant.app',
  quantai: 'https://ai.quant.app'
};

export class DeepLinkRegistry {
  private patterns: Map<AppName, LinkPattern[]> = new Map();
  private links: Map<string, DeepLink> = new Map();
  private analytics: Map<string, LinkAnalytics> = new Map();
  private universalLinks: Map<string, UniversalLink> = new Map();
  private linkCounter: number = 0;

  constructor() {
    this.registerDefaultPatterns();
  }

  private registerDefaultPatterns(): void {
    this.register('quantchat', [
      { path: '/chat/:chatId', description: 'Open specific chat' },
      { path: '/chat/:chatId/message/:messageId', description: 'Open specific message' },
      { path: '/channel/:channelId', description: 'Open channel' },
      { path: '/call/:callId', description: 'Join call' },
      { path: '/user/:userId', description: 'View user profile' }
    ]);

    this.register('quantmail', [
      { path: '/inbox', description: 'Open inbox' },
      { path: '/mail/:mailId', description: 'Open specific email' },
      { path: '/compose', description: 'New email' },
      { path: '/compose/:to', description: 'New email to recipient' },
      { path: '/folder/:folderId', description: 'Open folder' }
    ]);

    this.register('quantsync', [
      { path: '/post/:postId', description: 'View post' },
      { path: '/profile/:userId', description: 'View profile' },
      { path: '/story/:storyId', description: 'View story' },
      { path: '/reel/:reelId', description: 'Watch reel' },
      { path: '/group/:groupId', description: 'Open group' },
      { path: '/live/:streamId', description: 'Watch livestream' }
    ]);

    this.register('quantads', [
      { path: '/campaign/:campaignId', description: 'View campaign' },
      { path: '/creative/:creativeId', description: 'View creative' },
      { path: '/analytics/:campaignId', description: 'View campaign analytics' },
      { path: '/audience/:audienceId', description: 'View audience' },
      { path: '/billing', description: 'View billing' }
    ]);

    this.register('quantube', [
      { path: '/watch/:videoId', description: 'Watch video' },
      { path: '/channel/:channelId', description: 'View channel' },
      { path: '/playlist/:playlistId', description: 'View playlist' },
      { path: '/short/:shortId', description: 'Watch short' },
      { path: '/live/:streamId', description: 'Watch livestream' },
      { path: '/studio', description: 'Open creator studio' }
    ]);

    this.register('quantneon', [
      { path: '/photo/:photoId', description: 'View photo' },
      { path: '/story/:storyId', description: 'View story' },
      { path: '/reel/:reelId', description: 'Watch reel' },
      { path: '/profile/:userId', description: 'View profile' },
      { path: '/explore', description: 'Open explore page' },
      { path: '/camera', description: 'Open camera' }
    ]);

    this.register('quantedits', [
      { path: '/project/:projectId', description: 'Open project' },
      { path: '/project/:projectId/timeline', description: 'Open timeline' },
      { path: '/template/:templateId', description: 'Use template' },
      { path: '/export/:exportId', description: 'View export' },
      { path: '/collaborate/:projectId', description: 'Join collaboration' }
    ]);

    this.register('quantmax', [
      { path: '/doc/:docId', description: 'Open document' },
      { path: '/sheet/:sheetId', description: 'Open spreadsheet' },
      { path: '/slide/:slideId', description: 'Open presentation' },
      { path: '/workspace/:workspaceId', description: 'Open workspace' },
      { path: '/template/:templateId', description: 'Use template' }
    ]);

    this.register('quantai', [
      { path: '/chat/:chatId', description: 'Open AI conversation' },
      { path: '/generate/image', description: 'Generate image' },
      { path: '/generate/code', description: 'Generate code' },
      { path: '/analyze/:contentId', description: 'Analyze content' },
      { path: '/automation/:automationId', description: 'View automation' }
    ]);
  }

  register(app: AppName, pathPatterns: Array<{ path: string; description: string }>): void {
    const patterns: LinkPattern[] = pathPatterns.map(p => {
      const paramNames: string[] = [];
      const regexStr = p.path.replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

      return {
        app,
        pattern: p.path,
        regex: new RegExp(`^${regexStr}$`),
        paramNames,
        description: p.description
      };
    });

    this.patterns.set(app, patterns);
  }

  resolve(url: string): ResolvedLink | null {
    for (const [app, scheme] of Object.entries(URL_SCHEMES)) {
      if (url.startsWith(scheme)) {
        const path = '/' + url.substring(scheme.length);
        return this.matchPath(app as AppName, path);
      }
    }

    for (const [app, baseUrl] of Object.entries(WEB_URLS)) {
      if (url.startsWith(baseUrl)) {
        const path = url.substring(baseUrl.length) || '/';
        return this.matchPath(app as AppName, path);
      }
    }

    const universalMatch = url.match(/quant\.app\/u\/([a-zA-Z0-9]+)/);
    if (universalMatch) {
      const uLink = this.universalLinks.get(universalMatch[1]);
      if (uLink) {
        const firstApp = Object.keys(uLink.deepLinks)[0] as AppName;
        return this.resolve(uLink.deepLinks[firstApp]);
      }
    }

    return null;
  }

  generateLink(app: AppName, path: string, params: Record<string, string>): string {
    const scheme = URL_SCHEMES[app];
    let resolvedPath = path;
    for (const [key, value] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }

    const cleanPath = resolvedPath.startsWith('/') ? resolvedPath.substring(1) : resolvedPath;
    return `${scheme}${cleanPath}`;
  }

  generateWebLink(app: AppName, path: string, params: Record<string, string>): string {
    const baseUrl = WEB_URLS[app];
    let resolvedPath = path;
    for (const [key, value] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }
    return `${baseUrl}${resolvedPath}`;
  }

  validateLink(url: string): { valid: boolean; reason?: string; resolvedTo?: ResolvedLink } {
    const resolved = this.resolve(url);
    if (!resolved) {
      return { valid: false, reason: 'URL does not match any registered pattern' };
    }
    if (!resolved.valid) {
      return { valid: false, reason: 'URL matches pattern but parameters are invalid' };
    }
    return { valid: true, resolvedTo: resolved };
  }

  getAnalytics(linkId: string): LinkAnalytics | null {
    return this.analytics.get(linkId) || null;
  }

  trackClick(linkId: string, metadata: { platform?: string; country?: string; referrer?: string }): void {
    let analytics = this.analytics.get(linkId);
    if (!analytics) {
      analytics = {
        linkId,
        clicks: 0,
        uniqueClicks: 0,
        byPlatform: {},
        byCountry: {},
        byReferrer: {},
        firstClick: Date.now(),
        lastClick: Date.now(),
        conversionRate: 0
      };
      this.analytics.set(linkId, analytics);
    }

    analytics.clicks++;
    analytics.lastClick = Date.now();

    if (metadata.platform) {
      analytics.byPlatform[metadata.platform] = (analytics.byPlatform[metadata.platform] || 0) + 1;
    }
    if (metadata.country) {
      analytics.byCountry[metadata.country] = (analytics.byCountry[metadata.country] || 0) + 1;
    }
    if (metadata.referrer) {
      analytics.byReferrer[metadata.referrer] = (analytics.byReferrer[metadata.referrer] || 0) + 1;
    }
  }

  handleFallback(url: string): { action: string; fallbackUrl: string; message: string } {
    const resolved = this.resolve(url);
    if (!resolved) {
      return {
        action: 'redirect_store',
        fallbackUrl: 'https://quant.app/download',
        message: 'App not recognized. Please download from the Quant App Store.'
      };
    }

    const webUrl = this.generateWebLink(resolved.app, resolved.path, resolved.params);
    const appInfo = APP_REGISTRY[resolved.app];

    return {
      action: 'open_web',
      fallbackUrl: webUrl,
      message: `Opening in ${appInfo.displayName} web version. Install the app for the best experience.`
    };
  }

  generateUniversalLink(content: {
    primaryApp: AppName;
    path: string;
    params: Record<string, string>;
    metadata?: Record<string, string>;
  }): UniversalLink {
    const id = this.generateShortId();
    const deepLinks: Record<string, string> = {};

    deepLinks[content.primaryApp] = this.generateLink(content.primaryApp, content.path, content.params);

    const relatedApps = this.getRelatedApps(content.primaryApp);
    for (const app of relatedApps) {
      const appPatterns = this.patterns.get(app) || [];
      if (appPatterns.length > 0) {
        const genericPath = appPatterns[0].pattern;
        deepLinks[app] = this.generateLink(app, genericPath, content.params);
      }
    }

    const universalLink: UniversalLink = {
      id,
      shortUrl: `https://quant.app/u/${id}`,
      fullUrl: this.generateWebLink(content.primaryApp, content.path, content.params),
      deepLinks: deepLinks as Record<AppName, string>,
      fallbackUrl: this.generateWebLink(content.primaryApp, content.path, content.params),
      createdAt: Date.now(),
      metadata: content.metadata || {}
    };

    this.universalLinks.set(id, universalLink);
    return universalLink;
  }

  getRegisteredPatterns(app: AppName): LinkPattern[] {
    return this.patterns.get(app) || [];
  }

  getAllSchemes(): Record<AppName, string> {
    return { ...URL_SCHEMES };
  }

  getLinkById(linkId: string): DeepLink | undefined {
    return this.links.get(linkId);
  }

  private matchPath(app: AppName, path: string): ResolvedLink | null {
    const appPatterns = this.patterns.get(app) || [];

    for (const pattern of appPatterns) {
      const match = path.match(pattern.regex);
      if (match) {
        const params: Record<string, string> = {};
        pattern.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        return {
          app,
          path: pattern.pattern,
          params,
          displayName: APP_REGISTRY[app].displayName,
          contentType: pattern.description,
          valid: true
        };
      }
    }

    return {
      app,
      path,
      params: {},
      displayName: APP_REGISTRY[app].displayName,
      contentType: 'unknown',
      valid: false
    };
  }

  private getRelatedApps(app: AppName): AppName[] {
    const relations: Record<AppName, AppName[]> = {
      quantchat: ['quantsync', 'quantneon', 'quantmail'],
      quantmail: ['quantchat', 'quantmax', 'quantai'],
      quantsync: ['quantneon', 'quantchat', 'quantube'],
      quantads: ['quantsync', 'quantube', 'quantneon'],
      quantube: ['quantneon', 'quantsync', 'quantedits'],
      quantneon: ['quantsync', 'quantube', 'quantedits'],
      quantedits: ['quantube', 'quantneon', 'quantmax'],
      quantmax: ['quantmail', 'quantai', 'quantchat'],
      quantai: ['quantmax', 'quantchat', 'quantmail']
    };
    return relations[app] || [];
  }

  private generateShortId(): string {
    this.linkCounter++;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
