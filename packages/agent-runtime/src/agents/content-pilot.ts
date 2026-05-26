import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface ContentDraft {
  id: string;
  title: string;
  body: string;
  format: 'article' | 'blog' | 'newsletter' | 'social';
  wordCount: number;
  keywords: string[];
}

export interface ContentResult {
  drafts: ContentDraft[];
  outline: string[];
  estimatedReadTime: number;
}

export class ContentPilot extends WorkerAgent {
  private lastResult: ContentResult | null = null;

  constructor() {
    super({
      id: 'content-pilot',
      name: 'Content Pilot',
      icon: 'file-text',
      defaultPermission: PermissionLevel.SUGGEST,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const topic = (task.params?.['topic'] as string) ?? '';
      const format = (task.params?.['format'] as ContentDraft['format']) ?? 'article';
      const keywords = (task.params?.['keywords'] as string[] | undefined) ?? [];

      const outline = this.generateOutline(topic, format);
      const body = this.generateBody(topic, outline);
      const wordCount = body.split(/\s+/).length;

      const draft: ContentDraft = {
        id: `content-${Date.now()}`,
        title: `${topic.charAt(0).toUpperCase()}${topic.slice(1)}: A Comprehensive Guide`,
        body,
        format,
        wordCount,
        keywords,
      };

      this.lastResult = {
        drafts: [draft],
        outline,
        estimatedReadTime: Math.ceil(wordCount / 200),
      };

      this.logAction(`content-create:${format}`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getContentResult(): ContentResult | null {
    return this.lastResult;
  }

  private generateOutline(topic: string, format: string): string[] {
    if (format === 'social') {
      return [`Hook about ${topic}`, 'Key point', 'Call to action'];
    }
    return [
      `Introduction to ${topic}`,
      'Background and context',
      'Key insights',
      'Practical applications',
      'Conclusion and next steps',
    ];
  }

  private generateBody(topic: string, outline: string[]): string {
    return outline
      .map(
        (section) =>
          `## ${section}\n\nThis section covers ${section.toLowerCase()} related to ${topic}.`,
      )
      .join('\n\n');
  }
}
