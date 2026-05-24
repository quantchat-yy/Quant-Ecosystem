// ============================================================================
// QuantAds - Audiences Page
// Segment builder, audience size estimator, lookalike creation, save/edit audiences
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  type: 'custom' | 'lookalike' | 'saved' | 'retargeting';
  size: number;
  status: 'ready' | 'building' | 'too_small' | 'expired';
  rules: SegmentRule[];
  createdAt: string;
  lastUpdated: string;
  matchRate?: number;
}

interface SegmentRule {
  id: string;
  category: 'demographics' | 'interests' | 'behaviors' | 'connections' | 'custom';
  field: string;
  operator: 'is' | 'is_not' | 'contains' | 'between' | 'greater_than' | 'less_than';
  values: string[];
}

interface DemographicOption {
  category: string;
  options: { id: string; label: string; count: number }[];
}

interface LookalikeConfig {
  sourceAudienceId: string;
  country: string;
  percentage: number;
}

interface AudiencesPageProps {
  accountId?: string;
}

const DEMOGRAPHIC_OPTIONS: DemographicOption[] = [
  { category: 'Age', options: [{ id: '18-24', label: '18-24', count: 45000000 }, { id: '25-34', label: '25-34', count: 62000000 }, { id: '35-44', label: '35-44', count: 48000000 }, { id: '45-54', label: '45-54', count: 38000000 }, { id: '55-64', label: '55-64', count: 28000000 }, { id: '65+', label: '65+', count: 22000000 }] },
  { category: 'Gender', options: [{ id: 'male', label: 'Male', count: 120000000 }, { id: 'female', label: 'Female', count: 125000000 }, { id: 'all', label: 'All Genders', count: 250000000 }] },
  { category: 'Income', options: [{ id: 'low', label: '$0-50K', count: 80000000 }, { id: 'mid', label: '$50K-100K', count: 65000000 }, { id: 'high', label: '$100K-150K', count: 35000000 }, { id: 'top', label: '$150K+', count: 18000000 }] },
];

const INTEREST_OPTIONS = ['Technology', 'Fashion', 'Sports', 'Travel', 'Food & Dining', 'Fitness', 'Gaming', 'Music', 'Movies', 'Photography', 'Business', 'Entrepreneurship', 'Marketing', 'E-commerce', 'Cryptocurrency'];
const BEHAVIOR_OPTIONS = ['Frequent Travelers', 'Online Shoppers', 'Early Adopters', 'Mobile Gamers', 'Luxury Buyers', 'Coupon Users', 'New Parents', 'Home Owners', 'Small Business Owners', 'Recent Movers'];

const AudiencesPage: React.FC<AudiencesPageProps> = ({ accountId }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState<boolean>(false);
  const [showLookalike, setShowLookalike] = useState<boolean>(false);
  const [builderName, setBuilderName] = useState<string>('');
  const [builderDescription, setBuilderDescription] = useState<string>('');
  const [selectedDemographics, setSelectedDemographics] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [lookalikeConfig, setLookalikeConfig] = useState<LookalikeConfig>({ sourceAudienceId: '', country: 'US', percentage: 1 });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchAudiences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/audiences');
      if (!response.ok) throw new Error('Failed to load audiences');
      const data = await response.json();
      setAudiences(data.audiences || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudiences();
  }, [fetchAudiences]);

  useEffect(() => {
    let size = 250000000;
    if (selectedDemographics.length > 0) size = Math.floor(size * (0.3 + selectedDemographics.length * 0.05));
    if (selectedInterests.length > 0) size = Math.floor(size * (0.15 * selectedInterests.length));
    if (selectedBehaviors.length > 0) size = Math.floor(size * (0.1 * selectedBehaviors.length));
    size = Math.max(10000, Math.min(size, 250000000));
    setEstimatedSize(size);
  }, [selectedDemographics, selectedInterests, selectedBehaviors]);

  const handleSaveAudience = useCallback(async () => {
    if (!builderName.trim()) return;
    setSaving(true);
    try {
      const rules: SegmentRule[] = [];
      if (selectedDemographics.length > 0) rules.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), category: 'demographics', field: 'demographic', operator: 'is', values: selectedDemographics });
      if (selectedInterests.length > 0) rules.push({ id: String(Date.now() + 1), category: 'interests', field: 'interest', operator: 'is', values: selectedInterests });
      if (selectedBehaviors.length > 0) rules.push({ id: String(Date.now() + 2), category: 'behaviors', field: 'behavior', operator: 'is', values: selectedBehaviors });

      const response = await fetch('/api/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: builderName, description: builderDescription, rules, estimatedSize }),
      });
      if (!response.ok) throw new Error('Failed to save audience');
      const saved = await response.json();
      setAudiences(prev => [saved, ...prev]);
      setShowBuilder(false);
      setBuilderName('');
      setBuilderDescription('');
      setSelectedDemographics([]);
      setSelectedInterests([]);
      setSelectedBehaviors([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [builderName, builderDescription, selectedDemographics, selectedInterests, selectedBehaviors, estimatedSize]);

  const handleCreateLookalike = useCallback(async () => {
    if (!lookalikeConfig.sourceAudienceId) return;
    setSaving(true);
    try {
      const response = await fetch('/api/audiences/lookalike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lookalikeConfig),
      });
      if (!response.ok) throw new Error('Failed to create lookalike');
      const created = await response.json();
      setAudiences(prev => [created, ...prev]);
      setShowLookalike(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [lookalikeConfig]);

  const deleteAudience = useCallback(async (id: string) => {
    try {
      await fetch(`/api/audiences/${id}`, { method: 'DELETE' });
      setAudiences(prev => prev.filter(a => a.id !== id));
    } catch {}
  }, []);

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700';
      case 'building': return 'bg-yellow-100 text-yellow-700';
      case 'too_small': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredAudiences = audiences.filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading && audiences.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        <span className="ml-3 text-gray-500">Loading audiences...</span>
      </div>
    );
  }

  if (error && audiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Failed to load audiences</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={fetchAudiences} className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audiences</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowLookalike(true)} className="px-4 py-2 border border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50">Create Lookalike</button>
          <button onClick={() => setShowBuilder(true)} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">+ New Audience</button>
        </div>
      </header>

      {showBuilder && (
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Audience Builder</h2>
            <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <input type="text" value={builderName} onChange={e => setBuilderName(e.target.value)} placeholder="Audience name..." className="w-full px-3 py-2 border rounded-lg" />
              <textarea value={builderDescription} onChange={e => setBuilderDescription(e.target.value)} placeholder="Description..." className="w-full px-3 py-2 border rounded-lg" rows={2} />
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Demographics</h3>
                <div className="flex flex-wrap gap-2">
                  {DEMOGRAPHIC_OPTIONS.flatMap(cat => cat.options).map(opt => (
                    <button key={opt.id} onClick={() => setSelectedDemographics(prev => prev.includes(opt.id) ? prev.filter(d => d !== opt.id) : [...prev, opt.id])} className={`px-3 py-1 rounded-full text-sm ${selectedDemographics.includes(opt.id) ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(interest => (
                    <button key={interest} onClick={() => setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])} className={`px-3 py-1 rounded-full text-sm ${selectedInterests.includes(interest) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Behaviors</h3>
                <div className="flex flex-wrap gap-2">
                  {BEHAVIOR_OPTIONS.map(behavior => (
                    <button key={behavior} onClick={() => setSelectedBehaviors(prev => prev.includes(behavior) ? prev.filter(b => b !== behavior) : [...prev, behavior])} className={`px-3 py-1 rounded-full text-sm ${selectedBehaviors.includes(behavior) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {behavior}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-purple-700 mb-2">Estimated Size</h3>
              <div className="text-3xl font-bold text-purple-600">{formatNumber(estimatedSize)}</div>
              <p className="text-sm text-purple-500 mt-1">potential reach</p>
              <div className="mt-4 h-2 bg-purple-200 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (estimatedSize / 250000000) * 100)}%` }} />
              </div>
              <button onClick={handleSaveAudience} disabled={saving || !builderName.trim()} className="mt-6 w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Audience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLookalike && (
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create Lookalike Audience</h2>
            <button onClick={() => setShowLookalike(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Audience</label>
              <select value={lookalikeConfig.sourceAudienceId} onChange={e => setLookalikeConfig(prev => ({ ...prev, sourceAudienceId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select source audience...</option>
                {audiences.filter(a => a.status === 'ready').map(a => (<option key={a.id} value={a.id}>{a.name} ({formatNumber(a.size)})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select value={lookalikeConfig.country} onChange={e => setLookalikeConfig(prev => ({ ...prev, country: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                {['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IN', 'JP'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Similarity ({lookalikeConfig.percentage}%)</label>
              <input type="range" min={1} max={10} value={lookalikeConfig.percentage} onChange={e => setLookalikeConfig(prev => ({ ...prev, percentage: parseInt(e.target.value) }))} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500"><span>More similar</span><span>Broader reach</span></div>
            </div>
            <button onClick={handleCreateLookalike} disabled={saving || !lookalikeConfig.sourceAudienceId} className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Lookalike'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search audiences..." className="w-full max-w-md px-4 py-2 border rounded-lg" />
      </div>

      {filteredAudiences.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No audiences yet</h3>
          <p className="text-gray-500">Build your first audience segment to improve targeting.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAudiences.map(audience => (
          <div key={audience.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(audience.status)}`}>{audience.status}</span>
              <span className="text-xs text-gray-500 capitalize">{audience.type}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{audience.name}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{audience.description}</p>
            <div className="flex items-center justify-between">
              <div><span className="text-lg font-bold text-purple-600">{formatNumber(audience.size)}</span><span className="text-xs text-gray-500 ml-1">people</span></div>
              <button onClick={() => deleteAudience(audience.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
            {audience.matchRate !== undefined && (
              <div className="mt-2 text-xs text-gray-500">Match rate: {audience.matchRate}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudiencesPage;
