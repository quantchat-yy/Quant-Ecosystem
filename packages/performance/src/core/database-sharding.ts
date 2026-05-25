// ============================================================================
// Performance Package - Database Sharding
// Consistent hashing ring with virtual nodes, shard routing, cross-shard
// scatter-gather, rebalancing, hot shard detection, read replica routing
// ============================================================================

import type { ShardConfig, HashRing, ShardRouting } from '../types';

/** Physical node in the cluster */
interface PhysicalNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  isActive: boolean;
  joinedAt: number;
  dataSize: number;
  requestCount: number;
}

/** Virtual node on the hash ring */
interface VirtualNode {
  hash: number;
  physicalNodeId: string;
  virtualIndex: number;
}

/** Read replica configuration */
interface ReadReplica {
  id: string;
  primaryNodeId: string;
  host: string;
  port: number;
  replicationLag: number;
  load: number;
  isHealthy: boolean;
}

/** Cross-shard query result */
interface ScatterGatherResult<T = unknown> {
  results: Array<{ shardId: string; data: T[]; latencyMs: number }>;
  totalResults: number;
  failedShards: string[];
  executionTimeMs: number;
}

/** Rebalancing plan */
interface RebalancePlan {
  id: string;
  movements: Array<{
    key: string;
    fromNode: string;
    toNode: string;
  }>;
  estimatedDataMoved: number;
  affectedKeys: number;
  createdAt: number;
}

/** Shard split/merge plan */
interface ShardPlanAction {
  type: 'split' | 'merge';
  shardId: string;
  targetShardIds?: string[];
  reason: string;
  estimatedImpact: number;
}

/**
 * DatabaseSharding implements consistent hashing with virtual nodes for
 * data distribution, cross-shard query coordination via scatter-gather,
 * hot shard detection using entropy analysis, and automatic rebalancing.
 */
export class DatabaseSharding {
  private readonly physicalNodes: Map<string, PhysicalNode>;
  private readonly virtualNodes: VirtualNode[];
  private readonly replicas: Map<string, ReadReplica[]>;
  private readonly config: ShardConfig;
  private readonly requestHistory: Map<string, number[]>;
  private readonly dataAssignment: Map<string, string>;
  private readonly virtualNodesPerPhysical: number;

  constructor(config: ShardConfig) {
    this.config = config;
    this.physicalNodes = new Map();
    this.virtualNodes = [];
    this.replicas = new Map();
    this.requestHistory = new Map();
    this.dataAssignment = new Map();
    this.virtualNodesPerPhysical = config.virtualNodesPerPhysical ?? 150;
  }

  /**
   * MurmurHash3 simulation - 32-bit hash function for consistent hashing.
   * Uses mixing and finalizer steps similar to MurmurHash3.
   */
  private murmurhash(key: string, seed: number = 0): number {
    let h = seed ^ key.length;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;

    for (let i = 0; i < key.length; i++) {
      let k = key.charCodeAt(i);
      k = Math.imul(k, c1);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, c2);

      h ^= k;
      h = (h << 13) | (h >>> 19);
      h = Math.imul(h, 5) + 0xe6546b64;
    }

    // Finalization mix
    h ^= key.length;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;

    return h >>> 0; // Convert to unsigned 32-bit
  }

  /**
   * Add a physical node to the cluster, creating virtual nodes on the ring
   */
  addNode(id: string, host: string, port: number, weight: number = 1): void {
    const node: PhysicalNode = {
      id,
      host,
      port,
      weight,
      isActive: true,
      joinedAt: Date.now(),
      dataSize: 0,
      requestCount: 0,
    };
    this.physicalNodes.set(id, node);

    // Create virtual nodes on the ring
    const numVirtual = Math.floor(this.virtualNodesPerPhysical * weight);
    for (let i = 0; i < numVirtual; i++) {
      const hash = this.murmurhash(`${id}:${i}`);
      this.virtualNodes.push({ hash, physicalNodeId: id, virtualIndex: i });
    }

    // Sort virtual nodes by hash for binary search
    this.virtualNodes.sort((a, b) => a.hash - b.hash);
  }

  /**
   * Remove a physical node and its virtual nodes from the ring
   */
  removeNode(nodeId: string): boolean {
    if (!this.physicalNodes.has(nodeId)) return false;
    this.physicalNodes.delete(nodeId);

    // Remove virtual nodes
    let i = this.virtualNodes.length;
    while (i--) {
      if (this.virtualNodes[i]!.physicalNodeId === nodeId) {
        this.virtualNodes.splice(i, 1);
      }
    }

    return true;
  }

  /**
   * Extract shard key from a data object using the configured key path
   */
  extractShardKey(data: Record<string, unknown>, keyPath: string): string {
    const parts = keyPath.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }
    return String(current ?? '');
  }

  /**
   * Route a key to the appropriate physical node using consistent hashing.
   * Uses binary search on the sorted virtual node ring.
   */
  routeKey(key: string): ShardRouting {
    if (this.virtualNodes.length === 0) {
      return { key, hash: 0, nodeId: '', virtualNodeIndex: -1 };
    }

    const hash = this.murmurhash(key);

    // Binary search for the first virtual node with hash >= key hash
    let left = 0;
    let right = this.virtualNodes.length - 1;
    let targetIndex = 0;

    if (hash > this.virtualNodes[right]!.hash) {
      // Wrap around to first node
      targetIndex = 0;
    } else {
      while (left < right) {
        const mid = (left + right) >>> 1;
        if (this.virtualNodes[mid]!.hash < hash) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }
      targetIndex = left;
    }

    const vNode = this.virtualNodes[targetIndex]!;

    // Track request for hot shard detection
    this.trackRequest(vNode.physicalNodeId);

    return {
      key,
      hash,
      nodeId: vNode.physicalNodeId,
      virtualNodeIndex: targetIndex,
    };
  }

  /**
   * Execute a cross-shard query using scatter-gather pattern.
   * Sends query to all shards in parallel and merges results.
   */
  scatterGather<T>(
    queryFn: (nodeId: string) => { data: T[]; latencyMs: number },
    _mergeFn?: (results: T[][]) => T[],
  ): ScatterGatherResult<T> {
    const startTime = Date.now();
    const results: Array<{ shardId: string; data: T[]; latencyMs: number }> = [];
    const failedShards: string[] = [];

    // Scatter: query all active nodes in parallel (simulated)
    for (const [nodeId, node] of this.physicalNodes) {
      if (!node.isActive) {
        failedShards.push(nodeId);
        continue;
      }

      try {
        const result = queryFn(nodeId);
        results.push({ shardId: nodeId, data: result.data, latencyMs: result.latencyMs });
      } catch {
        failedShards.push(nodeId);
      }
    }

    // Gather: merge results
    const totalResults = results.reduce((sum, r) => sum + r.data.length, 0);

    return {
      results,
      totalResults,
      failedShards,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Calculate rebalancing plan when nodes join or leave.
   * Minimizes data movement by only reassigning keys that map to changed positions.
   */
  calculateRebalancePlan(addedNodeId?: string, removedNodeId?: string): RebalancePlan {
    const movements: Array<{ key: string; fromNode: string; toNode: string }> = [];

    for (const [key, currentNode] of this.dataAssignment) {
      const newRouting = this.routeKey(key);

      if (newRouting.nodeId !== currentNode) {
        // This key needs to move
        if (removedNodeId && currentNode === removedNodeId) {
          movements.push({ key, fromNode: currentNode, toNode: newRouting.nodeId });
        } else if (addedNodeId && newRouting.nodeId === addedNodeId) {
          movements.push({ key, fromNode: currentNode, toNode: newRouting.nodeId });
        }
      }
    }

    return {
      id: `rebalance_${Date.now()}`,
      movements,
      estimatedDataMoved: movements.length * 1024, // Estimated bytes
      affectedKeys: movements.length,
      createdAt: Date.now(),
    };
  }

  /**
   * Assign a key to a node (for tracking rebalance needs)
   */
  assignKey(key: string): string {
    const routing = this.routeKey(key);
    this.dataAssignment.set(key, routing.nodeId);
    return routing.nodeId;
  }

  /**
   * Detect hot shards using request distribution entropy.
   * H = -sum(p_i * log(p_i))
   * Lower entropy indicates uneven distribution (hot shards).
   */
  detectHotShards(): Array<{ nodeId: string; requestShare: number; isHot: boolean }> {
    const now = Date.now();
    const windowMs = this.config.hotShardWindowMs ?? 60000;
    const totalRequests = new Map<string, number>();
    let grandTotal = 0;

    for (const [nodeId] of this.physicalNodes) {
      const history = this.requestHistory.get(nodeId) ?? [];
      const recentCount = history.filter((t) => now - t < windowMs).length;
      totalRequests.set(nodeId, recentCount);
      grandTotal += recentCount;
    }

    if (grandTotal === 0) {
      return Array.from(this.physicalNodes.keys()).map((nodeId) => ({
        nodeId,
        requestShare: 0,
        isHot: false,
      }));
    }

    // Calculate entropy
    let entropy = 0;
    const nodeCount = this.physicalNodes.size;
    const probabilities: Map<string, number> = new Map();

    for (const [nodeId, count] of totalRequests) {
      const p = count / grandTotal;
      probabilities.set(nodeId, p);
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    // A node is "hot" if it has > 2x its fair share
    const fairShare = 1 / nodeCount;
    const hotThreshold = fairShare * this.config.hotShardMultiplier;

    return Array.from(this.physicalNodes.keys()).map((nodeId) => {
      const share = probabilities.get(nodeId) ?? 0;
      return {
        nodeId,
        requestShare: share,
        isHot: share > hotThreshold,
      };
    });
  }

  /**
   * Get the current entropy of request distribution.
   * Lower values indicate more skewed (problematic) distribution.
   */
  getRequestEntropy(): number {
    const now = Date.now();
    const windowMs = this.config.hotShardWindowMs ?? 60000;
    let grandTotal = 0;
    const counts: number[] = [];

    for (const [nodeId] of this.physicalNodes) {
      const history = this.requestHistory.get(nodeId) ?? [];
      const count = history.filter((t) => now - t < windowMs).length;
      counts.push(count);
      grandTotal += count;
    }

    if (grandTotal === 0) return 0;

    let entropy = 0;
    for (const count of counts) {
      const p = count / grandTotal;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Add a read replica for a physical node
   */
  addReadReplica(replica: ReadReplica): void {
    const existing = this.replicas.get(replica.primaryNodeId) ?? [];
    existing.push(replica);
    this.replicas.set(replica.primaryNodeId, existing);
  }

  /**
   * Route a read request to a replica using weighted load-based selection.
   * Lower load replicas get higher probability of selection.
   */
  routeReadToReplica(primaryNodeId: string): ReadReplica | null {
    const nodeReplicas = this.replicas.get(primaryNodeId);
    if (!nodeReplicas || nodeReplicas.length === 0) return null;

    const healthyReplicas = nodeReplicas.filter((r) => r.isHealthy);
    if (healthyReplicas.length === 0) return null;

    // Weighted selection: weight = 1 / (load + 0.1) to avoid division by zero
    const weights = healthyReplicas.map((r) => 1 / (r.load + 0.1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < healthyReplicas.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return healthyReplicas[i] ?? null;
      }
    }

    return healthyReplicas[healthyReplicas.length - 1] ?? null;
  }

  /**
   * Plan shard split or merge based on size thresholds
   */
  planShardActions(): ShardPlanAction[] {
    const actions: ShardPlanAction[] = [];

    for (const [nodeId, node] of this.physicalNodes) {
      if (node.dataSize > this.config.maxShardSize) {
        actions.push({
          type: 'split',
          shardId: nodeId,
          targetShardIds: [`${nodeId}_a`, `${nodeId}_b`],
          reason: `Data size ${node.dataSize} exceeds max ${this.config.maxShardSize}`,
          estimatedImpact: node.dataSize / 2,
        });
      } else if (node.dataSize < this.config.minShardSize && this.physicalNodes.size > 1) {
        actions.push({
          type: 'merge',
          shardId: nodeId,
          reason: `Data size ${node.dataSize} below min ${this.config.minShardSize}`,
          estimatedImpact: node.dataSize,
        });
      }
    }

    return actions;
  }

  /**
   * Get the hash ring state for visualization/debugging
   */
  getHashRing(): HashRing {
    return {
      virtualNodes: this.virtualNodes.map((vn) => ({
        hash: vn.hash,
        physicalNodeId: vn.physicalNodeId,
      })),
      physicalNodeCount: this.physicalNodes.size,
      virtualNodeCount: this.virtualNodes.length,
      virtualNodesPerPhysical: this.virtualNodesPerPhysical,
    };
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.physicalNodes.size;
  }

  /**
   * Track a request to a node for hot shard detection
   */
  private trackRequest(nodeId: string): void {
    const history = this.requestHistory.get(nodeId) ?? [];
    history.push(Date.now());

    // Keep only recent history
    const windowMs = this.config.hotShardWindowMs ?? 60000;
    const cutoff = Date.now() - windowMs * 2;
    const trimmed = history.filter((t) => t > cutoff);
    this.requestHistory.set(nodeId, trimmed);

    const node = this.physicalNodes.get(nodeId);
    if (node) {
      node.requestCount++;
    }
  }
}
