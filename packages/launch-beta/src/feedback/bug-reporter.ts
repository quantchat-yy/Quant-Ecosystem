import type { BugReport } from '../types.js';
export class BugReporter {
  private reports = new Map<string, BugReport>();
  report(
    userId: string,
    description: string,
    priority: number,
    opts?: { screenshot?: string; logs?: string; deviceInfo?: string; reproSteps?: string },
  ): BugReport {
    // prettier-ignore
    const r: BugReport = { id: crypto.randomUUID(), userId, priority, description, screenshot: opts?.screenshot, logs: opts?.logs, deviceInfo: opts?.deviceInfo ?? 'unknown', reproSteps: opts?.reproSteps ?? '', createdAt: Date.now() };
    this.reports.set(r.id, r);
    return r;
  }
  getPriorityQueue(): BugReport[] {
    return [...this.reports.values()].sort(
      (a, b) => b.priority - a.priority || a.createdAt - b.createdAt,
    );
  }
  // prettier-ignore
  getReport(id: string) { return this.reports.get(id) ?? null; }
  // prettier-ignore
  getReportsByUser(userId: string) { return [...this.reports.values()].filter((r) => r.userId === userId); }
}
