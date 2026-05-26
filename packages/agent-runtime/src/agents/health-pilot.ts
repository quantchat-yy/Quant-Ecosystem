import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface HealthReminder {
  id: string;
  message: string;
  dueTime: number;
  recurring: boolean;
}

export interface HealthResult {
  metrics: HealthMetric[];
  reminders: HealthReminder[];
  trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable' }>;
}

export class HealthPilot extends WorkerAgent {
  private lastResult: HealthResult | null = null;

  constructor() {
    super({
      id: 'health-pilot',
      name: 'Health Pilot',
      icon: 'heart',
      defaultPermission: PermissionLevel.OBSERVE,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const metrics = (task.params?.['metrics'] as HealthMetric[] | undefined) ?? [];
      const reminders = (task.params?.['reminders'] as HealthReminder[] | undefined) ?? [];

      const trends = this.analyzeTrends(metrics);

      this.lastResult = { metrics, reminders, trends };

      this.logAction(`health-track:${metrics.length} metrics`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getHealthResult(): HealthResult | null {
    return this.lastResult;
  }

  private analyzeTrends(
    metrics: HealthMetric[],
  ): Array<{ metric: string; trend: 'up' | 'down' | 'stable' }> {
    const grouped = new Map<string, number[]>();
    for (const m of metrics) {
      const values = grouped.get(m.type) ?? [];
      values.push(m.value);
      grouped.set(m.type, values);
    }

    const trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable' }> = [];
    for (const [type, values] of grouped) {
      if (values.length < 2) {
        trends.push({ metric: type, trend: 'stable' });
      } else {
        const first = values[0]!;
        const last = values[values.length - 1]!;
        const diff = last - first;
        if (diff > 0) trends.push({ metric: type, trend: 'up' });
        else if (diff < 0) trends.push({ metric: type, trend: 'down' });
        else trends.push({ metric: type, trend: 'stable' });
      }
    }

    return trends;
  }
}
