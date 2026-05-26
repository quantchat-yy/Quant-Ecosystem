import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface CodeChange {
  file: string;
  additions: number;
  deletions: number;
  content: string;
}

export interface CodeReviewResult {
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  score: number;
}

export interface CodeIssue {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface CodeSuggestion {
  file: string;
  line: number;
  original: string;
  suggested: string;
  reason: string;
}

export class CodePilot extends WorkerAgent {
  private lastReview: CodeReviewResult | null = null;

  constructor() {
    super({
      id: 'code-pilot',
      name: 'Code Pilot',
      icon: 'code',
      defaultPermission: PermissionLevel.SUGGEST,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const changes = (task.params?.['changes'] as CodeChange[] | undefined) ?? [];
      this.lastReview = this.analyzeChanges(changes);

      this.logAction(`code-review:${changes.length} files`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getLastReview(): CodeReviewResult | null {
    return this.lastReview;
  }

  private analyzeChanges(changes: CodeChange[]): CodeReviewResult {
    const issues: CodeIssue[] = [];
    const suggestions: CodeSuggestion[] = [];

    for (const change of changes) {
      // Check for common issues
      if (change.content.includes('console.log')) {
        issues.push({
          file: change.file,
          line: this.findLineNumber(change.content, 'console.log'),
          severity: 'warning',
          message: 'Remove console.log before committing',
        });
      }

      if (change.content.includes('any')) {
        issues.push({
          file: change.file,
          line: this.findLineNumber(change.content, 'any'),
          severity: 'error',
          message: 'Avoid using "any" type',
        });
      }

      // Check for large additions without tests
      if (change.additions > 50 && !change.file.includes('.test.')) {
        suggestions.push({
          file: change.file,
          line: 1,
          original: '',
          suggested: 'Add corresponding test file',
          reason: 'Large addition without test coverage',
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * 10 - suggestions.length * 5);

    return { issues, suggestions, score };
  }

  private findLineNumber(content: string, search: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes(search)) {
        return i + 1;
      }
    }
    return 1;
  }
}
