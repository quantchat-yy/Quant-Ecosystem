// ============================================================================
// QuantAds - Creatives Library Page
// Grid of ad previews, upload, format tabs, A/B test setup
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface Creative {
  id: string;
  name: string;
  format: 'image' | 'video' | 'carousel' | 'collection' | 'ar';
  status: 'active' | 'paused' | 'rejected' | 'pending_review' | 'draft';
  thumbnailUrl: string;
  mediaUrls: string[];
  headline: string;
  description: string;
  callToAction: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  performance: { impressions: number; clicks: number; ctr: number; conversions: number };
  abTestId?: string;
  abVariant?: 'A' | 'B' | 'C';
  createdAt: string;
  updatedAt: string;
}

interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'draft';
  variants: {
    id: string;
    creativeId: string;
    name: string;
    traffic: number;
    impressions: number;
    clicks: number;
    conversions: number;
    confidence: number;
  }[];
  winnerId?: string;
  startedAt: string;
  completedAt?: string;
}

type FormatFilter = 'all' | 'image' | 'video' | 'carousel' | 'collection' | 'ar';

interface CreativesPageProps {
  accountId?: string;
}

const CreativesPage: React.FC<CreativesPageProps> = ({ accountId: _accountId }) => {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState<boolean>(false);
  const [showABTest, setShowABTest] = useState<boolean>(false);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [abTestName, setAbTestName] = useState<string>('');

  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (formatFilter !== 'all') params.set('format', formatFilter);
      if (searchQuery) params.set('search', searchQuery);
      const response = await fetch(`/api/creatives?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load creatives');
      const data = await response.json();
      setCreatives(data.creatives || []);
      setAbTests(data.abTests || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load creatives');
    } finally {
      setLoading(false);
    }
  }, [formatFilter, searchQuery]);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        const response = await fetch('/api/creatives/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
        const uploaded = await response.json();
        setCreatives((prev) => [uploaded, ...prev]);
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      setShowUpload(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleCreateABTest = useCallback(async () => {
    if (selectedCreatives.size < 2 || !abTestName.trim()) return;
    try {
      const response = await fetch('/api/creatives/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: abTestName, creativeIds: Array.from(selectedCreatives) }),
      });
      if (!response.ok) throw new Error('Failed to create A/B test');
      const test = await response.json();
      setAbTests((prev) => [test, ...prev]);
      setShowABTest(false);
      setSelectedCreatives(new Set());
      setAbTestName('');
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedCreatives, abTestName]);

  const deleteCreative = useCallback(async (id: string) => {
    try {
      await fetch(`/api/creatives/${id}`, { method: 'DELETE' });
      setCreatives((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  }, []);

  const toggleCreativeSelect = useCallback((id: string) => {
    setSelectedCreatives((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const formatNumber = (n: number): string =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending_review':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredCreatives = creatives.filter((c) => {
    if (formatFilter !== 'all' && c.format !== formatFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading && creatives.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
        <span className="ml-3 text-gray-500">Loading creatives...</span>
      </div>
    );
  }

  if (error && creatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Failed to load creatives</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchCreatives}
          className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Creatives</h1>
        <div className="flex gap-2">
          {selectedCreatives.size >= 2 && (
            <button
              onClick={() => setShowABTest(true)}
              className="px-4 py-2 border border-pink-500 text-pink-600 rounded-lg hover:bg-pink-50"
            >
              A/B Test ({selectedCreatives.size})
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            + Upload
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'image', 'video', 'carousel', 'collection', 'ar'] as FormatFilter[]).map(
            (fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1 rounded text-sm capitalize ${formatFilter === fmt ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600'}`}
              >
                {fmt === 'ar' ? 'AR' : fmt}
              </button>
            ),
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search creatives..."
          className="flex-1 max-w-sm px-4 py-2 border rounded-lg"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upload Creatives</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-600 mb-4">Drag and drop files here or click to browse</p>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-6 py-2 bg-pink-500 text-white rounded-lg cursor-pointer hover:bg-pink-600"
            >
              Choose Files
            </label>
            {uploading && (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-pink-500 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">{uploadProgress.toFixed(0)}% uploaded</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showABTest && (
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create A/B Test</h2>
            <button
              onClick={() => setShowABTest(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={abTestName}
              onChange={(e) => setAbTestName(e.target.value)}
              placeholder="Test name..."
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-600">
              {selectedCreatives.size} creatives selected as variants
            </p>
            <button
              onClick={handleCreateABTest}
              disabled={!abTestName.trim()}
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              Start Test
            </button>
          </div>
        </div>
      )}

      {filteredCreatives.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No creatives yet</h3>
          <p className="text-gray-500">Upload your first creative to get started.</p>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCreatives.map((creative) => (
            <div
              key={creative.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${selectedCreatives.has(creative.id) ? 'ring-2 ring-pink-500' : ''}`}
            >
              <div
                className="relative aspect-square bg-gray-100 cursor-pointer"
                onClick={() => toggleCreativeSelect(creative.id)}
              >
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  {creative.format === 'video' ? '▶' : '🖼'}
                </div>
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(creative.status)}`}
                  >
                    {creative.status}
                  </span>
                </div>
                {creative.abVariant && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {creative.abVariant}
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm text-gray-900 truncate">{creative.name}</h4>
                <p className="text-xs text-gray-500 capitalize">
                  {creative.format} - {creative.dimensions.width}x{creative.dimensions.height}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{formatNumber(creative.performance.impressions)} imp</span>
                  <span>{creative.performance.ctr.toFixed(2)}% CTR</span>
                </div>
                <button
                  onClick={() => deleteCreative(creative.id)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Creative</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Format</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                  Impressions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">CTR</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCreatives.map((creative) => (
                <tr key={creative.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-sm">
                        🖼
                      </div>
                      <span className="font-medium text-sm">{creative.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{creative.format}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(creative.status)}`}
                    >
                      {creative.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatNumber(creative.performance.impressions)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {creative.performance.ctr.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatFileSize(creative.fileSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {abTests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">A/B Tests</h2>
          <div className="space-y-4">
            {abTests.map((test) => (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{test.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${test.status === 'running' ? 'bg-green-100 text-green-700' : test.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {test.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {test.variants.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg border ${test.winnerId === v.creativeId ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                    >
                      <div className="font-medium text-sm">{v.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatNumber(v.impressions)} imp
                      </div>
                      <div className="text-xs text-gray-500">{v.clicks} clicks</div>
                      <div className="text-xs font-medium mt-1">{v.confidence}% confidence</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativesPage;
