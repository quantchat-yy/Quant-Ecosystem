// ============================================================================
// QuantTube - AI Service
// Delegates to RecommendationAIService from @quant/ai for video recommendations
// ============================================================================

import { RecommendationAIService, AIEngine } from '@quant/ai';

// ----------------------------------------------------------------------------
// Initialize AI Engine and Recommendation Service
// ----------------------------------------------------------------------------

const engine = new AIEngine({
  defaultModel: 'quant-recommend-v2',
  maxTokens: 512,
  temperature: 0.5,
  rateLimitPerMinute: 300,
});

const recommendationAI = new RecommendationAIService(engine);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface VideoRecommendation {
  videoId: string;
  score: number;
  reason: string;
}

interface MusicRecommendation {
  trackId: string;
  score: number;
  reason: string;
}

// ----------------------------------------------------------------------------
// AI Service (delegates to @quant/ai RecommendationAIService)
// ----------------------------------------------------------------------------

export class AIService {
  private recommendationAIService: RecommendationAIService;

  constructor() {
    this.recommendationAIService = recommendationAI;
  }

  /**
   * Get video recommendations - delegates to RecommendationAIService
   */
  async getVideoRecommendations(
    userId: string,
    currentVideoId: string,
    watchHistory: string[],
    limit: number = 10
  ): Promise<VideoRecommendation[]> {
    const items = await this.recommendationAIService.recommendVideos(
      userId, currentVideoId, watchHistory, limit
    );
    return items.map((item) => ({
      videoId: item.id,
      score: item.score,
      reason: item.reason,
    }));
  }

  /**
   * Get music recommendations - delegates to RecommendationAIService
   */
  async getMusicRecommendations(
    userId: string,
    listeningHistory: string[],
    mood?: string,
    limit: number = 20
  ): Promise<MusicRecommendation[]> {
    const items = await this.recommendationAIService.recommendMusic(
      userId, listeningHistory, mood, limit
    );
    return items.map((item) => ({
      trackId: item.id,
      score: item.score,
      reason: item.reason,
    }));
  }

  /**
   * Get personalized feed - delegates to RecommendationAIService
   */
  async getPersonalizedFeed(
    userId: string,
    viewedIds: string[],
    interests: string[],
    limit: number = 20
  ): Promise<VideoRecommendation[]> {
    const items = await this.recommendationAIService.recommendFeedContent(
      userId, viewedIds, interests, limit
    );
    return items.map((item) => ({
      videoId: item.id,
      score: item.score,
      reason: item.reason,
    }));
  }

  /**
   * Get "Up Next" suggestions - delegates to RecommendationAIService
   */
  async getUpNext(
    userId: string,
    currentVideoId: string,
    watchHistory: string[]
  ): Promise<VideoRecommendation[]> {
    const items = await this.recommendationAIService.recommendVideos(
      userId, currentVideoId, watchHistory, 5
    );
    return items.map((item) => ({
      videoId: item.id,
      score: item.score,
      reason: item.reason,
    }));
  }

  /**
   * Suggest creators to follow - delegates to RecommendationAIService
   */
  async suggestCreators(
    userId: string,
    following: string[],
    interests: string[],
    limit: number = 10
  ): Promise<{ creatorId: string; score: number; reason: string }[]> {
    const items = await this.recommendationAIService.recommendUsersToFollow(
      userId, following, interests, limit
    );
    return items.map((item) => ({
      creatorId: item.id,
      score: item.score,
      reason: item.reason,
    }));
  }
}

export const aiService = new AIService();
