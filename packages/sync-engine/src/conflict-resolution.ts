import * as Y from 'yjs';

export type ConflictStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'custom';

export interface TimestampedValue<T> {
  value: T;
  timestamp: number;
}

export type CustomResolver<T> = (local: TimestampedValue<T>, remote: TimestampedValue<T>) => T;

export class ConflictResolver {
  private readonly customResolvers: Map<string, CustomResolver<unknown>> = new Map();

  mergeUpdates(updates: Uint8Array[]): Uint8Array {
    if (updates.length === 0) {
      return new Uint8Array(0);
    }
    if (updates.length === 1) {
      return updates[0]!;
    }
    return Y.mergeUpdates(updates);
  }

  resolveConflict<T>(
    local: TimestampedValue<T>,
    remote: TimestampedValue<T>,
    strategy: ConflictStrategy,
    customResolverName?: string,
  ): T {
    switch (strategy) {
      case 'last-write-wins':
        return remote.timestamp >= local.timestamp ? remote.value : local.value;
      case 'local-wins':
        return local.value;
      case 'remote-wins':
        return remote.value;
      case 'custom': {
        if (!customResolverName) {
          throw new Error('Custom resolver name is required for custom strategy');
        }
        const resolver = this.customResolvers.get(customResolverName);
        if (!resolver) {
          throw new Error(`Custom resolver '${customResolverName}' not found`);
        }
        return (resolver as CustomResolver<T>)(local, remote);
      }
    }
  }

  registerCustomResolver<T>(name: string, resolver: CustomResolver<T>): void {
    this.customResolvers.set(name, resolver as CustomResolver<unknown>);
  }
}
