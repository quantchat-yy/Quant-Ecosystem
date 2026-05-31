'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { Card } from '@quant/shared-ui';
import { SparklineChart } from './SparklineChart';

interface MetricCardProps {
  label: string;
  value: number;
  formattedValue?: string;
  trend: 'up' | 'down' | 'neutral';
  trendLabel: string;
  sparklineData: number[];
  subtitle?: string;
}

function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    const from = prevTarget.current !== target ? current : 0;
    prevTarget.current = target;
    startRef.current = performance.now();

    function animate(time: number) {
      const elapsed = time - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return current;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'neutral') {
    return <span className="text-[var(--quant-muted-foreground)] text-sm">&#8594;</span>;
  }
  if (trend === 'up') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-500">
        <path d="M7 2L12 8H2L7 2Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-500">
      <path d="M7 12L2 6H12L7 12Z" fill="currentColor" />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  formattedValue,
  trend,
  trendLabel,
  sparklineData,
  subtitle,
}: MetricCardProps) {
  const animatedValue = useCountUp(value);
  const displayValue = formattedValue ?? formatNumber(animatedValue);

  const trendColor =
    trend === 'up'
      ? 'text-green-500'
      : trend === 'down'
        ? 'text-red-500'
        : 'text-[var(--quant-muted-foreground)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', ...spring.gentle }}
    >
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--quant-muted-foreground)]">{label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--quant-foreground)]">
                  {displayValue}
                </span>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendArrow trend={trend} />
                  <span className="text-xs font-medium">{trendLabel}</span>
                </div>
              </div>
              {subtitle && (
                <p className="mt-1 text-xs text-[var(--quant-muted-foreground)]">{subtitle}</p>
              )}
            </div>
            <div className="ml-3">
              <SparklineChart
                data={sparklineData}
                width={72}
                height={32}
                color={trend === 'down' ? '#ef4444' : trend === 'up' ? '#22c55e' : '#6b7280'}
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
