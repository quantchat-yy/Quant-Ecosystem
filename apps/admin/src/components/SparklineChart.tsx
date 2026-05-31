'use client';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const cpx = (current.x + next.x) / 2;
    d += ` C ${cpx} ${current.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
  }

  return d;
}

export function SparklineChart({
  data,
  width = 80,
  height = 32,
  color = 'var(--brand-primary)',
  fillOpacity = 0.1,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((value - min) / range) * chartHeight,
  }));

  const linePath = buildSmoothPath(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sparkline chart"
    >
      <path d={fillPath} fill={color} opacity={fillOpacity} />
      <path d={linePath} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}
