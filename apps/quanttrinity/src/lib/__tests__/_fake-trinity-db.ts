import type { TrinityPrisma } from '../store';

/**
 * In-memory fake of the single-row `trinity_control_state` table used by the
 * durable owner store. It deep-clones on every read and write so callers can
 * never mutate the stored document by reference (matching the isolation a real
 * database round-trip provides). Create a FRESH fake per test so the store
 * re-seeds from scratch each time.
 */
export function makeFakeTrinityDb(): TrinityPrisma {
  let row: { id: string; data: unknown } | null = null;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  return {
    trinityControlState: {
      async findUnique({ where }) {
        if (!row || row.id !== where.id) return null;
        return { id: row.id, data: clone(row.data) };
      },
      async upsert({ where, create, update }) {
        if (row && row.id === where.id) {
          row = { id: row.id, data: clone((update as { data: unknown }).data) };
        } else {
          row = {
            id: (create as { id: string }).id,
            data: clone((create as { data: unknown }).data),
          };
        }
        return { id: row.id, data: clone(row.data) };
      },
    },
  };
}
