// ============================================================================
// Trust & Safety - Hate Speech Classifier
// Multi-category detection, severity scoring, context window analysis,
// negation detection, dog-whistle patterns, multi-language, explanations
// ============================================================================

import type {
  HateSpeechCategory,
  ToxicityLevel,
  ContentClassification,
  ClassificationLabel,
} from '../types';

/** Keyword entry in a lexicon */
interface LexiconEntry {
  term: string;
  category: HateSpeechCategory;
  baseSeverity: number;
  language: string;
  isPattern: boolean;
}

/** Dog-whistle pattern */
interface DogWhistlePattern {
  pattern: string;
  category: HateSpeechCategory;
  severity: number;
  description: string;
}

/** Context rule for modifying severity */
interface ContextRule {
  contextTerms: string[];
  modifier: number; // Multiply severity by this
  description: string;
}

/** Allowlist context for false positive reduction */
interface AllowlistContext {
  terms: string[];
  description: string;
}

/** Flagged span in text */
interface FlaggedSpan {
  start: number;
  end: number;
  term: string;
  category: HateSpeechCategory;
  severity: number;
  reason: string;
}

/** Classification result with explanations */
interface ClassificationExplanation {
  classification: ContentClassification;
  flaggedSpans: FlaggedSpan[];
  explanation: string;
  appliedRules: string[];
}

/**
 * HateSpeechClassifier performs multi-category hate speech detection using
 * keyword lexicons with context-aware severity scoring, negation detection,
 * dog-whistle pattern matching, multi-language support, and explanation generation.
 */
export class HateSpeechClassifier {
  private readonly lexicons: Map<string, LexiconEntry[]>;
  private readonly dogWhistles: DogWhistlePattern[];
  private readonly contextRules: ContextRule[];
  private readonly allowlists: AllowlistContext[];
  private readonly negationTerms: Set<string>;
  private readonly amplifiers: Set<string>;
  private classificationCounter: number;

  constructor() {
    this.lexicons = new Map();
    this.dogWhistles = [];
    this.contextRules = [];
    this.allowlists = [];
    this.classificationCounter = 0;

    // Default negation terms that reduce severity
    this.negationTerms = new Set([
      'not',
      'no',
      'never',
      'none',
      'neither',
      'nor',
      'nobody',
      'nothing',
      'nowhere',
      'cannot',
      "can't",
      "don't",
      "doesn't",
      "didn't",
      "won't",
      "wouldn't",
      "shouldn't",
      "isn't",
      "aren't",
      "wasn't",
      "weren't",
    ]);

    // Amplifiers that increase severity
    this.amplifiers = new Set([
      'very',
      'extremely',
      'absolutely',
      'totally',
      'completely',
      'utterly',
      'fucking',
      'damn',
      'all',
      'every',
      'always',
    ]);

    // Default allowlist contexts for false positive reduction
    this.allowlists.push(
      {
        terms: ['news', 'report', 'article', 'journalist', 'coverage'],
        description: 'news_reporting',
      },
      {
        terms: ['education', 'study', 'research', 'academic', 'history', 'lesson'],
        description: 'educational',
      },
      {
        terms: ['quote', 'quoted', 'said', 'wrote', 'stated', 'according'],
        description: 'quotation',
      },
      {
        terms: ['definition', 'meaning', 'term', 'word', 'dictionary'],
        description: 'linguistic_discussion',
      },
    );
  }

  /**
   * Add a lexicon for a specific language
   */
  addLexicon(
    language: string,
    entries: Array<{
      term: string;
      category: HateSpeechCategory;
      severity: number;
      isPattern?: boolean;
    }>,
  ): void {
    const lexiconEntries: LexiconEntry[] = entries.map((e) => ({
      term: e.term.toLowerCase(),
      category: e.category,
      baseSeverity: Math.max(0, Math.min(1, e.severity)),
      language,
      isPattern: e.isPattern ?? false,
    }));

    const existing = this.lexicons.get(language) ?? [];
    this.lexicons.set(language, [...existing, ...lexiconEntries]);
  }

  /**
   * Add a dog-whistle pattern
   */
  addDogWhistle(
    pattern: string,
    category: HateSpeechCategory,
    severity: number,
    description: string,
  ): void {
    this.dogWhistles.push({
      pattern: pattern.toLowerCase(),
      category,
      severity: Math.max(0, Math.min(1, severity)),
      description,
    });
  }

  /**
   * Add a context rule that modifies severity
   */
  addContextRule(contextTerms: string[], modifier: number, description: string): void {
    this.contextRules.push({
      contextTerms: contextTerms.map((t) => t.toLowerCase()),
      modifier,
      description,
    });
  }

  /**
   * Classify text content for hate speech
   */
  classify(text: string, language: string = 'en'): ClassificationExplanation {
    const lowerText = text.toLowerCase();
    const words = this.tokenize(lowerText);
    const flaggedSpans: FlaggedSpan[] = [];
    const appliedRules: string[] = [];

    // Check for allowlist context (reduce false positives)
    const isAllowlistContext = this.checkAllowlistContext(words);
    if (isAllowlistContext) {
      appliedRules.push(`Allowlist context detected: ${isAllowlistContext}`);
    }

    // Scan lexicon entries
    const lexicon = this.lexicons.get(language) ?? [];
    for (const entry of lexicon) {
      const matches = this.findTermOccurrences(lowerText, entry.term, entry.isPattern);
      for (const match of matches) {
        let severity = entry.baseSeverity;

        // Context window analysis: check surrounding words
        const contextWindow = this.getContextWindow(words, match.wordIndex, 3);

        // Negation detection: reduce severity if preceded by negation
        if (this.hasNegation(contextWindow.before)) {
          severity *= 0.3;
          appliedRules.push(`Negation detected before "${entry.term}"`);
        }

        // Amplifier detection: increase severity
        if (this.hasAmplifier(contextWindow.before)) {
          severity = Math.min(1, severity * 1.5);
          appliedRules.push(`Amplifier detected before "${entry.term}"`);
        }

        // Allowlist context reduces severity
        if (isAllowlistContext) {
          severity *= 0.2;
        }

        if (severity > 0.1) {
          flaggedSpans.push({
            start: match.start,
            end: match.end,
            term: entry.term,
            category: entry.category,
            severity,
            reason: `Matched lexicon term: "${entry.term}" (${entry.category})`,
          });
        }
      }
    }

    // Dog-whistle detection
    for (const dw of this.dogWhistles) {
      if (lowerText.includes(dw.pattern)) {
        const idx = lowerText.indexOf(dw.pattern);
        let severity = dw.severity;
        if (isAllowlistContext) severity *= 0.2;

        if (severity > 0.1) {
          flaggedSpans.push({
            start: idx,
            end: idx + dw.pattern.length,
            term: dw.pattern,
            category: dw.category,
            severity,
            reason: `Dog-whistle pattern: "${dw.pattern}" - ${dw.description}`,
          });
          appliedRules.push(`Dog-whistle: ${dw.description}`);
        }
      }
    }

    // Build classification result
    const classification = this.buildClassification(text, flaggedSpans);
    const explanation = this.generateExplanation(flaggedSpans, appliedRules);

    return {
      classification,
      flaggedSpans,
      explanation,
      appliedRules,
    };
  }

  /**
   * Calculate overall severity score from flagged spans (0-1)
   */
  calculateSeverityScore(spans: FlaggedSpan[]): number {
    if (spans.length === 0) return 0;

    // Use max severity, boosted by number of violations
    const maxSeverity = Math.max(...spans.map((s) => s.severity));
    const countBoost = Math.min(0.3, (spans.length - 1) * 0.1);

    return Math.min(1, maxSeverity + countBoost);
  }

  /**
   * Map severity score to toxicity level
   */
  private severityToToxicity(severity: number): ToxicityLevel {
    if (severity === 0) return 'none';
    if (severity < 0.25) return 'mild';
    if (severity < 0.5) return 'moderate';
    if (severity < 0.75) return 'severe';
    return 'extreme';
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter((w) => w.length > 0);
  }

  /**
   * Find occurrences of a term in text
   */
  private findTermOccurrences(
    text: string,
    term: string,
    isPattern: boolean,
  ): Array<{ start: number; end: number; wordIndex: number }> {
    const matches: Array<{ start: number; end: number; wordIndex: number }> = [];

    if (isPattern) {
      try {
        const regex = new RegExp(term, 'gi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const wordIndex = text.substring(0, match.index).split(/\s+/).length - 1;
          matches.push({ start: match.index, end: match.index + match[0].length, wordIndex });
        }
      } catch {
        // Invalid regex, skip
      }
    } else {
      let startIdx = 0;
      while (true) {
        const idx = text.indexOf(term, startIdx);
        if (idx === -1) break;

        // Check word boundaries
        const before = idx > 0 ? (text[idx - 1] ?? ' ') : ' ';
        const after = idx + term.length < text.length ? (text[idx + term.length] ?? ' ') : ' ';
        if (/\W/.test(before) && /\W/.test(after)) {
          const wordIndex = text.substring(0, idx).split(/\s+/).length - 1;
          matches.push({ start: idx, end: idx + term.length, wordIndex });
        }
        startIdx = idx + 1;
      }
    }

    return matches;
  }

  /**
   * Get words in a context window around a position
   */
  private getContextWindow(
    words: string[],
    centerIndex: number,
    windowSize: number,
  ): { before: string[]; after: string[] } {
    const before = words.slice(Math.max(0, centerIndex - windowSize), centerIndex);
    const after = words.slice(centerIndex + 1, centerIndex + 1 + windowSize);
    return { before, after };
  }

  /**
   * Check if any word in the context is a negation
   */
  private hasNegation(contextWords: string[]): boolean {
    return contextWords.some((w) => this.negationTerms.has(w));
  }

  /**
   * Check if any word in the context is an amplifier
   */
  private hasAmplifier(contextWords: string[]): boolean {
    return contextWords.some((w) => this.amplifiers.has(w));
  }

  /**
   * Check if text is in an allowlist context
   */
  private checkAllowlistContext(words: string[]): string | null {
    const wordSet = new Set(words);
    for (const ctx of this.allowlists) {
      const matchCount = ctx.terms.filter((t) => wordSet.has(t)).length;
      if (matchCount >= 2) {
        return ctx.description;
      }
    }
    return null;
  }

  /**
   * Build a ContentClassification from flagged spans
   */
  private buildClassification(_text: string, spans: FlaggedSpan[]): ContentClassification {
    const severityScore = this.calculateSeverityScore(spans);
    const toxicityLevel = this.severityToToxicity(severityScore);

    const categories = new Set<HateSpeechCategory>();
    for (const span of spans) {
      categories.add(span.category);
    }

    const labels: ClassificationLabel[] = [];
    const confidence: Record<ClassificationLabel, number> = {
      safe: 0,
      sensitive: 0,
      harmful: 0,
      illegal: 0,
      spam: 0,
      misinformation: 0,
    };

    if (severityScore === 0) {
      labels.push('safe');
      confidence.safe = 0.95;
    } else if (severityScore < 0.5) {
      labels.push('sensitive');
      confidence.sensitive = severityScore * 2;
      confidence.safe = 1 - severityScore * 2;
    } else {
      labels.push('harmful');
      confidence.harmful = severityScore;
      if (severityScore > 0.8) {
        labels.push('illegal');
        confidence.illegal = (severityScore - 0.8) * 5;
      }
    }

    return {
      contentId: `content_${++this.classificationCounter}`,
      labels,
      confidence,
      hateCategories: Array.from(categories),
      toxicityLevel,
      flaggedSpans: spans.map((s) => ({ start: s.start, end: s.end, reason: s.reason })),
      requiresReview: severityScore > 0.4,
    };
  }

  /**
   * Generate a human-readable explanation of the classification
   */
  private generateExplanation(spans: FlaggedSpan[], rules: string[]): string {
    if (spans.length === 0) {
      return 'No hate speech indicators detected.';
    }

    const parts: string[] = [];
    parts.push(`Detected ${spans.length} potential violation(s).`);

    const categories = new Set(spans.map((s) => s.category));
    parts.push(`Categories: ${Array.from(categories).join(', ')}.`);

    const maxSeverity = Math.max(...spans.map((s) => s.severity));
    parts.push(`Maximum severity: ${(maxSeverity * 100).toFixed(0)}%.`);

    if (rules.length > 0) {
      parts.push(`Applied rules: ${rules.join('; ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.lexicons.keys());
  }

  /**
   * Get lexicon size for a language
   */
  getLexiconSize(language: string): number {
    return this.lexicons.get(language)?.length ?? 0;
  }
}
