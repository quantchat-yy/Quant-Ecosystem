import type { DeviceCapability } from '../capabilities/types.js';

export interface DeviceAuditEntry {
  id: string;
  timestamp: number;
  capability: DeviceCapability;
  action: string;
  params?: Record<string, unknown>;
  result: 'success' | 'failure';
  undoRecipe?: string;
}

export interface AuditFilter {
  timeRange?: { start: number; end: number };
  capability?: DeviceCapability;
  action?: string;
}

export class DeviceActionAudit {
  private entries: DeviceAuditEntry[] = [];

  log(entry: DeviceAuditEntry): void {
    this.entries.push(entry);
  }

  query(filter: AuditFilter): ReadonlyArray<DeviceAuditEntry> {
    return this.entries.filter((e) => {
      if (filter.capability && e.capability !== filter.capability) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (filter.timeRange) {
        if (e.timestamp < filter.timeRange.start || e.timestamp > filter.timeRange.end)
          return false;
      }
      return true;
    });
  }

  getHistory(): ReadonlyArray<DeviceAuditEntry> {
    return [...this.entries];
  }

  export(): DeviceAuditEntry[] {
    return [...this.entries];
  }
}
