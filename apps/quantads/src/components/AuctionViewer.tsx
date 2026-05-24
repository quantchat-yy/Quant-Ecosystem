// ============================================================================
// QuantAds - AuctionViewer Component
// Real-time auction bid waterfall visualization
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface Bidder {
  id: string;
  name: string;
  bidAmount: number;
  maxBid: number;
  qualityScore: number;
  relevanceScore: number;
  effectiveBid: number;
  status: 'won' | 'lost' | 'pending' | 'filtered';
  responseTime: number;
  reason?: string;
}

interface AuctionRound {
  id: string;
  timestamp: string;
  placementId: string;
  placementName: string;
  floorPrice: number;
  winningBid: number;
  bidders: Bidder[];
  latency: number;
  auctionType: 'first_price' | 'second_price' | 'header_bidding';
  impressionId: string;
}

interface AuctionStats {
  totalAuctions: number;
  avgWinningBid: number;
  avgBidders: number;
  avgLatency: number;
  fillRate: number;
  winRate: number;
}

interface AuctionViewerProps {
  campaignId?: string;
  adGroupId?: string;
  realtime?: boolean;
  maxRounds?: number;
}

const AuctionViewer: React.FC<AuctionViewerProps> = ({
  campaignId,
  adGroupId,
  realtime = true,
  maxRounds = 20,
}) => {
  const [rounds, setRounds] = useState<AuctionRound[]>([]);
  const [stats, setStats] = useState<AuctionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<AuctionRound | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(maxRounds) });
      if (campaignId) params.set('campaignId', campaignId);
      if (adGroupId) params.set('adGroupId', adGroupId);
      const response = await fetch(`/api/bidding/auctions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load auction data');
      const data = await response.json();
      setRounds(data.auctions || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, adGroupId, maxRounds]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!realtime || paused) return;
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    const ws = new WebSocket(`${protocol}//${host}/ws/auctions`);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const round: AuctionRound = JSON.parse(event.data);
        setRounds(prev => [round, ...prev].slice(0, maxRounds));
      } catch {}
    };

    return () => { ws.close(); };
  }, [realtime, paused, maxRounds]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-700';
      case 'lost': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'filtered': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getBarWidth = (bid: number, maxBid: number): number => {
    return maxBid > 0 ? (bid / maxBid) * 100 : 0;
  };

  const formatCurrency = (n: number): string => `$${n.toFixed(3)}`;

  if (loading && rounds.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">Loading auctions...</span>
      </div>
    );
  }

  if (error && rounds.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-2">Failed to load auction data</p>
        <button onClick={fetchHistory} className="text-sm text-blue-500 hover:underline">Retry</button>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <div className="text-4xl mb-2">⚡</div>
        <p>No auction data available yet</p>
      </div>
    );
  }

  const maxBidInView = Math.max(...rounds.flatMap(r => r.bidders.map(b => b.effectiveBid)), 0.01);

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Auction Viewer</h3>
          {wsConnected && <span className="flex items-center gap-1 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Live</span>}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2 py-1 border rounded">
            <option value="all">All</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button onClick={() => setPaused(!paused)} className={`px-3 py-1 rounded text-xs ${paused ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-gray-50 border-b">
          <div className="text-center"><p className="text-xs text-gray-500">Auctions</p><p className="font-bold text-sm">{stats.totalAuctions}</p></div>
          <div className="text-center"><p className="text-xs text-gray-500">Avg Bid</p><p className="font-bold text-sm">{formatCurrency(stats.avgWinningBid)}</p></div>
          <div className="text-center"><p className="text-xs text-gray-500">Avg Bidders</p><p className="font-bold text-sm">{stats.avgBidders.toFixed(1)}</p></div>
          <div className="text-center"><p className="text-xs text-gray-500">Avg Latency</p><p className="font-bold text-sm">{stats.avgLatency}ms</p></div>
          <div className="text-center"><p className="text-xs text-gray-500">Fill Rate</p><p className="font-bold text-sm">{stats.fillRate}%</p></div>
          <div className="text-center"><p className="text-xs text-gray-500">Win Rate</p><p className="font-bold text-sm">{stats.winRate}%</p></div>
        </div>
      )}

      <div className="divide-y max-h-96 overflow-y-auto">
        {rounds.map(round => (
          <div key={round.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRound(selectedRound?.id === round.id ? null : round)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{new Date(round.timestamp).toLocaleTimeString()}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{round.placementName}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{round.auctionType.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{round.latency}ms</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(round.winningBid)}</span>
              </div>
            </div>

            <div className="space-y-1">
              {round.bidders
                .filter(b => filterStatus === 'all' || b.status === filterStatus)
                .sort((a, b) => b.effectiveBid - a.effectiveBid)
                .map(bidder => (
                  <div key={bidder.id} className="flex items-center gap-2">
                    <span className="text-xs w-20 truncate text-gray-700">{bidder.name}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                      <div className={`h-full rounded transition-all ${bidder.status === 'won' ? 'bg-green-400' : bidder.status === 'filtered' ? 'bg-gray-300' : 'bg-blue-300'}`}
                        style={{ width: `${getBarWidth(bidder.effectiveBid, maxBidInView)}%` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">{formatCurrency(bidder.effectiveBid)}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(bidder.status)}`}>{bidder.status}</span>
                  </div>
                ))}
            </div>

            {selectedRound?.id === round.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Floor Price:</span> <span className="font-medium">{formatCurrency(round.floorPrice)}</span></div>
                  <div><span className="text-gray-500">Impression ID:</span> <span className="font-mono">{round.impressionId.slice(0, 12)}...</span></div>
                  <div><span className="text-gray-500">Bidders:</span> <span className="font-medium">{round.bidders.length}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{round.auctionType.replace('_', ' ')}</span></div>
                </div>
                <div className="mt-2">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Bidder Details</h4>
                  {round.bidders.map(b => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-0.5">
                      <span>{b.name}</span>
                      <span>QS: {b.qualityScore} | Rel: {b.relevanceScore} | {b.responseTime}ms {b.reason && `(${b.reason})`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuctionViewer;
