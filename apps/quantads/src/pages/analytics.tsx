// ============================================================================
// QuantAds - Analytics Dashboard
// KPI cards, line charts, funnel visualization, breakdown by placement/device/geo
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface KPICard {
  label: string;
  value: string;
  change: number;
  prefix?: string;
  suffix?: string;
}

interface TimeSeriesPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface BreakdownItem {
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
}

interface AnalyticsData {
  kpis: KPICard[];
  timeSeries: TimeSeriesPoint[];
  funnel: FunnelStage[];
  byPlacement: BreakdownItem[];
  byDevice: BreakdownItem[];
  byGeo: BreakdownItem[];
}

type DateRange = '7d' | '14d' | '30d' | '90d' | 'custom';
type BreakdownTab = 'placement' | 'device' | 'geo';

interface AnalyticsPageProps {
  campaignId?: string;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ campaignId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('placement');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');
  const [chartHover, setChartHover] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (campaignId) params.set('campaignId', campaignId);
      const response = await fetch(`/api/analytics/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange, campaignId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (n: number): string => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const getChangeIndicator = (change: number): string => {
    if (change > 0) return `+${change.toFixed(1)}%`;
    if (change < 0) return `${change.toFixed(1)}%`;
    return '0%';
  };

  const getMaxValue = (series: TimeSeriesPoint[], metric: string): number => {
    return Math.max(...series.map(p => (p as any)[metric] || 0), 1);
  };

  const getBreakdownData = (): BreakdownItem[] => {
    if (!data) return [];
    switch (breakdownTab) {
      case 'placement': return data.byPlacement;
      case 'device': return data.byDevice;
      case 'geo': return data.byGeo;
      default: return [];
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">Loading analytics...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Analytics Error</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-semibold text-gray-700">No analytics data</h3>
        <p className="text-gray-500">Start running campaigns to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2">
          {(['7d', '14d', '30d', '90d'] as DateRange[]).map(range => (
            <button key={range} onClick={() => setDateRange(range)} className={`px-3 py-1 rounded-lg text-sm ${dateRange === range ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {range}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {data.kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.prefix}{kpi.value}{kpi.suffix}</p>
            <p className={`text-sm mt-1 ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{getChangeIndicator(kpi.change)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Performance Over Time</h2>
          <div className="flex gap-2">
            {['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'roas'].map(metric => (
              <button key={metric} onClick={() => setSelectedMetric(metric)} className={`px-3 py-1 rounded text-xs capitalize ${selectedMetric === metric ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
                {metric}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 flex items-end gap-1 border-b border-l relative">
          {data.timeSeries.map((point, idx) => {
            const max = getMaxValue(data.timeSeries, selectedMetric);
            const value = (point as any)[selectedMetric] || 0;
            const height = (value / max) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group" onMouseEnter={() => setChartHover(idx)} onMouseLeave={() => setChartHover(null)}>
                <div className={`w-full rounded-t transition-all ${chartHover === idx ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ height: `${height}%`, minHeight: '2px' }} />
                {chartHover === idx && (
                  <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                    {point.date}: {selectedMetric === 'spend' ? formatCurrency(value) : selectedMetric === 'ctr' ? `${value.toFixed(2)}%` : formatNumber(value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
          <div className="space-y-3">
            {data.funnel.map((stage, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <span className="text-sm text-gray-500">{formatNumber(stage.value)} ({stage.percentage}%)</span>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg transition-all" style={{ width: `${stage.percentage}%`, backgroundColor: stage.color }} />
                </div>
                {idx < data.funnel.length - 1 && (
                  <div className="flex justify-center py-1">
                    <span className="text-xs text-gray-400">↓ {data.funnel[idx + 1] ? ((data.funnel[idx + 1].value / stage.value) * 100).toFixed(1) : 0}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Breakdown</h2>
            <div className="flex gap-1 ml-auto">
              {(['placement', 'device', 'geo'] as BreakdownTab[]).map(tab => (
                <button key={tab} onClick={() => setBreakdownTab(tab)} className={`px-3 py-1 rounded text-xs capitalize ${breakdownTab === tab ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {getBreakdownData().map((item, idx) => {
              const maxSpend = Math.max(...getBreakdownData().map(i => i.spend), 1);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24 truncate">{item.name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-400 rounded" style={{ width: `${(item.spend / maxSpend) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{formatCurrency(item.spend)}</span>
                  <span className="text-xs text-gray-500 w-12 text-right">{item.ctr.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
