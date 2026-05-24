// ============================================================================
// QuantAds API - Pixel Service
// Event ingestion, attribution modeling, cross-device matching
// ============================================================================

interface Pixel {
  id: string;
  accountId: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  lastActivity: string;
  eventsToday: number;
  totalEvents: number;
}

interface PixelEvent {
  id: string;
  pixelId: string;
  type: string;
  url: string;
  referrer?: string;
  value?: number;
  currency?: string;
  timestamp: string;
  userAgent: string;
  ip: string;
  deviceId?: string;
  userId?: string;
  sessionId: string;
  parameters: Record<string, string>;
  attributed: boolean;
  campaignId?: string;
  adId?: string;
  clickId?: string;
}

interface AttributionTouch {
  timestamp: string;
  channel: string;
  campaignId: string;
  adId?: string;
  type: 'impression' | 'click' | 'view';
}

interface ConversionAttribution {
  conversionId: string;
  pixelId: string;
  value: number;
  touches: AttributionTouch[];
  model: string;
  attributedCampaignId: string;
  attributedAdId?: string;
  window: number;
  crossDevice: boolean;
}

interface DeviceGraph {
  userId: string;
  devices: { deviceId: string; type: string; firstSeen: string; lastSeen: string }[];
  matchConfidence: number;
}

interface AttributionModel {
  type: 'last_click' | 'first_click' | 'linear' | 'time_decay' | 'position_based';
  window: number;
  conversions: number;
  revenue: number;
}

interface PixelStore {
  pixels: Map<string, Pixel>;
  events: PixelEvent[];
  conversions: ConversionAttribution[];
  deviceGraphs: Map<string, DeviceGraph>;
  touches: Map<string, AttributionTouch[]>;
}

const store: PixelStore = {
  pixels: new Map(),
  events: [],
  conversions: [],
  deviceGraphs: new Map(),
  touches: new Map(),
};

export class PixelService {
  async createPixel(accountId: string, name: string, domain: string): Promise<Pixel> {
    const pixel: Pixel = {
      id: `px_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      name,
      domain,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      eventsToday: 0,
      totalEvents: 0,
    };
    store.pixels.set(pixel.id, pixel);
    return pixel;
  }

  async getPixels(accountId: string): Promise<Pixel[]> {
    return Array.from(store.pixels.values()).filter(p => p.accountId === accountId);
  }

  async getPixel(pixelId: string): Promise<Pixel | null> {
    return store.pixels.get(pixelId) || null;
  }

  async ingestEvent(event: Omit<PixelEvent, 'id' | 'attributed' | 'campaignId'>): Promise<PixelEvent> {
    const pixel = store.pixels.get(event.pixelId);
    if (!pixel) throw new Error('Pixel not found');

    const fullEvent: PixelEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      attributed: false,
    };

    if (event.clickId) {
      const attribution = await this.attributeConversion(fullEvent);
      if (attribution) {
        fullEvent.attributed = true;
        fullEvent.campaignId = attribution.attributedCampaignId;
        fullEvent.adId = attribution.attributedAdId;
      }
    }

    store.events.push(fullEvent);
    if (store.events.length > 100000) store.events = store.events.slice(-50000);

    pixel.lastActivity = new Date().toISOString();
    pixel.eventsToday++;
    pixel.totalEvents++;

    if (event.deviceId && event.userId) {
      await this.updateDeviceGraph(event.userId, event.deviceId, event.userAgent);
    }

    return fullEvent;
  }

  async getEvents(pixelId: string, options: { type?: string; limit?: number; offset?: number }): Promise<{ events: PixelEvent[]; total: number }> {
    let filtered = store.events.filter(e => e.pixelId === pixelId);
    if (options.type && options.type !== 'all') {
      filtered = filtered.filter(e => e.type === options.type);
    }
    const total = filtered.length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    return { events: filtered.slice(offset, offset + limit), total };
  }

  async attributeConversion(event: PixelEvent): Promise<ConversionAttribution | null> {
    const sessionTouches = store.touches.get(event.sessionId) || [];
    if (sessionTouches.length === 0) return null;

    const windowMs = 7 * 24 * 60 * 60 * 1000;
    const eventTime = new Date(event.timestamp).getTime();
    const eligibleTouches = sessionTouches.filter(t => eventTime - new Date(t.timestamp).getTime() <= windowMs);

    if (eligibleTouches.length === 0) return null;

    const lastTouch = eligibleTouches[eligibleTouches.length - 1];
    const attribution: ConversionAttribution = {
      conversionId: event.id,
      pixelId: event.pixelId,
      value: event.value || 0,
      touches: eligibleTouches,
      model: 'last_click',
      attributedCampaignId: lastTouch.campaignId,
      attributedAdId: lastTouch.adId,
      window: 7,
      crossDevice: false,
    };

    if (event.deviceId) {
      const graph = await this.findDeviceGraph(event.deviceId);
      if (graph && graph.devices.length > 1) {
        attribution.crossDevice = true;
      }
    }

    store.conversions.push(attribution);
    return attribution;
  }

  async recordTouch(sessionId: string, touch: AttributionTouch): Promise<void> {
    const existing = store.touches.get(sessionId) || [];
    existing.push(touch);
    if (existing.length > 100) existing.splice(0, existing.length - 50);
    store.touches.set(sessionId, existing);
  }

  async getAttributionModels(pixelId: string): Promise<AttributionModel[]> {
    const pixelConversions = store.conversions.filter(c => c.pixelId === pixelId);
    const totalConversions = pixelConversions.length;
    const totalRevenue = pixelConversions.reduce((s, c) => s + c.value, 0);

    return [
      { type: 'last_click', window: 7, conversions: totalConversions, revenue: totalRevenue },
      { type: 'first_click', window: 7, conversions: Math.floor(totalConversions * 0.85), revenue: Math.floor(totalRevenue * 0.8) },
      { type: 'linear', window: 7, conversions: totalConversions, revenue: totalRevenue },
      { type: 'time_decay', window: 7, conversions: Math.floor(totalConversions * 0.92), revenue: Math.floor(totalRevenue * 0.9) },
      { type: 'position_based', window: 7, conversions: Math.floor(totalConversions * 0.95), revenue: Math.floor(totalRevenue * 0.93) },
    ];
  }

  async updateDeviceGraph(userId: string, deviceId: string, userAgent: string): Promise<void> {
    let graph = store.deviceGraphs.get(userId);
    if (!graph) {
      graph = { userId, devices: [], matchConfidence: 1.0 };
      store.deviceGraphs.set(userId, graph);
    }

    const existing = graph.devices.find(d => d.deviceId === deviceId);
    if (existing) {
      existing.lastSeen = new Date().toISOString();
    } else {
      const type = /mobile|android|iphone/i.test(userAgent) ? 'mobile' : /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop';
      graph.devices.push({ deviceId, type, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() });
      graph.matchConfidence = Math.max(0.5, graph.matchConfidence - 0.1 * (graph.devices.length - 1));
    }
  }

  async findDeviceGraph(deviceId: string): Promise<DeviceGraph | null> {
    for (const graph of store.deviceGraphs.values()) {
      if (graph.devices.some(d => d.deviceId === deviceId)) return graph;
    }
    return null;
  }

  async testEvent(pixelId: string, eventType: string): Promise<{ success: boolean; details: string }> {
    const pixel = store.pixels.get(pixelId);
    if (!pixel) return { success: false, details: 'Pixel not found' };
    if (pixel.status !== 'active') return { success: false, details: 'Pixel is not active' };

    await this.ingestEvent({
      pixelId,
      type: eventType,
      url: `https://${pixel.domain}/test`,
      timestamp: new Date().toISOString(),
      userAgent: 'QuantAds Test Agent',
      ip: '127.0.0.1',
      sessionId: `test_${Date.now()}`,
      parameters: { source: 'test' },
    });

    return { success: true, details: 'Event received and processed successfully' };
  }

  async deletePixel(pixelId: string): Promise<void> {
    store.pixels.delete(pixelId);
    store.events = store.events.filter(e => e.pixelId !== pixelId);
  }
}

export const pixelService = new PixelService();
