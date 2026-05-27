// ============================================================================
// QuantAds - Dashboard Page
// Ads manager dashboard with overview metrics
// ============================================================================

import type { Campaign } from '../types';

interface DashboardState {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  overallCTR: number;
  activeCampaigns: number;
  recentCampaigns: Campaign[];
  isLoading: boolean;
}

export function DashboardPage() {
  const state: DashboardState = {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    overallCTR: 0,
    activeCampaigns: 0,
    recentCampaigns: [],
    isLoading: true,
  };

  return {
    type: 'DashboardPage',
    layout: 'full-width',
    components: {
      header: {
        type: 'PageHeader',
        props: {
          title: 'Ads Manager',
          action: { label: 'Create Campaign', href: '/create-campaign' },
        },
      },
      metrics: {
        type: 'MetricsGrid',
        props: {
          metrics: [
            { label: 'Total Spend', value: `$${state.totalSpend.toFixed(2)}`, trend: '+12%' },
            { label: 'Impressions', value: formatNumber(state.totalImpressions), trend: '+8%' },
            { label: 'Clicks', value: formatNumber(state.totalClicks), trend: '+15%' },
            { label: 'CTR', value: `${state.overallCTR.toFixed(2)}%`, trend: '+0.3%' },
            { label: 'Active Campaigns', value: String(state.activeCampaigns) },
          ],
        },
      },
      chart: {
        type: 'AnalyticsChart',
        props: { period: '7d', metrics: ['impressions', 'clicks', 'spend'] },
      },
      campaigns: {
        type: 'CampaignList',
        props: { campaigns: state.recentCampaigns, compact: true },
      },
    },
  };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default DashboardPage;
