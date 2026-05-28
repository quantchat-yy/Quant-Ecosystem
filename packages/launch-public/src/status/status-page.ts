import type { StatusIncident } from '../types.js';

export class StatusPageService {
  private incidents: Map<string, StatusIncident> = new Map();
  createIncident(title: string, severity: number): StatusIncident {
    const id = `inc-${crypto.randomUUID()}`;
    const incident: StatusIncident = {
      id,
      title,
      severity,
      status: 'investigating',
      createdAt: Date.now(),
    };
    this.incidents.set(id, incident);
    return incident;
  }
  updateIncident(id: string, status: StatusIncident['status']) {
    const inc = this.incidents.get(id);
    if (inc) inc.status = status;
  }
  resolveIncident(id: string) {
    const inc = this.incidents.get(id);
    if (inc) {
      inc.status = 'resolved';
      inc.resolvedAt = Date.now();
    }
  }
  getActiveIncidents(): StatusIncident[] {
    return [...this.incidents.values()].filter((i) => i.status !== 'resolved');
  }
  calculateUptime(totalMs: number, downtimeMs: number): number {
    return totalMs === 0 ? 100 : ((totalMs - downtimeMs) / totalMs) * 100;
  }
  meetsTarget(uptime: number): boolean {
    return uptime >= 99.9;
  }
}
