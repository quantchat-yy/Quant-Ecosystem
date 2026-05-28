import type { SwarmAuditEntry } from '../types.js';
export class SwarmAudit {
  private entries: SwarmAuditEntry[] = [];
  // prettier-ignore
  log(entry: SwarmAuditEntry): void { this.entries.push(entry); }
  // prettier-ignore
  getByGoal(goalId: string): SwarmAuditEntry[] { return this.entries.filter((e) => e.goalId === goalId); }
  // prettier-ignore
  getByAgent(agentId: string): SwarmAuditEntry[] { return this.entries.filter((e) => e.agentId === agentId); }
  replay(goalId: string): SwarmAuditEntry[] {
    return this.getByGoal(goalId).sort((a, b) => a.timestamp - b.timestamp);
  }
}
