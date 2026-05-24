// ============================================================================
// QuantChat API - Bitmoji Controller
// Custom avatar creation, expressions, outfits
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Bitmoji, BitmojiOutfit, BitmojiExpression, BitmojiExpressionAsset, BitmojiCustomization } from '../../src/types';

// ============================================================================
// Bitmoji Store
// ============================================================================

class BitmojiStore {
  private bitmojis: Map<string, Bitmoji> = new Map();
  private outfits: BitmojiOutfit[] = [
    { id: 'outfit_casual_1', name: 'Classic Tee', category: 'casual', topUrl: 'https://bitmoji.quant.chat/outfits/tee.png', bottomUrl: 'https://bitmoji.quant.chat/outfits/jeans.png', shoesUrl: 'https://bitmoji.quant.chat/outfits/sneakers.png', accessoryUrls: [] },
    { id: 'outfit_formal_1', name: 'Business Suit', category: 'formal', topUrl: 'https://bitmoji.quant.chat/outfits/blazer.png', bottomUrl: 'https://bitmoji.quant.chat/outfits/slacks.png', shoesUrl: 'https://bitmoji.quant.chat/outfits/oxford.png', accessoryUrls: ['https://bitmoji.quant.chat/outfits/tie.png'] },
    { id: 'outfit_sporty_1', name: 'Athletic Wear', category: 'sporty', topUrl: 'https://bitmoji.quant.chat/outfits/jersey.png', bottomUrl: 'https://bitmoji.quant.chat/outfits/shorts.png', shoesUrl: 'https://bitmoji.quant.chat/outfits/trainers.png', accessoryUrls: ['https://bitmoji.quant.chat/outfits/headband.png'] },
    { id: 'outfit_seasonal_1', name: 'Winter Bundle', category: 'seasonal', topUrl: 'https://bitmoji.quant.chat/outfits/coat.png', bottomUrl: 'https://bitmoji.quant.chat/outfits/warmjeans.png', shoesUrl: 'https://bitmoji.quant.chat/outfits/boots.png', accessoryUrls: ['https://bitmoji.quant.chat/outfits/scarf.png', 'https://bitmoji.quant.chat/outfits/beanie.png'] },
    { id: 'outfit_costume_1', name: 'Superhero', category: 'costume', topUrl: 'https://bitmoji.quant.chat/outfits/cape.png', bottomUrl: 'https://bitmoji.quant.chat/outfits/tights.png', shoesUrl: 'https://bitmoji.quant.chat/outfits/heroboots.png', accessoryUrls: ['https://bitmoji.quant.chat/outfits/mask.png'] },
  ];

  async createBitmoji(userId: string, options: Partial<Bitmoji>): Promise<Bitmoji> {
    const avatarId = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const expressions: BitmojiExpressionAsset[] = (
      ['happy', 'sad', 'surprised', 'angry', 'cool', 'love', 'thinking', 'wink', 'laugh', 'neutral'] as BitmojiExpression[]
    ).map(expr => ({
      expression: expr,
      url: `https://bitmoji.quant.chat/avatars/${avatarId}/${expr}.png`,
      animatedUrl: `https://bitmoji.quant.chat/avatars/${avatarId}/${expr}.gif`,
    }));

    const bitmoji: Bitmoji = {
      id: `bitmoji_${userId}`,
      userId,
      avatarId,
      style: options.style || 'deluxe',
      gender: options.gender || 'male',
      skinTone: options.skinTone || '#F5D0A9',
      hairStyle: options.hairStyle || 'short_wavy',
      hairColor: options.hairColor || '#3B2716',
      eyeShape: options.eyeShape || 'round',
      eyeColor: options.eyeColor || '#4A6741',
      noseShape: options.noseShape || 'medium',
      mouthShape: options.mouthShape || 'smile',
      facialHair: options.facialHair,
      accessories: options.accessories || [],
      outfit: this.outfits[0],
      expressions,
      previewUrl: `https://bitmoji.quant.chat/avatars/${avatarId}/preview.png`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bitmojis.set(userId, bitmoji);
    return bitmoji;
  }

  async getBitmoji(userId: string): Promise<Bitmoji | null> {
    return this.bitmojis.get(userId) || null;
  }

  async updateBitmoji(userId: string, updates: Partial<Bitmoji>): Promise<Bitmoji | null> {
    const bitmoji = this.bitmojis.get(userId);
    if (!bitmoji) return null;

    if (updates.skinTone) bitmoji.skinTone = updates.skinTone;
    if (updates.hairStyle) bitmoji.hairStyle = updates.hairStyle;
    if (updates.hairColor) bitmoji.hairColor = updates.hairColor;
    if (updates.eyeShape) bitmoji.eyeShape = updates.eyeShape;
    if (updates.eyeColor) bitmoji.eyeColor = updates.eyeColor;
    if (updates.noseShape) bitmoji.noseShape = updates.noseShape;
    if (updates.mouthShape) bitmoji.mouthShape = updates.mouthShape;
    if (updates.facialHair !== undefined) bitmoji.facialHair = updates.facialHair;
    if (updates.accessories) bitmoji.accessories = updates.accessories;
    if (updates.style) bitmoji.style = updates.style;
    if (updates.gender) bitmoji.gender = updates.gender;
    bitmoji.updatedAt = new Date();

    return bitmoji;
  }

  async setOutfit(userId: string, outfitId: string): Promise<Bitmoji | null> {
    const bitmoji = this.bitmojis.get(userId);
    if (!bitmoji) return null;

    const outfit = this.outfits.find(o => o.id === outfitId);
    if (!outfit) return null;

    bitmoji.outfit = outfit;
    bitmoji.updatedAt = new Date();
    return bitmoji;
  }

  async getOutfits(category?: string): Promise<BitmojiOutfit[]> {
    if (category) return this.outfits.filter(o => o.category === category);
    return this.outfits;
  }

  async getExpression(userId: string, expression: BitmojiExpression): Promise<BitmojiExpressionAsset | null> {
    const bitmoji = this.bitmojis.get(userId);
    if (!bitmoji) return null;
    return bitmoji.expressions.find(e => e.expression === expression) || null;
  }

  getCustomizationOptions(): BitmojiCustomization[] {
    return [
      { feature: 'skinTone', value: '', options: ['#F5D0A9', '#E8B88A', '#C68642', '#8D5524', '#3B2716', '#FFDBB4'] },
      { feature: 'hairStyle', value: '', options: ['short_straight', 'short_wavy', 'short_curly', 'medium_straight', 'medium_wavy', 'long_straight', 'long_wavy', 'long_curly', 'buzz', 'bald'] },
      { feature: 'hairColor', value: '', options: ['#000000', '#3B2716', '#8B4513', '#D2691E', '#FFD700', '#FF4500', '#808080', '#FFFFFF', '#FF69B4', '#4169E1'] },
      { feature: 'eyeShape', value: '', options: ['round', 'almond', 'wide', 'narrow', 'hooded', 'upturned'] },
      { feature: 'eyeColor', value: '', options: ['#4A6741', '#4169E1', '#8B4513', '#000000', '#808080', '#6B8E23'] },
      { feature: 'noseShape', value: '', options: ['small', 'medium', 'large', 'pointed', 'rounded', 'wide'] },
      { feature: 'mouthShape', value: '', options: ['smile', 'neutral', 'full', 'thin', 'wide', 'small'] },
      { feature: 'facialHair', value: '', options: ['none', 'stubble', 'goatee', 'beard', 'mustache', 'full_beard'] },
    ];
  }
}

const bitmojiStore = new BitmojiStore();

// ============================================================================
// Bitmoji Controller
// ============================================================================

export class BitmojiController {
  async createBitmoji(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as Partial<Bitmoji>;

    const existing = await bitmojiStore.getBitmoji(userId);
    if (existing) {
      res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Bitmoji already exists. Use update endpoint.', statusCode: 409 } });
      return;
    }

    const bitmoji = await bitmojiStore.createBitmoji(userId, body);
    res.status(201).json({ success: true, data: bitmoji });
  }

  async getBitmoji(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] || req.userId!;
    const bitmoji = await bitmojiStore.getBitmoji(userId);

    if (!bitmoji) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bitmoji not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: bitmoji });
  }

  async updateBitmoji(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as Partial<Bitmoji>;

    const bitmoji = await bitmojiStore.updateBitmoji(userId, body);
    if (!bitmoji) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bitmoji not found. Create one first.', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: bitmoji });
  }

  async setOutfit(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { outfitId: string };

    if (!body.outfitId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Outfit ID is required', statusCode: 400 } });
      return;
    }

    const bitmoji = await bitmojiStore.setOutfit(userId, body.outfitId);
    if (!bitmoji) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bitmoji or outfit not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: bitmoji });
  }

  async getOutfits(req: Request, res: Response): Promise<void> {
    const category = req.query['category'] as string | undefined;
    const outfits = await bitmojiStore.getOutfits(category);
    res.status(200).json({ success: true, data: outfits });
  }

  async getExpression(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] || req.userId!;
    const expression = req.params['expression'] as BitmojiExpression;

    const asset = await bitmojiStore.getExpression(userId, expression);
    if (!asset) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expression not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: asset });
  }

  async getCustomizationOptions(req: Request, res: Response): Promise<void> {
    const options = bitmojiStore.getCustomizationOptions();
    res.status(200).json({ success: true, data: options });
  }
}

export const bitmojiController = new BitmojiController();
