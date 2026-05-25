// ============================================================================
// Quant Ecosystem Bridge - Content Embedding Service
// Enables embedding content from one app inside another across the ecosystem
// ============================================================================

import {
  AppName,
  ContentType,
  EmbedConfig,
  EmbedReference,
  DisplayMode,
  ContentPermissions,
  APP_REGISTRY,
  ALL_APPS
} from '../types';

interface EmbedPreview {
  embedId: string;
  sourceApp: AppName;
  contentId: string;
  title: string;
  description: string;
  thumbnail: string;
  dimensions: { width: number; height: number };
  duration?: number;
  interactive: boolean;
  lastUpdated: number;
}

interface EmbedCard {
  embedId: string;
  html: string;
  css: string;
  sourceApp: AppName;
  targetApp: AppName;
  displayMode: DisplayMode;
  actions: EmbedAction[];
  metadata: Record<string, unknown>;
}

interface EmbedAction {
  label: string;
  action: string;
  url: string;
  icon: string;
}

interface EngagementMetrics {
  embedId: string;
  views: number;
  clicks: number;
  expands: number;
  interactions: number;
  averageViewTime: number;
  clickThroughRate: number;
}

interface EmbedCompatibility {
  sourceApp: AppName;
  targetApp: AppName;
  contentTypes: ContentType[];
  displayModes: DisplayMode[];
  maxWidth?: number;
  maxHeight?: number;
  interactive: boolean;
}

const EMBED_COMPATIBILITY: EmbedCompatibility[] = [
  { sourceApp: 'quantube', targetApp: 'quantsync', contentTypes: ['video'], displayModes: ['compact', 'standard', 'expanded'], interactive: true },
  { sourceApp: 'quantube', targetApp: 'quantchat', contentTypes: ['video'], displayModes: ['compact', 'standard'], maxWidth: 480, interactive: true },
  { sourceApp: 'quantube', targetApp: 'quantmail', contentTypes: ['video'], displayModes: ['compact', 'minimal'], maxWidth: 600, interactive: false },
  { sourceApp: 'quantube', targetApp: 'quantmax', contentTypes: ['video'], displayModes: ['standard', 'expanded'], interactive: true },
  { sourceApp: 'quantneon', targetApp: 'quantchat', contentTypes: ['image', 'video'], displayModes: ['compact', 'standard'], interactive: true },
  { sourceApp: 'quantneon', targetApp: 'quantsync', contentTypes: ['image', 'video'], displayModes: ['standard', 'expanded'], interactive: true },
  { sourceApp: 'quantneon', targetApp: 'quantmail', contentTypes: ['image'], displayModes: ['compact', 'minimal'], interactive: false },
  { sourceApp: 'quantneon', targetApp: 'quantmax', contentTypes: ['image'], displayModes: ['standard'], maxWidth: 800, interactive: false },
  { sourceApp: 'quantchat', targetApp: 'quantsync', contentTypes: ['text'], displayModes: ['compact'], interactive: false },
  { sourceApp: 'quantchat', targetApp: 'quantmax', contentTypes: ['text'], displayModes: ['compact', 'standard'], interactive: false },
  { sourceApp: 'quantmax', targetApp: 'quantchat', contentTypes: ['document'], displayModes: ['compact', 'minimal'], interactive: false },
  { sourceApp: 'quantmax', targetApp: 'quantmail', contentTypes: ['document', 'spreadsheet', 'presentation'], displayModes: ['compact'], interactive: false },
  { sourceApp: 'quantmax', targetApp: 'quantsync', contentTypes: ['document'], displayModes: ['compact', 'standard'], interactive: false },
  { sourceApp: 'quantedits', targetApp: 'quantube', contentTypes: ['video'], displayModes: ['standard', 'expanded', 'fullscreen'], interactive: true },
  { sourceApp: 'quantedits', targetApp: 'quantsync', contentTypes: ['video'], displayModes: ['standard'], interactive: true },
  { sourceApp: 'quantedits', targetApp: 'quantneon', contentTypes: ['video', 'image'], displayModes: ['standard'], interactive: true },
  { sourceApp: 'quantai', targetApp: 'quantmax', contentTypes: ['text', 'code'], displayModes: ['standard', 'expanded'], interactive: true },
  { sourceApp: 'quantai', targetApp: 'quantchat', contentTypes: ['text'], displayModes: ['compact', 'standard'], interactive: true },
  { sourceApp: 'quantai', targetApp: 'quantmail', contentTypes: ['text'], displayModes: ['compact'], interactive: false },
  { sourceApp: 'quantads', targetApp: 'quantsync', contentTypes: ['image', 'video', 'ad_creative'], displayModes: ['compact', 'standard'], interactive: false },
  { sourceApp: 'quantads', targetApp: 'quantube', contentTypes: ['video', 'ad_creative'], displayModes: ['compact', 'standard'], interactive: false },
  { sourceApp: 'quantads', targetApp: 'quantneon', contentTypes: ['image', 'ad_creative'], displayModes: ['compact', 'standard'], interactive: false },
  { sourceApp: 'quantmail', targetApp: 'quantmax', contentTypes: ['text', 'document'], displayModes: ['compact'], interactive: false },
  { sourceApp: 'quantsync', targetApp: 'quantchat', contentTypes: ['text', 'image', 'video'], displayModes: ['compact', 'standard'], interactive: true }
];

export class ContentEmbedding {
  private embeds: Map<string, EmbedReference> = new Map();
  private previews: Map<string, EmbedPreview> = new Map();
  private engagement: Map<string, EngagementMetrics> = new Map();
  private embedCounter: number = 0;

  async embed(sourceApp: AppName, contentId: string, targetApp: AppName, config?: Partial<EmbedConfig>): Promise<EmbedReference | null> {
    const compatibility = this.getCompatibility(sourceApp, targetApp);
    if (!compatibility) return null;

    const embedConfig: EmbedConfig = {
      sourceApp,
      contentId,
      displayMode: config?.displayMode || compatibility.displayModes[0],
      interactive: config?.interactive !== undefined ? config.interactive : compatibility.interactive,
      autoplay: config?.autoplay || false,
      showControls: config?.showControls !== undefined ? config.showControls : true,
      maxWidth: config?.maxWidth || compatibility.maxWidth,
      maxHeight: config?.maxHeight || compatibility.maxHeight,
      theme: config?.theme || 'auto',
      permissions: config?.permissions || this.getDefaultPermissions()
    };

    const embedRef: EmbedReference = {
      id: this.generateId(),
      config: embedConfig,
      targetApp,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      status: 'active'
    };

    this.embeds.set(embedRef.id, embedRef);
    this.initializeEngagement(embedRef.id);

    return embedRef;
  }

  async getPreview(embedRef: EmbedReference): Promise<EmbedPreview> {
    const cached = this.previews.get(embedRef.id);
    if (cached && Date.now() - cached.lastUpdated < 300000) {
      return cached;
    }

    const appInfo = APP_REGISTRY[embedRef.config.sourceApp];
    const preview: EmbedPreview = {
      embedId: embedRef.id,
      sourceApp: embedRef.config.sourceApp,
      contentId: embedRef.config.contentId,
      title: `Content from ${appInfo.displayName}`,
      description: `Embedded ${embedRef.config.displayMode} view`,
      thumbnail: `/api/embeds/${embedRef.id}/thumbnail`,
      dimensions: this.calculateDimensions(embedRef.config),
      interactive: embedRef.config.interactive,
      lastUpdated: Date.now()
    };

    this.previews.set(embedRef.id, preview);
    return preview;
  }

  async resolveEmbed(embedRef: EmbedReference): Promise<Record<string, unknown> | null> {
    if (embedRef.status !== 'active') return null;

    embedRef.lastAccessed = Date.now();
    embedRef.accessCount++;

    const metrics = this.engagement.get(embedRef.id);
    if (metrics) metrics.views++;

    const appInfo = APP_REGISTRY[embedRef.config.sourceApp];
    return {
      embedId: embedRef.id,
      sourceApp: embedRef.config.sourceApp,
      contentId: embedRef.config.contentId,
      apiEndpoint: `${appInfo.baseUrl}/api/content/${embedRef.config.contentId}`,
      displayMode: embedRef.config.displayMode,
      permissions: embedRef.config.permissions,
      interactive: embedRef.config.interactive,
      theme: embedRef.config.theme,
      controls: embedRef.config.showControls,
      autoplay: embedRef.config.autoplay,
      dimensions: this.calculateDimensions(embedRef.config),
      timestamp: Date.now()
    };
  }

  renderCard(embedRef: EmbedReference): EmbedCard {
    const appInfo = APP_REGISTRY[embedRef.config.sourceApp];
    const dimensions = this.calculateDimensions(embedRef.config);

    const actions: EmbedAction[] = [
      { label: 'Open in ' + appInfo.displayName, action: 'open', url: `${appInfo.urlScheme}content/${embedRef.config.contentId}`, icon: appInfo.icon },
      { label: 'Share', action: 'share', url: `${appInfo.baseUrl}/share/${embedRef.config.contentId}`, icon: 'share' }
    ];

    if (embedRef.config.interactive) {
      actions.push({ label: 'Expand', action: 'expand', url: `${appInfo.baseUrl}/embed/${embedRef.id}/fullscreen`, icon: 'expand' });
    }

    const html = `<div class="quant-embed quant-embed-${embedRef.config.displayMode}" data-embed-id="${embedRef.id}" data-source="${embedRef.config.sourceApp}" style="max-width:${dimensions.width}px;max-height:${dimensions.height}px;"><div class="embed-header"><img src="${appInfo.icon}" class="app-icon"/><span class="app-name">${appInfo.displayName}</span></div><div class="embed-content" data-content-id="${embedRef.config.contentId}"></div><div class="embed-actions">${actions.map(a => `<button data-action="${a.action}">${a.label}</button>`).join('')}</div></div>`;

    const css = `.quant-embed{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background:#fff;}.embed-header{padding:8px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;}.embed-content{padding:12px;}.embed-actions{padding:8px 12px;border-top:1px solid #f0f0f0;display:flex;gap:8px;}`;

    return {
      embedId: embedRef.id,
      html,
      css,
      sourceApp: embedRef.config.sourceApp,
      targetApp: embedRef.targetApp,
      displayMode: embedRef.config.displayMode,
      actions,
      metadata: { dimensions, theme: embedRef.config.theme, interactive: embedRef.config.interactive }
    };
  }

  trackEngagement(embedId: string, action: 'click' | 'expand' | 'interact' | 'view'): void {
    const metrics = this.engagement.get(embedId);
    if (!metrics) return;

    switch (action) {
      case 'click': metrics.clicks++; break;
      case 'expand': metrics.expands++; break;
      case 'interact': metrics.interactions++; break;
      case 'view': metrics.views++; break;
    }

    if (metrics.views > 0) {
      metrics.clickThroughRate = metrics.clicks / metrics.views;
    }
  }

  getEngagementMetrics(embedId: string): EngagementMetrics | undefined {
    return this.engagement.get(embedId);
  }

  getSupported(): Map<string, EmbedCompatibility[]> {
    const map = new Map<string, EmbedCompatibility[]>();
    for (const compat of EMBED_COMPATIBILITY) {
      const key = `${compat.sourceApp}_to_${compat.targetApp}`;
      const existing = map.get(key) || [];
      existing.push(compat);
      map.set(key, existing);
    }
    return map;
  }

  getSupportedForApp(sourceApp: AppName): EmbedCompatibility[] {
    return EMBED_COMPATIBILITY.filter(c => c.sourceApp === sourceApp);
  }

  getEmbeddableIn(targetApp: AppName): EmbedCompatibility[] {
    return EMBED_COMPATIBILITY.filter(c => c.targetApp === targetApp);
  }

  validateEmbed(embedRef: EmbedReference): { valid: boolean; reason?: string } {
    if (embedRef.status === 'expired') {
      return { valid: false, reason: 'Embed has expired' };
    }
    if (embedRef.status === 'removed') {
      return { valid: false, reason: 'Content has been removed' };
    }

    const compatibility = this.getCompatibility(embedRef.config.sourceApp, embedRef.targetApp);
    if (!compatibility) {
      return { valid: false, reason: `Embedding from ${embedRef.config.sourceApp} to ${embedRef.targetApp} is not supported` };
    }

    if (!compatibility.displayModes.includes(embedRef.config.displayMode)) {
      return { valid: false, reason: `Display mode ${embedRef.config.displayMode} not supported for this embed` };
    }

    return { valid: true };
  }

  expireEmbed(embedId: string): boolean {
    const embed = this.embeds.get(embedId);
    if (!embed) return false;
    embed.status = 'expired';
    return true;
  }

  removeEmbed(embedId: string): boolean {
    const embed = this.embeds.get(embedId);
    if (!embed) return false;
    embed.status = 'removed';
    return true;
  }

  getEmbedById(embedId: string): EmbedReference | undefined {
    return this.embeds.get(embedId);
  }

  getActiveEmbeds(sourceApp?: AppName): EmbedReference[] {
    const all = Array.from(this.embeds.values()).filter(e => e.status === 'active');
    if (sourceApp) return all.filter(e => e.config.sourceApp === sourceApp);
    return all;
  }

  private getCompatibility(sourceApp: AppName, targetApp: AppName): EmbedCompatibility | undefined {
    return EMBED_COMPATIBILITY.find(c => c.sourceApp === sourceApp && c.targetApp === targetApp);
  }

  private calculateDimensions(config: EmbedConfig): { width: number; height: number } {
    const modeDefaults: Record<DisplayMode, { width: number; height: number }> = {
      minimal: { width: 200, height: 60 },
      compact: { width: 320, height: 180 },
      standard: { width: 560, height: 315 },
      expanded: { width: 800, height: 450 },
      fullscreen: { width: 1920, height: 1080 }
    };

    const defaults = modeDefaults[config.displayMode];
    return {
      width: config.maxWidth ? Math.min(defaults.width, config.maxWidth) : defaults.width,
      height: config.maxHeight ? Math.min(defaults.height, config.maxHeight) : defaults.height
    };
  }

  private getDefaultPermissions(): ContentPermissions {
    return { canView: true, canEdit: false, canShare: true, canEmbed: true, canDownload: false, canComment: true };
  }

  private initializeEngagement(embedId: string): void {
    this.engagement.set(embedId, {
      embedId,
      views: 0,
      clicks: 0,
      expands: 0,
      interactions: 0,
      averageViewTime: 0,
      clickThroughRate: 0
    });
  }

  private generateId(): string {
    this.embedCounter++;
    return `embed_${Date.now()}_${this.embedCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
