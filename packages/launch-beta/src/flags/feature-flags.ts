import type { FeatureFlag } from '../types.js';
export class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();
  createFlag(name: string, opts?: { cohorts?: string[]; rolloutPercent?: number }): FeatureFlag {
    // prettier-ignore
    const f: FeatureFlag = { id: crypto.randomUUID(), name, enabled: true, cohorts: opts?.cohorts ?? [], userIds: [], rolloutPercent: opts?.rolloutPercent ?? 100, killSwitch: false };
    this.flags.set(f.id, f);
    return f;
  }
  isEnabled(flagId: string, userId: string, cohort?: string): boolean {
    const f = this.flags.get(flagId);
    if (!f || !f.enabled || f.killSwitch) return false;
    if (f.userIds.length > 0 && f.userIds.includes(userId)) return true;
    if (f.cohorts.length > 0 && cohort && f.cohorts.includes(cohort)) return true;
    if (f.cohorts.length === 0 && f.userIds.length === 0) {
      let h = 2166136261;
      for (let i = 0; i < userId.length; i++) {
        h ^= userId.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h % 100 < f.rolloutPercent;
    }
    return false;
  }
  toggleKillSwitch(flagId: string, enabled: boolean) {
    const f = this.flags.get(flagId);
    if (f) f.killSwitch = enabled;
  }
  setRollout(flagId: string, percent: number) {
    const f = this.flags.get(flagId);
    if (f) f.rolloutPercent = percent;
  }
  // prettier-ignore
  getFlag(id: string) { return this.flags.get(id) ?? null; }
}
