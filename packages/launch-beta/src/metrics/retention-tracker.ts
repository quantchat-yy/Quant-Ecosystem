import type { RetentionMetrics } from '../types.js';
export class RetentionTracker {
  private logins = new Map<string, Set<number>>();
  private userCohorts = new Map<string, string>();
  recordLogin(userId: string, day: number, cohort = 'default') {
    if (!this.logins.has(userId)) this.logins.set(userId, new Set());
    this.logins.get(userId)!.add(day);
    this.userCohorts.set(userId, cohort);
  }
  calculateRetention(cohort: string): RetentionMetrics {
    let total = 0,
      d1 = 0,
      d7 = 0,
      d30 = 0;
    for (const [uid, days] of this.logins) {
      if (this.userCohorts.get(uid) !== cohort) continue;
      total++;
      if (days.has(1)) d1++;
      if (days.has(7)) d7++;
      if (days.has(30)) d30++;
    }
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return { d1: pct(d1), d7: pct(d7), d30: pct(d30), cohort };
  }
  // prettier-ignore
  meetsTargets(m: RetentionMetrics) { return { d7Ok: m.d7 >= 40, d30Ok: m.d30 >= 25 }; }
  getCohortAnalysis() {
    const cohorts = new Set(this.userCohorts.values());
    return [...cohorts].map((c) => this.calculateRetention(c));
  }
}
