// ============================================================================
// QuantChat API - AI Controller
// Smart replies, translation, moderation, chatbot, sticker generation
// ============================================================================

import type { Request, Response } from '../middleware';
import { aiService } from '../services/ai-service';
import type { TranslationRequest, StickerGenerationRequest } from '../../src/types';

export class AIController {
  async getSmartReplies(req: Request, res: Response): Promise<void> {
    const body = req.body as { message: string; count?: number };

    if (!body.message) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Message is required', statusCode: 400 } });
      return;
    }

    const replies = await aiService.getSmartReplies(body.message, body.count || 3);
    res.status(200).json({ success: true, data: replies });
  }

  async translate(req: Request, res: Response): Promise<void> {
    const body = req.body as TranslationRequest;

    if (!body.text || !body.targetLanguage) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Text and target language are required', statusCode: 400 } });
      return;
    }

    const result = await aiService.translateMessage(body);
    res.status(200).json({ success: true, data: result });
  }

  async moderate(req: Request, res: Response): Promise<void> {
    const body = req.body as { content: string };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Content is required', statusCode: 400 } });
      return;
    }

    const result = await aiService.moderateContent(body.content);
    res.status(200).json({ success: true, data: result });
  }

  async chat(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { message: string };

    if (!body.message) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Message is required', statusCode: 400 } });
      return;
    }

    const response = await aiService.chatWithBot(userId, body.message);
    res.status(200).json({ success: true, data: { response } });
  }

  async getChatHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const history = await aiService.getChatHistory(userId);
    res.status(200).json({ success: true, data: history });
  }

  async clearChatHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    await aiService.clearChatHistory(userId);
    res.status(200).json({ success: true, data: { message: 'Chat history cleared' } });
  }

  async generateStickers(req: Request, res: Response): Promise<void> {
    const body = req.body as StickerGenerationRequest;

    if (!body.prompt || !body.style) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Prompt and style are required', statusCode: 400 } });
      return;
    }

    const stickers = await aiService.generateStickers(body);
    res.status(200).json({ success: true, data: stickers });
  }

  async generateCaption(req: Request, res: Response): Promise<void> {
    const body = req.body as { mediaUrl: string; tone?: string };

    if (!body.mediaUrl) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Media URL is required', statusCode: 400 } });
      return;
    }

    const caption = await aiService.generateCaption(body.mediaUrl, body.tone);
    res.status(200).json({ success: true, data: { caption } });
  }

  async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    const languages = aiService.getSupportedLanguages();
    res.status(200).json({ success: true, data: languages });
  }
}

export const aiController = new AIController();
