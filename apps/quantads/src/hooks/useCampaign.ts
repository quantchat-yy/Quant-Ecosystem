// ============================================================================
// QuantAds - useCampaign Hook
// Campaign CRUD operations and real-time metrics updates
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversionRate: number;
  roas: number;
  frequency: number;
  reach: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed' | 'archived';
  objective: string;
  budget: { type: 'daily' | 'lifetime'; amount: number; spent: number };
  bidStrategy: string;
  schedule: { startDate: string; endDate: string; isEvergreen: boolean };
  targeting: { locations: string[]; ageMin: number; ageMax: number; interests: string[] };
  placements: string[];
  metrics: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

interface CreateCampaignInput {
  name: string;
  objective: string;
  budget: { type: 'daily' | 'lifetime'; amount: number };
  bidStrategy: string;
  schedule: { startDate: string; endDate: string };
  targeting: Record<string, any>;
  placements: string[];
  creative: Record<string, any>;
}

interface UpdateCampaignInput {
  name?: string;
  status?: string;
  budget?: { type: string; amount: number };
  bidStrategy?: string;
  targeting?: Record<string, any>;
  placements?: string[];
}

interface UseCampaignOptions {
  campaignId?: string;
  enableRealtime?: boolean;
  refreshInterval?: number;
}

interface UseCampaignReturn {
  campaign: Campaign | null;
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  metrics: CampaignMetrics | null;
  metricsLoading: boolean;
  create: (input: CreateCampaignInput) => Promise<Campaign | null>;
  update: (id: string, input: UpdateCampaignInput) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  pause: (id: string) => Promise<boolean>;
  resume: (id: string) => Promise<boolean>;
  duplicate: (id: string) => Promise<Campaign | null>;
  refresh: () => Promise<void>;
  fetchMetrics: (id: string, dateRange?: string) => Promise<CampaignMetrics | null>;
}

export function useCampaign(options: UseCampaignOptions = {}): UseCampaignReturn {
  const { campaignId, enableRealtime = false, refreshInterval = 30000 } = options;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCampaign = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      if (!response.ok) throw new Error('Campaign not found');
      const data = await response.json();
      setCampaign(data);
      setMetrics(data.metrics || null);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to load campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (campaignId) {
      setLoading(true);
      fetchCampaign(campaignId).finally(() => setLoading(false));
    } else {
      fetchCampaigns();
    }
  }, [campaignId, fetchCampaign, fetchCampaigns]);

  useEffect(() => {
    if (!enableRealtime || !campaignId) return;

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    const ws = new WebSocket(`${protocol}//${host}/ws/campaigns/${campaignId}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'metrics_update') {
          setMetrics(prev => prev ? { ...prev, ...msg.metrics } : msg.metrics);
          setCampaign(prev => prev ? { ...prev, metrics: { ...prev.metrics, ...msg.metrics } } : prev);
        } else if (msg.type === 'status_change') {
          setCampaign(prev => prev ? { ...prev, status: msg.status } : prev);
        }
      } catch {}
    };

    wsRef.current = ws;
    return () => { ws.close(); };
  }, [enableRealtime, campaignId]);

  useEffect(() => {
    if (!campaignId || enableRealtime) return;
    intervalRef.current = setInterval(() => {
      fetchCampaign(campaignId);
    }, refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [campaignId, enableRealtime, refreshInterval, fetchCampaign]);

  const create = useCallback(async (input: CreateCampaignInput): Promise<Campaign | null> => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create campaign');
      }
      const created = await response.json();
      setCampaigns(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateCampaignInput): Promise<boolean> => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to update campaign');
      const updated = await response.json();
      setCampaign(prev => prev?.id === id ? { ...prev, ...updated } : prev);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete campaign');
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (campaign?.id === id) setCampaign(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [campaign]);

  const pause = useCallback(async (id: string): Promise<boolean> => {
    return update(id, { status: 'paused' });
  }, [update]);

  const resume = useCallback(async (id: string): Promise<boolean> => {
    return update(id, { status: 'active' });
  }, [update]);

  const duplicate = useCallback(async (id: string): Promise<Campaign | null> => {
    try {
      const response = await fetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to duplicate campaign');
      const dup = await response.json();
      setCampaigns(prev => [dup, ...prev]);
      return dup;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (campaignId) {
      await fetchCampaign(campaignId);
    } else {
      await fetchCampaigns();
    }
  }, [campaignId, fetchCampaign, fetchCampaigns]);

  const fetchMetrics = useCallback(async (id: string, dateRange: string = '7d'): Promise<CampaignMetrics | null> => {
    setMetricsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/metrics?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to load metrics');
      const data = await response.json();
      setMetrics(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  return {
    campaign, campaigns, loading, error, metrics, metricsLoading,
    create, update, remove, pause, resume, duplicate, refresh, fetchMetrics,
  };
}

export default useCampaign;
