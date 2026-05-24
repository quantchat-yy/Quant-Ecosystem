// ============================================================================
// QuantAds API - Fraud Detection Controller
// ============================================================================

import { fraudService } from '../services/fraud-service';

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

class FraudController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const dateRange = req.query.range || '7d';
      const data = await fraudService.getDashboardMetrics(accountId, dateRange);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load fraud dashboard', message: error.message });
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const dateRange = req.query.range || '7d';
      const data = await fraudService.getDashboardMetrics(accountId, dateRange);
      res.status(200).json(data.metrics);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load metrics', message: error.message });
    }
  }

  async scoreBotProbability(req: Request, res: Response): Promise<void> {
    try {
      const { ip, userAgent, headers, behavior } = req.body;
      if (!ip || !userAgent) {
        res.status(400).json({ error: 'ip and userAgent are required' });
        return;
      }
      const score = await fraudService.scoreBotProbability({ ip, userAgent, headers: headers || {}, behavior: behavior || {} });
      res.status(200).json(score);
    } catch (error: any) {
      res.status(500).json({ error: 'Bot scoring failed', message: error.message });
    }
  }

  async getIPReputation(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = req.params;
      if (!ip) {
        res.status(400).json({ error: 'IP address required' });
        return;
      }
      const reputation = await fraudService.getIPReputation(ip);
      res.status(200).json(reputation);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get IP reputation', message: error.message });
    }
  }

  async blockIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = req.body;
      if (!ip) {
        res.status(400).json({ error: 'IP address required' });
        return;
      }
      await fraudService.blockIP(ip);
      res.status(200).json({ success: true, message: `IP ${ip} has been blocked` });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to block IP', message: error.message });
    }
  }

  async analyzeClicks(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, click } = req.body;
      if (!sessionId || !click) {
        res.status(400).json({ error: 'sessionId and click data required' });
        return;
      }
      const pattern = await fraudService.analyzeClickPattern(sessionId, click);
      res.status(200).json(pattern);
    } catch (error: any) {
      res.status(500).json({ error: 'Click analysis failed', message: error.message });
    }
  }

  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const data = await fraudService.getDashboardMetrics(accountId, '7d');
      res.status(200).json({ alerts: data.alerts });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load alerts', message: error.message });
    }
  }

  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await fraudService.resolveAlert(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to resolve alert', message: error.message });
    }
  }

  async trackViewability(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;
      if (!event.impressionId) {
        res.status(400).json({ error: 'impressionId required' });
        return;
      }
      await fraudService.trackViewability(event);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to track viewability', message: error.message });
    }
  }
}

export const fraudController = new FraudController();
