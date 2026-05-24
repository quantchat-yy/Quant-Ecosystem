// ============================================================================
// QuantChat - Spotlight Controller
// ============================================================================
import { SpotlightService } from '../services/spotlight-service';

interface Request { method: string; url: string; headers: Record<string, string>; params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; user?: { id: string; email: string; role: string }; }
interface Response { status(code: number): Response; json(data: unknown): void; }

export class SpotlightController {
  static async getFeed(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const limit = Number(req.query.limit) || 20; const offset = Number(req.query.offset) || 0; const videos = await SpotlightService.getFeed(userId, limit, offset); res.status(200).json({ videos }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async getTrending(req: Request, res: Response): Promise<void> {
    try { const videos = await SpotlightService.getTrending(Number(req.query.limit) || 10); res.status(200).json({ videos }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async submitVideo(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { videoUrl, thumbnailUrl, caption, soundId, duration, tags } = req.body as { videoUrl: string; thumbnailUrl: string; caption: string; soundId: string; duration: number; tags: string[] }; if (!videoUrl) { res.status(400).json({ error: 'videoUrl required' }); return; } const video = await SpotlightService.submitVideo(userId, { videoUrl, thumbnailUrl: thumbnailUrl || '', caption: caption || '', soundId: soundId || '', duration: duration || 15, tags: tags || [] }); res.status(201).json(video); } catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : 'Submit failed' }); }
  }
  static async toggleLike(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const result = await SpotlightService.toggleLike(req.params.id, userId); res.status(200).json(result); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async toggleBookmark(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const bookmarked = await SpotlightService.toggleBookmark(req.params.id, userId); res.status(200).json({ bookmarked }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async recordView(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } await SpotlightService.recordView(req.params.id, userId); res.status(200).json({ success: true }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async recordShare(req: Request, res: Response): Promise<void> {
    try { await SpotlightService.recordShare(req.params.id); res.status(200).json({ success: true }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async getComments(req: Request, res: Response): Promise<void> { res.status(200).json({ comments: [] }); }
  static async addComment(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { text } = req.body as { text: string }; res.status(201).json({ id: `cmt_${Date.now()}`, author: { name: 'User', avatarUrl: '' }, text, likes: 0, createdAt: new Date().toISOString(), isLiked: false }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async getCreatorStats(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const stats = await SpotlightService.getCreatorStats(userId); res.status(200).json(stats); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
}

export default SpotlightController;
