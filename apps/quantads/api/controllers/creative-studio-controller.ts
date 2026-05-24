// ============================================================================
// QuantAds API - Creative Studio Controller
// ============================================================================

import { creativeStudioService } from '../services/creative-studio-service';

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

class CreativeStudioController {
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category;
      const templates = await creativeStudioService.getTemplates(category);
      const accountId = req.user?.accountId || 'default';
      const projects = await creativeStudioService.getProjects(accountId);
      res.status(200).json({ templates, projects });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load templates', message: error.message });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await creativeStudioService.getTemplate(id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.status(200).json(template);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get template', message: error.message });
    }
  }

  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const projects = await creativeStudioService.getProjects(accountId);
      res.status(200).json({ projects });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load projects', message: error.message });
    }
  }

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { name, templateId, layers } = req.body;
      if (!name || !templateId) {
        res.status(400).json({ error: 'name and templateId are required' });
        return;
      }
      const project = await creativeStudioService.createProject(accountId, { name, templateId, layers: layers || [] });
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create project', message: error.message });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      const { name, layers } = req.body;
      const project = await creativeStudioService.updateProject(accountId, id, { name, layers });
      res.status(200).json(project);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update project', message: error.message });
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      await creativeStudioService.deleteProject(accountId, id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete project', message: error.message });
    }
  }

  async exportCreative(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { layers, format, dimensions, quality } = req.body;
      if (!layers || !format || !dimensions) {
        res.status(400).json({ error: 'layers, format, and dimensions are required' });
        return;
      }
      const record = await creativeStudioService.renderExport(accountId, { layers, format, dimensions, quality });
      res.status(200).json(record);
    } catch (error: any) {
      res.status(500).json({ error: 'Export failed', message: error.message });
    }
  }

  async generateFormats(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { projectId, formats } = req.body;
      if (!projectId || !formats || !Array.isArray(formats)) {
        res.status(400).json({ error: 'projectId and formats array are required' });
        return;
      }
      const exports = await creativeStudioService.generateFormats(accountId, projectId, formats);
      res.status(200).json({ exports });
    } catch (error: any) {
      res.status(500).json({ error: 'Format generation failed', message: error.message });
    }
  }

  async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const type = req.query.type;
      const assets = await creativeStudioService.getAssets(accountId, type);
      res.status(200).json({ assets });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load assets', message: error.message });
    }
  }

  async uploadAsset(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { name, type, fileSize, dimensions } = req.body;
      if (!name || !type) {
        res.status(400).json({ error: 'name and type are required' });
        return;
      }
      const asset = await creativeStudioService.uploadAsset(accountId, { name, type, fileSize: fileSize || 0, dimensions });
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(500).json({ error: 'Upload failed', message: error.message });
    }
  }

  async deleteAsset(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.user?.accountId || 'default';
      const { id } = req.params;
      await creativeStudioService.deleteAsset(accountId, id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete asset', message: error.message });
    }
  }
}

export const creativeStudioController = new CreativeStudioController();
