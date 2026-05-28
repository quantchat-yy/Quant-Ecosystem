import type { BetaCohort, BetaUser } from '../types.js';
const DEFAULTS: [string, number][] = [
  ['power', 200],
  ['mainstream', 300],
  ['elderly', 200],
  ['hindi-only', 200],
  ['self-host', 100],
];
export class BetaCohortManager {
  private users = new Map<string, BetaUser>();
  private cohorts = new Map<string, BetaCohort>();
  constructor() {
    for (const [n, c] of DEFAULTS)
      this.cohorts.set(n, { name: n, capacity: c, members: [], activationRate: 0 });
  }
  addUser(email: string, cohort: string): BetaUser | null {
    const c = this.cohorts.get(cohort);
    if (!c || c.members.length >= c.capacity) return null;
    // prettier-ignore
    const u: BetaUser = { id: crypto.randomUUID(), email, cohort, activatedAt: Date.now(), isActive: true };
    this.users.set(email, u);
    c.members.push(email);
    c.activationRate = c.members.length / c.capacity;
    return u;
  }
  removeUser(email: string): boolean {
    const u = this.users.get(email);
    if (!u) return false;
    u.isActive = false;
    const c = this.cohorts.get(u.cohort);
    if (c) {
      c.members = c.members.filter((m) => m !== email);
      c.activationRate = c.members.length / c.capacity;
    }
    return true;
  }
  // prettier-ignore
  getActivationRate(cohort: string) { return this.cohorts.get(cohort)?.activationRate ?? 0; }
  // prettier-ignore
  getCohort(name: string) { return this.cohorts.get(name) ?? null; }
  // prettier-ignore
  getAllCohorts() { return [...this.cohorts.values()]; }
}
