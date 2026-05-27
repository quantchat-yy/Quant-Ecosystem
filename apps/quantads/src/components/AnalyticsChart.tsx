// ============================================================================
// QuantAds - AnalyticsChart Component
// Charts for impressions, clicks, conversions
// ============================================================================

interface DataPoint {
  date: string;
  value: number;
}

interface AnalyticsChartProps {
  title: string;
  type: 'line' | 'bar' | 'area' | 'pie';
  data: DataPoint[];
  color?: string;
  showTrend?: boolean;
  height?: number;
}

export function AnalyticsChart({
  title,
  type,
  data,
  color = '#4F46E5',
  showTrend = true,
  height = 300,
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const avg = data.length > 0 ? total / data.length : 0;

  // Calculate trend
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint).reduce((s, d) => s + d.value, 0) / (midpoint || 1);
  const secondHalf =
    data.slice(midpoint).reduce((s, d) => s + d.value, 0) / (data.length - midpoint || 1);
  const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const trendDirection = trendPercent >= 0 ? 'up' : 'down';

  return {
    type: 'div',
    className: `analytics-chart chart-${type}`,
    style: { height: `${height}px` },
    children: [
      {
        type: 'div',
        className: 'chart-header',
        children: [
          { type: 'h4', className: 'chart-title', text: title },
          showTrend && {
            type: 'span',
            className: `chart-trend ${trendDirection}`,
            text: `${trendPercent >= 0 ? '+' : ''}${trendPercent.toFixed(1)}%`,
          },
        ].filter(Boolean),
      },
      {
        type: 'div',
        className: 'chart-stats',
        children: [
          { type: 'span', className: 'stat-total', text: `Total: ${formatValue(total)}` },
          { type: 'span', className: 'stat-avg', text: `Avg: ${formatValue(avg)}` },
        ],
      },
      {
        type: 'div',
        className: 'chart-canvas',
        children: data.map((point, i) => ({
          type: 'div',
          className: 'chart-bar',
          style: {
            height: `${(point.value / maxValue) * 100}%`,
            backgroundColor: color,
            left: `${(i / data.length) * 100}%`,
          },
          title: `${point.date}: ${formatValue(point.value)}`,
        })),
      },
      {
        type: 'div',
        className: 'chart-x-axis',
        children: [
          data.length > 0 && { type: 'span', text: data[0]?.date },
          data.length > 1 && { type: 'span', text: data[data.length - 1]?.date },
        ].filter(Boolean),
      },
    ],
  };
}

function formatValue(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default AnalyticsChart;
