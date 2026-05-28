import { BetaCohortManager } from '../cohort/beta-cohort.js';
import { RetentionTracker } from '../metrics/retention-tracker.js';
import { NPSTracker } from '../metrics/nps-tracker.js';
import { FeatureFlagService } from '../flags/feature-flags.js';
import { BugReporter } from '../feedback/bug-reporter.js';
describe('BetaCohortManager', () => {
  it('add/remove users and track activation', () => {
    const m = new BetaCohortManager();
    const u = m.addUser('a@b.com', 'power');
    expect(u?.cohort).toBe('power');
    expect(m.getActivationRate('power')).toBeCloseTo(1 / 200);
    expect(m.getCohort('power')?.members).toContain('a@b.com');
    m.removeUser('a@b.com');
    expect(m.getActivationRate('power')).toBe(0);
    expect(m.getAllCohorts()).toHaveLength(5);
  });
  it('respects capacity', () => {
    const m = new BetaCohortManager();
    for (let i = 0; i < 100; i++) m.addUser(`u${i}@x.com`, 'self-host');
    expect(m.addUser('extra@x.com', 'self-host')).toBeNull();
  });
});
describe('RetentionTracker', () => {
  it('records logins and calculates retention', () => {
    const t = new RetentionTracker();
    t.recordLogin('u1', 1, 'power');
    t.recordLogin('u1', 7, 'power');
    t.recordLogin('u2', 1, 'power');
    const r = t.calculateRetention('power');
    expect(r.d1).toBe(100);
    expect(r.d7).toBe(50);
    expect(r.d30).toBe(0);
  });
  it('meets targets check', () => {
    const t = new RetentionTracker();
    expect(t.meetsTargets({ d1: 80, d7: 45, d30: 30, cohort: 'x' })).toEqual({
      d7Ok: true,
      d30Ok: true,
    });
    expect(t.meetsTargets({ d1: 80, d7: 30, d30: 20, cohort: 'x' })).toEqual({
      d7Ok: false,
      d30Ok: false,
    });
  });
});
describe('NPSTracker', () => {
  it('calculates NPS correctly', () => {
    const n = new NPSTracker();
    n.submitSurvey('u1', 10, 'great');
    n.submitSurvey('u2', 9, 'good');
    n.submitSurvey('u3', 5, 'meh');
    const s = n.calculateNPS();
    expect(s.promoters).toBe(2);
    expect(s.detractors).toBe(1);
    expect(s.score).toBe(33);
    expect(n.meetsTarget(s.score)).toBe(false);
    expect(n.meetsTarget(40)).toBe(true);
  });
  it('rejects scores outside 0-10', () => {
    const n = new NPSTracker();
    expect(n.submitSurvey('u1', -1, 'bad')).toBeNull();
    expect(n.submitSurvey('u2', 11, 'over')).toBeNull();
    expect(n.submitSurvey('u3', 0, 'low')).not.toBeNull();
    expect(n.submitSurvey('u4', 10, 'high')).not.toBeNull();
    expect(n.calculateNPS().responseCount).toBe(2);
  });
});
describe('FeatureFlagService', () => {
  it('create, enable, killswitch, rollout', () => {
    const f = new FeatureFlagService();
    const flag = f.createFlag('dark-mode', { cohorts: ['power'] });
    expect(f.isEnabled(flag.id, 'u1', 'power')).toBe(true);
    expect(f.isEnabled(flag.id, 'u1', 'elderly')).toBe(false);
    f.toggleKillSwitch(flag.id, true);
    expect(f.isEnabled(flag.id, 'u1', 'power')).toBe(false);
    f.toggleKillSwitch(flag.id, false);
    f.setRollout(flag.id, 50);
    expect(f.getFlag(flag.id)?.rolloutPercent).toBe(50);
  });
});
describe('BugReporter', () => {
  it('returns reports sorted by priority then createdAt', () => {
    const b = new BugReporter();
    const r1 = b.report('u1', 'low bug', 1);
    const r2 = b.report('u1', 'high bug', 5);
    const r3 = b.report('u2', 'high bug old', 5);
    const queue = b.getPriorityQueue();
    expect(queue[0]!.id).toBe(r2.id);
    expect(queue[1]!.id).toBe(r3.id);
    expect(queue[2]!.id).toBe(r1.id);
  });
  it('filters reports by user', () => {
    const b = new BugReporter();
    b.report('u1', 'bug a', 3);
    b.report('u2', 'bug b', 2);
    b.report('u1', 'bug c', 1);
    const u1Reports = b.getReportsByUser('u1');
    expect(u1Reports).toHaveLength(2);
    expect(u1Reports.every((r) => r.userId === 'u1')).toBe(true);
    expect(b.getReportsByUser('u3')).toHaveLength(0);
  });
});
