// ============================================================================
// Social Graph Package - Graph Store
// ============================================================================
// Core graph data structure using adjacency lists with O(1) lookups.
// Supports privacy-aware traversal, edge filtering, and bulk operations.
// ============================================================================

import {
  GraphNode,
  GraphEdge,
  EdgeType,
  NodeType,
  GraphStats,
  BatchResult,
  GraphEvent,
  GraphEventListener,
  TraversalOptions,
  NodeMetadata,
  EdgeMetadata,
} from '../types';

// ---------------------------------------------------------------------------
// Graph Store Implementation
// ---------------------------------------------------------------------------

export class GraphStore {
  /** Map of node ID to GraphNode */
  private nodes: Map<string, GraphNode> = new Map();

  /** Outgoing adjacency list: source -> Set of target IDs */
  private outgoing: Map<string, Set<string>> = new Map();

  /** Incoming adjacency list: target -> Set of source IDs */
  private incoming: Map<string, Set<string>> = new Map();

  /** Edge storage: edgeKey -> GraphEdge */
  private edges: Map<string, GraphEdge> = new Map();

  /** Edge type index: edgeType -> Set of edge keys */
  private edgeTypeIndex: Map<EdgeType, Set<string>> = new Map();

  /** Blocked relationships: nodeId -> Set of blocked node IDs */
  private blockedIndex: Map<string, Set<string>> = new Map();

  /** Muted relationships: nodeId -> Set of muted node IDs */
  private mutedIndex: Map<string, Set<string>> = new Map();

  /** Event listeners */
  private eventListeners: GraphEventListener[] = [];

  /** Edge counter for generating unique IDs */
  private edgeIdCounter: number = 0;

  constructor() {
    const edgeTypes: EdgeType[] = ['follow', 'friend', 'block', 'mute', 'restrict'];
    for (const type of edgeTypes) {
      this.edgeTypeIndex.set(type, new Set());
    }
  }

  // -------------------------------------------------------------------------
  // Node Operations
  // -------------------------------------------------------------------------

  /** Add a node to the graph */
  addNode(id: string, type: NodeType, metadata: Partial<NodeMetadata> = {}): GraphNode {
    if (this.nodes.has(id)) {
      return this.nodes.get(id)!;
    }

    const node: GraphNode = {
      id,
      type,
      metadata: {
        displayName: metadata.displayName || id,
        verified: metadata.verified || false,
        activeStatus: metadata.activeStatus || 'offline',
        profileScore: metadata.profileScore || 0,
        tags: metadata.tags || [],
        region: metadata.region || 'unknown',
        language: metadata.language || 'en',
      },
      createdAt: Date.now(),
    };

    this.nodes.set(id, node);
    this.outgoing.set(id, new Set());
    this.incoming.set(id, new Set());
    this.blockedIndex.set(id, new Set());
    this.mutedIndex.set(id, new Set());

    return node;
  }

  /** Remove a node and all its associated edges */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove all outgoing edges
    const outNeighbors = this.outgoing.get(id);
    if (outNeighbors) {
      for (const target of outNeighbors) {
        const edgeKey = this.buildEdgeKey(id, target);
        const edge = this.edges.get(edgeKey);
        if (edge) {
          this.edgeTypeIndex.get(edge.type)?.delete(edgeKey);
          this.edges.delete(edgeKey);
        }
        this.incoming.get(target)?.delete(id);
      }
    }

    // Remove all incoming edges
    const inNeighbors = this.incoming.get(id);
    if (inNeighbors) {
      for (const source of inNeighbors) {
        const edgeKey = this.buildEdgeKey(source, id);
        const edge = this.edges.get(edgeKey);
        if (edge) {
          this.edgeTypeIndex.get(edge.type)?.delete(edgeKey);
          this.edges.delete(edgeKey);
        }
        this.outgoing.get(source)?.delete(id);
      }
    }

    // Clean up node data
    this.nodes.delete(id);
    this.outgoing.delete(id);
    this.incoming.delete(id);
    this.blockedIndex.delete(id);
    this.mutedIndex.delete(id);

    return true;
  }

  /** Get a node by ID */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /** Check if a node exists */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /** Get all node IDs */
  getAllNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /** Get nodes by type */
  getNodesByType(type: NodeType): GraphNode[] {
    const result: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.type === type) {
        result.push(node);
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Edge Operations
  // -------------------------------------------------------------------------

  /** Add an edge between two nodes */
  addEdge(
    source: string,
    target: string,
    type: EdgeType,
    weight: number = 1.0,
    metadata: Partial<EdgeMetadata> = {}
  ): GraphEdge | null {
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      return null;
    }

    if (source === target) {
      return null;
    }

    const edgeKey = this.buildEdgeKey(source, target);

    // If edge already exists, update it
    if (this.edges.has(edgeKey)) {
      const existing = this.edges.get(edgeKey)!;
      existing.type = type;
      existing.weight = weight;
      existing.updatedAt = Date.now();
      return existing;
    }

    const edge: GraphEdge = {
      id: `edge_${++this.edgeIdCounter}`,
      source,
      target,
      type,
      weight,
      metadata: {
        interactionCount: metadata.interactionCount || 0,
        lastInteraction: metadata.lastInteraction || Date.now(),
        mutualConnections: metadata.mutualConnections || 0,
        source: metadata.source || 'organic',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.edges.set(edgeKey, edge);
    this.outgoing.get(source)!.add(target);
    this.incoming.get(target)!.add(source);
    this.edgeTypeIndex.get(type)!.add(edgeKey);

    // Update privacy indexes
    if (type === 'block') {
      this.blockedIndex.get(source)!.add(target);
    } else if (type === 'mute') {
      this.mutedIndex.get(source)!.add(target);
    }

    return edge;
  }

  /** Remove an edge between two nodes */
  removeEdge(source: string, target: string): boolean {
    const edgeKey = this.buildEdgeKey(source, target);
    const edge = this.edges.get(edgeKey);

    if (!edge) {
      return false;
    }

    this.edges.delete(edgeKey);
    this.outgoing.get(source)?.delete(target);
    this.incoming.get(target)?.delete(source);
    this.edgeTypeIndex.get(edge.type)?.delete(edgeKey);

    // Update privacy indexes
    if (edge.type === 'block') {
      this.blockedIndex.get(source)?.delete(target);
    } else if (edge.type === 'mute') {
      this.mutedIndex.get(source)?.delete(target);
    }

    return true;
  }

  /** Check if an edge exists between two nodes */
  hasEdge(source: string, target: string): boolean {
    return this.edges.has(this.buildEdgeKey(source, target));
  }

  /** Get edge data between two nodes */
  getEdge(source: string, target: string): GraphEdge | undefined {
    return this.edges.get(this.buildEdgeKey(source, target));
  }

  /** Get all edges of a specific type */
  getEdgesByType(type: EdgeType): GraphEdge[] {
    const edgeKeys = this.edgeTypeIndex.get(type);
    if (!edgeKeys) return [];

    const result: GraphEdge[] = [];
    for (const key of edgeKeys) {
      const edge = this.edges.get(key);
      if (edge) result.push(edge);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Neighbor Queries (Privacy-Aware)
  // -------------------------------------------------------------------------

  /** Get outgoing neighbors with privacy filtering */
  getOutNeighbors(nodeId: string, options?: Partial<TraversalOptions>): string[] {
    const neighbors = this.outgoing.get(nodeId);
    if (!neighbors) return [];

    const opts: TraversalOptions = {
      maxDepth: options?.maxDepth || 1,
      excludeBlocked: options?.excludeBlocked !== false,
      excludeMuted: options?.excludeMuted || false,
      edgeTypes: options?.edgeTypes || [],
      maxResults: options?.maxResults || Infinity,
    };

    let result: string[] = [];
    const blocked = this.blockedIndex.get(nodeId) || new Set();
    const muted = this.mutedIndex.get(nodeId) || new Set();

    for (const neighbor of neighbors) {
      if (opts.excludeBlocked && blocked.has(neighbor)) continue;
      if (opts.excludeMuted && muted.has(neighbor)) continue;

      if (opts.edgeTypes.length > 0) {
        const edge = this.getEdge(nodeId, neighbor);
        if (edge && !opts.edgeTypes.includes(edge.type)) continue;
      }

      result.push(neighbor);
      if (result.length >= opts.maxResults) break;
    }

    return result;
  }

  /** Get incoming neighbors with privacy filtering */
  getInNeighbors(nodeId: string, options?: Partial<TraversalOptions>): string[] {
    const neighbors = this.incoming.get(nodeId);
    if (!neighbors) return [];

    const opts: TraversalOptions = {
      maxDepth: options?.maxDepth || 1,
      excludeBlocked: options?.excludeBlocked !== false,
      excludeMuted: options?.excludeMuted || false,
      edgeTypes: options?.edgeTypes || [],
      maxResults: options?.maxResults || Infinity,
    };

    let result: string[] = [];
    const blocked = this.blockedIndex.get(nodeId) || new Set();
    const muted = this.mutedIndex.get(nodeId) || new Set();

    for (const neighbor of neighbors) {
      if (opts.excludeBlocked && blocked.has(neighbor)) continue;
      if (opts.excludeMuted && muted.has(neighbor)) continue;

      if (opts.edgeTypes.length > 0) {
        const edge = this.getEdge(neighbor, nodeId);
        if (edge && !opts.edgeTypes.includes(edge.type)) continue;
      }

      result.push(neighbor);
      if (result.length >= opts.maxResults) break;
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Degree Queries
  // -------------------------------------------------------------------------

  /** Get the out-degree (number of outgoing edges) for a node */
  getOutDegree(nodeId: string): number {
    return this.outgoing.get(nodeId)?.size || 0;
  }

  /** Get the in-degree (number of incoming edges) for a node */
  getInDegree(nodeId: string): number {
    return this.incoming.get(nodeId)?.size || 0;
  }

  /** Get total degree (in + out) for a node */
  getTotalDegree(nodeId: string): number {
    return this.getInDegree(nodeId) + this.getOutDegree(nodeId);
  }

  // -------------------------------------------------------------------------
  // Privacy Checks
  // -------------------------------------------------------------------------

  /** Check if source has blocked target */
  isBlocked(source: string, target: string): boolean {
    return this.blockedIndex.get(source)?.has(target) || false;
  }

  /** Check if source has muted target */
  isMuted(source: string, target: string): boolean {
    return this.mutedIndex.get(source)?.has(target) || false;
  }

  /** Check if traversal from source to target is allowed */
  canTraverse(source: string, target: string): boolean {
    if (this.isBlocked(source, target)) return false;
    if (this.isBlocked(target, source)) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Bulk Operations
  // -------------------------------------------------------------------------

  /** Add multiple nodes in batch */
  addNodesBatch(
    nodes: Array<{ id: string; type: NodeType; metadata?: Partial<NodeMetadata> }>
  ): BatchResult {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const nodeData of nodes) {
      try {
        this.addNode(nodeData.id, nodeData.type, nodeData.metadata);
        successful++;
      } catch (err) {
        failed++;
        errors.push({ id: nodeData.id, error: String(err) });
      }
    }

    return { successful, failed, errors, duration: Date.now() - startTime };
  }

  /** Add multiple edges in batch */
  addEdgesBatch(
    edges: Array<{ source: string; target: string; type: EdgeType; weight?: number }>
  ): BatchResult {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const edgeData of edges) {
      const result = this.addEdge(
        edgeData.source,
        edgeData.target,
        edgeData.type,
        edgeData.weight || 1.0
      );
      if (result) {
        successful++;
      } else {
        failed++;
        errors.push({
          id: `${edgeData.source}->${edgeData.target}`,
          error: 'Failed to add edge - nodes may not exist',
        });
      }
    }

    return { successful, failed, errors, duration: Date.now() - startTime };
  }

  // -------------------------------------------------------------------------
  // Graph Statistics
  // -------------------------------------------------------------------------

  /** Get the total number of nodes */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /** Get the total number of edges */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /** Compute comprehensive graph statistics */
  getStats(): GraphStats {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    let maxInDegree = 0;
    let maxOutDegree = 0;
    let totalDegree = 0;

    for (const nodeId of this.nodes.keys()) {
      const inDeg = this.getInDegree(nodeId);
      const outDeg = this.getOutDegree(nodeId);
      maxInDegree = Math.max(maxInDegree, inDeg);
      maxOutDegree = Math.max(maxOutDegree, outDeg);
      totalDegree += inDeg + outDeg;
    }

    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Count connected components using BFS
    const visited = new Set<string>();
    let connectedComponents = 0;

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        connectedComponents++;
        const queue: string[] = [nodeId];
        visited.add(nodeId);

        while (queue.length > 0) {
          const current = queue.shift()!;
          const outNeighbors = this.outgoing.get(current) || new Set();
          const inNeighbors = this.incoming.get(current) || new Set();

          for (const neighbor of outNeighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
          for (const neighbor of inNeighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
      }
    }

    return {
      nodeCount,
      edgeCount,
      avgDegree,
      maxInDegree,
      maxOutDegree,
      density,
      connectedComponents,
    };
  }

  // -------------------------------------------------------------------------
  // Event System
  // -------------------------------------------------------------------------

  /** Register an event listener */
  addEventListener(listener: GraphEventListener): void {
    this.eventListeners.push(listener);
  }

  /** Remove an event listener */
  removeEventListener(listener: GraphEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /** Emit a graph event to all listeners */
  emitEvent(event: GraphEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        // Swallow listener errors to prevent cascading failures
      }
    }
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /** Export graph to a serializable format */
  exportGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  /** Import graph from serialized data */
  importGraph(data: { nodes: GraphNode[]; edges: GraphEdge[] }): BatchResult {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const node of data.nodes) {
      this.addNode(node.id, node.type, node.metadata);
      successful++;
    }

    for (const edge of data.edges) {
      const result = this.addEdge(edge.source, edge.target, edge.type, edge.weight, edge.metadata);
      if (result) {
        successful++;
      } else {
        failed++;
        errors.push({ id: edge.id, error: 'Failed to import edge' });
      }
    }

    return { successful, failed, errors, duration: Date.now() - startTime };
  }

  /** Clear all graph data */
  clear(): void {
    this.nodes.clear();
    this.outgoing.clear();
    this.incoming.clear();
    this.edges.clear();
    this.blockedIndex.clear();
    this.mutedIndex.clear();
    for (const set of this.edgeTypeIndex.values()) {
      set.clear();
    }
    this.edgeIdCounter = 0;
  }

  // -------------------------------------------------------------------------
  // Internal Helpers
  // -------------------------------------------------------------------------

  /** Build a unique key for an edge */
  private buildEdgeKey(source: string, target: string): string {
    return `${source}::${target}`;
  }
}
