// ============================================================================
// Quant Ecosystem - Testing Framework: Fixture Manager
// Fixture definition, lifecycle, shared fixtures, inheritance, lazy init
// ============================================================================

import type { Fixture, FixtureInstance } from '../types';

interface FixtureEntry<T = unknown> {
  definition: Fixture<T>;
  instance: FixtureInstance<T> | null;
  children: string[];
  params: Map<string, FixtureEntry<T>>;
}

/**
 * FixtureManager - Manages test fixtures with lifecycle, sharing, and inheritance
 */
export class FixtureManager {
  private fixtures: Map<string, FixtureEntry> = new Map();
  private activeInstances: Map<string, FixtureInstance> = new Map();
  private cleanupStack: { name: string; teardown: Function }[] = [];
  private initializationOrder: string[] = [];

  /**
   * Defines a fixture with factory and optional teardown
   */
  define<T>(
    name: string,
    config: {
      factory: () => T | Promise<T>;
      teardown?: (value: T) => void | Promise<void>;
      shared?: boolean;
      lazy?: boolean;
      parent?: string;
      params?: Record<string, unknown>;
    },
  ): void {
    if (this.fixtures.has(name)) {
      throw new Error(`Fixture "${name}" is already defined`);
    }

    const entry: FixtureEntry<T> = {
      definition: {
        name,
        factory: config.factory,
        teardown: config.teardown,
        shared: config.shared ?? false,
        lazy: config.lazy ?? true,
        parent: config.parent,
        params: config.params,
      },
      instance: null,
      children: [],
      params: new Map(),
    };

    this.fixtures.set(name, entry as FixtureEntry);

    // Register as child of parent
    if (config.parent) {
      const parent = this.fixtures.get(config.parent);
      if (parent) {
        parent.children.push(name);
      }
    }
  }

  /**
   * Defines a parameterized fixture (creates variants)
   */
  defineParameterized<T>(
    baseName: string,
    params: Record<string, unknown>[],
    config: {
      factory: (params: Record<string, unknown>) => T | Promise<T>;
      teardown?: (value: T) => void | Promise<void>;
    },
  ): void {
    for (let i = 0; i < params.length; i++) {
      const paramSet = params[i]!;
      const name = `${baseName}[${i}]`;
      this.define(name, {
        factory: () => config.factory(paramSet),
        teardown: config.teardown,
        params: paramSet,
      });
    }
  }

  /**
   * Gets a fixture value, initializing if needed
   */
  async get<T>(name: string): Promise<T> {
    // Check if already initialized
    const active = this.activeInstances.get(name);
    if (active && active.initialized) {
      return active.value as T;
    }

    const entry = this.fixtures.get(name);
    if (!entry) {
      throw new Error(`Fixture "${name}" is not defined`);
    }

    // Check for shared instance
    if (entry.definition.shared && entry.instance?.initialized) {
      return entry.instance.value as T;
    }

    // Resolve dependencies first
    const deps = this.resolveDependencies(name);
    for (const dep of deps) {
      if (dep !== name && !this.activeInstances.has(dep)) {
        await this.get(dep);
      }
    }

    // Initialize the fixture
    return (await this.initialize(name)) as T;
  }

  /**
   * Initializes a fixture
   */
  private async initialize<T>(name: string): Promise<T> {
    const entry = this.fixtures.get(name);
    if (!entry) {
      throw new Error(`Fixture "${name}" is not defined`);
    }

    // If there's a parent, initialize parent first and merge
    let parentValue: unknown = undefined;
    if (entry.definition.parent) {
      parentValue = await this.get(entry.definition.parent);
    }

    // Create the fixture value
    const value = await entry.definition.factory();

    // Merge with parent if applicable
    const finalValue =
      parentValue && typeof parentValue === 'object' && typeof value === 'object'
        ? { ...(parentValue as object), ...(value as object) }
        : value;

    const instance: FixtureInstance<T> = {
      name,
      value: finalValue as T,
      initialized: true,
      dependencies: this.resolveDependencies(name),
    };

    entry.instance = instance as FixtureInstance;
    this.activeInstances.set(name, instance as FixtureInstance);
    this.initializationOrder.push(name);

    // Register teardown
    if (entry.definition.teardown) {
      this.cleanupStack.push({
        name,
        teardown: () => entry.definition.teardown!(finalValue as T),
      });
    }

    return finalValue as T;
  }

  /**
   * Resolves fixture dependencies using topological sort
   */
  private resolveDependencies(name: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>();

    const visit = (n: string) => {
      if (visited.has(n)) return;
      if (visiting.has(n)) {
        throw new Error(`Circular fixture dependency detected: ${n}`);
      }

      visiting.add(n);
      const entry = this.fixtures.get(n);
      if (entry?.definition.parent) {
        visit(entry.definition.parent);
      }
      visiting.delete(n);
      visited.add(n);
      result.push(n);
    };

    visit(name);
    return result;
  }

  /**
   * Tears down a specific fixture
   */
  async teardown(name: string): Promise<void> {
    const entry = this.fixtures.get(name);
    if (!entry) return;

    // Teardown children first
    for (const child of entry.children) {
      await this.teardown(child);
    }

    // Run teardown function
    if (entry.definition.teardown && entry.instance?.initialized) {
      await entry.definition.teardown(entry.instance.value);
    }

    entry.instance = null;
    this.activeInstances.delete(name);
  }

  /**
   * Tears down all fixtures in reverse initialization order
   */
  async teardownAll(): Promise<void> {
    // Reverse cleanup order
    const stack = [...this.cleanupStack].reverse();

    for (const { name, teardown } of stack) {
      try {
        await teardown();
      } catch (err) {
        // Log but don't throw during cleanup
        console.error(`Error tearing down fixture "${name}":`, err);
      }
    }

    this.activeInstances.clear();
    this.cleanupStack = [];
    this.initializationOrder = [];

    // Reset instances
    for (const entry of this.fixtures.values()) {
      if (!entry.definition.shared) {
        entry.instance = null;
      }
    }
  }

  /**
   * Checks if a fixture is defined
   */
  has(name: string): boolean {
    return this.fixtures.has(name);
  }

  /**
   * Checks if a fixture is currently initialized
   */
  isInitialized(name: string): boolean {
    return this.activeInstances.has(name) && this.activeInstances.get(name)!.initialized;
  }

  /**
   * Gets all defined fixture names
   */
  getNames(): string[] {
    return [...this.fixtures.keys()];
  }

  /**
   * Gets initialization order
   */
  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Extends an existing fixture with additional setup
   */
  extend<T>(
    name: string,
    parentName: string,
    overrides: {
      factory?: () => T | Promise<T>;
      teardown?: (value: T) => void | Promise<void>;
    },
  ): void {
    const parent = this.fixtures.get(parentName);
    if (!parent) {
      throw new Error(`Parent fixture "${parentName}" is not defined`);
    }

    this.define(name, {
      factory: overrides.factory ?? (parent.definition.factory as () => T | Promise<T>),
      teardown:
        overrides.teardown ??
        (parent.definition.teardown as ((value: T) => void | Promise<void>) | undefined),
      parent: parentName,
      shared: parent.definition.shared,
      lazy: parent.definition.lazy,
    });
  }

  /**
   * Creates a scoped fixture manager (inherits definitions but isolates instances)
   */
  createScope(): FixtureManager {
    const scope = new FixtureManager();
    for (const [name, entry] of this.fixtures) {
      scope.fixtures.set(name, {
        definition: { ...entry.definition },
        instance: entry.definition.shared ? entry.instance : null,
        children: [...entry.children],
        params: new Map(entry.params),
      });
    }
    return scope;
  }

  /**
   * Resets all fixtures (clears definitions and instances)
   */
  reset(): void {
    this.fixtures.clear();
    this.activeInstances.clear();
    this.cleanupStack = [];
    this.initializationOrder = [];
  }
}
