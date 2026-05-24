// ============================================================================
// QuantChat - Bitmoji Routes (Avatar customization)
// ============================================================================
import { Router } from '@quant/server';

interface Request { method: string; url: string; headers: Record<string, string>; params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; user?: { id: string }; }
interface Response { status(code: number): Response; json(data: unknown): void; }

const avatars = new Map<string, Record<string, unknown>>();

export function registerBitmojiRoutes(router: Router): void {
  router.register('GET', '/api/bitmoji/current', async (req: Request, res: Response) => {
    const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const config = avatars.get(userId) || null; res.status(200).json({ config });
  });
  router.register('POST', '/api/bitmoji/save', async (req: Request, res: Response) => {
    const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { config } = req.body as { config: Record<string, unknown> };
    if (!config) { res.status(400).json({ error: 'Config required' }); return; }
    avatars.set(userId, config); res.status(200).json({ success: true, config });
  });
  router.register('POST', '/api/bitmoji/randomize', async (req: Request, res: Response) => {
    const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const randomConfig = { faceShape: 'oval', skinTone: '#FFDBB4', hairStyle: 'medium', hairColor: '#2C1B18', eyeShape: 'almond', eyeColor: '#634E34', noseShape: 'small', mouthShape: 'smile', outfit: 'casual_tee', outfitColor: '#4A90D9', accessories: [] };
    avatars.set(userId, randomConfig); res.status(200).json({ config: randomConfig });
  });
  router.register('GET', '/api/bitmoji/presets', async (_req: Request, res: Response) => {
    res.status(200).json({ presets: [{ id: 'default_male', name: 'Default Male' }, { id: 'default_female', name: 'Default Female' }, { id: 'anime', name: 'Anime Style' }, { id: 'pixel', name: 'Pixel Art' }] });
  });
  router.register('POST', '/api/bitmoji/render', async (req: Request, res: Response) => {
    const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    res.status(200).json({ renderUrl: `/avatars/${userId}/render.png`, expiresIn: 3600 });
  });
}

export default registerBitmojiRoutes;
