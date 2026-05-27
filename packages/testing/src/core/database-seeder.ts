// ============================================================================
// Quant Ecosystem - Testing Framework: Database Seeder
// Seed definitions, dependency resolution, topological sort, bulk insert
// ============================================================================

import type { SeedDefinition, SeedResult } from '../types';

interface TableState {
  name: string;
  records: Record<string, unknown>[];
  primaryKey: string;
  foreignKeys: { column: string; references: string; refColumn: string }[];
}

/**
 * Seeded random number generator for deterministic data
 * Uses xorshift128+ algorithm
 */
class DeterministicRandom {
  private s0: number;
  private s1: number;

  constructor(seed: number = 1) {
    this.s0 = seed;
    this.s1 = seed ^ 0xdeadbeef;
  }

  next(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    return ((this.s0 + this.s1) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]!;
  }
}

/**
 * DatabaseSeeder - Manages test data seeding with dependency ordering
 */
export class DatabaseSeeder {
  private tables: Map<string, TableState> = new Map();
  private seeds: Map<string, SeedDefinition> = new Map();
  private random: DeterministicRandom;
  private transactionLog: { action: string; table: string; timestamp: number }[] = [];
  private autoIncrements: Map<string, number> = new Map();

  constructor(seed: number = 42) {
    this.random = new DeterministicRandom(seed);
  }

  /**
   * Registers a table schema
   */
  registerTable(
    name: string,
    config: {
      primaryKey?: string;
      foreignKeys?: { column: string; references: string; refColumn: string }[];
    } = {},
  ): void {
    this.tables.set(name, {
      name,
      records: [],
      primaryKey: config.primaryKey ?? 'id',
      foreignKeys: config.foreignKeys ?? [],
    });
    this.autoIncrements.set(name, 0);
  }

  /**
   * Defines seed data for a table
   */
  defineSeed(
    table: string,
    records: Record<string, unknown>[],
    options: { dependencies?: string[]; truncateFirst?: boolean } = {},
  ): void {
    this.seeds.set(table, {
      table,
      records,
      dependencies: options.dependencies ?? this.inferDependencies(table),
      truncateFirst: options.truncateFirst ?? true,
    });
  }

  /**
   * Infers dependencies from foreign keys
   */
  private inferDependencies(table: string): string[] {
    const tableState = this.tables.get(table);
    if (!tableState) return [];
    return tableState.foreignKeys.map((fk) => fk.references);
  }

  /**
   * Resolves seeding order using topological sort (Kahn's algorithm)
   */
  private resolveSeedOrder(): string[] {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const [name, seed] of this.seeds) {
      if (!graph.has(name)) graph.set(name, new Set());
      if (!inDegree.has(name)) inDegree.set(name, 0);

      for (const dep of seed.dependencies) {
        if (!graph.has(dep)) graph.set(dep, new Set());
        if (!inDegree.has(dep)) inDegree.set(dep, 0);
        graph.get(dep)!.add(name);
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) queue.push(node);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const neighbors = graph.get(node) ?? new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (result.length < this.seeds.size) {
      const remaining = [...this.seeds.keys()].filter((n) => !result.includes(n));
      throw new Error(`Circular dependency detected in seeds: ${remaining.join(', ')}`);
    }

    // Filter to only include tables that have seeds
    return result.filter((name) => this.seeds.has(name));
  }

  /**
   * Seeds all tables in dependency order
   */
  async seedAll(): Promise<SeedResult[]> {
    const order = this.resolveSeedOrder();
    const results: SeedResult[] = [];

    this.beginTransaction();

    try {
      for (const tableName of order) {
        const result = await this.seedTable(tableName);
        results.push(result);
      }
      this.commitTransaction();
    } catch (err) {
      this.rollbackTransaction();
      throw err;
    }

    return results;
  }

  /**
   * Seeds a single table
   */
  async seedTable(tableName: string): Promise<SeedResult> {
    const seed = this.seeds.get(tableName);
    if (!seed) {
      throw new Error(`No seed defined for table "${tableName}"`);
    }

    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table "${tableName}" is not registered`);
    }

    const startTime = Date.now();

    // Truncate if specified
    if (seed.truncateFirst) {
      this.truncateTable(tableName);
    }

    // Insert records with auto-increment
    for (const record of seed.records) {
      const processedRecord = this.processRecord(tableName, record);
      table.records.push(processedRecord);
    }

    this.transactionLog.push({
      action: 'seed',
      table: tableName,
      timestamp: Date.now(),
    });

    return {
      table: tableName,
      inserted: seed.records.length,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Processes a record, adding auto-increment IDs and resolving references
   */
  private processRecord(
    tableName: string,
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    const table = this.tables.get(tableName)!;
    const processed = { ...record };

    // Auto-increment primary key if not specified
    if (!processed[table.primaryKey]) {
      const nextId = (this.autoIncrements.get(tableName) ?? 0) + 1;
      this.autoIncrements.set(tableName, nextId);
      processed[table.primaryKey] = nextId;
    }

    // Add timestamps if not present
    if (!processed['created_at']) {
      processed['created_at'] = new Date().toISOString();
    }
    if (!processed['updated_at']) {
      processed['updated_at'] = new Date().toISOString();
    }

    return processed;
  }

  /**
   * Bulk inserts records into a table
   */
  bulkInsert(tableName: string, records: Record<string, unknown>[]): number {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table "${tableName}" is not registered`);
    }

    let inserted = 0;
    for (const record of records) {
      const processed = this.processRecord(tableName, record);
      table.records.push(processed);
      inserted++;
    }

    this.transactionLog.push({
      action: 'bulk_insert',
      table: tableName,
      timestamp: Date.now(),
    });

    return inserted;
  }

  /**
   * Truncates a table (removes all records)
   */
  truncateTable(tableName: string): void {
    const table = this.tables.get(tableName);
    if (table) {
      table.records = [];
      this.autoIncrements.set(tableName, 0);
      this.transactionLog.push({
        action: 'truncate',
        table: tableName,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Truncates all tables in reverse dependency order
   */
  truncateAll(): void {
    const order = this.resolveSeedOrder().reverse();
    for (const tableName of order) {
      this.truncateTable(tableName);
    }
    // Also truncate tables without seeds
    for (const tableName of this.tables.keys()) {
      if (!this.seeds.has(tableName)) {
        this.truncateTable(tableName);
      }
    }
  }

  /**
   * Begins a transaction
   */
  beginTransaction(): void {
    this.transactionLog.push({ action: 'begin', table: '', timestamp: Date.now() });
  }

  /**
   * Commits the current transaction
   */
  commitTransaction(): void {
    this.transactionLog.push({ action: 'commit', table: '', timestamp: Date.now() });
  }

  /**
   * Rolls back the current transaction (reverts to empty)
   */
  rollbackTransaction(): void {
    this.transactionLog.push({ action: 'rollback', table: '', timestamp: Date.now() });
    // In a real DB this would undo changes; here we truncate
    for (const table of this.tables.values()) {
      table.records = [];
    }
  }

  /**
   * Gets records from a table
   */
  getRecords(tableName: string): Record<string, unknown>[] {
    return this.tables.get(tableName)?.records ?? [];
  }

  /**
   * Gets record count for a table
   */
  getCount(tableName: string): number {
    return this.tables.get(tableName)?.records.length ?? 0;
  }

  /**
   * Gets the transaction log
   */
  getTransactionLog(): { action: string; table: string; timestamp: number }[] {
    return [...this.transactionLog];
  }

  /**
   * Generates deterministic fake data for a field type
   */
  generateData(type: string): unknown {
    switch (type) {
      case 'string':
        return `value_${this.random.nextInt(1, 9999)}`;
      case 'number':
        return this.random.nextInt(1, 1000);
      case 'boolean':
        return this.random.next() > 0.5;
      case 'email':
        return `user${this.random.nextInt(1, 999)}@test.com`;
      case 'date':
        return new Date(Date.now() - this.random.nextInt(0, 365 * 86400000)).toISOString();
      case 'uuid':
        return `${this.randomHex(8)}-${this.randomHex(4)}-4${this.randomHex(3)}-${this.randomHex(4)}-${this.randomHex(12)}`;
      default:
        return null;
    }
  }

  private randomHex(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.random.nextInt(0, 15).toString(16);
    }
    return result;
  }

  /**
   * Resets the seeder
   */
  reset(): void {
    this.tables.clear();
    this.seeds.clear();
    this.transactionLog = [];
    this.autoIncrements.clear();
  }
}
