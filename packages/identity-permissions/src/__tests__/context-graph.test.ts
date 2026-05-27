import { describe, it, expect, beforeEach } from 'vitest';
import { ContextGraph } from '../core/context-graph.js';
import type { ContextNode } from '../types.js';

describe('ContextGraph', () => {
  let graph: ContextGraph;

  const createNode = (overrides: Partial<ContextNode> = {}): ContextNode => ({
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'doc',
    ownerId: 'user-1',
    workspaceId: 'ws-1',
    metadata: {},
    relationships: [],
    ...overrides,
  });

  beforeEach(() => {
    graph = new ContextGraph();
  });

  describe('addNode', () => {
    it('adds a node', () => {
      const node = createNode({ id: 'n1' });
      graph.addNode(node);
      expect(graph.getNode('n1')).toEqual(node);
    });
  });

  describe('addEdge', () => {
    it('adds bidirectional edges', () => {
      graph.addNode(createNode({ id: 'n1' }));
      graph.addNode(createNode({ id: 'n2' }));
      expect(graph.addEdge('n1', 'n2', 'related-to')).toBe(true);

      const n1 = graph.getNode('n1');
      const n2 = graph.getNode('n2');
      expect(n1?.relationships).toHaveLength(1);
      expect(n1?.relationships[0]).toEqual({ targetId: 'n2', relationship: 'related-to' });
      expect(n2?.relationships).toHaveLength(1);
      expect(n2?.relationships[0]).toEqual({ targetId: 'n1', relationship: 'related-to' });
    });

    it('returns false if nodes do not exist', () => {
      expect(graph.addEdge('n1', 'n2', 'related')).toBe(false);
    });
  });

  describe('getRelated', () => {
    it('returns direct neighbors at depth 1', () => {
      graph.addNode(createNode({ id: 'n1' }));
      graph.addNode(createNode({ id: 'n2' }));
      graph.addNode(createNode({ id: 'n3' }));
      graph.addEdge('n1', 'n2', 'ref');
      graph.addEdge('n2', 'n3', 'ref');

      const related = graph.getRelated('n1', 1);
      expect(related).toHaveLength(1);
      expect(related[0]?.id).toBe('n2');
    });

    it('returns nodes up to depth 2', () => {
      graph.addNode(createNode({ id: 'n1' }));
      graph.addNode(createNode({ id: 'n2' }));
      graph.addNode(createNode({ id: 'n3' }));
      graph.addEdge('n1', 'n2', 'ref');
      graph.addEdge('n2', 'n3', 'ref');

      const related = graph.getRelated('n1', 2);
      expect(related).toHaveLength(2);
      expect(related.map((n) => n.id)).toContain('n2');
      expect(related.map((n) => n.id)).toContain('n3');
    });

    it('does not revisit nodes', () => {
      graph.addNode(createNode({ id: 'n1' }));
      graph.addNode(createNode({ id: 'n2' }));
      graph.addEdge('n1', 'n2', 'ref');

      const related = graph.getRelated('n1', 3);
      expect(related).toHaveLength(1);
    });
  });

  describe('getByType', () => {
    it('filters by type and workspace', () => {
      graph.addNode(createNode({ id: 'n1', type: 'doc', workspaceId: 'ws-1' }));
      graph.addNode(createNode({ id: 'n2', type: 'email', workspaceId: 'ws-1' }));
      graph.addNode(createNode({ id: 'n3', type: 'doc', workspaceId: 'ws-2' }));

      const results = graph.getByType('doc', 'ws-1');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('n1');
    });
  });

  describe('search', () => {
    it('searches metadata for matching text', () => {
      graph.addNode(createNode({ id: 'n1', metadata: { title: 'Project Plan' } }));
      graph.addNode(createNode({ id: 'n2', metadata: { title: 'Meeting Notes' } }));

      const results = graph.search('project', 'ws-1');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('n1');
    });

    it('is case insensitive', () => {
      graph.addNode(createNode({ id: 'n1', metadata: { title: 'IMPORTANT' } }));

      const results = graph.search('important', 'ws-1');
      expect(results).toHaveLength(1);
    });

    it('only searches within workspace', () => {
      graph.addNode(createNode({ id: 'n1', workspaceId: 'ws-1', metadata: { title: 'test' } }));
      graph.addNode(createNode({ id: 'n2', workspaceId: 'ws-2', metadata: { title: 'test' } }));

      const results = graph.search('test', 'ws-1');
      expect(results).toHaveLength(1);
    });
  });

  describe('removeNode', () => {
    it('removes a node and cleans up edges', () => {
      graph.addNode(createNode({ id: 'n1' }));
      graph.addNode(createNode({ id: 'n2' }));
      graph.addEdge('n1', 'n2', 'ref');

      expect(graph.removeNode('n1')).toBe(true);
      expect(graph.getNode('n1')).toBeUndefined();
      expect(graph.getNode('n2')?.relationships).toHaveLength(0);
    });

    it('returns false for unknown node', () => {
      expect(graph.removeNode('unknown')).toBe(false);
    });
  });
});
