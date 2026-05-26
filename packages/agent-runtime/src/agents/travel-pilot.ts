import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface TripPlan {
  destination: string;
  startDate: number;
  endDate: number;
  budget: number;
  activities: TripActivity[];
}

export interface TripActivity {
  name: string;
  date: number;
  estimatedCost: number;
  category: 'transport' | 'accommodation' | 'food' | 'activity' | 'other';
  booked: boolean;
}

export interface TravelResult {
  plan: TripPlan | null;
  totalEstimatedCost: number;
  withinBudget: boolean;
  suggestions: string[];
}

export class TravelPilot extends WorkerAgent {
  private lastResult: TravelResult | null = null;

  constructor() {
    super({
      id: 'travel-pilot',
      name: 'Travel Pilot',
      icon: 'map-pin',
      defaultPermission: PermissionLevel.ACT_HIGH,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const destination = (task.params?.['destination'] as string) ?? '';
      const budget = (task.params?.['budget'] as number) ?? 1000;
      const startDate = (task.params?.['startDate'] as number) ?? Date.now();
      const endDate = (task.params?.['endDate'] as number) ?? startDate + 7 * 24 * 60 * 60 * 1000;

      const activities = this.planActivities(destination, startDate, endDate);
      const totalEstimatedCost = activities.reduce((sum, a) => sum + a.estimatedCost, 0);

      const plan: TripPlan = {
        destination,
        startDate,
        endDate,
        budget,
        activities,
      };

      this.lastResult = {
        plan,
        totalEstimatedCost,
        withinBudget: totalEstimatedCost <= budget,
        suggestions: this.generateSuggestions(destination, totalEstimatedCost, budget),
      };

      this.logAction(`travel-plan:${destination}`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getTravelResult(): TravelResult | null {
    return this.lastResult;
  }

  private planActivities(destination: string, startDate: number, endDate: number): TripActivity[] {
    const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    const activities: TripActivity[] = [
      {
        name: `Flight to ${destination}`,
        date: startDate,
        estimatedCost: 300,
        category: 'transport',
        booked: false,
      },
      {
        name: `Hotel in ${destination}`,
        date: startDate,
        estimatedCost: 100 * days,
        category: 'accommodation',
        booked: false,
      },
    ];

    for (let i = 0; i < Math.min(days, 5); i++) {
      activities.push({
        name: `Day ${i + 1} activity in ${destination}`,
        date: startDate + i * 24 * 60 * 60 * 1000,
        estimatedCost: 50,
        category: 'activity',
        booked: false,
      });
    }

    return activities;
  }

  private generateSuggestions(destination: string, totalCost: number, budget: number): string[] {
    const suggestions: string[] = [];
    if (totalCost > budget) {
      suggestions.push(`Consider shorter stay to fit within $${budget} budget`);
      suggestions.push('Look for budget accommodation options');
    } else {
      suggestions.push(`You have $${budget - totalCost} remaining for extras in ${destination}`);
    }
    return suggestions;
  }
}
