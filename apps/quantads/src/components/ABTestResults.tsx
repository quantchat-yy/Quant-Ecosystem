// ============================================================================
// QuantAds - ABTestResults Component
// A/B test statistical significance display with confidence intervals
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface Variant {
  id: string;
  name: string;
  label: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  costPerConversion: number;
  roas: number;
  isControl: boolean;
  isWinner?: boolean;
}

interface StatisticalResult {
  confidence: number;
  pValue: number;
  effect: number;
  lowerBound: number;
  upperBound: number;
  sampleSizeAdequate: boolean;
  daysRemaining?: number;
}

interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused' | 'inconclusive';
  primaryMetric: 'ctr' | 'conversion_rate' | 'roas' | 'cpc';
  variants: Variant[];
  statistics: StatisticalResult;
  startDate: string;
  endDate?: string;
  trafficSplit: number[];
  minimumConfidence: number;
}

interface ABTestResultsProps {
  testId: string;
  onApplyWinner?: (variantId: string) => void;
  onStopTest?: (testId: string) => void;
  compact?: boolean;
}

const ABTestResults: React.FC<ABTestResultsProps> = ({
  testId,
  onApplyWinner,
  onStopTest,
  compact = false,
}) => {
  const [test, setTest] = useState<ABTest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('ctr');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const fetchTestData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/ab-tests/${testId}`);
      if (!response.ok) throw new Error('Failed to load A/B test data');
      const data = await response.json();
      setTest(data);
      setSelectedMetric(data.primaryMetric || 'ctr');
    } catch (err: any) {
      setError(err.message || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchTestData();
    const interval = setInterval(fetchTestData, 30000);
    return () => clearInterval(interval);
  }, [fetchTestData]);

  const getMetricValue = (variant: Variant, metric: string): number => {
    switch (metric) {
      case 'ctr':
        return variant.ctr;
      case 'conversion_rate':
        return variant.conversionRate;
      case 'roas':
        return variant.roas;
      case 'cpc':
        return variant.costPerConversion;
      default:
        return variant.ctr;
    }
  };

  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'ctr':
        return `${value.toFixed(2)}%`;
      case 'conversion_rate':
        return `${value.toFixed(2)}%`;
      case 'roas':
        return `${value.toFixed(2)}x`;
      case 'cpc':
        return `$${value.toFixed(2)}`;
      default:
        return value.toFixed(2);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string): { color: string; label: string } => {
    switch (status) {
      case 'running':
        return { color: 'bg-green-100 text-green-700', label: 'Running' };
      case 'completed':
        return { color: 'bg-blue-100 text-blue-700', label: 'Completed' };
      case 'paused':
        return { color: 'bg-yellow-100 text-yellow-700', label: 'Paused' };
      case 'inconclusive':
        return { color: 'bg-gray-100 text-gray-700', label: 'Inconclusive' };
      default:
        return { color: 'bg-gray-100 text-gray-600', label: status };
    }
  };

  const getImprovement = (variant: Variant, control: Variant, metric: string): number => {
    const controlValue = getMetricValue(control, metric);
    const variantValue = getMetricValue(variant, metric);
    if (controlValue === 0) return 0;
    return ((variantValue - controlValue) / controlValue) * 100;
  };

  if (loading && !test) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">Loading test results...</span>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-2">{error}</p>
        <button onClick={fetchTestData} className="text-sm text-blue-500 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!test) {
    return <div className="text-center p-8 text-gray-500">No test data available</div>;
  }

  const control = test.variants.find((v) => v.isControl) ?? test.variants[0];
  const winner = test.variants.find((v) => v.isWinner);
  const statusBadge = getStatusBadge(test.status);
  const maxMetricValue = Math.max(
    ...test.variants.map((v) => getMetricValue(v, selectedMetric)),
    0.01,
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
            {test.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
            <span className="text-xs text-gray-500">
              Started {new Date(test.startDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {test.status === 'running' && onStopTest && (
            <button
              onClick={() => onStopTest(test.id)}
              className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Stop Test
            </button>
          )}
          {winner && onApplyWinner && (
            <button
              onClick={() => onApplyWinner(winner.id)}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Apply Winner
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-700">Statistical Confidence:</span>
              <span
                className={`text-lg font-bold ${getConfidenceColor(test.statistics.confidence)}`}
              >
                {test.statistics.confidence.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${test.statistics.confidence >= 95 ? 'bg-green-500' : test.statistics.confidence >= 80 ? 'bg-yellow-500' : 'bg-red-400'}`}
                style={{ width: `${test.statistics.confidence}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">0%</span>
              <span className="text-xs text-gray-500">Target: {test.minimumConfidence}%</span>
              <span className="text-xs text-gray-400">100%</span>
            </div>
          </div>
          {test.statistics.daysRemaining !== undefined && test.statistics.daysRemaining > 0 && (
            <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Est. days remaining</p>
              <p className="text-xl font-bold text-blue-700">{test.statistics.daysRemaining}</p>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex gap-2 mb-4">
          {['ctr', 'conversion_rate', 'roas', 'cpc'].map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1 rounded text-xs ${selectedMetric === metric ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {metric === 'ctr'
                ? 'CTR'
                : metric === 'conversion_rate'
                  ? 'Conv. Rate'
                  : metric === 'roas'
                    ? 'ROAS'
                    : 'CPC'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {test.variants.map((variant, idx) => {
          const metricVal = getMetricValue(variant, selectedMetric);
          const barWidth = (metricVal / maxMetricValue) * 100;
          const improvement =
            !variant.isControl && control ? getImprovement(variant, control, selectedMetric) : 0;

          return (
            <div
              key={variant.id}
              className={`p-3 rounded-lg border ${variant.isWinner ? 'border-green-300 bg-green-50' : variant.isControl ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-orange-500'}`}
                  >
                    {variant.label || String.fromCharCode(65 + idx)}
                  </span>
                  <span className="font-medium text-sm">{variant.name}</span>
                  {variant.isControl && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      Control
                    </span>
                  )}
                  {variant.isWinner && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      Winner
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">
                    {formatMetricValue(metricVal, selectedMetric)}
                  </span>
                  {!variant.isControl && (
                    <span
                      className={`ml-2 text-xs font-medium ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {improvement >= 0 ? '+' : ''}
                      {improvement.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${variant.isWinner ? 'bg-green-500' : idx === 0 ? 'bg-blue-400' : 'bg-purple-400'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {!compact && (
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{variant.impressions.toLocaleString()} imp</span>
                  <span>{variant.clicks.toLocaleString()} clicks</span>
                  <span>{variant.conversions} conv</span>
                  <span>${variant.revenue.toFixed(0)} rev</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs text-blue-600 hover:underline"
        >
          {showDetails ? 'Hide details' : 'Show statistical details'}
        </button>
      )}

      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">P-value:</span>
            <span className="font-mono">{test.statistics.pValue.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Effect size:</span>
            <span>{test.statistics.effect.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">95% CI:</span>
            <span>
              [{test.statistics.lowerBound.toFixed(2)}%, {test.statistics.upperBound.toFixed(2)}%]
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sample adequate:</span>
            <span
              className={test.statistics.sampleSizeAdequate ? 'text-green-600' : 'text-red-600'}
            >
              {test.statistics.sampleSizeAdequate ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Traffic split:</span>
            <span>{test.trafficSplit.map((t) => `${t}%`).join(' / ')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTestResults;
