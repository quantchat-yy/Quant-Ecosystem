import { LaunchChecklistManager } from '../checklist/launch-checklist.js';
import { StatusPageService } from '../status/status-page.js';
import { QuantCoach } from '../support/support-agent.js';
import { AppStoreTracker } from '../store/app-store-tracker.js';

describe('LaunchChecklistManager', () => {
  it('tracks gates and ready status', () => {
    const m = new LaunchChecklistManager();
    expect(m.isReadyToLaunch()).toBe(false);
    m.passGate('pen-test-clean');
    m.passGate('nps-gte-40');
    m.passGate('d30-gte-25');
    m.passGate('zero-p0-incidents');
    m.passGate('app-store-approved');
    expect(m.isReadyToLaunch()).toBe(true);
    const s = m.getStatus();
    expect(s.allHardGatesPassed).toBe(true);
    expect(s.gates).toHaveLength(5);
  });
  it('fail gate blocks launch', () => {
    const m = new LaunchChecklistManager();
    m.passGate('pen-test-clean');
    m.passGate('nps-gte-40');
    m.passGate('d30-gte-25');
    m.passGate('zero-p0-incidents');
    m.passGate('app-store-approved');
    m.failGate('pen-test-clean');
    expect(m.isReadyToLaunch()).toBe(false);
  });
  it('addGate works', () => {
    const m = new LaunchChecklistManager();
    m.addGate('custom', false);
    expect(m.getStatus().gates).toHaveLength(6);
  });
});

describe('StatusPageService', () => {
  it('creates and resolves incidents', () => {
    const s = new StatusPageService();
    const inc = s.createIncident('DB down', 1);
    expect(inc.status).toBe('investigating');
    expect(s.getActiveIncidents()).toHaveLength(1);
    s.updateIncident(inc.id, 'identified');
    s.resolveIncident(inc.id);
    expect(s.getActiveIncidents()).toHaveLength(0);
  });
  it('calculates uptime', () => {
    const s = new StatusPageService();
    expect(s.calculateUptime(1000000, 500)).toBeCloseTo(99.95);
    expect(s.meetsTarget(99.95)).toBe(true);
    expect(s.meetsTarget(99.8)).toBe(false);
  });
});

describe('QuantCoach', () => {
  it('auto-answers matching FAQ', () => {
    const c = new QuantCoach();
    c.addFAQ('how to reset password', 'Go to settings > security');
    const t = c.askQuestion('u1', 'how to reset password');
    expect(t.confidence).toBeGreaterThanOrEqual(0.6);
    expect(t.escalated).toBe(false);
    expect(t.answer).toBe('Go to settings > security');
  });
  it('escalates low confidence', () => {
    const c = new QuantCoach();
    c.addFAQ('how to reset password', 'Go to settings');
    const t = c.askQuestion('u1', 'what is quantum physics');
    expect(t.escalated).toBe(true);
    expect(t.status).toBe('escalated');
    expect(c.getEscalated()).toHaveLength(1);
  });
  it('resolves ticket', () => {
    const c = new QuantCoach();
    c.addFAQ('help', 'yes');
    const t = c.askQuestion('u1', 'random question xyz');
    c.resolveTicket(t.id, 'Done');
    expect(c.getEscalated()).toHaveLength(0);
    expect(c.getOpenTickets()).toHaveLength(0);
  });
});

describe('AppStoreTracker', () => {
  it('submits and tracks status', () => {
    const a = new AppStoreTracker();
    a.submitApp('ios');
    expect(a.getStatus('ios')).toBe('submitted');
    a.updateStatus('ios', 'approved');
    expect(a.getStatus('ios')).toBe('approved');
  });
  it('tracks ratings', () => {
    const a = new AppStoreTracker();
    a.addRating('android', 5);
    a.addRating('android', 4);
    a.addRating('android', 5);
    expect(a.getAverageRating('android')).toBeCloseTo(4.67);
    expect(a.meetsRatingTarget('android')).toBe(true);
    expect(a.getReviewCount('android')).toBe(3);
  });
  it('fails rating target', () => {
    const a = new AppStoreTracker();
    a.addRating('ios', 3);
    a.addRating('ios', 4);
    expect(a.meetsRatingTarget('ios')).toBe(false);
  });
});
