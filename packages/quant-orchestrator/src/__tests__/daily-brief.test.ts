import { describe, it, expect } from 'vitest';
import { DailyBriefGenerator } from '../daily-brief.js';
import type { BriefDataSource, BriefItem } from '../types.js';

function makeItem(overrides: Partial<BriefItem> & { id: string }): BriefItem {
  return {
    title: 'Test Item',
    description: 'Test description',
    priority: 'medium',
    source: 'calendar',
    actionable: false,
    ...overrides,
  };
}

describe('DailyBriefGenerator - extended', () => {
  it('should aggregate items from multiple sources correctly', async () => {
    const calendarSource: BriefDataSource = {
      name: 'calendar',
      fetch: async () => [
        makeItem({ id: 'cal1', title: 'Meeting A', source: 'calendar' }),
        makeItem({ id: 'cal2', title: 'Meeting B', source: 'calendar' }),
      ],
    };
    const newsSource: BriefDataSource = {
      name: 'news',
      fetch: async () => [makeItem({ id: 'news1', title: 'Article', source: 'news' })],
    };

    const generator = new DailyBriefGenerator([calendarSource, newsSource]);
    const brief = await generator.generate('user_001');
    expect(brief.upcomingEvents).toHaveLength(2);
    expect(brief.newsHighlights).toHaveLength(1);
  });

  it('should include weather when option is set to true', async () => {
    const generator = new DailyBriefGenerator();
    const brief = await generator.generate('user_001', { includeWeather: true });
    expect(brief.weather).toBeDefined();
    expect(typeof brief.weather).toBe('string');
  });

  it('should exclude weather when option is set to false', async () => {
    const generator = new DailyBriefGenerator();
    const brief = await generator.generate('user_001', { includeWeather: false });
    expect(brief.weather).toBeUndefined();
  });

  it('should generate a non-empty greeting string', async () => {
    const generator = new DailyBriefGenerator();
    const brief = await generator.generate('user_001');
    expect(brief.greeting).toBeTruthy();
    expect(brief.greeting.length).toBeGreaterThan(0);
  });

  it('should place actionable items into pendingActions', async () => {
    const source: BriefDataSource = {
      name: 'mail',
      fetch: async () => [
        makeItem({ id: 'a1', title: 'Reply', source: 'mail', actionable: true }),
        makeItem({ id: 'a2', title: 'Read Only', source: 'mail', actionable: false }),
      ],
    };

    const generator = new DailyBriefGenerator([source]);
    const brief = await generator.generate('user_001');
    expect(brief.pendingActions).toHaveLength(1);
    expect(brief.pendingActions[0]!.title).toBe('Reply');
    // Non-actionable mail items should not appear in pendingActions
    const inPending = brief.pendingActions.find((item) => item.id === 'a2');
    expect(inPending).toBeUndefined();
  });

  it('should allow adding a source dynamically with addSource', async () => {
    const generator = new DailyBriefGenerator();
    const brief1 = await generator.generate('user_001');
    expect(brief1.upcomingEvents).toHaveLength(0);

    generator.addSource({
      name: 'dynamic',
      fetch: async () => [makeItem({ id: 'd1', title: 'Event', source: 'calendar' })],
    });

    const brief2 = await generator.generate('user_001');
    expect(brief2.upcomingEvents).toHaveLength(1);
    expect(brief2.upcomingEvents[0]!.title).toBe('Event');
  });
});
