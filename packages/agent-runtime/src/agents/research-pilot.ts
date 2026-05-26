import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

export interface ResearchResult {
  query: string;
  summary: string;
  sources: ResearchSource[];
  keyFindings: string[];
}

export class ResearchPilot extends WorkerAgent {
  private lastResult: ResearchResult | null = null;

  constructor() {
    super({
      id: 'research-pilot',
      name: 'Research Pilot',
      icon: 'search',
      defaultPermission: PermissionLevel.ACT_LOW,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const query = (task.params?.['query'] as string) ?? '';
      const sources = (task.params?.['sources'] as ResearchSource[] | undefined) ?? [];

      const rankedSources = this.rankSources(sources);
      const summary = this.generateSummary(query, rankedSources);
      const keyFindings = this.extractKeyFindings(rankedSources);

      this.lastResult = {
        query,
        summary,
        sources: rankedSources,
        keyFindings,
      };

      this.logAction(`research:${query}`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getResearchResult(): ResearchResult | null {
    return this.lastResult;
  }

  private rankSources(sources: ResearchSource[]): ResearchSource[] {
    return [...sources].sort((a, b) => b.relevance - a.relevance);
  }

  private generateSummary(query: string, sources: ResearchSource[]): string {
    if (sources.length === 0) {
      return `No sources found for "${query}".`;
    }
    const topSnippets = sources.slice(0, 3).map((s) => s.snippet);
    return `Research on "${query}": ${topSnippets.join(' ')}`;
  }

  private extractKeyFindings(sources: ResearchSource[]): string[] {
    return sources
      .filter((s) => s.relevance > 0.7)
      .map((s) => `From "${s.title}": ${s.snippet.slice(0, 100)}`);
  }
}
