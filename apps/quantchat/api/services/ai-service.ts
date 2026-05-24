// ============================================================================
// QuantChat - AI Service
// Smart replies, content moderation, translation, AI chatbot, sticker generation
// Uses packages/ai for core AI functionality
// ============================================================================

import type {
  SmartReply, TranslationRequest, TranslationResult,
  ModerationResult, ModerationCategory, AIChatMessage,
  StickerGenerationRequest, Message,
} from '../../src/types';

// ============================================================================
// Smart Reply Engine
// ============================================================================

class SmartReplyEngine {
  private replyTemplates: Map<string, SmartReply[]> = new Map([
    ['greeting', [
      { id: 'sr_1', text: 'Hey! What\'s up?', confidence: 0.95, tone: 'casual' },
      { id: 'sr_2', text: 'Hi there!', confidence: 0.9, tone: 'friendly' },
      { id: 'sr_3', text: 'Hello!', confidence: 0.85, tone: 'professional' },
    ]],
    ['question', [
      { id: 'sr_4', text: 'Sure, sounds good!', confidence: 0.9, tone: 'casual' },
      { id: 'sr_5', text: 'Let me think about it', confidence: 0.8, tone: 'casual' },
      { id: 'sr_6', text: 'I\'m not sure, what do you think?', confidence: 0.75, tone: 'friendly' },
    ]],
    ['positive', [
      { id: 'sr_7', text: 'That\'s awesome!', confidence: 0.92, tone: 'casual' },
      { id: 'sr_8', text: 'Love it!', confidence: 0.88, tone: 'friendly' },
      { id: 'sr_9', text: 'Great to hear!', confidence: 0.85, tone: 'professional' },
    ]],
    ['negative', [
      { id: 'sr_10', text: 'Oh no, that sucks', confidence: 0.88, tone: 'casual' },
      { id: 'sr_11', text: 'Sorry to hear that', confidence: 0.9, tone: 'friendly' },
      { id: 'sr_12', text: 'That\'s unfortunate', confidence: 0.82, tone: 'professional' },
    ]],
    ['invitation', [
      { id: 'sr_13', text: 'I\'m down!', confidence: 0.92, tone: 'casual' },
      { id: 'sr_14', text: 'Count me in!', confidence: 0.9, tone: 'friendly' },
      { id: 'sr_15', text: 'Sorry, can\'t make it', confidence: 0.85, tone: 'casual' },
    ]],
    ['thanks', [
      { id: 'sr_16', text: 'No problem!', confidence: 0.95, tone: 'casual' },
      { id: 'sr_17', text: 'Anytime!', confidence: 0.9, tone: 'friendly' },
      { id: 'sr_18', text: 'You\'re welcome!', confidence: 0.88, tone: 'professional' },
    ]],
    ['funny', [
      { id: 'sr_19', text: 'lol', confidence: 0.9, tone: 'casual' },
      { id: 'sr_20', text: 'haha that\'s hilarious', confidence: 0.88, tone: 'funny' },
      { id: 'sr_21', text: 'I\'m dead', confidence: 0.85, tone: 'casual' },
    ]],
  ]);

  generateReplies(message: string, count: number = 3): SmartReply[] {
    const category = this.classifyMessage(message);
    const templates = this.replyTemplates.get(category) || this.replyTemplates.get('positive')!;
    return templates.slice(0, count);
  }

  private classifyMessage(message: string): string {
    const lower = message.toLowerCase();
    if (/\b(hi|hey|hello|sup|what'?s up)\b/.test(lower)) return 'greeting';
    if (/\?/.test(lower) || /\b(can|could|would|want|wanna)\b/.test(lower)) return 'question';
    if (/\b(come|join|let'?s|hang|meet|party)\b/.test(lower)) return 'invitation';
    if (/\b(thanks|thank you|thx|ty)\b/.test(lower)) return 'thanks';
    if (/\b(lol|lmao|haha|funny|joke)\b/.test(lower)) return 'funny';
    if (/\b(bad|sad|sorry|awful|terrible|sucks)\b/.test(lower)) return 'negative';
    return 'positive';
  }
}

// ============================================================================
// Content Moderation Engine
// ============================================================================

class ModerationEngine {
  private bannedPatterns: RegExp[] = [
    /\b(spam|scam)\b/i,
    /\b(hack|exploit)\b/i,
  ];

  private sensitiveCategories: Array<{ name: string; patterns: RegExp[] }> = [
    { name: 'profanity', patterns: [/\b(damn|hell)\b/i] },
    { name: 'harassment', patterns: [/\b(stupid|idiot|loser)\b/i] },
    { name: 'violence', patterns: [/\b(kill|fight|attack)\b/i] },
    { name: 'spam', patterns: [/\b(buy now|click here|free money)\b/i] },
    { name: 'adult', patterns: [/\b(nsfw|explicit)\b/i] },
  ];

  moderate(content: string): ModerationResult {
    const categories: ModerationCategory[] = [];
    let maxScore = 0;

    for (const category of this.sensitiveCategories) {
      let score = 0;
      let flagged = false;

      for (const pattern of category.patterns) {
        if (pattern.test(content)) {
          score += 0.4;
          flagged = true;
        }
      }

      categories.push({ name: category.name, score: Math.min(score, 1), flagged });
      maxScore = Math.max(maxScore, score);
    }

    // Check banned patterns
    for (const pattern of this.bannedPatterns) {
      if (pattern.test(content)) {
        maxScore = Math.max(maxScore, 0.7);
      }
    }

    let action: 'allow' | 'warn' | 'block' | 'review';
    if (maxScore >= 0.8) action = 'block';
    else if (maxScore >= 0.6) action = 'review';
    else if (maxScore >= 0.3) action = 'warn';
    else action = 'allow';

    return {
      isApproved: action === 'allow' || action === 'warn',
      score: maxScore,
      categories,
      action,
      reason: action !== 'allow' ? `Content flagged for review (score: ${maxScore.toFixed(2)})` : undefined,
    };
  }
}

// ============================================================================
// Translation Engine
// ============================================================================

class TranslationEngine {
  private supportedLanguages: Map<string, string> = new Map([
    ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'],
    ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'],
    ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'],
    ['ar', 'Arabic'], ['hi', 'Hindi'], ['ru', 'Russian'],
  ]);

  translate(request: TranslationRequest): TranslationResult {
    const sourceLanguage = request.sourceLanguage || this.detectLanguage(request.text);
    // Simulated translation - in production would use packages/ai
    const translatedText = this.simulateTranslation(request.text, sourceLanguage, request.targetLanguage);

    return {
      originalText: request.text,
      translatedText,
      sourceLanguage,
      targetLanguage: request.targetLanguage,
      confidence: 0.92,
    };
  }

  private detectLanguage(text: string): string {
    // Simple heuristic-based language detection
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    return 'en';
  }

  private simulateTranslation(text: string, from: string, to: string): string {
    if (from === to) return text;
    // Prefix with target language indicator for simulation
    const langName = this.supportedLanguages.get(to) || to;
    return `[${langName}] ${text}`;
  }

  getSupportedLanguages(): Map<string, string> {
    return this.supportedLanguages;
  }
}

// ============================================================================
// AI Chatbot
// ============================================================================

class AIChatbot {
  private conversations: Map<string, AIChatMessage[]> = new Map();

  async chat(userId: string, message: string): Promise<string> {
    const history = this.conversations.get(userId) || [];
    history.push({ role: 'user', content: message, timestamp: new Date() });

    // Generate response based on context
    const response = this.generateResponse(message, history);
    history.push({ role: 'assistant', content: response, timestamp: new Date() });

    // Keep last 50 messages
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    this.conversations.set(userId, history);

    return response;
  }

  private generateResponse(message: string, _history: AIChatMessage[]): string {
    const lower = message.toLowerCase();

    if (/\b(hi|hey|hello)\b/.test(lower)) {
      return 'Hey there! I\'m your QuantChat AI assistant. How can I help you today?';
    }
    if (/\b(help|what can you do)\b/.test(lower)) {
      return 'I can help you with: smart replies, translating messages, finding filters, managing your account, or just chatting! What would you like?';
    }
    if (/\b(filter|lens|ar)\b/.test(lower)) {
      return 'Looking for filters? Try the trending ones like "Dog Ears" or "Beauty Glow", or I can help you find something specific. What mood are you going for?';
    }
    if (/\b(streak|streaks)\b/.test(lower)) {
      return 'Want to keep your streaks alive? I can remind you before they expire! Just say "remind me about streaks" and I\'ll set it up.';
    }
    if (/\b(story|stories)\b/.test(lower)) {
      return 'Stories are a great way to share moments! You can add music, stickers, and filters. Would you like tips on making engaging stories?';
    }
    if (/\b(group|groups)\b/.test(lower)) {
      return 'I can help you manage groups! Would you like to create a new group, update settings, or add members?';
    }
    if (/\b(translate)\b/.test(lower)) {
      return 'I can translate messages for you! Just send me the text and tell me what language you want it in.';
    }
    if (/\b(bye|goodbye|later)\b/.test(lower)) {
      return 'See you later! Feel free to chat anytime you need help.';
    }

    return 'That\'s interesting! Is there anything specific I can help you with? I\'m great at suggesting replies, finding content, and managing your QuantChat experience.';
  }

  getHistory(userId: string): AIChatMessage[] {
    return this.conversations.get(userId) || [];
  }

  clearHistory(userId: string): void {
    this.conversations.delete(userId);
  }
}

// ============================================================================
// AI Service (Main)
// ============================================================================

export class AIService {
  private smartReplyEngine: SmartReplyEngine;
  private moderationEngine: ModerationEngine;
  private translationEngine: TranslationEngine;
  private chatbot: AIChatbot;

  constructor() {
    this.smartReplyEngine = new SmartReplyEngine();
    this.moderationEngine = new ModerationEngine();
    this.translationEngine = new TranslationEngine();
    this.chatbot = new AIChatbot();
  }

  async getSmartReplies(message: string, count: number = 3): Promise<SmartReply[]> {
    return this.smartReplyEngine.generateReplies(message, count);
  }

  async moderateContent(content: string): Promise<ModerationResult> {
    return this.moderationEngine.moderate(content);
  }

  async translateMessage(request: TranslationRequest): Promise<TranslationResult> {
    return this.translationEngine.translate(request);
  }

  async chatWithBot(userId: string, message: string): Promise<string> {
    return this.chatbot.chat(userId, message);
  }

  async getChatHistory(userId: string): Promise<AIChatMessage[]> {
    return this.chatbot.getHistory(userId);
  }

  async clearChatHistory(userId: string): Promise<void> {
    this.chatbot.clearHistory(userId);
  }

  async generateStickers(request: StickerGenerationRequest): Promise<Array<{ url: string; prompt: string }>> {
    const stickers: Array<{ url: string; prompt: string }> = [];
    for (let i = 0; i < request.count; i++) {
      stickers.push({
        url: `https://media.quant.chat/stickers/gen_${Date.now()}_${i}_${request.style}.png`,
        prompt: request.prompt,
      });
    }
    return stickers;
  }

  async generateCaption(mediaUrl: string, tone: string = 'casual'): Promise<string> {
    const captions: Record<string, string[]> = {
      casual: ['living my best life', 'vibes only', 'can\'t stop won\'t stop', 'mood'],
      funny: ['when the wifi disconnects', 'me pretending to be productive', 'plot twist'],
      aesthetic: ['golden hour magic', 'chasing sunsets', 'moments like these'],
      professional: ['New beginnings', 'Making progress', 'Grateful for this journey'],
    };

    const options = captions[tone] || captions['casual'];
    return options[Math.floor(Math.random() * options.length)];
  }

  getSupportedLanguages(): Array<{ code: string; name: string }> {
    const langs: Array<{ code: string; name: string }> = [];
    for (const [code, name] of this.translationEngine.getSupportedLanguages()) {
      langs.push({ code, name });
    }
    return langs;
  }
}

export const aiService = new AIService();
