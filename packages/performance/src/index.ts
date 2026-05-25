// ============================================================================
// Performance Package - Barrel Export
// ============================================================================

export { LRUCache } from './core/lru-cache';
export { MultiLayerCache } from './core/multi-layer-cache';
export { CacheInvalidator } from './core/cache-invalidation';
export { RequestDeduplicator } from './core/request-deduplicator';
export { ConnectionPool } from './core/connection-pool';
export { QueryOptimizer } from './core/query-optimizer';
export { CompressionEngine } from './core/compression';
export { LazyLoader } from './core/lazy-loader';
export { VirtualScroll } from './core/virtual-scroll';
export { CodeSplitter } from './core/code-splitter';
export { BundleAnalyzer } from './core/bundle-analyzer';
export { WebVitalsCollector } from './core/web-vitals';
export { ResourcePreloader } from './core/resource-preloader';
export { ServiceWorkerGenerator } from './core/service-worker-gen';
export { BackgroundSyncQueue } from './core/background-sync';
export { MemoryLeakDetector } from './core/memory-leak-detector';
export { EdgeComputing } from './core/edge-computing';
export { DatabaseSharding } from './core/database-sharding';
export { ServiceMesh } from './core/service-mesh';
export { CDNOptimizer } from './core/cdn-optimizer';

export type {
  LRUConfig,
  LRUNode,
  CacheEntry,
  CacheLayerType,
  CacheLayerConfig,
  MultiLayerCacheConfig,
  CoherenceProtocol,
  CoherenceState,
  CacheShard,
  CDNEdgeLocation,
  InvalidationStrategy,
  InvalidationEvent,
  StampedeConfig,
  DeduplicationConfig,
  DeduplicationRequest,
  PendingRequest,
  ConnectionPoolConfig,
  PooledConnection,
  ConnectionState,
  WaitQueueEntry,
  QueryPlan,
  ScanType,
  QueryOptimization,
  OptimizationType,
  IndexSuggestion,
  CompressionConfig,
  CompressionAlgorithm,
  CompressionResult,
  LazyLoadConfig,
  LazyLoadItem,
  VirtualScrollConfig,
  ScrollState,
  VirtualScrollItem,
  CodeSplitConfig,
  PreloadStrategy,
  ChunkInfo,
  BundleMetrics,
  BudgetStatus,
  WebVitalsMetrics,
  PercentileResult,
  VitalsThreshold,
  VitalsAttribution,
  PreloadHint,
  ResourceType,
  FetchPriority,
  ServiceWorkerConfig,
  RuntimeCachingRule,
  CacheStrategy,
  SyncQueueItem,
  SyncStatus,
  MemorySnapshot,
  LeakReport,
  LeakSeverity,
  SuspectedLeak,
  EdgeNode,
  EdgeConfig,
  ShardConfig,
  HashRing,
  ShardRouting,
  ServiceEndpoint,
  LoadBalancerConfig,
  CDNConfig,
  CachePolicy,
  PurgeEvent,
} from './types';
