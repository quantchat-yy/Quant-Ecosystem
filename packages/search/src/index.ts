// ============================================================================
// Search Package - Barrel Export
// ============================================================================

export { InvertedIndex } from './core/inverted-index';
export { BM25Ranker } from './core/bm25-ranker';
export { AutocompleteEngine } from './core/autocomplete';
export { FacetedSearch } from './core/faceted-search';
export { SearchAnalytics } from './core/search-analytics';

export type {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchFilter,
  FilterOperator,
  SortOption,
  ScoreExplanation,
  FacetDefinition,
  FacetType,
  FacetRange,
  FacetResult,
  FacetBucket,
  IndexDocument,
  DocumentMetadata,
  SearchSuggestion,
  TokenInfo,
  TFIDFScore,
  BM25Config,
  SearchAnalyticsEntry,
  TrieNode,
  IndexStats,
  SearchIndexConfig,
  IndexFieldConfig,
  AnalyzerConfig,
} from './types';
