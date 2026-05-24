// ============================================================================
// QuantAds API - Brand Safety Controller
// ============================================================================

import { brandSafetyService } from '../services/brand-safety-service';

interface Request {
  method: string;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
  user?: { id: string; accountId: string };
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
  send(data: string): void;
}

class BrandSafetyController {
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const settings = await brandSafetyService.getSettings(accountId);
      const blocklist = await brandSafetyService.getBlocklist(accountId);
      const exclusions = await brandSafetyService.getExclusions(accountId);
      res.status(200).json({
        ...settings,
        blocklist,
        exclusions,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load brand safety settings', message: error.message });
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const updated = await brandSafetyService.updateSettings(accountId, req.body);
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update settings', message: error.message });
    }
  }

  async getKeywords(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const keywords = await brandSafetyService.getBlocklist(accountId);
      res.status(200).json({ keywords });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get keywords', message: error.message });
    }
  }

  async addKeyword(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { keyword, matchType } = req.body;
      if (!keyword) {
        res.status(400).json({ error: 'keyword is required' });
        return;
      }
      const entry = await brandSafetyService.addKeyword(accountId, keyword, matchType || 'phrase');
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to add keyword', message: error.message });
    }
  }

  async removeKeyword(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      await brandSafetyService.removeKeyword(accountId, id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to remove keyword', message: error.message });
    }
  }

  async classifyContent(req: Request, res: Response): Promise<void> {
    try {
      const { url, content } = req.body;
      if (!url) {
        res.status(400).json({ error: 'url is required' });
        return;
      }
      const classification = await brandSafetyService.classifyContent(url, content);
      res.status(200).json(classification);
    } catch (error: any) {
      res.status(500).json({ error: 'Classification failed', message: error.message });
    }
  }

  async checkPlacement(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ error: 'url is required' });
        return;
      }
      const result = await brandSafetyService.isPlacementSafe(accountId, url);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Placement check failed', message: error.message });
    }
  }

  async getExclusions(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const exclusions = await brandSafetyService.getExclusions(accountId);
      res.status(200).json({ exclusions });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get exclusions', message: error.message });
    }
  }

  async addExclusion(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { type, value, reason } = req.body;
      if (!type || !value) {
        res.status(400).json({ error: 'type and value are required' });
        return;
      }
      const exclusion = await brandSafetyService.addExclusion(accountId, type, value, reason || '');
      res.status(201).json(exclusion);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to add exclusion', message: error.message });
    }
  }

  async removeExclusion(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      await brandSafetyService.removeExclusion(accountId, id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to remove exclusion', message: error.message });
    }
  }

  async updateInventory(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { type } = req.body;
      if (!type) {
        res.status(400).json({ error: 'type is required' });
        return;
      }
      await brandSafetyService.updateSettings(accountId, { inventoryType: type });
      res.status(200).json({ success: true, inventoryType: type });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update inventory', message: error.message });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      const { enabled } = req.body;
      const settings = await brandSafetyService.getSettings(accountId);
      const categories = settings.categories.map(c => c.id === id ? { ...c, enabled } : c);
      await brandSafetyService.updateSettings(accountId, { categories } as any);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update category', message: error.message });
    }
  }
}

export const brandSafetyController = new BrandSafetyController();
