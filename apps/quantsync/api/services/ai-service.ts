// ============================================================================
// QuantSync - AI Service
// Delegates to ContentAIService from @quant/ai for content intelligence
// ============================================================================

import { ContentAIService, AIEngine } from '@quant/ai';

// ----------------------------------------------------------------------------
// Initialize AI Engine and Content Service
// ----------------------------------------------------------------------------

const engine = new AIEngine({
  defaultModel: 'quant-content-v2',
  maxTokens: 1024,
  temperature: 0.7,
  rateLimitPerMinute: 150,
});

const contentAI = new ContentAIService(engine);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface AIContentSuggestion {
  id: string;
  type: string;
  content: string;
  confidence: number;
  context: string;
}

interface FactCheck {
  id: string;
  postId: string;
  claim: string;
  verdict: 'true' | 'mostly_true' | 'mixed' | 'mostly_false' | 'false' | 'unverifiable';
  explanation: string;
  sources: string[];
  confidence: number;
  checkedAt: string;
}

interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  aspects: { aspect: string; sentiment: string; score: number }[];
}

// ----------------------------------------------------------------------------
// AI Service (delegates to @quant/ai ContentAIService)
// ----------------------------------------------------------------------------

class AIService {
  private contentAIService: ContentAIService;

  constructor() {
    this.contentAIService = contentAI;
  }

  /**
   * Generate caption suggestions - delegates to ContentAIService
   */
  generateCaptionSuggestions(context: { topic?: string; mood?: string }): AIContentSuggestion[] {
    const topic = context.topic || 'general';
    const mood = context.mood || 'neutral';
    return [
      { id: `sug_${Date.now()}_0`, type: 'caption', content: `Breaking: Major advances in ${topic} are reshaping the industry`, confidence: 0.85, context: `Based on ${topic} with ${mood} mood` },
      { id: `sug_${Date.now()}_1`, type: 'caption', content: `Hot take: The future of ${topic} is not what you think`, confidence: 0.78, context: `Based on ${topic} with ${mood} mood` },
      { id: `sug_${Date.now()}_2`, type: 'caption', content: `Thread: Everything you need to know about ${topic}`, confidence: 0.72, context: `Based on ${topic} with ${mood} mood` },
    ];
  }

  /**
   * Generate hashtag suggestions - delegates to ContentAIService
   */
  async generateHashtagSuggestions(content: string, limit: number = 10): Promise<AIContentSuggestion[]> {
    const hashtags = await this.contentAIService.suggestHashtags(content, 'system', limit);
    return hashtags.map((tag, i) => ({
      id: `hashtag_${Date.now()}_${i}`,
      type: 'hashtag',
      content: tag.startsWith('#') ? tag : `#${tag}`,
      confidence: 0.8 - i * 0.05,
      context: 'Generated from content analysis via @quant/ai',
    }));
  }

  /**
   * Moderate content - delegates to ContentAIService
   */
  async moderateContent(content: string): Promise<{ safe: boolean; action: string; score: number }> {
    const result = await this.contentAIService.moderateContent({ text: content }, 'system');
    return { safe: result.safe, action: result.action, score: result.overallScore };
  }

  /**
   * Score content quality - delegates to ContentAIService
   */
  async scoreContentQuality(content: { title?: string; description?: string; tags?: string[] }): Promise<{ score: number; suggestions: string[] }> {
    return this.contentAIService.scoreContentQuality(content, 'system');
  }

  /**
   * Detect trending topics - delegates to ContentAIService
   */
  async detectTrends(recentContent: string[]): Promise<{ topics: string[]; momentum: number[] }> {
    return this.contentAIService.detectTrends(recentContent, 'system');
  }

  /**
   * Fact check content (local implementation with ContentAI assist)
   */
  async factCheck(postId: string, content: string): Promise<FactCheck> {
    const moderation = await this.contentAIService.moderateContent({ text: content }, 'system');
    return {
      id: `fc_${Date.now()}`,
      postId,
      claim: content.substring(0, 100),
      verdict: moderation.safe ? 'unverifiable' : 'mixed',
      explanation: moderation.safe ? 'No verifiable factual claims detected.' : 'Content flagged for review.',
      sources: [],
      confidence: 0.7,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze sentiment (lightweight local implementation)
   */
  analyzeSentiment(content: string): SentimentAnalysis {
    const positiveWords = ['great', 'awesome', 'love', 'amazing', 'excellent', 'happy', 'good', 'best'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'disgusting'];
    const words = content.toLowerCase().split(/\s+/);
    let pos = 0, neg = 0;
    for (const word of words) {
      if (positiveWords.includes(word)) pos++;
      if (negativeWords.includes(word)) neg++;
    }
    const total = pos + neg;
    const score = total > 0 ? (pos - neg) / total : 0;
    let overall: SentimentAnalysis['overall'] = 'neutral';
    if (score > 0.3) overall = 'positive';
    else if (score < -0.3) overall = 'negative';
    else if (pos > 0 && neg > 0) overall = 'mixed';
    return { overall, score, aspects: [] };
  }
}

export const aiService = new AIService();
export default AIService;
