import { SwarmOrchestrator } from '../orchestrator/swarm-orchestrator.js';
import { SwarmBudget } from '../budget/swarm-budget.js';
import { SharedScratchpad } from '../scratchpad/shared-scratchpad.js';
import { SwarmAudit } from '../audit/swarm-audit.js';
describe('SwarmOrchestrator', () => {
  it('lifecycle: create, decompose, assign, complete, progress, timeout', () => {
    const o = new SwarmOrchestrator();
    const g = o.createGoal('t', { maxTimeMs: 5000, maxTokens: 100, maxCostCents: 50 });
    expect(g.state).toBe('pending');
    const [s1] = o.decompose(g.id, ['a', 'b']);
    expect(s1!.parentId).toBe(g.id);
    expect(g.state).toBe('decomposing');
    expect(o.assign(s1!.id, 'ag1').agentId).toBe('ag1');
    expect(o.completeSubGoal(s1!.id)).toBe(true);
    expect(o.getProgress(g.id)).toEqual({ total: 2, completed: 1, failed: 0 });
    const t = o.createGoal('x', { maxTimeMs: 0, maxTokens: 1, maxCostCents: 1 });
    expect(o.checkTimeout(t.id)).toBe(true);
  });
});
describe('SwarmBudget', () => {
  it('tracks usage, over-budget, pause at 80%, reset', () => {
    const b = new SwarmBudget();
    b.setBudget('g1', { maxTimeMs: 1000, maxTokens: 100, maxCostCents: 50 });
    b.track('g1', 30, 15, 300);
    expect(b.getUsage('g1')).toEqual({ tokens: 30, cost: 15, time: 300 });
    b.track('g1', 71, 0, 0);
    expect(b.isOverBudget('g1')).toBe(true);
    b.reset('g1');
    b.track('g1', 80, 0, 0);
    expect(b.shouldPause('g1')).toBe(true);
  });
});
describe('SharedScratchpad', () => {
  it('write/read/merge/history', () => {
    const p = new SharedScratchpad();
    p.write('g1', 'k', 'v1', 'a1');
    expect(p.read('g1', 'k')).toBe('v1');
    expect(p.read('g1', 'x')).toBeNull();
    p.merge('g1', { x: 10 }, 'a2');
    expect(p.read('g1', 'x')).toBe(10);
    p.write('g1', 'k', 'v2', 'a2');
    expect(p.read('g1', 'k')).toBe('v2');
    expect(p.getHistory('g1', 'k')).toHaveLength(2);
  });
});
describe('SwarmAudit', () => {
  it('logs, queries by goal/agent, replays in order', () => {
    const a = new SwarmAudit();
    a.log({ goalId: 'g1', agentId: 'a1', action: 'x', timestamp: 100, detail: '' });
    a.log({ goalId: 'g2', agentId: 'a1', action: 'y', timestamp: 2, detail: '' });
    a.log({ goalId: 'g1', agentId: 'a2', action: 'z', timestamp: 50, detail: '' });
    expect(a.getByGoal('g1')).toHaveLength(2);
    expect(a.getByAgent('a1')).toHaveLength(2);
    expect(a.replay('g1')[0]!.timestamp).toBe(50);
  });
});
