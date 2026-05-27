// ============================================================================
// Context Graph - Knowledge graph of resources and relationships
// ============================================================================

import type { ContextNode, ResourceType } from '../types.js';

export class ContextGraph {
  private nodes: Map<string, ContextNode> = new Map();

  addNode(node: ContextNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(fromId: string, toId: string, relationship: string): boolean {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return false;

    fromNode.relationships.push({ targetId: toId, relationship });
    toNode.relationships.push({ targetId: fromId, relationship });
    return true;
  }

  getNode(id: string): ContextNode | undefined {
    return this.nodes.get(id);
  }

  getRelated(nodeId: string, depth: number = 1): ContextNode[] {
    const visited = new Set<string>();
    const result: ContextNode[] = [];
    const queue: { id: string; currentDepth: number }[] = [{ id: nodeId, currentDepth: 0 }];

    visited.add(nodeId);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if (item.currentDepth >= depth) continue;

      const node = this.nodes.get(item.id);
      if (!node) continue;

      for (const edge of node.relationships) {
        if (visited.has(edge.targetId)) continue;
        visited.add(edge.targetId);

        const relatedNode = this.nodes.get(edge.targetId);
        if (relatedNode) {
          result.push(relatedNode);
          queue.push({ id: edge.targetId, currentDepth: item.currentDepth + 1 });
        }
      }
    }

    return result;
  }

  getByType(type: ResourceType, workspaceId: string): ContextNode[] {
    const results: ContextNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.type === type && node.workspaceId === workspaceId) {
        results.push(node);
      }
    }
    return results;
  }

  search(query: string, workspaceId: string): ContextNode[] {
    const lowerQuery = query.toLowerCase();
    const results: ContextNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.workspaceId !== workspaceId) continue;
      const metadataStr = JSON.stringify(node.metadata).toLowerCase();
      if (metadataStr.includes(lowerQuery)) {
        results.push(node);
      }
    }
    return results;
  }

  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    // Remove edges pointing to this node from other nodes
    for (const otherNode of this.nodes.values()) {
      otherNode.relationships = otherNode.relationships.filter((e) => e.targetId !== nodeId);
    }

    return this.nodes.delete(nodeId);
  }
}
