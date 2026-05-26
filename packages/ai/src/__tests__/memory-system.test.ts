import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySystem } from '../advanced/memory-system';

describe('MemorySystem', () => {
  let memory: MemorySystem;
  const userId = 'user_123';

  beforeEach(() => {
    memory = new MemorySystem();
  });

  describe('storeMemory', () => {
    it('stores a memory with generated ID', async () => {
      const result = await memory.storeMemory(userId, 'Test memory content');

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.content).toBe('Test memory content');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.accessCount).toBe(0);
      expect(result.importance).toBe(0.5);
    });

    it('stores memory with tags', async () => {
      const result = await memory.storeMemory(userId, 'Tagged memory', ['work', 'important']);

      expect(result.tags).toEqual(['work', 'important']);
    });

    it('stores memory with custom importance', async () => {
      const result = await memory.storeMemory(userId, 'Important memory', undefined, 0.9);

      expect(result.importance).toBe(0.9);
    });
  });

  describe('retrieveMemory', () => {
    it('retrieves a stored memory', async () => {
      const stored = await memory.storeMemory(userId, 'Retrievable memory');
      const retrieved = await memory.retrieveMemory(stored.id);

      expect(retrieved.id).toBe(stored.id);
      expect(retrieved.content).toBe('Retrievable memory');
      expect(retrieved.accessCount).toBe(1);
    });

    it('increments access count on retrieval', async () => {
      const stored = await memory.storeMemory(userId, 'Memory');
      await memory.retrieveMemory(stored.id);
      await memory.retrieveMemory(stored.id);
      const result = await memory.retrieveMemory(stored.id);

      expect(result.accessCount).toBe(3);
    });

    it('throws for non-existent memory', async () => {
      await expect(memory.retrieveMemory('non_existent')).rejects.toThrow(
        "Memory 'non_existent' not found",
      );
    });
  });

  describe('searchMemories', () => {
    it('searches memories by content', async () => {
      await memory.storeMemory(userId, 'TypeScript tutorial notes');
      await memory.storeMemory(userId, 'Python tutorial notes');
      await memory.storeMemory(userId, 'Grocery list');

      const results = await memory.searchMemories(userId, 'tutorial');

      expect(results.length).toBe(2);
    });

    it('searches memories by tag', async () => {
      await memory.storeMemory(userId, 'Memory 1', ['coding']);
      await memory.storeMemory(userId, 'Memory 2', ['cooking']);

      const results = await memory.searchMemories(userId, 'coding');

      expect(results.length).toBe(1);
    });

    it('respects limit parameter', async () => {
      await memory.storeMemory(userId, 'Memory A contains keyword');
      await memory.storeMemory(userId, 'Memory B contains keyword');
      await memory.storeMemory(userId, 'Memory C contains keyword');

      const results = await memory.searchMemories(userId, 'keyword', 2);

      expect(results.length).toBe(2);
    });

    it('only returns memories for specified user', async () => {
      await memory.storeMemory('user_1', 'Shared content keyword');
      await memory.storeMemory('user_2', 'Shared content keyword');

      const results = await memory.searchMemories('user_1', 'keyword');

      expect(results.length).toBe(1);
      expect(results[0]?.userId).toBe('user_1');
    });

    it('sorts by importance', async () => {
      await memory.storeMemory(userId, 'Low keyword', undefined, 0.1);
      await memory.storeMemory(userId, 'High keyword', undefined, 0.9);

      const results = await memory.searchMemories(userId, 'keyword');

      expect(results[0]?.importance).toBe(0.9);
    });
  });

  describe('buildKnowledgeGraph', () => {
    it('creates nodes from memories', async () => {
      const mem1 = await memory.storeMemory(userId, 'Node A', ['tag1']);
      const mem2 = await memory.storeMemory(userId, 'Node B', ['tag2']);

      const graph = await memory.buildKnowledgeGraph(userId, [mem1, mem2]);

      expect(graph.nodes.length).toBe(2);
      expect(graph.nodes[0]?.type).toBe('memory');
    });

    it('creates edges for memories sharing tags', async () => {
      const mem1 = await memory.storeMemory(userId, 'Memory A', ['shared']);
      const mem2 = await memory.storeMemory(userId, 'Memory B', ['shared']);

      const graph = await memory.buildKnowledgeGraph(userId, [mem1, mem2]);

      expect(graph.edges.length).toBe(1);
      expect(graph.edges[0]?.relationship).toBe('related');
    });

    it('has no edges for unrelated memories', async () => {
      const mem1 = await memory.storeMemory(userId, 'Memory A', ['tag1']);
      const mem2 = await memory.storeMemory(userId, 'Memory B', ['tag2']);

      const graph = await memory.buildKnowledgeGraph(userId, [mem1, mem2]);

      expect(graph.edges.length).toBe(0);
    });

    it('includes metadata', async () => {
      const mem1 = await memory.storeMemory(userId, 'Test', ['tag']);
      const graph = await memory.buildKnowledgeGraph(userId, [mem1]);

      expect(graph.metadata['userId']).toBe(userId);
      expect(graph.metadata['memoryCount']).toBe(1);
    });
  });

  describe('getRelatedConcepts', () => {
    it('returns related nodes from knowledge graph', async () => {
      const mem1 = await memory.storeMemory(userId, 'Central', ['shared']);
      const mem2 = await memory.storeMemory(userId, 'Related', ['shared']);
      await memory.buildKnowledgeGraph(userId, [mem1, mem2]);

      const related = await memory.getRelatedConcepts(mem1.id);

      expect(related.length).toBe(1);
      expect(related[0]?.id).toBe(mem2.id);
    });

    it('returns empty for unconnected node', async () => {
      const mem1 = await memory.storeMemory(userId, 'Isolated', ['unique']);
      await memory.buildKnowledgeGraph(userId, [mem1]);

      const related = await memory.getRelatedConcepts(mem1.id);

      expect(related.length).toBe(0);
    });
  });

  describe('updatePersonalization', () => {
    it('creates new profile', async () => {
      const profile = await memory.updatePersonalization(userId, { theme: 'dark' });

      expect(profile.userId).toBe(userId);
      expect(profile.preferences['theme']).toBe('dark');
    });

    it('merges preferences on update', async () => {
      await memory.updatePersonalization(userId, { theme: 'dark' });
      const profile = await memory.updatePersonalization(userId, { language: 'en' });

      expect(profile.preferences['theme']).toBe('dark');
      expect(profile.preferences['language']).toBe('en');
    });
  });

  describe('forgetMemory', () => {
    it('removes a memory', async () => {
      const stored = await memory.storeMemory(userId, 'To forget');
      await memory.forgetMemory(stored.id);

      await expect(memory.retrieveMemory(stored.id)).rejects.toThrow();
    });

    it('throws for non-existent memory', async () => {
      await expect(memory.forgetMemory('non_existent')).rejects.toThrow(
        "Memory 'non_existent' not found",
      );
    });
  });

  describe('getMemoryStats', () => {
    it('returns stats for user with memories', async () => {
      await memory.storeMemory(userId, 'Memory 1', ['tag1'], 0.8);
      await memory.storeMemory(userId, 'Memory 2', ['tag2'], 0.6);

      const stats = await memory.getMemoryStats(userId);

      expect(stats.totalMemories).toBe(2);
      expect(stats.totalTags).toBe(2);
      expect(stats.averageImportance).toBe(0.7);
      expect(stats.oldestMemoryAt).toBeGreaterThan(0);
      expect(stats.newestMemoryAt).toBeGreaterThanOrEqual(stats.oldestMemoryAt);
    });

    it('returns zero stats for user with no memories', async () => {
      const stats = await memory.getMemoryStats('no_memories_user');

      expect(stats.totalMemories).toBe(0);
      expect(stats.averageImportance).toBe(0);
    });
  });

  describe('consolidateMemories', () => {
    it('returns consolidation result', async () => {
      await memory.storeMemory(userId, 'Active memory', ['tag'], 0.8);

      const result = await memory.consolidateMemories(userId);

      expect(result.mergedCount).toBeDefined();
      expect(result.removedCount).toBeDefined();
      expect(result.updatedCount).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('getPersonalization', () => {
    it('returns existing profile', async () => {
      await memory.updatePersonalization(userId, { theme: 'dark' });
      const profile = await memory.getPersonalization(userId);

      expect(profile.userId).toBe(userId);
      expect(profile.preferences['theme']).toBe('dark');
    });

    it('returns default profile for new user', async () => {
      const profile = await memory.getPersonalization('new_user');

      expect(profile.userId).toBe('new_user');
      expect(profile.communicationStyle).toBe('neutral');
      expect(profile.interests).toEqual([]);
    });
  });
});
