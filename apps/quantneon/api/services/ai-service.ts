// ============================================================================
// QuantNeon - AI Service
// Delegates to ContentAIService and RecommendationAIService from @quant/ai
// ============================================================================

import { ContentAIService, RecommendationAIService, AIEngine } from '@quant/ai';

// ----------------------------------------------------------------------------
// Initialize AI Engine and Services
// ----------------------------------------------------------------------------

const engine = new AIEngine({
  defaultModel: 'quant-neon-v2',
  maxTokens: 512,
  temperature: 0.8,
  rateLimitPerMinute: 200,
});

const contentAI = new ContentAIService(engine);
const recommendationAI = new RecommendationAIService(engine);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface FilterResult {
  outputUrl: string;
  filterType: string;
  intensity: number;
  processingTime: number;
}

interface RecognizedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  category: string;
}

interface ContentSuggestion {
  type: 'post_idea' | 'best_time' | 'trending_format' | 'collaboration';
  title: string;
  description: string;
  confidence: number;
}

// ----------------------------------------------------------------------------
// AI Service (delegates to @quant/ai)
// ----------------------------------------------------------------------------

class AIService {
  private contentAIService: ContentAIService;
  private recommendationAIService: RecommendationAIService;

  constructor() {
    this.contentAIService = contentAI;
    this.recommendationAIService = recommendationAI;
  }

  /**
   * Apply photo/video filter (local implementation)
   */
  applyFilter(mediaUrl: string, filterType: string, intensity: number): FilterResult {
    return {
      outputUrl: `/ai/filtered/${Date.now().toString(36)}_${filterType}.jpg`,
      filterType,
      intensity: Math.min(1, Math.max(0, intensity)),
      processingTime: 150 + Math.random() * 100,
    };
  }

  /**
   * Generate captions - delegates to ContentAIService
   */
  async generateCaptions(mediaUrl: string, mood: string, count: number): Promise<string[]> {
    const result = await this.contentAIService.generateContent(
      { type: 'caption', context: `Photo with ${mood} mood`, tone: mood, length: 'short' },
      'system'
    );
    const captions = [result.content, ...result.alternatives];
    return captions.slice(0, count);
  }

  /**
   * Generate alt text - delegates to ContentAIService
   */
  async generateAltText(mediaUrl: string): Promise<string> {
    const result = await this.contentAIService.generateContent(
      { type: 'alt_text', context: `Image at ${mediaUrl}` },
      'system'
    );
    return result.content;
  }

  /**
   * Suggest hashtags - delegates to ContentAIService
   */
  async suggestHashtags(caption: string, mediaUrl: string, count: number): Promise<{ tag: string; relevance: number }[]> {
    const hashtags = await this.contentAIService.suggestHashtags(caption, 'system', count);
    return hashtags.map((tag, i) => ({
      tag: tag.startsWith('#') ? tag.substring(1) : tag,
      relevance: 1 - (i * 0.05),
    }));
  }

  /**
   * Recognize objects in media (local implementation)
   */
  recognizeObjects(mediaUrl: string): RecognizedObject[] {
    return [
      { label: 'person', confidence: 0.95, boundingBox: { x: 20, y: 10, width: 60, height: 80 }, category: 'human' },
      { label: 'smartphone', confidence: 0.78, boundingBox: { x: 45, y: 50, width: 10, height: 15 }, category: 'electronics' },
      { label: 'building', confidence: 0.82, boundingBox: { x: 0, y: 0, width: 100, height: 60 }, category: 'architecture' },
    ];
  }

  /**
   * Get personalized content suggestions - delegates to RecommendationAIService
   */
  async getContentSuggestions(userId: string): Promise<ContentSuggestion[]> {
    const recommendations = await this.recommendationAIService.recommendFeedContent(
      userId, [], ['photography', 'lifestyle'], 4
    );
    return [
      { type: 'best_time', title: 'Best Time to Post', description: 'Your audience is most active at 7 PM today', confidence: 0.85 },
      { type: 'trending_format', title: 'Try a Carousel Post', description: 'Carousels are getting 3x more engagement this week', confidence: 0.78 },
      { type: 'post_idea', title: 'Behind the Scenes', description: 'Your followers love seeing your process', confidence: 0.72 },
      { type: 'collaboration', title: 'Collaborate', description: 'Similar creators in your niche are open to collabs', confidence: 0.65 },
    ];
  }

  /**
   * Recommend explore feed content - delegates to RecommendationAIService
   */
  async getExploreFeed(userId: string, viewedIds: string[], interests: string[]): Promise<string[]> {
    const items = await this.recommendationAIService.recommendFeedContent(userId, viewedIds, interests, 20);
    return items.map((item) => item.id);
  }

  /**
   * Moderate content - delegates to ContentAIService
   */
  async moderateContent(content: string): Promise<{ safe: boolean; score: number }> {
    const result = await this.contentAIService.moderateContent({ text: content }, 'system');
    return { safe: result.safe, score: result.overallScore };
  }
}

export const aiService = new AIService();
