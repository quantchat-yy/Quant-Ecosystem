// ============================================================================
// QuantChat API - AR Filters Controller
// AR filter gallery, custom filters, face tracking
// ============================================================================

import type { Request, Response } from '../middleware';
import { arService } from '../services/ar-service';
import type { FilterType, FilterCategory, CustomFilterRequest } from '../../src/types';

export class ARFiltersController {
  async getFilters(req: Request, res: Response): Promise<void> {
    const type = req.query['type'] as FilterType | undefined;
    const category = req.query['category'] as FilterCategory | undefined;
    const trending = req.query['trending'] === 'true';
    const search = req.query['search'] as string | undefined;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const result = await arService.getFilters({ type, category, trending, search, limit, offset });
    res.status(200).json({ success: true, data: result.filters, metadata: { total: result.total, limit, offset } });
  }

  async getFilter(req: Request, res: Response): Promise<void> {
    const filterId = req.params['filterId'];
    const filter = await arService.getFilter(filterId);

    if (!filter) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Filter not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: filter });
  }

  async getTrending(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const filters = await arService.getTrending(limit);
    res.status(200).json({ success: true, data: filters });
  }

  async createCustomFilter(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as CustomFilterRequest;

    if (!body.name || !body.type || !body.category) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, type, and category are required', statusCode: 400 } });
      return;
    }

    const filter = await arService.createCustomFilter(userId, body);
    res.status(201).json({ success: true, data: filter });
  }

  async applyFilter(req: Request, res: Response): Promise<void> {
    const filterId = req.params['filterId'];
    const body = req.body as { imageData: string };

    if (!body.imageData) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Image data is required', statusCode: 400 } });
      return;
    }

    try {
      const result = await arService.applyFilter(filterId, body.imageData);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to apply filter';
      res.status(400).json({ success: false, error: { code: 'APPLY_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async detectFaces(req: Request, res: Response): Promise<void> {
    const body = req.body as { imageData: string };

    if (!body.imageData) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Image data is required', statusCode: 400 } });
      return;
    }

    const result = await arService.detectFaces(body.imageData);
    res.status(200).json({ success: true, data: result });
  }

  async addFavorite(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const filterId = req.params['filterId'];
    await arService.addFavorite(userId, filterId);
    res.status(200).json({ success: true, data: { message: 'Filter added to favorites' } });
  }

  async removeFavorite(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const filterId = req.params['filterId'];
    await arService.removeFavorite(userId, filterId);
    res.status(200).json({ success: true, data: { message: 'Filter removed from favorites' } });
  }

  async getFavorites(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const favorites = await arService.getUserFavorites(userId);
    res.status(200).json({ success: true, data: favorites });
  }
}

export const arFiltersController = new ARFiltersController();
