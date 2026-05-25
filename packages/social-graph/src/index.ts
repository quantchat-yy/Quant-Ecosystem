// ============================================================================
// Social Graph Package - Barrel Export
// ============================================================================

export { GraphStore } from './core/graph-store';
export { PathFinder } from './core/path-finder';
export { InfluenceScorer } from './core/influence-scorer';
export { CommunityDetector } from './core/community-detector';
export { FollowerManager } from './core/follower-manager';

export type {
  GraphNode,
  NodeType,
  NodeMetadata,
  GraphEdge,
  EdgeType,
  EdgeMetadata,
  RelationshipStrength,
  StrengthFactors,
  InfluenceScore,
  InfluenceComponents,
  Community,
  SocialCircle,
  SocialCircleType,
  PathResult,
  MutualConnectionsResult,
  FriendSuggestion,
  PaginatedResult,
  GraphEvent,
  GraphEventType,
  NetworkGrowthMetrics,
  TrendingAccount,
  PageRankConfig,
  CommunityDetectionConfig,
  StrengthConfig,
  TraversalOptions,
  GraphStats,
  BatchResult,
  GraphEventListener,
} from './types';
