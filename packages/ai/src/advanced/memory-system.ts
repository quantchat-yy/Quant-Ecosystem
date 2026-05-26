// ============================================================================
// Advanced AI - Long-term Memory System with Knowledge Graphs
// ============================================================================

import type {
  Memory,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  PersonalizationProfile,
  MemoryStats,
  ConsolidationResult,
} from './types';

/**
 * MemorySystem
 *
 * Long-term memory management for AI agents:
 * - Store and retrieve memories with importance scoring
 * - Build knowledge graphs from memories
 * - Personalization profiles per user
 * - Memory consolidation and forgetting
 */
export class MemorySystem {
  private memories: Map<string, Memory> = new Map();
  private graphs: Map<string, KnowledgeGraph> = new Map();
  private profiles: Map<string, PersonalizationProfile> = new Map();

  /**
   * Store a new memory for a user
   */
  async storeMemory(
    userId: string,
    content: string,
    tags?: string[],
    importance?: number,
  ): Promise<Memory> {
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      content,
      tags: tags ?? [],
      timestamp: Date.now(),
      accessCount: 0,
      importance: importance ?? 0.5,
    };

    this.memories.set(memory.id, memory);
    return memory;
  }

  /**
   * Retrieve a specific memory by ID
   */
  async retrieveMemory(memoryId: string): Promise<Memory> {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      throw new Error(`Memory '${memoryId}' not found`);
    }

    memory.accessCount++;
    return memory;
  }

  /**
   * Search memories by query with optional limit
   */
  async searchMemories(userId: string, query: string, limit?: number): Promise<Memory[]> {
    const userMemories = Array.from(this.memories.values())
      .filter((m) => m.userId === userId)
      .filter((m) => {
        const queryLower = query.toLowerCase();
        return (
          m.content.toLowerCase().includes(queryLower) ||
          m.tags.some((t) => t.toLowerCase().includes(queryLower))
        );
      })
      .sort((a, b) => b.importance - a.importance);

    return userMemories.slice(0, limit ?? 10);
  }

  /**
   * Build a knowledge graph from user memories
   */
  async buildKnowledgeGraph(userId: string, memories: Memory[]): Promise<KnowledgeGraph> {
    const nodes: KnowledgeNode[] = memories.map((m) => ({
      id: m.id,
      label: m.content.substring(0, 50),
      type: 'memory',
      properties: {
        importance: m.importance,
        tags: m.tags,
        timestamp: m.timestamp,
      },
    }));

    const edges: KnowledgeEdge[] = [];
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memA = memories[i];
        const memB = memories[j];
        if (!memA || !memB) continue;

        const sharedTags = memA.tags.filter((t) => memB.tags.includes(t));
        if (sharedTags.length > 0) {
          edges.push({
            id: `edge_${memA.id}_${memB.id}`,
            source: memA.id,
            target: memB.id,
            relationship: 'related',
            weight: sharedTags.length / Math.max(memA.tags.length, memB.tags.length, 1),
          });
        }
      }
    }

    const graph: KnowledgeGraph = {
      nodes,
      edges,
      metadata: { userId, createdAt: Date.now(), memoryCount: memories.length },
    };

    this.graphs.set(userId, graph);
    return graph;
  }

  /**
   * Get related concepts from a knowledge graph node
   */
  async getRelatedConcepts(nodeId: string, depth?: number): Promise<KnowledgeNode[]> {
    const maxDepth = depth ?? 1;
    const relatedNodes: KnowledgeNode[] = [];

    for (const graph of this.graphs.values()) {
      const connectedEdges = graph.edges.filter((e) => e.source === nodeId || e.target === nodeId);

      for (const edge of connectedEdges) {
        const targetId = edge.source === nodeId ? edge.target : edge.source;
        const node = graph.nodes.find((n) => n.id === targetId);
        if (node) {
          relatedNodes.push(node);
        }
      }

      if (maxDepth > 1) {
        const secondLevel: KnowledgeNode[] = [];
        for (const related of relatedNodes) {
          const deepEdges = graph.edges.filter(
            (e) =>
              (e.source === related.id || e.target === related.id) &&
              e.source !== nodeId &&
              e.target !== nodeId,
          );
          for (const edge of deepEdges) {
            const targetId = edge.source === related.id ? edge.target : edge.source;
            const node = graph.nodes.find((n) => n.id === targetId);
            if (node && !relatedNodes.includes(node)) {
              secondLevel.push(node);
            }
          }
        }
        relatedNodes.push(...secondLevel);
      }
    }

    return relatedNodes;
  }

  /**
   * Update personalization preferences for a user
   */
  async updatePersonalization(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<PersonalizationProfile> {
    const existing = this.profiles.get(userId);
    const profile: PersonalizationProfile = {
      userId,
      preferences: { ...(existing?.preferences ?? {}), ...preferences },
      interests: existing?.interests ?? [],
      communicationStyle: existing?.communicationStyle ?? 'neutral',
      updatedAt: Date.now(),
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  /**
   * Remove a memory permanently
   */
  async forgetMemory(memoryId: string): Promise<void> {
    if (!this.memories.has(memoryId)) {
      throw new Error(`Memory '${memoryId}' not found`);
    }
    this.memories.delete(memoryId);
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<MemoryStats> {
    const userMemories = Array.from(this.memories.values()).filter((m) => m.userId === userId);

    if (userMemories.length === 0) {
      return {
        totalMemories: 0,
        totalTags: 0,
        averageImportance: 0,
        oldestMemoryAt: 0,
        newestMemoryAt: 0,
      };
    }

    const allTags = new Set(userMemories.flatMap((m) => m.tags));
    const timestamps = userMemories.map((m) => m.timestamp);
    const totalImportance = userMemories.reduce((sum, m) => sum + m.importance, 0);

    return {
      totalMemories: userMemories.length,
      totalTags: allTags.size,
      averageImportance: totalImportance / userMemories.length,
      oldestMemoryAt: Math.min(...timestamps),
      newestMemoryAt: Math.max(...timestamps),
    };
  }

  /**
   * Consolidate memories by merging similar ones
   */
  async consolidateMemories(userId: string): Promise<ConsolidationResult> {
    const userMemories = Array.from(this.memories.values()).filter((m) => m.userId === userId);

    let mergedCount = 0;
    let removedCount = 0;

    // Remove low-importance, old memories with no access
    const toRemove = userMemories.filter(
      (m) => m.importance < 0.2 && m.accessCount === 0 && Date.now() - m.timestamp > 86400000,
    );

    for (const mem of toRemove) {
      this.memories.delete(mem.id);
      removedCount++;
    }

    return {
      mergedCount,
      removedCount,
      updatedCount: userMemories.length - removedCount,
      summary: `Consolidated memories: ${mergedCount} merged, ${removedCount} removed`,
    };
  }

  /**
   * Get personalization profile for a user
   */
  async getPersonalization(userId: string): Promise<PersonalizationProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return {
        userId,
        preferences: {},
        interests: [],
        communicationStyle: 'neutral',
        updatedAt: Date.now(),
      };
    }
    return profile;
  }
}
