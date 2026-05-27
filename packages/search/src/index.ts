// ============================================================================
// Search Package - Barrel Export
// ============================================================================

export { InvertedIndex } from './core/inverted-index';
export { BM25Ranker } from './core/bm25-ranker';
export { AutocompleteEngine } from './core/autocomplete';
export { FacetedSearch } from './core/faceted-search';
export { SearchAnalytics } from './core/search-analytics';
export { SearchClient, QUANT_INDEXES, SearchOptionsSchema } from './services/search-client';
export {
  VectorClient,
  QdrantPointSchema,
  VectorSearchOptionsSchema,
} from './services/vector-client';
export { HybridSearchEngine, HybridSearchOptionsSchema } from './services/hybrid-search';
export {
  QueryParser,
  ParsedQuerySchema,
  ParsedFilterSchema,
  DateRangeSchema,
} from './services/query-parser';
export {
  PermissionFilter,
  VisibilitySchema,
  SearchResultWithPermissionsSchema,
  UserPermissionsSchema,
} from './services/permission-filter';
export { CohereReranker, RerankDocumentSchema, RerankOptionsSchema } from './services/reranker';
export { SearchFacetAggregator, FacetableResultSchema, FacetScopeSchema } from './services/facets';
export {
  ProactiveSearch,
  ProactiveContextSchema,
  ProactiveResultSchema,
} from './services/proactive';

export type { SearchOptions, IndexConfig } from './services/search-client';
export type {
  QdrantPoint,
  VectorSearchOptions,
  VectorSearchResult,
  CollectionInfo,
  VectorClientOptions,
} from './services/vector-client';
export type { HybridSearchOptions, HybridSearchResult } from './services/hybrid-search';
export type { ParsedQuery, ParsedFilter, DateRange } from './services/query-parser';
export type {
  Visibility,
  SearchResultWithPermissions,
  UserPermissions,
} from './services/permission-filter';
export type { RerankDocument, RerankOptions, RerankResult } from './services/reranker';
export type { FacetableResult, FacetScope } from './services/facets';
export type {
  ProactiveContext,
  ProactiveResult,
  ProactiveSearchOptions,
} from './services/proactive';

export {
  SavedSearchService,
  SavedSearchSchema,
  AlertFrequencySchema,
} from './services/saved-search';
export type {
  SavedSearch,
  AlertFrequency,
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
  DocumentToMatch,
  SavedSearchMatch,
} from './services/saved-search';

export { SearchObservabilityService } from './services/search-observability';
export type {
  QueryRecord,
  TimeRange,
  SearchMetrics,
  SlowQuery,
  PopularQuery,
  ZeroResultQuery,
} from './services/search-observability';

export { ReindexJobManager, ReindexJobStateSchema, ReindexJobSchema } from './services/reindex-job';
export type { ReindexJob, ReindexJobState } from './services/reindex-job';

export { NLQueryEnhancer } from './services/nl-query-enhancer';
export type { QueryIntent, ExtractedEntity, EnhancedQuery } from './services/nl-query-enhancer';

export { CrossAppSearchService } from './cross-app-search';
export type {
  CrossAppSearchResult,
  CrossAppSearchOptions,
  CrossAppSearchSuggestion,
  CrossAppSearchResponse,
} from './cross-app-search';

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
