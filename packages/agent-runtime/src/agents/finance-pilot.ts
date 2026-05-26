import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: number;
  recurring: boolean;
}

export interface FinanceInsight {
  totalSpending: number;
  categoryBreakdown: Record<string, number>;
  topCategory: string;
  averageDaily: number;
  recurringTotal: number;
}

export class FinancePilot extends WorkerAgent {
  private lastInsight: FinanceInsight | null = null;

  constructor() {
    super({
      id: 'finance-pilot',
      name: 'Finance Pilot',
      icon: 'dollar-sign',
      defaultPermission: PermissionLevel.OBSERVE,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const expenses = (task.params?.['expenses'] as Expense[] | undefined) ?? [];
      this.lastInsight = this.analyzeExpenses(expenses);

      this.logAction(`finance-analysis:${expenses.length} expenses`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getInsight(): FinanceInsight | null {
    return this.lastInsight;
  }

  private analyzeExpenses(expenses: Expense[]): FinanceInsight {
    const categoryBreakdown: Record<string, number> = {};
    let totalSpending = 0;
    let recurringTotal = 0;

    for (const expense of expenses) {
      totalSpending += expense.amount;
      categoryBreakdown[expense.category] =
        (categoryBreakdown[expense.category] ?? 0) + expense.amount;
      if (expense.recurring) {
        recurringTotal += expense.amount;
      }
    }

    const topCategory =
      Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'none';

    const days = expenses.length > 0 ? this.getUniqueDays(expenses) : 1;
    const averageDaily = totalSpending / days;

    return { totalSpending, categoryBreakdown, topCategory, averageDaily, recurringTotal };
  }

  private getUniqueDays(expenses: Expense[]): number {
    const days = new Set(expenses.map((e) => new Date(e.date).toISOString().split('T')[0]));
    return Math.max(days.size, 1);
  }
}
