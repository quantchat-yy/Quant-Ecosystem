export type GoalState = 'pending' | 'decomposing' | 'running' | 'completed' | 'failed';
export interface BudgetConfig {
  maxTimeMs: number;
  maxTokens: number;
  maxCostCents: number;
}
export interface SwarmGoal {
  id: string;
  description: string;
  state: GoalState;
  subGoals: SubGoal[];
  budget: BudgetConfig;
  createdAt: number;
}
export interface SubGoal {
  id: string;
  parentId: string;
  description: string;
  assignedAgent: string | null;
  state: GoalState;
}
export interface AgentAssignment {
  agentId: string;
  subGoalId: string;
  assignedAt: number;
  completedAt: number | null;
}
export interface SwarmAuditEntry {
  goalId: string;
  agentId: string;
  action: string;
  timestamp: number;
  detail: string;
}
