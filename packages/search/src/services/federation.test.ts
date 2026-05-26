// ============================================================================
// Search Federation - Tests
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchFederation } from './federation';
import type { FederatedResult, FederatedSuggestion } from './federation';

describe('SearchFederation', () => {
  let federation: SearchFederation;

  const chatSearchHandler = vi.fn((query: string, limit: number): FederatedResult[] => {
    if (!query) return [];
    return [
      {
        id: 'chat-1',
        sourceId: 'chats',
        title: `Chat: ${query}`,
        snippet: 'Message content',
        score: 0.9,
        timestamp: 1000,
      },
      {
        id: 'chat-2',
        sourceId: 'chats',
        title: `Chat: ${query} 2`,
        snippet: 'Another message',
        score: 0.7,
        timestamp: 900,
      },
    ].slice(0, limit);
  });

  const emailSearchHandler = vi.fn((query: string, limit: number): FederatedResult[] => {
    if (!query) return [];
    return [
      {
        id: 'email-1',
        sourceId: 'emails',
        title: `Email: ${query}`,
        snippet: 'Email body',
        score: 0.85,
        timestamp: 2000,
      },
    ].slice(0, limit);
  });

  const chatSuggestionHandler = vi.fn((query: string): FederatedSuggestion[] => {
    return [{ text: `${query} in chats`, sourceId: 'chats', score: 0.8 }];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    federation = new SearchFederation();
    federation.registerSource(
      'chats',
      {
        displayName: 'Chat Messages',
        contentType: 'messages',
        priority: 80,
        enabled: true,
      },
      chatSearchHandler,
      chatSuggestionHandler,
    );

    federation.registerSource(
      'emails',
      {
        displayName: 'Emails',
        contentType: 'emails',
        priority: 90,
        enabled: true,
      },
      emailSearchHandler,
    );
  });

  describe('registerSource', () => {
    it('should register sources and list them', () => {
      const sources = federation.getSources();
      expect(sources).toHaveLength(2);
      expect(sources.map((s) => s.sourceId)).toContain('chats');
      expect(sources.map((s) => s.sourceId)).toContain('emails');
    });

    it('should unregister a source', () => {
      const result = federation.unregisterSource('chats');
      expect(result).toBe(true);
      expect(federation.getSources()).toHaveLength(1);
    });

    it('should return false when unregistering unknown source', () => {
      const result = federation.unregisterSource('unknown');
      expect(result).toBe(false);
    });
  });

  describe('federatedSearch', () => {
    it('should search across all sources and merge results by score', async () => {
      const results = await federation.federatedSearch('meeting notes');

      expect(results.length).toBeGreaterThan(0);
      expect(chatSearchHandler).toHaveBeenCalledWith('meeting notes', 20);
      expect(emailSearchHandler).toHaveBeenCalledWith('meeting notes', 20);

      // Results should be sorted by weighted score
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should apply source priority weighting', async () => {
      const results = await federation.federatedSearch('test');

      // Email source has priority 90, chat has 80
      // email score: 0.85 * 0.9 = 0.765
      // chat score: 0.9 * 0.8 = 0.72
      const emailResult = results.find((r) => r.sourceId === 'emails');
      const chatResult = results.find((r) => r.sourceId === 'chats');
      expect(emailResult).toBeDefined();
      expect(chatResult).toBeDefined();
      expect(emailResult!.score).toBeGreaterThan(chatResult!.score);
    });

    it('should return empty for empty query', async () => {
      const results = await federation.federatedSearch('');
      expect(results).toHaveLength(0);
    });

    it('should return empty for whitespace query', async () => {
      const results = await federation.federatedSearch('   ');
      expect(results).toHaveLength(0);
    });

    it('should filter by specific sources', async () => {
      const results = await federation.federatedSearch('hello', { sourceIds: ['chats'] });

      expect(chatSearchHandler).toHaveBeenCalled();
      expect(emailSearchHandler).not.toHaveBeenCalled();
      expect(results.every((r) => r.sourceId === 'chats')).toBe(true);
    });

    it('should respect limit option', async () => {
      const results = await federation.federatedSearch('test', { limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should filter by minScore', async () => {
      const results = await federation.federatedSearch('test', { minScore: 0.75 });
      expect(results.every((r) => r.score >= 0.75)).toBe(true);
    });

    it('should sort by recency when specified', async () => {
      const results = await federation.federatedSearch('test', { sortBy: 'recency' });
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp ?? 0).toBeGreaterThanOrEqual(results[i + 1].timestamp ?? 0);
      }
    });

    it('should handle source errors gracefully', async () => {
      federation.registerSource(
        'broken',
        {
          displayName: 'Broken Source',
          contentType: 'broken',
          priority: 50,
          enabled: true,
        },
        () => {
          throw new Error('Source failed');
        },
      );

      const results = await federation.federatedSearch('test');
      // Should still get results from other sources
      expect(results.length).toBeGreaterThan(0);
    });

    it('should skip disabled sources', async () => {
      federation.registerSource(
        'disabled',
        {
          displayName: 'Disabled',
          contentType: 'other',
          priority: 50,
          enabled: false,
        },
        vi.fn(),
      );

      await federation.federatedSearch('test');
      // The disabled source handler should not be called
    });
  });

  describe('searchBySource', () => {
    it('should search a specific source', async () => {
      const results = await federation.searchBySource('emails', 'quarterly report');
      expect(emailSearchHandler).toHaveBeenCalledWith('quarterly report', 20);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown source', async () => {
      const results = await federation.searchBySource('unknown', 'test');
      expect(results).toHaveLength(0);
    });

    it('should return empty for empty query', async () => {
      const results = await federation.searchBySource('chats', '');
      expect(results).toHaveLength(0);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should aggregate suggestions from all sources with handlers', async () => {
      const suggestions = await federation.getSearchSuggestions('meet');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].text).toContain('meet');
    });

    it('should return empty for empty query', async () => {
      const suggestions = await federation.getSearchSuggestions('');
      expect(suggestions).toHaveLength(0);
    });

    it('should deduplicate suggestions by text', async () => {
      // Register another source with same suggestion text
      federation.registerSource(
        'docs',
        {
          displayName: 'Docs',
          contentType: 'documents',
          priority: 70,
          enabled: true,
        },
        vi.fn().mockReturnValue([]),
        () => [{ text: 'meet in chats', sourceId: 'docs', score: 0.5 }],
      );

      const suggestions = await federation.getSearchSuggestions('meet');
      const texts = suggestions.map((s) => s.text.toLowerCase());
      const unique = new Set(texts);
      expect(texts.length).toBe(unique.size);
    });
  });

  describe('recentUserSearches', () => {
    it('should track and retrieve user recent searches', () => {
      federation.trackUserSearch('user1', 'first query', 5, ['chats', 'emails']);
      federation.trackUserSearch('user1', 'second query', 3, ['chats']);

      const recent = federation.recentUserSearches('user1');
      expect(recent).toHaveLength(2);
      expect(recent[0].query).toBe('second query');
      expect(recent[1].query).toBe('first query');
    });

    it('should return empty for unknown user', () => {
      const recent = federation.recentUserSearches('unknown');
      expect(recent).toHaveLength(0);
    });
  });
});
