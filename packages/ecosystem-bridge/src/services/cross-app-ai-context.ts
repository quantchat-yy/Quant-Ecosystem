// ============================================================================
// Quant Ecosystem Bridge - Cross-App AI Context Service
// Provides unified AI context from all apps for intelligent assistance
// ============================================================================

import {
  AppName,
  AIContextEntry,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface ContextQuery {
  userId: string;
  targetApp: AppName;
  query?: string;
  timeRange?: { start: number; end: number };
  maxEntries?: number;
  apps?: AppName[];
  categories?: string[];
}

interface ContextResult {
  entries: AIContextEntry[];
  totalRelevant: number;
  summary: string;
  topCategories: string[];
  confidence: number;
}

interface ActivitySummary {
  userId: string;
  timeRange: { start: number; end: number };
  totalActions: number;
  byApp: Record<string, { actions: number; topActions: string[]; lastActive: number }>;
  highlights: string[];
  patterns: string[];
  sentiment: number;
}

interface ActionSuggestion {
  action: string;
  app: AppName;
  reason: string;
  confidence: number;
  priority: number;
  context: string;
}

interface UserPreference {
  category: string;
  value: string;
  confidence: number;
  source: AppName;
  lastUpdated: number;
  frequency: number;
}

export class CrossAppAIContext {
  private contextEntries: Map<string, AIContextEntry[]> = new Map();
  private userPreferences: Map<string, UserPreference[]> = new Map();
  private entryCounter: number = 0;
  private relevanceDecayFactor: number = 0.95;
  private maxEntriesPerUser: number = 1000;

  async getContext(query: ContextQuery): Promise<ContextResult> {
    const userEntries = this.contextEntries.get(query.userId) || [];
    let filtered = [...userEntries];

    if (query.apps && query.apps.length > 0) {
      filtered = filtered.filter(e => query.apps!.includes(e.app));
    }

    if (query.timeRange) {
      filtered = filtered.filter(e =>
        e.timestamp >= query.timeRange!.start && e.timestamp <= query.timeRange!.end
      );
    }

    if (query.categories && query.categories.length > 0) {
      filtered = filtered.filter(e => query.categories!.includes(e.category));
    }

    if (query.query) {
      filtered = filtered.map(entry => ({
        ...entry,
        relevanceScore: this.getContextRelevanceScore(entry, query.query!)
      })).filter(e => e.relevanceScore > 0.2);
    }

    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const maxEntries = query.maxEntries || 50;
    const topEntries = filtered.slice(0, maxEntries);

    const categories = this.extractTopCategories(topEntries);
    const summary = this.generateContextSummary(topEntries, query.targetApp);
    const confidence = topEntries.length > 0
      ? topEntries.reduce((sum, e) => sum + e.relevanceScore, 0) / topEntries.length
      : 0;

    return {
      entries: topEntries,
      totalRelevant: filtered.length,
      summary,
      topCategories: categories,
      confidence
    };
  }

  async addContext(userId: string, app: AppName, context: {
    action: string;
    content: string;
    category?: string;
    entities?: string[];
    sentiment?: number;
  }): Promise<AIContextEntry> {
    const entry: AIContextEntry = {
      id: this.generateId(),
      app,
      userId,
      action: context.action,
      content: context.content,
      timestamp: Date.now(),
      relevanceScore: 1.0,
      category: context.category || this.categorizeAction(context.action, app),
      entities: context.entities || this.extractEntities(context.content),
      sentiment: context.sentiment !== undefined ? context.sentiment : 0.5,
      processed: false
    };

    const userEntries = this.contextEntries.get(userId) || [];
    userEntries.push(entry);

    if (userEntries.length > this.maxEntriesPerUser) {
      userEntries.sort((a, b) => b.relevanceScore - a.relevanceScore);
      userEntries.splice(this.maxEntriesPerUser);
    }

    this.contextEntries.set(userId, userEntries);
    this.updatePreferences(userId, entry);
    this.decayRelevance(userId);

    return entry;
  }

  getRelevantHistory(userId: string, query: string, limit: number = 20): AIContextEntry[] {
    const userEntries = this.contextEntries.get(userId) || [];

    const scored = userEntries.map(entry => ({
      entry,
      score: this.getContextRelevanceScore(entry, query)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.entry);
  }

  summarizeActivity(userId: string, timeRange: { start: number; end: number }): ActivitySummary {
    const userEntries = this.contextEntries.get(userId) || [];
    const inRange = userEntries.filter(e =>
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    const byApp: Record<string, { actions: number; topActions: string[]; lastActive: number }> = {};
    const actionCounts: Map<string, Map<string, number>> = new Map();

    for (const entry of inRange) {
      if (!byApp[entry.app]) {
        byApp[entry.app] = { actions: 0, topActions: [], lastActive: 0 };
        actionCounts.set(entry.app, new Map());
      }
      byApp[entry.app].actions++;
      byApp[entry.app].lastActive = Math.max(byApp[entry.app].lastActive, entry.timestamp);

      const appActions = actionCounts.get(entry.app)!;
      appActions.set(entry.action, (appActions.get(entry.action) || 0) + 1);
    }

    for (const [app, counts] of actionCounts.entries()) {
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      byApp[app].topActions = sorted.slice(0, 3).map(([action]) => action);
    }

    const highlights = this.generateHighlights(inRange);
    const patterns = this.detectPatterns(inRange);
    const avgSentiment = inRange.length > 0
      ? inRange.reduce((sum, e) => sum + e.sentiment, 0) / inRange.length
      : 0.5;

    return {
      userId,
      timeRange,
      totalActions: inRange.length,
      byApp,
      highlights,
      patterns,
      sentiment: avgSentiment
    };
  }

  suggestActions(userId: string, limit: number = 5): ActionSuggestion[] {
    const userEntries = this.contextEntries.get(userId) || [];
    const recentEntries = userEntries
      .filter(e => Date.now() - e.timestamp < 3600000)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentEntries.length === 0) {
      return this.getDefaultSuggestions(userId);
    }

    const suggestions: ActionSuggestion[] = [];
    const lastApp = recentEntries[0].app;
    const lastAction = recentEntries[0].action;

    const followUpActions = this.getFollowUpActions(lastApp, lastAction);
    for (const followUp of followUpActions) {
      suggestions.push({
        action: followUp.action,
        app: followUp.app,
        reason: `Based on your recent ${lastAction} in ${APP_REGISTRY[lastApp].displayName}`,
        confidence: followUp.confidence,
        priority: followUp.priority,
        context: recentEntries[0].content.substring(0, 100)
      });
    }

    const preferences = this.userPreferences.get(userId) || [];
    const timeBasedSuggestions = this.getTimeBasedSuggestions(preferences, userEntries);
    suggestions.push(...timeBasedSuggestions);

    return suggestions
      .sort((a, b) => b.confidence * b.priority - a.confidence * a.priority)
      .slice(0, limit);
  }

  getPreferences(userId: string): UserPreference[] {
    return this.userPreferences.get(userId) || [];
  }

  forgetContext(userId: string, app?: AppName): number {
    if (!app) {
      const count = (this.contextEntries.get(userId) || []).length;
      this.contextEntries.delete(userId);
      this.userPreferences.delete(userId);
      return count;
    }

    const userEntries = this.contextEntries.get(userId) || [];
    const filtered = userEntries.filter(e => e.app !== app);
    const removed = userEntries.length - filtered.length;
    this.contextEntries.set(userId, filtered);

    const prefs = this.userPreferences.get(userId) || [];
    this.userPreferences.set(userId, prefs.filter(p => p.source !== app));

    return removed;
  }

  getContextRelevanceScore(context: AIContextEntry, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = context.content.toLowerCase();
    const actionLower = context.action.toLowerCase();
    const categoryLower = context.category.toLowerCase();

    let termMatchScore = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) termMatchScore += 0.4;
      if (actionLower.includes(term)) termMatchScore += 0.3;
      if (categoryLower.includes(term)) termMatchScore += 0.2;
      if (context.entities.some(e => e.toLowerCase().includes(term))) termMatchScore += 0.3;
    }
    termMatchScore = Math.min(termMatchScore / queryTerms.length, 1.0);

    const ageHours = (Date.now() - context.timestamp) / (1000 * 60 * 60);
    const recencyScore = Math.pow(this.relevanceDecayFactor, ageHours / 24);

    const baseRelevance = context.relevanceScore;

    return (termMatchScore * 0.5 + recencyScore * 0.3 + baseRelevance * 0.2);
  }

  getEntryCount(userId: string): number {
    return (this.contextEntries.get(userId) || []).length;
  }

  getAppContext(userId: string, app: AppName): AIContextEntry[] {
    const entries = this.contextEntries.get(userId) || [];
    return entries.filter(e => e.app === app).sort((a, b) => b.timestamp - a.timestamp);
  }

  private updatePreferences(userId: string, entry: AIContextEntry): void {
    const prefs = this.userPreferences.get(userId) || [];
    const existingPref = prefs.find(p =>
      p.category === entry.category && p.source === entry.app
    );

    if (existingPref) {
      existingPref.frequency++;
      existingPref.confidence = Math.min(existingPref.confidence + 0.05, 1.0);
      existingPref.lastUpdated = Date.now();
    } else {
      prefs.push({
        category: entry.category,
        value: entry.action,
        confidence: 0.3,
        source: entry.app,
        lastUpdated: Date.now(),
        frequency: 1
      });
    }

    this.userPreferences.set(userId, prefs);
  }

  private decayRelevance(userId: string): void {
    const entries = this.contextEntries.get(userId) || [];
    const now = Date.now();
    for (const entry of entries) {
      const ageHours = (now - entry.timestamp) / (1000 * 60 * 60);
      if (ageHours > 1) {
        entry.relevanceScore *= Math.pow(this.relevanceDecayFactor, ageHours / 24);
      }
    }
  }

  private categorizeAction(action: string, app: AppName): string {
    const categories: Record<string, string[]> = {
      communication: ['send_message', 'email', 'call', 'comment', 'reply'],
      creation: ['upload', 'post', 'create', 'publish', 'write', 'compose'],
      consumption: ['view', 'watch', 'read', 'listen', 'browse'],
      social: ['like', 'follow', 'share', 'react', 'mention'],
      productivity: ['edit', 'organize', 'schedule', 'plan', 'collaborate'],
      commerce: ['purchase', 'bid', 'advertise', 'campaign', 'checkout']
    };

    const actionLower = action.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(k => actionLower.includes(k))) {
        return category;
      }
    }
    return 'general';
  }

  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    const words = content.split(/\s+/);
    for (const word of words) {
      if (word.startsWith('@')) entities.push(word);
      if (word.startsWith('#')) entities.push(word);
      if (word.match(/^https?:\/\//)) entities.push(word);
    }
    return entities.slice(0, 10);
  }

  private extractTopCategories(entries: AIContextEntry[]): string[] {
    const categoryCounts: Map<string, number> = new Map();
    for (const entry of entries) {
      categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
    }
    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  }

  private generateContextSummary(entries: AIContextEntry[], targetApp: AppName): string {
    if (entries.length === 0) return 'No relevant context available.';

    const apps = [...new Set(entries.map(e => e.app))];
    const appNames = apps.map(a => APP_REGISTRY[a].displayName).join(', ');
    const categories = this.extractTopCategories(entries);

    return `Context from ${apps.length} apps (${appNames}). Primary activities: ${categories.join(', ')}. ${entries.length} relevant entries found for ${APP_REGISTRY[targetApp].displayName}.`;
  }

  private generateHighlights(entries: AIContextEntry[]): string[] {
    const highlights: string[] = [];
    const highEngagement = entries.filter(e => e.relevanceScore > 0.8);

    if (highEngagement.length > 0) {
      const topApp = highEngagement[0].app;
      highlights.push(`High engagement in ${APP_REGISTRY[topApp].displayName}`);
    }

    const uniqueApps = new Set(entries.map(e => e.app));
    if (uniqueApps.size > 3) {
      highlights.push(`Active across ${uniqueApps.size} apps`);
    }

    const positiveEntries = entries.filter(e => e.sentiment > 0.7);
    if (positiveEntries.length > entries.length * 0.7) {
      highlights.push('Mostly positive interactions');
    }

    return highlights;
  }

  private detectPatterns(entries: AIContextEntry[]): string[] {
    const patterns: string[] = [];

    const hourCounts: Map<number, number> = new Map();
    for (const entry of entries) {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    const peakHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      patterns.push(`Most active around ${peakHour[0]}:00`);
    }

    const appSequences: string[] = entries.slice(0, 20).map(e => e.app);
    for (let i = 0; i < appSequences.length - 1; i++) {
      if (appSequences[i] !== appSequences[i + 1]) {
        const from = APP_REGISTRY[appSequences[i] as AppName]?.displayName;
        const to = APP_REGISTRY[appSequences[i + 1] as AppName]?.displayName;
        if (from && to) {
          patterns.push(`Frequently switches between ${from} and ${to}`);
          break;
        }
      }
    }

    return patterns;
  }

  private getFollowUpActions(app: AppName, action: string): Array<{ action: string; app: AppName; confidence: number; priority: number }> {
    const followUps: Record<string, Array<{ action: string; app: AppName; confidence: number; priority: number }>> = {
      'upload_video': [
        { action: 'Share to social', app: 'quantsync', confidence: 0.8, priority: 8 },
        { action: 'Create ad campaign', app: 'quantads', confidence: 0.5, priority: 5 },
        { action: 'Edit video', app: 'quantedits', confidence: 0.6, priority: 6 }
      ],
      'send_message': [
        { action: 'Follow up via email', app: 'quantmail', confidence: 0.4, priority: 4 },
        { action: 'Schedule meeting', app: 'quantmax', confidence: 0.5, priority: 5 }
      ],
      'create_post': [
        { action: 'Boost post', app: 'quantads', confidence: 0.6, priority: 6 },
        { action: 'Cross-post to Neon', app: 'quantneon', confidence: 0.7, priority: 7 }
      ]
    };

    return followUps[action] || [
      { action: 'Continue in AI assistant', app: 'quantai', confidence: 0.4, priority: 4 }
    ];
  }

  private getTimeBasedSuggestions(preferences: UserPreference[], entries: AIContextEntry[]): ActionSuggestion[] {
    const hour = new Date().getHours();
    const suggestions: ActionSuggestion[] = [];

    if (hour >= 9 && hour <= 11) {
      suggestions.push({
        action: 'Check inbox',
        app: 'quantmail',
        reason: 'Morning is a good time to review emails',
        confidence: 0.6,
        priority: 7,
        context: 'time-based'
      });
    } else if (hour >= 12 && hour <= 14) {
      suggestions.push({
        action: 'Browse feed',
        app: 'quantsync',
        reason: 'Lunch break - catch up on social feed',
        confidence: 0.5,
        priority: 5,
        context: 'time-based'
      });
    }

    return suggestions;
  }

  private getDefaultSuggestions(userId: string): ActionSuggestion[] {
    return [
      { action: 'Check messages', app: 'quantchat', reason: 'Stay connected', confidence: 0.5, priority: 6, context: 'default' },
      { action: 'Browse feed', app: 'quantsync', reason: 'See what is new', confidence: 0.4, priority: 5, context: 'default' },
      { action: 'Check email', app: 'quantmail', reason: 'Review inbox', confidence: 0.4, priority: 5, context: 'default' }
    ];
  }

  private generateId(): string {
    this.entryCounter++;
    return `ctx_${Date.now()}_${this.entryCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
