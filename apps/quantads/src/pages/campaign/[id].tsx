// ============================================================================
// QuantAds - Campaign Detail Page
// Campaign detail with analytics and management
// ============================================================================

import type { Campaign, CampaignMetrics } from '../../types';

interface CampaignDetailState {
  campaign: Campaign | null;
  metrics: CampaignMetrics | null;
  activeTab: 'overview' | 'creatives' | 'targeting' | 'analytics' | 'ab-tests';
  isLoading: boolean;
}

export function CampaignDetailPage({ campaignId: _campaignId }: { campaignId: string }) {
  const state: CampaignDetailState = {
    campaign: null,
    metrics: null,
    activeTab: 'overview',
    isLoading: true,
  };

  return {
    type: 'CampaignDetailPage',
    layout: 'full-width',
    components: {
      header: { type: 'CampaignHeader', props: { campaign: state.campaign } },
      metrics: { type: 'MetricsSummary', props: { metrics: state.metrics } },
      tabs: {
        type: 'TabBar',
        props: {
          tabs: ['overview', 'creatives', 'targeting', 'analytics', 'ab-tests'],
          active: state.activeTab,
        },
      },
      content: {
        type: 'CampaignTabContent',
        props: { tab: state.activeTab, campaign: state.campaign },
      },
    },
  };
}

export default CampaignDetailPage;
