// ============================================================================
// Search Federation - Cross-app unified search across all content sources
// ============================================================================

import { z } from 'zod';

export const FederationSourceConfigSchema = z.object({
  sourceId: z.string().min(1),
  displayName: z.string().min(1),
  contentType: z.string(),
  priority: z.number().int().min(0).max(100).default(50),
  enabled: z.boolean().default(true),
});

export type FederationSourceConfig = z.infer<typeof FederationSourceConfigSchema>;

/** A search result from a federated source */
export interface FederatedResult {
  id: string;
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
  url?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

/** Options for federated search */
export interface FederatedSearchOptions {
  sourceIds?: string[];
  limit?: number;
  minScore?: number;
  sortBy?: 'relevance' | 'recency';
}

/** Search suggestion from a source */
export interface FederatedSuggestion {
  text: string;
  sourceId: string;
  score: number;
}

/** Recent search entry */
export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
  sourcesSearched: string[];
}

/** Search handler function that sources provide */
export type SearchHandler = (
  query: string,
  limit: number,
) => FederatedResult[] | Promise<FederatedResult[]>;

/** Suggestion handler function */
export type SuggestionHandler = (
  query: string,
) => FederatedSuggestion[] | Promise<FederatedSuggestion[]>;

/** Full source registration with handlers */
interface RegisteredSource {
  config: FederationSourceConfig;
  searchHandler: SearchHandler;
  suggestionHandler?: SuggestionHandler;
}

/**
 * SearchFederation - Unified cross-app search
 *
 * Aggregates search results from multiple content sources (chat messages,
 * emails, documents, drive files, calendar events) into a single ranked
 * result set. Each source registers a search handler and optional
 * suggestion handler.
 */
export class SearchFederation {
  private sources: Map<string, RegisteredSource> = new Map();
  private recentSearches: Map<string, RecentSearch[]> = new Map();
  private maxRecentSearches = 50;

  /**
   * Register a searchable content source
   */
  registerSource(
    sourceId: string,
    config: Omit<FederationSourceConfig, 'sourceId'>,
    searchHandler: SearchHandler,
    suggestionHandler?: SuggestionHandler,
  ): void {
    const fullConfig = FederationSourceConfigSchema.parse({ sourceId, ...config });
    this.sources.set(sourceId, {
      config: fullConfig,
      searchHandler,
      suggestionHandler,
    });
  }

  /**
   * Remove a registered source
   */
  unregisterSource(sourceId: string): boolean {
    return this.sources.delete(sourceId);
  }

  /**
   * Execute a federated search across all (or selected) sources
   */
  async federatedSearch(
    query: string,
    options: FederatedSearchOptions = {},
  ): Promise<FederatedResult[]> {
    if (!query.trim()) return [];

    const limit = options.limit ?? 20;
    const minScore = options.minScore ?? 0;
    const sortBy = options.sortBy ?? 'relevance';

    // Determine which sources to query
    const sourcesToQuery = this.getActiveSources(options.sourceIds);
    if (sourcesToQuery.length === 0) return [];

    // Execute search across all sources in parallel
    const searchPromises = sourcesToQuery.map(async (source) => {
      try {
        const results = await Promise.resolve(source.searchHandler(query, limit));
        // Apply source priority weighting to scores
        return results.map((r) => ({
          ...r,
          sourceId: source.config.sourceId,
          score: r.score * (source.config.priority / 100),
        }));
      } catch {
        return [];
      }
    });

    const allResults = (await Promise.all(searchPromises)).flat();

    // Filter by min score
    let filtered = allResults.filter((r) => r.score >= minScore);

    // Sort results
    if (sortBy === 'relevance') {
      filtered.sort((a, b) => b.score - a.score);
    } else {
      filtered.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    }

    // Track recent search
    this.trackSearch(
      query,
      filtered.length,
      sourcesToQuery.map((s) => s.config.sourceId),
    );

    return filtered.slice(0, limit);
  }

  /**
   * Search a specific source only
   */
  async searchBySource(sourceId: string, query: string, limit = 20): Promise<FederatedResult[]> {
    const source = this.sources.get(sourceId);
    if (!source || !source.config.enabled) return [];

    if (!query.trim()) return [];

    try {
      const results = await Promise.resolve(source.searchHandler(query, limit));
      return results.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * List all registered sources
   */
  getSources(): FederationSourceConfig[] {
    return Array.from(this.sources.values()).map((s) => s.config);
  }

  /**
   * Get suggestions from all sources
   */
  async getSearchSuggestions(query: string): Promise<FederatedSuggestion[]> {
    if (!query.trim()) return [];

    const activeSources = this.getActiveSources();
    const sourcesWithSuggestions = activeSources.filter((s) => s.suggestionHandler);

    const suggestPromises = sourcesWithSuggestions.map(async (source) => {
      try {
        return await Promise.resolve(source.suggestionHandler!(query));
      } catch {
        return [];
      }
    });

    const allSuggestions = (await Promise.all(suggestPromises)).flat();

    // Sort by score, deduplicate by text
    allSuggestions.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const unique: FederatedSuggestion[] = [];
    for (const suggestion of allSuggestions) {
      const key = suggestion.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    return unique.slice(0, 10);
  }

  /**
   * Get recent searches for a user
   */
  recentUserSearches(userId: string): RecentSearch[] {
    return this.recentSearches.get(userId) || [];
  }

  /**
   * Track a search for a user (for recent searches feature)
   */
  trackUserSearch(userId: string, query: string, resultCount: number, sources: string[]): void {
    if (!this.recentSearches.has(userId)) {
      this.recentSearches.set(userId, []);
    }
    const searches = this.recentSearches.get(userId)!;
    searches.unshift({
      query,
      timestamp: Date.now(),
      resultCount,
      sourcesSearched: sources,
    });

    if (searches.length > this.maxRecentSearches) {
      searches.length = this.maxRecentSearches;
    }
  }

  // ---- Private Methods ----

  private getActiveSources(sourceIds?: string[]): RegisteredSource[] {
    const sources = Array.from(this.sources.values()).filter((s) => s.config.enabled);

    if (sourceIds && sourceIds.length > 0) {
      return sources.filter((s) => sourceIds.includes(s.config.sourceId));
    }

    return sources;
  }

  private trackSearch(query: string, resultCount: number, sources: string[]): void {
    // Internal tracking (anonymous - no userId)
    const key = '__internal__';
    if (!this.recentSearches.has(key)) {
      this.recentSearches.set(key, []);
    }
    const searches = this.recentSearches.get(key)!;
    searches.unshift({
      query,
      timestamp: Date.now(),
      resultCount,
      sourcesSearched: sources,
    });

    if (searches.length > this.maxRecentSearches) {
      searches.length = this.maxRecentSearches;
    }
  }
}
