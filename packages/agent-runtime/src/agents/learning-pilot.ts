import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'article' | 'video' | 'book';
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  completed: boolean;
}

export interface LearningPath {
  goal: string;
  resources: LearningResource[];
  totalHours: number;
  progress: number;
}

export interface LearningResult {
  recommendations: LearningResource[];
  path: LearningPath | null;
  nextStep: LearningResource | null;
}

export class LearningPilot extends WorkerAgent {
  private lastResult: LearningResult | null = null;

  constructor() {
    super({
      id: 'learning-pilot',
      name: 'Learning Pilot',
      icon: 'book-open',
      defaultPermission: PermissionLevel.SUGGEST,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const goal = (task.params?.['goal'] as string) ?? '';
      const resources = (task.params?.['resources'] as LearningResource[] | undefined) ?? [];
      const currentLevel = (task.params?.['level'] as string) ?? 'beginner';

      const filtered = this.filterByLevel(resources, currentLevel);
      const sorted = this.prioritizeResources(filtered);
      const completed = resources.filter((r) => r.completed);
      const totalHours = sorted.reduce((sum, r) => sum + r.estimatedHours, 0);
      const completedHours = completed.reduce((sum, r) => sum + r.estimatedHours, 0);
      const progress = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

      const nextStep = sorted.find((r) => !r.completed) ?? null;

      this.lastResult = {
        recommendations: sorted.slice(0, 5),
        path: {
          goal,
          resources: sorted,
          totalHours,
          progress,
        },
        nextStep,
      };

      this.logAction(`learning-recommend:${goal}`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getLearningResult(): LearningResult | null {
    return this.lastResult;
  }

  private filterByLevel(resources: LearningResource[], level: string): LearningResource[] {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const levelIdx = levels.indexOf(level);
    return resources.filter((r) => levels.indexOf(r.difficulty) <= levelIdx + 1);
  }

  private prioritizeResources(resources: LearningResource[]): LearningResource[] {
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    return [...resources].sort(
      (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty],
    );
  }
}
