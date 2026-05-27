// ============================================================================
// QuantAds - Campaigns Page
// Campaign list with status filters, search, bulk actions, inline metrics
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed' | 'archived';
  objective: string;
  budget: number;
  budgetType: 'daily' | 'lifetime';
  startDate: string;
  endDate?: string;
  metrics: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | 'active' | 'paused' | 'draft' | 'completed';
type SortField = 'name' | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'roas' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface CampaignsPageProps {
  accountId?: string;
}

const CampaignsPage: React.FC<CampaignsPageProps> = ({ accountId: _accountId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort: sortField,
        order: sortOrder,
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      const response = await fetch(`/api/campaigns?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, statusFilter, searchQuery]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map((c) => c.id)));
    }
  }, [campaigns, selectedIds.size]);

  const executeBulkAction = useCallback(
    async (action: 'pause' | 'resume' | 'archive' | 'delete') => {
      if (selectedIds.size === 0) return;
      setBulkActionLoading(true);
      try {
        const response = await fetch('/api/campaigns/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedIds), action }),
        });
        if (!response.ok) throw new Error(`Bulk ${action} failed`);
        setCampaigns((prev) =>
          prev
            .map((c) => {
              if (!selectedIds.has(c.id)) return c;
              if (action === 'pause') return { ...c, status: 'paused' as const };
              if (action === 'resume') return { ...c, status: 'active' as const };
              if (action === 'archive') return { ...c, status: 'archived' as const };
              return c;
            })
            .filter((c) => action !== 'delete' || !selectedIds.has(c.id)),
        );
        setSelectedIds(new Set());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedIds],
  );

  const formatCurrency = (n: number): string =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
  const formatNumber = (n: number): string =>
    n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}K`
        : n.toString();

  const statusCounts = campaigns.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">Loading campaigns...</span>
      </div>
    );
  }

  if (error && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Failed to load campaigns</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchCampaigns}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
        <a
          href="/create-campaign"
          className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          + New Campaign
        </a>
      </header>

      <div className="flex items-center gap-2 mb-4 border-b">
        {(['all', 'active', 'paused', 'draft', 'completed'] as StatusFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              statusFilter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab} {tab !== 'all' && statusCounts[tab] ? `(${statusCounts[tab]})` : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
            <button
              onClick={() => executeBulkAction('pause')}
              disabled={bulkActionLoading}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              Pause
            </button>
            <button
              onClick={() => executeBulkAction('resume')}
              disabled={bulkActionLoading}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Resume
            </button>
            <button
              onClick={() => executeBulkAction('archive')}
              disabled={bulkActionLoading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Archive
            </button>
          </div>
        )}
      </div>

      {campaigns.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 mb-4">Create your first campaign to start advertising.</p>
          <a href="/create-campaign" className="px-6 py-2 bg-blue-500 text-white rounded-lg">
            Create Campaign
          </a>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === campaigns.length && campaigns.length > 0}
                    onChange={selectAll}
                    className="rounded"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Campaign {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('spend')}
                >
                  Spend {sortField === 'spend' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('impressions')}
                >
                  Impressions {sortField === 'impressions' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('clicks')}
                >
                  Clicks {sortField === 'clicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('ctr')}
                >
                  CTR {sortField === 'ctr' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => handleSort('roas')}
                >
                  ROAS {sortField === 'roas' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(campaign.id)}
                      onChange={() => toggleSelect(campaign.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {campaign.name}
                    </a>
                    <p className="text-xs text-gray-500 capitalize">{campaign.objective}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(campaign.status)}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {formatCurrency(campaign.metrics.spend)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatNumber(campaign.metrics.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatNumber(campaign.metrics.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {campaign.metrics.ctr.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {campaign.metrics.roas.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
