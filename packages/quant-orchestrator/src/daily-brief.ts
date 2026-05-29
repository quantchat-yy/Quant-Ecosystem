import type { BriefDataSource, BriefItem, DailyBrief } from './types.js';

export interface DailyBriefOptions {
  includeWeather?: boolean;
  includeNews?: boolean;
}

export class DailyBriefGenerator {
  private sources: BriefDataSource[];

  constructor(sources: BriefDataSource[] = []) {
    this.sources = sources;
  }

  async generate(userId: string, options?: DailyBriefOptions): Promise<DailyBrief> {
    const allItems = await this.fetchAllItems(userId);

    const upcomingEvents = allItems.filter(
      (item) => item.source === 'calendar' || item.source === 'events',
    );
    const pendingActions = allItems.filter((item) => item.actionable && item.source !== 'news');
    const suggestedAutomations = allItems.filter(
      (item) => item.source === 'automations' || item.source === 'suggestions',
    );
    const newsHighlights =
      options?.includeNews !== false ? allItems.filter((item) => item.source === 'news') : [];

    return {
      greeting: this.generateGreeting(),
      weather: options?.includeWeather ? 'Weather data not available' : undefined,
      upcomingEvents,
      pendingActions,
      suggestedAutomations,
      newsHighlights,
    };
  }

  addSource(source: BriefDataSource): void {
    this.sources.push(source);
  }

  private async fetchAllItems(userId: string): Promise<BriefItem[]> {
    const results = await Promise.allSettled(this.sources.map((source) => source.fetch(userId)));

    const items: BriefItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      }
    }
    return items;
  }

  private generateGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning! Here is your daily brief.';
    } else if (hour < 17) {
      return 'Good afternoon! Here is your daily brief.';
    } else {
      return 'Good evening! Here is your daily brief.';
    }
  }
}
