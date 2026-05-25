// ============================================================================
// Social Graph Package - Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

/** Type of node in the social graph */
export type NodeType = 'user' | 'page' | 'group';

/** A node in the social graph representing a user, page, or group */
export interface GraphNode {
  id: string;
  type: NodeType;
  metadata: NodeMetadata;
  createdAt: number;
}

/** Metadata associated with a graph node */
export interface NodeMetadata {
  displayName: string;
  verified: boolean;
  activeStatus: 'online' | 'offline' | 'idle';
  profileScore: number;
  tags: string[];
  region: string;
  language: string;
}

// ---------------------------------------------------------------------------
// Edge Types
// ---------------------------------------------------------------------------

/** Type of relationship between nodes */
export type EdgeType = 'follow' | 'friend' | 'block' | 'mute' | 'restrict';

/** An edge in the social graph representing a relationship */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  metadata: EdgeMetadata;
  createdAt: number;
  updatedAt: number;
}

/** Metadata associated with a graph edge */
export interface EdgeMetadata {
  interactionCount: number;
  lastInteraction: number;
  mutualConnections: number;
  source: 'organic' | 'suggested' | 'imported';
}

// ---------------------------------------------------------------------------
// Relationship & Influence Types
// ---------------------------------------------------------------------------

/** Factors contributing to relationship strength */
export interface StrengthFactors {
  frequency: number;
  recency: number;
  type: number;
  mutuality: number;
  duration: number;
}

/** Calculated relationship strength between two nodes */
export interface RelationshipStrength {
  sourceId: string;
  targetId: string;
  score: number;
  factors: StrengthFactors;
  calculatedAt: number;
}

/** Components contributing to influence score */
export interface InfluenceComponents {
  followerWeight: number;
  engagementWeight: number;
  contentQuality: number;
  networkCentrality: number;
  activityConsistency: number;
}

/** Influence score for a node */
export interface InfluenceScore {
  nodeId: string;
  score: number;
  rank: number;
  components: InfluenceComponents;
  percentile: number;
  calculatedAt: number;
}

// ---------------------------------------------------------------------------
// Community Types
// ---------------------------------------------------------------------------

/** A detected community within the social graph */
export interface Community {
  id: string;
  label: string;
  members: string[];
  density: number;
  modularity: number;
  cohesion: number;
  createdAt: number;
}

/** Type of social circle */
export type SocialCircleType = 'close_friends' | 'acquaintances' | 'professional' | 'family' | 'interests';

/** A social circle classification */
export interface SocialCircle {
  type: SocialCircleType;
  members: string[];
  avgStrength: number;
  interactionFrequency: number;
  lastActivity: number;
}

// ---------------------------------------------------------------------------
// Path & Traversal Types
// ---------------------------------------------------------------------------

/** Result of a path search between two nodes */
export interface PathResult {
  path: string[];
  distance: number;
  exists: boolean;
  searchDepth: number;
  nodesExplored: number;
}

/** Result of mutual connections query */
export interface MutualConnectionsResult {
  connections: string[];
  count: number;
  strongConnections: string[];
}

/** Friend suggestion with scoring */
export interface FriendSuggestion {
  nodeId: string;
  mutualCount: number;
  score: number;
  reason: string;
  commonCommunities: string[];
}

// ---------------------------------------------------------------------------
// Pagination Types
// ---------------------------------------------------------------------------

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  cursor: string | null;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/** Type of graph event */
export type GraphEventType = 'follow' | 'unfollow' | 'block' | 'unblock' | 'mute' | 'unmute' | 'friend_request' | 'friend_accept' | 'friend_remove';

/** An event that occurred in the social graph */
export interface GraphEvent {
  id: string;
  type: GraphEventType;
  sourceNode: string;
  targetNode: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Growth & Trending Types
// ---------------------------------------------------------------------------

/** Network growth metrics for a time period */
export interface NetworkGrowthMetrics {
  nodeId: string;
  date: number;
  followers: number;
  following: number;
  ratio: number;
  velocity: number;
  acceleration: number;
  projectedGrowth: number;
}

/** A trending account based on growth patterns */
export interface TrendingAccount {
  nodeId: string;
  growthRate: number;
  engagementSpike: number;
  score: number;
  trendStarted: number;
  currentFollowers: number;
  previousFollowers: number;
}

// ---------------------------------------------------------------------------
// Configuration Types
// ---------------------------------------------------------------------------

/** Configuration for PageRank algorithm */
export interface PageRankConfig {
  dampingFactor: number;
  maxIterations: number;
  convergenceThreshold: number;
  personalizationVector: Map<string, number> | null;
}

/** Configuration for community detection */
export interface CommunityDetectionConfig {
  maxIterations: number;
  minCommunitySize: number;
  resolutionParameter: number;
  randomSeed: number;
}

/** Configuration for relationship strength calculation */
export interface StrengthConfig {
  frequencyWeight: number;
  recencyWeight: number;
  typeWeight: number;
  mutualityWeight: number;
  durationWeight: number;
  recencyDecayFactor: number;
}

/** Graph traversal options */
export interface TraversalOptions {
  maxDepth: number;
  excludeBlocked: boolean;
  excludeMuted: boolean;
  edgeTypes: EdgeType[];
  maxResults: number;
}

// ---------------------------------------------------------------------------
// Store Types
// ---------------------------------------------------------------------------

/** Graph statistics */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  maxInDegree: number;
  maxOutDegree: number;
  density: number;
  connectedComponents: number;
}

/** Batch operation result */
export interface BatchResult {
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

/** Event listener type */
export type GraphEventListener = (event: GraphEvent) => void;
