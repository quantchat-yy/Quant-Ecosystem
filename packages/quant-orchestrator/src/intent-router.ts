import type { IntentType, RoutedIntent, SessionContext } from './types.js';

export class IntentRouter {
  private toolKeywords = [
    'send',
    'search',
    'create',
    'delete',
    'open',
    'read',
    'find',
    'schedule',
    'set',
    'check',
    'show',
    'get',
    'list',
    'update',
    'move',
    'copy',
  ];

  private automationKeywords = [
    'automate',
    'every time',
    'whenever',
    'when i',
    'routine',
    'workflow',
    'trigger',
    'if then',
    'on event',
  ];

  private codexKeywords = [
    'build app',
    'create app',
    'new app',
    'scaffold',
    'generate app',
    'deploy app',
    'make me an app',
  ];

  route(transcript: string, _context: SessionContext): RoutedIntent {
    const normalized = transcript.toLowerCase();

    const codexMatches = this.countPhraseMatches(normalized, this.codexKeywords);
    if (codexMatches > 0) {
      return this.buildIntent('codex', codexMatches, transcript, {
        codexCommand: normalized,
      });
    }

    const automationMatches = this.countPhraseMatches(normalized, this.automationKeywords);
    if (automationMatches > 0) {
      return this.buildIntent('automation', automationMatches, transcript, {
        automationId: `auto-${Date.now()}`,
      });
    }

    const toolMatches = this.countWordMatches(normalized, this.toolKeywords);
    if (toolMatches > 0) {
      return this.buildIntent('tool', toolMatches, transcript, {
        toolId: this.extractToolId(normalized),
      });
    }

    return this.buildIntent('conversation', 0, transcript, {});
  }

  private countPhraseMatches(text: string, phrases: string[]): number {
    let count = 0;
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        count++;
      }
    }
    return count;
  }

  private countWordMatches(text: string, keywords: string[]): number {
    const words = text.split(/\s+/);
    let count = 0;
    for (const keyword of keywords) {
      if (words.includes(keyword)) {
        count++;
      }
    }
    return count;
  }

  private extractToolId(text: string): string {
    const words = text.split(/\s+/);
    for (const keyword of this.toolKeywords) {
      if (words.includes(keyword)) {
        return keyword;
      }
    }
    return 'unknown';
  }

  private computeConfidence(matchCount: number, maxPossible: number): number {
    if (maxPossible === 0) return 0.1;
    const raw = matchCount / maxPossible;
    return Math.min(0.95, 0.3 + raw * 0.65);
  }

  private buildIntent(
    type: IntentType,
    matchCount: number,
    rawTranscript: string,
    extra: { toolId?: string; automationId?: string; codexCommand?: string },
  ): RoutedIntent {
    const maxMap: Record<IntentType, number> = {
      codex: this.codexKeywords.length,
      automation: this.automationKeywords.length,
      tool: this.toolKeywords.length,
      conversation: 1,
    };

    return {
      type,
      confidence: type === 'conversation' ? 0.1 : this.computeConfidence(matchCount, maxMap[type]),
      rawTranscript,
      ...extra,
    };
  }
}
