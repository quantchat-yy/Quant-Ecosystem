// ============================================================================
// Moderation - Text Classifier
// ML-based text classification via OpenAI moderation API
// ============================================================================

import type {
  ModerationAPIClient,
  TextModerationResponse,
  ModerationResult,
  CategoryScore,
} from '../types';
import {
  determineAction,
  DEFAULT_CLASSIFIER_THRESHOLDS,
  type ClassifierThresholds,
} from './classifier-thresholds';

/**
 * TextClassifier - ML-based text content classification
 *
 * Delegates classification to an external moderation API (e.g., OpenAI)
 * via the ModerationAPIClient interface. Maps API responses to internal
 * ModerationResult format for consistent downstream processing.
 */
export class TextClassifier {
  private readonly client: ModerationAPIClient;
  private readonly thresholds: ClassifierThresholds;

  constructor(client: ModerationAPIClient, thresholds?: Partial<ClassifierThresholds>) {
    this.client = client;
    this.thresholds = { ...DEFAULT_CLASSIFIER_THRESHOLDS, ...thresholds };
  }

  /** Classify text content using ML API */
  async classify(text: string, contentId?: string): Promise<ModerationResult> {
    const response = await this.client.moderateText(text);
    const categories = this.mapResponseToCategories(response);
    const overallScore = Math.max(...categories.map((c) => c.score), 0);
    const action = determineAction(categories, this.thresholds);

    return {
      id: `txtcls_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      contentId: contentId ?? `content_${Date.now()}`,
      contentType: 'text',
      categories,
      overallScore,
      action,
      confidence: this.calculateConfidence(categories),
      automated: true,
      flags: categories.filter((c) => c.detected).map((c) => c.category),
      metadata: { textLength: text.length, classifier: 'ml-api' },
      createdAt: Date.now(),
    };
  }

  private mapResponseToCategories(response: TextModerationResponse): CategoryScore[] {
    return [
      {
        category: 'hate_speech',
        score: response.hate.score,
        confidence: this.scoreToConfidence(response.hate.score),
        detected: response.hate.flagged,
      },
      {
        category: 'harassment',
        score: response.harassment.score,
        confidence: this.scoreToConfidence(response.harassment.score),
        detected: response.harassment.flagged,
      },
      {
        category: 'self_harm',
        score: response.selfHarm.score,
        confidence: this.scoreToConfidence(response.selfHarm.score),
        detected: response.selfHarm.flagged,
      },
      {
        category: 'nsfw',
        score: response.sexual.score,
        confidence: this.scoreToConfidence(response.sexual.score),
        detected: response.sexual.flagged,
      },
      {
        category: 'violence',
        score: response.violence.score,
        confidence: this.scoreToConfidence(response.violence.score),
        detected: response.violence.flagged,
      },
    ];
  }

  private scoreToConfidence(score: number): number {
    // High scores or very low scores indicate high confidence
    if (score >= 0.8 || score <= 0.1) return 0.95;
    if (score >= 0.6 || score <= 0.2) return 0.85;
    return 0.7;
  }

  private calculateConfidence(categories: CategoryScore[]): number {
    const detected = categories.filter((c) => c.detected);
    if (detected.length === 0) return 0.95;
    return detected.reduce((sum, c) => sum + c.confidence, 0) / detected.length;
  }
}
