// ============================================================================
// QuantChat - AI Service
// Delegates to ChatAIService from @quant/ai for core AI functionality
// Adds app-specific wrappers for smart replies, moderation, translation
// ============================================================================

import { ChatAIService, AIEngine } from '@quant/ai';
import type { SmartReply, ModerationResult } from '@quant/ai';

// ----------------------------------------------------------------------------
// Initialize AI Engine and Chat Service
// ----------------------------------------------------------------------------

const engine = new AIEngine({
  defaultModel: 'quant-chat-v2',
  maxTokens: 2048,
  temperature: 0.7,
  rateLimitPerMinute: 100,
});

const chatAI = new ChatAIService(engine);

// ----------------------------------------------------------------------------
// Translation Types
// ----------------------------------------------------------------------------

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

// ----------------------------------------------------------------------------
// AI Service (delegates to @quant/ai ChatAIService)
// ----------------------------------------------------------------------------

export class AIService {
  private chatAIService: ChatAIService;

  constructor() {
    this.chatAIService = chatAI;
  }

  /**
   * Get smart reply suggestions - delegates to ChatAIService
   */
  async getSmartReplies(message: string, count: number = 3): Promise<SmartReply[]> {
    return this.chatAIService.generateSmartReplies(message, [], 'system');
  }

  /**
   * Moderate content - delegates to ChatAIService
   */
  async moderateContent(content: string): Promise<ModerationResult> {
    return this.chatAIService.moderateMessage(content, 'system');
  }

  /**
   * Translate message - delegates to ChatAIService
   */
  async translateMessage(request: TranslationRequest): Promise<TranslationResult> {
    const translated = await this.chatAIService.translateMessage(
      request.text,
      request.targetLanguage,
      'system'
    );
    return {
      originalText: request.text,
      translatedText: translated,
      sourceLanguage: request.sourceLanguage || 'auto',
      targetLanguage: request.targetLanguage,
      confidence: 0.92,
    };
  }

  /**
   * Chat with AI bot - delegates to ChatAIService
   */
  async chatWithBot(userId: string, message: string): Promise<string> {
    const summary = await this.chatAIService.summarizeConversation(
      [{ sender: 'user', content: message }],
      userId
    );
    return summary;
  }

  /**
   * Detect spam - delegates to ChatAIService
   */
  async detectSpam(content: string): Promise<{ isSpam: boolean; confidence: number }> {
    return this.chatAIService.detectSpam(content, 'system');
  }

  /**
   * Analyze message tone - delegates to ChatAIService
   */
  async analyzeTone(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    emotions: string[];
    confidence: number;
  }> {
    return this.chatAIService.analyzeTone(content, 'system');
  }

  /**
   * Summarize conversation - delegates to ChatAIService
   */
  async summarizeConversation(
    messages: { sender: string; content: string }[],
    userId: string
  ): Promise<string> {
    return this.chatAIService.summarizeConversation(messages, userId);
  }
}

export const aiService = new AIService();
