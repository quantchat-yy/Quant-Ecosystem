// ============================================================================
// QuantChat - Memories Controller
// ============================================================================
import { MemoriesService } from '../services/memories-service';

interface Request { method: string; url: string; headers: Record<string, string>; params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; user?: { id: string; email: string; role: string }; }
interface Response { status(code: number): Response; json(data: unknown): void; }

export class MemoriesController {
  static async listMemories(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { type, q, page, limit } = req.query; const result = await MemoriesService.getMemories(userId, { type, query: q, page: Number(page) || 1, limit: Number(limit) || 50 }); res.status(200).json(result); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async saveMemory(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const memory = await MemoriesService.saveMemory(userId, req.body as any); res.status(201).json(memory); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Save failed' }); }
  }
  static async starMemory(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } await MemoriesService.starMemory(userId, req.params.id); res.status(200).json({ success: true }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async deleteMemories(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { ids } = req.body as { ids: string[] }; const count = await MemoriesService.deleteMemories(userId, ids || []); res.status(200).json({ deletedCount: count }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' }); }
  }
  static async generateAutoStory(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { date } = req.body as { date: string }; const memories = await MemoriesService.generateAutoStory(userId, date); res.status(200).json({ story: memories }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Generation failed' }); }
  }
  static async exportMemories(req: Request, res: Response): Promise<void> { res.status(200).json({ downloadUrl: '/exports/memories.zip', expiresIn: 3600 }); }
  static async getStats(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const stats = await MemoriesService.getStats(userId); res.status(200).json(stats); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
  static async searchByLocation(req: Request, res: Response): Promise<void> {
    try { const userId = req.user?.id; if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; } const { lat, lng, radius } = req.query; const memories = await MemoriesService.searchByLocation(userId, Number(lat), Number(lng), Number(radius) || 10); res.status(200).json({ memories }); } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' }); }
  }
}

export default MemoriesController;
