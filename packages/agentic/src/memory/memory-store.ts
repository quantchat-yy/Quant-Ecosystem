import { randomUUID } from 'crypto';

export interface MemoryItem {
  id: string;
  type: string;
  content: any;
  embedding?: number[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class MemoryStore {
  private memories: Map<string, MemoryItem> = new Map();
  private agentId: string;
  private maxSize: number = 10000;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async store(item: Omit<MemoryItem, 'id' | 'timestamp'>): Promise<string> {
    const id = randomUUID();
    const memoryItem: MemoryItem = {
      ...item,
      id,
      timestamp: new Date(),
    };

    this.memories.set(id, memoryItem);

    // Simple eviction if too many memories
    if (this.memories.size > this.maxSize) {
      const oldestKey = Array.from(this.memories.keys())[0];
      this.memories.delete(oldestKey);
    }

    return id;
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    return this.memories.get(id) || null;
  }

  async retrieveRelevant(query: string, limit: number = 10): Promise<MemoryItem[]> {
    // TODO: Implement proper vector similarity search
    // For now, simple keyword matching
    const results: MemoryItem[] = [];
    const queryLower = query.toLowerCase();

    for (const memory of this.memories.values()) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      if (contentStr.includes(queryLower)) {
        results.push(memory);
      }
      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getRecent(limit: number = 20): Promise<MemoryItem[]> {
    return Array.from(this.memories.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.memories.clear();
  }

  getSize(): number {
    return this.memories.size;
  }
}
