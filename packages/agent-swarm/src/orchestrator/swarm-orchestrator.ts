import type { BudgetConfig, SwarmGoal, SubGoal, AgentAssignment } from '../types.js';
const uid = () => crypto.randomUUID();
const now = () => Date.now();
export class SwarmOrchestrator {
  private goals = new Map<string, SwarmGoal>();
  private subs = new Map<string, SubGoal>();
  private asgn = new Map<string, AgentAssignment>();
  createGoal(desc: string, budget: BudgetConfig): SwarmGoal {
    // prettier-ignore
    const g: SwarmGoal = { id: uid(), description: desc, state: 'pending', subGoals: [], budget, createdAt: now() };
    this.goals.set(g.id, g);
    return g;
  }
  decompose(gid: string, descs: string[]): SubGoal[] {
    const g = this.goals.get(gid);
    if (!g) return [];
    g.state = 'decomposing';
    g.subGoals = descs.map((d) => {
      // prettier-ignore
      const s: SubGoal = { id: uid(), parentId: gid, description: d, assignedAgent: null, state: 'pending' };
      this.subs.set(s.id, s);
      return s;
    });
    return g.subGoals;
  }
  assign(sid: string, agentId: string): AgentAssignment {
    const s = this.subs.get(sid);
    if (s) {
      s.assignedAgent = agentId;
      s.state = 'running';
    }
    // prettier-ignore
    const a: AgentAssignment = { agentId, subGoalId: sid, assignedAt: now(), completedAt: null };
    this.asgn.set(sid, a);
    return a;
  }
  completeSubGoal(sid: string): boolean {
    const s = this.subs.get(sid);
    if (!s) return false;
    s.state = 'completed';
    const a = this.asgn.get(sid);
    if (a) a.completedAt = now();
    return true;
  }
  getProgress(gid: string) {
    const g = this.goals.get(gid);
    if (!g) return { total: 0, completed: 0, failed: 0 };
    const ss = g.subGoals;
    // prettier-ignore
    return { total: ss.length, completed: ss.filter((x) => x.state === 'completed').length, failed: ss.filter((x) => x.state === 'failed').length };
  }
  checkTimeout(gid: string): boolean {
    const g = this.goals.get(gid);
    return g ? now() - g.createdAt >= g.budget.maxTimeMs : false;
  }
}
