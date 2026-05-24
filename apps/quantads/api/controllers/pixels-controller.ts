// ============================================================================
// QuantAds API - Pixels Controller
// ============================================================================

import { pixelService } from '../services/pixel-service';

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

class PixelsController {
  async listPixels(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const pixels = await pixelService.getPixels(accountId);
      res.status(200).json({ pixels });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to list pixels', message: error.message });
    }
  }

  async createPixel(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { name, domain } = req.body;
      if (!name || !domain) {
        res.status(400).json({ error: 'name and domain are required' });
        return;
      }
      const pixel = await pixelService.createPixel(accountId, name, domain);
      res.status(201).json(pixel);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create pixel', message: error.message });
    }
  }

  async getPixel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const pixel = await pixelService.getPixel(id);
      if (!pixel) {
        res.status(404).json({ error: 'Pixel not found' });
        return;
      }
      res.status(200).json(pixel);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get pixel', message: error.message });
    }
  }

  async deletePixel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await pixelService.deletePixel(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete pixel', message: error.message });
    }
  }

  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, limit, offset } = req.query;
      const result = await pixelService.getEvents(id, {
        type: type || undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get events', message: error.message });
    }
  }

  async ingestEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, url, value, currency, parameters, sessionId, userId, deviceId } = req.body;
      if (!type) {
        res.status(400).json({ error: 'Event type is required' });
        return;
      }
      const event = await pixelService.ingestEvent({
        pixelId: id,
        type,
        url: url || req.headers.referer || '',
        value,
        currency,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || '',
        ip: req.headers['x-forwarded-for'] || '127.0.0.1',
        sessionId: sessionId || `sess_${Date.now()}`,
        userId,
        deviceId,
        parameters: parameters || {},
      });
      res.status(200).json({ success: true, eventId: event.id });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to ingest event', message: error.message });
    }
  }

  async testEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { eventType } = req.body;
      if (!eventType) {
        res.status(400).json({ error: 'eventType is required' });
        return;
      }
      const result = await pixelService.testEvent(id, eventType);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Test failed', message: error.message });
    }
  }

  async getAttribution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const models = await pixelService.getAttributionModels(id);
      res.status(200).json({ models });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get attribution', message: error.message });
    }
  }
}

export const pixelsController = new PixelsController();
