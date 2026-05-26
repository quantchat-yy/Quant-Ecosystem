import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  scheduledTime?: number;
  hashtags: string[];
}

export interface SocialResult {
  drafted: SocialPost[];
  scheduled: SocialPost[];
  suggestions: string[];
}

export class SocialPilot extends WorkerAgent {
  private lastResult: SocialResult | null = null;

  constructor() {
    super({
      id: 'social-pilot',
      name: 'Social Pilot',
      icon: 'share-2',
      defaultPermission: PermissionLevel.SUGGEST,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const action = (task.params?.['action'] as string) ?? 'draft';
      const posts = (task.params?.['posts'] as SocialPost[] | undefined) ?? [];
      const topic = (task.params?.['topic'] as string) ?? '';

      this.lastResult = { drafted: [], scheduled: [], suggestions: [] };

      if (action === 'draft') {
        // Generate content suggestions
        if (topic) {
          this.lastResult.suggestions = this.generateSuggestions(topic);
        }
        this.lastResult.drafted = posts;
      } else if (action === 'schedule') {
        // Optimize scheduling times
        this.lastResult.scheduled = posts.map((post) => ({
          ...post,
          scheduledTime: post.scheduledTime ?? this.getOptimalPostTime(post.platform),
        }));
      }

      this.logAction(`social-${action}:${posts.length} posts`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getSocialResult(): SocialResult | null {
    return this.lastResult;
  }

  private generateSuggestions(topic: string): string[] {
    return [
      `Share insights about ${topic} with your audience`,
      `Create a thread discussing ${topic} trends`,
      `Post a question about ${topic} to boost engagement`,
    ];
  }

  private getOptimalPostTime(platform: string): number {
    // Simulated optimal posting times (9 AM next day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(platform === 'linkedin' ? 8 : 9, 0, 0, 0);
    return tomorrow.getTime();
  }
}
