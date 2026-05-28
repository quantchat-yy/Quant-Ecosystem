import type { BudgetConfig } from '../types.js';
type U = { tokens: number; cost: number; time: number };
const Z: U = { tokens: 0, cost: 0, time: 0 };
export class SwarmBudget {
  private usage = new Map<string, U>();
  private budgets = new Map<string, BudgetConfig>();
  // prettier-ignore
  setBudget(id: string, c: BudgetConfig): void { this.budgets.set(id, c); }
  track(id: string, tokens: number, cost: number, time: number): void {
    const u = this.usage.get(id) ?? { ...Z };
    u.tokens += tokens;
    u.cost += cost;
    u.time += time;
    this.usage.set(id, u);
  }
  // prettier-ignore
  getUsage(id: string): U { return this.usage.get(id) ?? { ...Z }; }
  isOverBudget(id: string): boolean {
    const b = this.budgets.get(id);
    if (!b) return false;
    const u = this.getUsage(id);
    return u.tokens > b.maxTokens || u.cost > b.maxCostCents || u.time > b.maxTimeMs;
  }
  shouldPause(id: string): boolean {
    const b = this.budgets.get(id);
    if (!b) return false;
    const u = this.getUsage(id);
    // prettier-ignore
    return u.tokens >= b.maxTokens * 0.8 || u.cost >= b.maxCostCents * 0.8 || u.time >= b.maxTimeMs * 0.8;
  }
  // prettier-ignore
  reset(id: string): void { this.usage.set(id, { ...Z }); }
}
