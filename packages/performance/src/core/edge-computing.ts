// ============================================================================
// Performance Package - Edge Computing
// Edge node registry, geographic routing (haversine), edge function deployment,
// geographic-aware cache invalidation, stale-while-revalidate, request coalescing
// ============================================================================

import type { EdgeNode, EdgeConfig } from '../types';

/** Edge function deployment record */
interface EdgeFunction {
  id: string;
  name: string;
  code: string;
  deployedNodes: string[];
  deployedAt: number;
  coldStartMs: number;
  invocationCount: number;
  lastInvokedAt: number;
}

/** Edge cache entry */
interface EdgeCacheEntry {
  key: string;
  value: unknown;
  createdAt: number;
  ttlMs: number;
  staleWhileRevalidateMs: number;
  isRevalidating: boolean;
  nodeId: string;
  tags: string[];
}

/** Coalesced request tracking */
interface CoalescedRequest {
  key: string;
  promise: Promise<unknown>;
  subscriberCount: number;
  startedAt: number;
}

/** Invalidation propagation record */
interface InvalidationPropagation {
  id: string;
  key: string;
  originNodeId: string;
  targetNodes: string[];
  propagatedTo: Set<string>;
  initiatedAt: number;
  completedAt: number | null;
}

/** Health check result */
interface HealthStatus {
  nodeId: string;
  healthy: boolean;
  latencyMs: number;
  lastCheckedAt: number;
  consecutiveFailures: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * EdgeComputing manages a network of geographically distributed edge nodes,
 * providing request routing via haversine distance, edge function deployment
 * with cold start tracking, geographic-aware cache invalidation, and
 * request coalescing for thundering herd prevention.
 */
export class EdgeComputing {
  private readonly nodes: Map<string, EdgeNode>;
  private readonly functions: Map<string, EdgeFunction>;
  private readonly cache: Map<string, EdgeCacheEntry>;
  private readonly coalescedRequests: Map<string, CoalescedRequest>;
  private readonly propagations: Map<string, InvalidationPropagation>;
  private readonly healthStatuses: Map<string, HealthStatus>;
  private readonly config: EdgeConfig;
  private readonly earthRadiusKm: number = 6371;
  private propagationCounter: number;

  constructor(config: EdgeConfig) {
    this.config = config;
    this.nodes = new Map();
    this.functions = new Map();
    this.cache = new Map();
    this.coalescedRequests = new Map();
    this.propagations = new Map();
    this.healthStatuses = new Map();
    this.propagationCounter = 0;
  }

  /**
   * Register a new edge node in the network
   */
  registerNode(node: EdgeNode): void {
    this.nodes.set(node.id, { ...node });
    this.healthStatuses.set(node.id, {
      nodeId: node.id,
      healthy: true,
      latencyMs: 0,
      lastCheckedAt: Date.now(),
      consecutiveFailures: 0,
      cpuUsage: 0,
      memoryUsage: 0,
    });
  }

  /**
   * Remove an edge node from the network
   */
  deregisterNode(nodeId: string): boolean {
    const removed = this.nodes.delete(nodeId);
    this.healthStatuses.delete(nodeId);
    return removed;
  }

  /**
   * Calculate haversine distance between two geographic points in km.
   * Formula: d = 2R * arcsin(sqrt(sin^2((lat2-lat1)/2) + cos(lat1)*cos(lat2)*sin^2((lng2-lng1)/2)))
   */
  calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);

    const sinDLatHalf = Math.sin(dLat / 2);
    const sinDLngHalf = Math.sin(dLng / 2);

    const a =
      sinDLatHalf * sinDLatHalf + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLngHalf * sinDLngHalf;

    const c = 2 * Math.asin(Math.sqrt(a));

    return this.earthRadiusKm * c;
  }

  /**
   * Route a request to the nearest healthy edge node based on geographic distance
   */
  routeRequest(clientLat: number, clientLng: number): EdgeNode | null {
    let nearestNode: EdgeNode | null = null;
    let minDistance = Infinity;

    for (const [nodeId, node] of this.nodes) {
      const health = this.healthStatuses.get(nodeId);
      if (!health || !health.healthy) continue;
      if (!node.isActive) continue;

      const distance = this.calculateHaversineDistance(
        clientLat,
        clientLng,
        node.latitude,
        node.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  /**
   * Get the N nearest healthy nodes for a given location
   */
  getNearestNodes(clientLat: number, clientLng: number, count: number): EdgeNode[] {
    const distances: Array<{ node: EdgeNode; distance: number }> = [];

    for (const [nodeId, node] of this.nodes) {
      const health = this.healthStatuses.get(nodeId);
      if (!health || !health.healthy) continue;
      if (!node.isActive) continue;

      const distance = this.calculateHaversineDistance(
        clientLat,
        clientLng,
        node.latitude,
        node.longitude,
      );
      distances.push({ node, distance });
    }

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map((d) => d.node);
  }

  /**
   * Deploy an edge function to specified nodes with cold start tracking
   */
  deployFunction(id: string, name: string, code: string, targetNodeIds: string[]): EdgeFunction {
    const validNodes = targetNodeIds.filter((nid) => this.nodes.has(nid));

    const edgeFunction: EdgeFunction = {
      id,
      name,
      code,
      deployedNodes: validNodes,
      deployedAt: Date.now(),
      coldStartMs: this.config.defaultColdStartMs,
      invocationCount: 0,
      lastInvokedAt: 0,
    };

    this.functions.set(id, edgeFunction);
    return edgeFunction;
  }

  /**
   * Invoke an edge function, tracking cold start time
   */
  invokeFunction(
    functionId: string,
    nodeId: string,
  ): { result: string; coldStart: boolean; latencyMs: number } | null {
    const fn = this.functions.get(functionId);
    if (!fn) return null;
    if (!fn.deployedNodes.includes(nodeId)) return null;

    const now = Date.now();
    const timeSinceLastInvocation = now - fn.lastInvokedAt;
    const isColdStart = timeSinceLastInvocation > this.config.warmInstanceTtlMs;

    const latencyMs = isColdStart ? fn.coldStartMs + Math.random() * 10 : 1 + Math.random() * 5;

    fn.invocationCount++;
    fn.lastInvokedAt = now;

    return {
      result: `executed:${fn.name}`,
      coldStart: isColdStart,
      latencyMs,
    };
  }

  /**
   * Set a value in the edge cache with stale-while-revalidate support
   */
  cacheSet(
    key: string,
    value: unknown,
    nodeId: string,
    options: { ttlMs?: number; staleWhileRevalidateMs?: number; tags?: string[] } = {},
  ): void {
    const entry: EdgeCacheEntry = {
      key,
      value,
      createdAt: Date.now(),
      ttlMs: options.ttlMs ?? this.config.defaultCacheTtlMs,
      staleWhileRevalidateMs: options.staleWhileRevalidateMs ?? this.config.staleWhileRevalidateMs,
      isRevalidating: false,
      nodeId,
      tags: options.tags ?? [],
    };
    this.cache.set(`${nodeId}:${key}`, entry);
  }

  /**
   * Get a value from edge cache implementing stale-while-revalidate pattern.
   * Returns the cached value even if stale, and marks for async revalidation.
   */
  cacheGet(key: string, nodeId: string): { value: unknown; status: 'fresh' | 'stale' | 'miss' } {
    const cacheKey = `${nodeId}:${key}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return { value: null, status: 'miss' };
    }

    const now = Date.now();
    const age = now - entry.createdAt;

    if (age <= entry.ttlMs) {
      return { value: entry.value, status: 'fresh' };
    }

    if (age <= entry.ttlMs + entry.staleWhileRevalidateMs) {
      // Serve stale, mark for async revalidation
      if (!entry.isRevalidating) {
        entry.isRevalidating = true;
        // In a real system, this would trigger async refresh
        this.scheduleRevalidation(cacheKey);
      }
      return { value: entry.value, status: 'stale' };
    }

    // Expired beyond stale window
    this.cache.delete(cacheKey);
    return { value: null, status: 'miss' };
  }

  /**
   * Coalesce multiple concurrent requests for the same resource into a single
   * origin fetch, preventing thundering herd on cache miss.
   */
  coalesceRequest(key: string, fetchFn: () => Promise<unknown>): Promise<unknown> {
    const existing = this.coalescedRequests.get(key);
    if (existing) {
      existing.subscriberCount++;
      return existing.promise;
    }

    const promise = fetchFn().finally(() => {
      this.coalescedRequests.delete(key);
    });

    this.coalescedRequests.set(key, {
      key,
      promise,
      subscriberCount: 1,
      startedAt: Date.now(),
    });

    return promise;
  }

  /**
   * Get the number of subscribers for a coalesced request
   */
  getCoalescedSubscriberCount(key: string): number {
    return this.coalescedRequests.get(key)?.subscriberCount ?? 0;
  }

  /**
   * Propagate cache invalidation geographically, notifying nearest nodes first
   */
  propagateInvalidation(key: string, originNodeId: string): InvalidationPropagation {
    const originNode = this.nodes.get(originNodeId);
    if (!originNode) {
      throw new Error(`Origin node ${originNodeId} not found`);
    }

    // Get all other nodes sorted by distance from origin (nearest first)
    const otherNodes: Array<{ nodeId: string; distance: number }> = [];
    for (const [nodeId, node] of this.nodes) {
      if (nodeId === originNodeId) continue;
      const distance = this.calculateHaversineDistance(
        originNode.latitude,
        originNode.longitude,
        node.latitude,
        node.longitude,
      );
      otherNodes.push({ nodeId, distance });
    }
    otherNodes.sort((a, b) => a.distance - b.distance);

    const propagation: InvalidationPropagation = {
      id: `prop_${++this.propagationCounter}`,
      key,
      originNodeId,
      targetNodes: otherNodes.map((n) => n.nodeId),
      propagatedTo: new Set(),
      initiatedAt: Date.now(),
      completedAt: null,
    };

    // Invalidate local cache immediately
    this.cache.delete(`${originNodeId}:${key}`);

    // Simulate propagation to nearest nodes first
    for (const { nodeId } of otherNodes) {
      this.cache.delete(`${nodeId}:${key}`);
      propagation.propagatedTo.add(nodeId);
    }

    propagation.completedAt = Date.now();
    this.propagations.set(propagation.id, propagation);
    return propagation;
  }

  /**
   * Update health status for a node
   */
  updateHealthStatus(
    nodeId: string,
    healthy: boolean,
    latencyMs: number,
    cpuUsage: number,
    memoryUsage: number,
  ): void {
    const status = this.healthStatuses.get(nodeId);
    if (!status) return;

    status.healthy = healthy;
    status.latencyMs = latencyMs;
    status.lastCheckedAt = Date.now();
    status.cpuUsage = cpuUsage;
    status.memoryUsage = memoryUsage;

    if (!healthy) {
      status.consecutiveFailures++;
    } else {
      status.consecutiveFailures = 0;
    }

    // Auto-failover: mark node inactive if too many failures
    if (status.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.isActive = false;
      }
    }
  }

  /**
   * Perform automatic failover - reroute traffic from unhealthy nodes
   */
  performFailover(failedNodeId: string): EdgeNode | null {
    const failedNode = this.nodes.get(failedNodeId);
    if (!failedNode) return null;

    // Find nearest healthy node to take over
    const replacement = this.routeRequest(failedNode.latitude, failedNode.longitude);
    if (!replacement || replacement.id === failedNodeId) {
      // Try to find any healthy node
      for (const [nodeId, node] of this.nodes) {
        if (nodeId === failedNodeId) continue;
        const health = this.healthStatuses.get(nodeId);
        if (health?.healthy && node.isActive) return node;
      }
      return null;
    }

    return replacement;
  }

  /**
   * Get all registered nodes
   */
  getNodes(): EdgeNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get health status for all nodes
   */
  getHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * Get cache statistics for a node
   */
  getNodeCacheStats(nodeId: string): { entries: number; totalSize: number } {
    let entries = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(`${nodeId}:`)) {
        entries++;
      }
    }
    return { entries, totalSize: entries * 1024 }; // estimated
  }

  /**
   * Get deployed functions count
   */
  getFunctionCount(): number {
    return this.functions.size;
  }

  /**
   * Schedule async revalidation of a stale cache entry
   */
  private scheduleRevalidation(cacheKey: string): void {
    // In production, this triggers an async background fetch
    // Here we simulate by marking the entry for refresh
    const entry = this.cache.get(cacheKey);
    if (entry) {
      // After revalidation, reset the entry
      setTimeout(() => {
        const current = this.cache.get(cacheKey);
        if (current) {
          current.isRevalidating = false;
          current.createdAt = Date.now();
        }
      }, 0);
    }
  }
}
