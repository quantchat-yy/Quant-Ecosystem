// ============================================================================
// QuantAds API - Creative Studio Service
// Template rendering, asset management, format generation
// ============================================================================

interface Template {
  id: string;
  name: string;
  category: 'social' | 'display' | 'video' | 'story' | 'email';
  thumbnail: string;
  dimensions: { width: number; height: number };
  layers: Layer[];
  tags: string[];
  usageCount: number;
  createdAt: string;
}

interface Layer {
  id: string;
  type: 'text' | 'image' | 'button' | 'shape' | 'logo';
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  properties: Record<string, any>;
}

interface Project {
  id: string;
  accountId: string;
  name: string;
  templateId: string;
  template: Template;
  layers: Layer[];
  lastModified: string;
  exported: boolean;
  exports: ExportRecord[];
}

interface ExportRecord {
  id: string;
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'gif' | 'mp4';
  dimensions: { width: number; height: number };
  fileSize: number;
  url: string;
  createdAt: string;
}

interface Asset {
  id: string;
  accountId: string;
  name: string;
  type: 'image' | 'video' | 'font' | 'logo';
  url: string;
  thumbnail: string;
  dimensions?: { width: number; height: number };
  fileSize: number;
  uploadedAt: string;
}

interface RenderRequest {
  layers: Layer[];
  format: string;
  dimensions: { width: number; height: number };
  quality?: number;
  background?: string;
}

interface StudioStore {
  templates: Template[];
  projects: Map<string, Project[]>;
  assets: Map<string, Asset[]>;
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: 'tpl_feed_1', name: 'Feed Post - Product', category: 'social', thumbnail: '', dimensions: { width: 1080, height: 1080 }, layers: [
    { id: 'l1', type: 'image', name: 'Background', visible: true, locked: false, x: 0, y: 0, width: 1080, height: 1080, rotation: 0, opacity: 100, properties: { src: '', fit: 'cover', borderRadius: 0 } },
    { id: 'l2', type: 'text', name: 'Headline', visible: true, locked: false, x: 100, y: 800, width: 880, height: 60, rotation: 0, opacity: 100, properties: { content: 'Your Headline', fontSize: 48, fontFamily: 'Inter', fontWeight: 'bold', color: '#FFFFFF', alignment: 'center' } },
    { id: 'l3', type: 'button', name: 'CTA Button', visible: true, locked: false, x: 340, y: 920, width: 400, height: 60, rotation: 0, opacity: 100, properties: { text: 'Shop Now', backgroundColor: '#3B82F6', textColor: '#FFFFFF', borderRadius: 30, fontSize: 18 } },
  ], tags: ['product', 'ecommerce', 'feed'], usageCount: 1250, createdAt: '2024-01-15T00:00:00Z' },
  { id: 'tpl_story_1', name: 'Story - Sale', category: 'story', thumbnail: '', dimensions: { width: 1080, height: 1920 }, layers: [
    { id: 'l1', type: 'shape', name: 'Background', visible: true, locked: true, x: 0, y: 0, width: 1080, height: 1920, rotation: 0, opacity: 100, properties: { fill: '#FF6B6B' } },
    { id: 'l2', type: 'text', name: 'Sale Text', visible: true, locked: false, x: 100, y: 400, width: 880, height: 200, rotation: 0, opacity: 100, properties: { content: 'MEGA SALE', fontSize: 96, fontFamily: 'Impact', fontWeight: 'bold', color: '#FFFFFF', alignment: 'center' } },
    { id: 'l3', type: 'text', name: 'Discount', visible: true, locked: false, x: 200, y: 650, width: 680, height: 150, rotation: 0, opacity: 100, properties: { content: 'UP TO 70% OFF', fontSize: 64, fontFamily: 'Inter', fontWeight: 'bold', color: '#FFF3CD', alignment: 'center' } },
    { id: 'l4', type: 'button', name: 'Swipe Up', visible: true, locked: false, x: 340, y: 1600, width: 400, height: 60, rotation: 0, opacity: 100, properties: { text: 'Swipe Up', backgroundColor: '#FFFFFF', textColor: '#FF6B6B', borderRadius: 30, fontSize: 18 } },
  ], tags: ['sale', 'discount', 'story'], usageCount: 890, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'tpl_banner_1', name: 'Leaderboard Banner', category: 'display', thumbnail: '', dimensions: { width: 728, height: 90 }, layers: [
    { id: 'l1', type: 'shape', name: 'Background', visible: true, locked: true, x: 0, y: 0, width: 728, height: 90, rotation: 0, opacity: 100, properties: { fill: '#1E3A5F' } },
    { id: 'l2', type: 'logo', name: 'Logo', visible: true, locked: false, x: 20, y: 15, width: 60, height: 60, rotation: 0, opacity: 100, properties: { src: '' } },
    { id: 'l3', type: 'text', name: 'Message', visible: true, locked: false, x: 100, y: 20, width: 400, height: 50, rotation: 0, opacity: 100, properties: { content: 'Discover Something New', fontSize: 24, fontFamily: 'Inter', fontWeight: 'semibold', color: '#FFFFFF', alignment: 'left' } },
    { id: 'l4', type: 'button', name: 'CTA', visible: true, locked: false, x: 580, y: 22, width: 130, height: 46, rotation: 0, opacity: 100, properties: { text: 'Learn More', backgroundColor: '#3B82F6', textColor: '#FFFFFF', borderRadius: 6, fontSize: 14 } },
  ], tags: ['banner', 'display', 'leaderboard'], usageCount: 2100, createdAt: '2024-01-20T00:00:00Z' },
  { id: 'tpl_video_1', name: 'Video Ad - 16:9', category: 'video', thumbnail: '', dimensions: { width: 1920, height: 1080 }, layers: [
    { id: 'l1', type: 'image', name: 'Frame', visible: true, locked: false, x: 0, y: 0, width: 1920, height: 1080, rotation: 0, opacity: 100, properties: { src: '', fit: 'cover', borderRadius: 0 } },
    { id: 'l2', type: 'text', name: 'Title', visible: true, locked: false, x: 100, y: 800, width: 1200, height: 80, rotation: 0, opacity: 100, properties: { content: 'Video Title', fontSize: 56, fontFamily: 'Inter', fontWeight: 'bold', color: '#FFFFFF', alignment: 'left' } },
  ], tags: ['video', '16:9', 'landscape'], usageCount: 560, createdAt: '2024-03-01T00:00:00Z' },
  { id: 'tpl_email_1', name: 'Email Header', category: 'email', thumbnail: '', dimensions: { width: 600, height: 200 }, layers: [
    { id: 'l1', type: 'shape', name: 'Background', visible: true, locked: true, x: 0, y: 0, width: 600, height: 200, rotation: 0, opacity: 100, properties: { fill: '#F8FAFC' } },
    { id: 'l2', type: 'logo', name: 'Logo', visible: true, locked: false, x: 230, y: 30, width: 140, height: 50, rotation: 0, opacity: 100, properties: { src: '' } },
    { id: 'l3', type: 'text', name: 'Tagline', visible: true, locked: false, x: 100, y: 110, width: 400, height: 40, rotation: 0, opacity: 100, properties: { content: 'Your tagline here', fontSize: 18, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', alignment: 'center' } },
  ], tags: ['email', 'header'], usageCount: 340, createdAt: '2024-02-15T00:00:00Z' },
];

const store: StudioStore = {
  templates: [...DEFAULT_TEMPLATES],
  projects: new Map(),
  assets: new Map(),
};

export class CreativeStudioService {
  async getTemplates(category?: string): Promise<Template[]> {
    if (category && category !== 'all') {
      return store.templates.filter(t => t.category === category);
    }
    return store.templates;
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    return store.templates.find(t => t.id === templateId) || null;
  }

  async getProjects(accountId: string): Promise<Project[]> {
    return store.projects.get(accountId) || [];
  }

  async getProject(accountId: string, projectId: string): Promise<Project | null> {
    const projects = store.projects.get(accountId) || [];
    return projects.find(p => p.id === projectId) || null;
  }

  async createProject(accountId: string, data: { name: string; templateId: string; layers: Layer[] }): Promise<Project> {
    const template = store.templates.find(t => t.id === data.templateId);
    if (!template) throw new Error('Template not found');

    template.usageCount++;

    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      name: data.name,
      templateId: data.templateId,
      template,
      layers: data.layers,
      lastModified: new Date().toISOString(),
      exported: false,
      exports: [],
    };

    const projects = store.projects.get(accountId) || [];
    projects.push(project);
    store.projects.set(accountId, projects);
    return project;
  }

  async updateProject(accountId: string, projectId: string, data: { name?: string; layers?: Layer[] }): Promise<Project> {
    const projects = store.projects.get(accountId) || [];
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx < 0) throw new Error('Project not found');

    if (data.name) projects[idx].name = data.name;
    if (data.layers) projects[idx].layers = data.layers;
    projects[idx].lastModified = new Date().toISOString();
    return projects[idx];
  }

  async deleteProject(accountId: string, projectId: string): Promise<void> {
    const projects = store.projects.get(accountId) || [];
    store.projects.set(accountId, projects.filter(p => p.id !== projectId));
  }

  async renderExport(accountId: string, request: RenderRequest): Promise<ExportRecord> {
    const { layers, format, dimensions, quality = 90 } = request;

    let fileSize = dimensions.width * dimensions.height;
    switch (format) {
      case 'png': fileSize = Math.floor(fileSize * 0.3); break;
      case 'jpg': fileSize = Math.floor(fileSize * 0.15 * (quality / 100)); break;
      case 'svg': fileSize = Math.floor(layers.length * 2000 + 5000); break;
      case 'pdf': fileSize = Math.floor(fileSize * 0.4); break;
      default: fileSize = Math.floor(fileSize * 0.2);
    }

    const record: ExportRecord = {
      id: `exp_${Date.now()}`,
      format: format as ExportRecord['format'],
      dimensions,
      fileSize,
      url: `/exports/${Date.now()}.${format}`,
      createdAt: new Date().toISOString(),
    };

    return record;
  }

  async uploadAsset(accountId: string, data: { name: string; type: Asset['type']; fileSize: number; dimensions?: { width: number; height: number } }): Promise<Asset> {
    const asset: Asset = {
      id: `asset_${Date.now()}`,
      accountId,
      name: data.name,
      type: data.type,
      url: `/assets/${accountId}/${Date.now()}_${data.name}`,
      thumbnail: `/assets/${accountId}/thumb_${Date.now()}.jpg`,
      dimensions: data.dimensions,
      fileSize: data.fileSize,
      uploadedAt: new Date().toISOString(),
    };

    const assets = store.assets.get(accountId) || [];
    assets.push(asset);
    store.assets.set(accountId, assets);
    return asset;
  }

  async getAssets(accountId: string, type?: string): Promise<Asset[]> {
    const assets = store.assets.get(accountId) || [];
    if (type) return assets.filter(a => a.type === type);
    return assets;
  }

  async deleteAsset(accountId: string, assetId: string): Promise<void> {
    const assets = store.assets.get(accountId) || [];
    store.assets.set(accountId, assets.filter(a => a.id !== assetId));
  }

  async generateFormats(accountId: string, projectId: string, formats: { width: number; height: number; name: string }[]): Promise<ExportRecord[]> {
    const project = await this.getProject(accountId, projectId);
    if (!project) throw new Error('Project not found');

    const exports: ExportRecord[] = [];
    for (const format of formats) {
      const scaleX = format.width / project.template.dimensions.width;
      const scaleY = format.height / project.template.dimensions.height;
      const scaledLayers = project.layers.map(l => ({
        ...l,
        x: Math.round(l.x * scaleX),
        y: Math.round(l.y * scaleY),
        width: Math.round(l.width * scaleX),
        height: Math.round(l.height * scaleY),
      }));

      const record = await this.renderExport(accountId, {
        layers: scaledLayers,
        format: 'png',
        dimensions: { width: format.width, height: format.height },
      });
      exports.push(record);
    }
    return exports;
  }

  async duplicateTemplate(templateId: string, newName: string): Promise<Template> {
    const source = store.templates.find(t => t.id === templateId);
    if (!source) throw new Error('Template not found');

    const duplicate: Template = {
      ...source,
      id: `tpl_${Date.now()}`,
      name: newName,
      layers: source.layers.map(l => ({ ...l, id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    store.templates.push(duplicate);
    return duplicate;
  }
}

export const creativeStudioService = new CreativeStudioService();
