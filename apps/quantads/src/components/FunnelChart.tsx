// ============================================================================
// QuantAds - FunnelChart Component
// Conversion funnel stages with drop-off rates and visual representation
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface FunnelStage {
  id: string;
  name: string;
  value: number;
  color: string;
  icon?: string;
  metadata?: Record<string, string | number>;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  showPercentages?: boolean;
  showDropOff?: boolean;
  orientation?: 'vertical' | 'horizontal';
  animated?: boolean;
  onStageClick?: (stage: FunnelStage) => void;
  height?: number;
  comparisonStages?: FunnelStage[];
  comparisonLabel?: string;
}

const FunnelChart: React.FC<FunnelChartProps> = ({
  stages,
  title = 'Conversion Funnel',
  showPercentages = true,
  showDropOff = true,
  orientation = 'vertical',
  animated = true,
  onStageClick,
  height = 400,
  comparisonStages,
  comparisonLabel = 'Previous Period',
}) => {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [animatedWidths, setAnimatedWidths] = useState<number[]>([]);

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  useEffect(() => {
    if (animated) {
      setAnimatedWidths(stages.map(() => 0));
      const timer = setTimeout(() => {
        setAnimatedWidths(stages.map((s) => (s.value / maxValue) * 100));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedWidths(stages.map((s) => (s.value / maxValue) * 100));
    }
  }, [stages, maxValue, animated]);

  const getDropOffRate = useCallback(
    (currentIndex: number): number => {
      if (currentIndex === 0) return 0;
      const prev = stages[currentIndex - 1]?.value ?? 0;
      const curr = stages[currentIndex]?.value ?? 0;
      if (prev === 0) return 0;
      return ((prev - curr) / prev) * 100;
    },
    [stages],
  );

  const getConversionRate = useCallback(
    (fromIndex: number, toIndex: number): number => {
      const fromVal = stages[fromIndex]?.value ?? 0;
      const toVal = stages[toIndex]?.value ?? 0;
      if (fromVal === 0) return 0;
      return (toVal / fromVal) * 100;
    },
    [stages],
  );

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const overallConversion = stages.length >= 2 ? getConversionRate(0, stages.length - 1) : 100;

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>No funnel data available</p>
      </div>
    );
  }

  if (orientation === 'horizontal') {
    return (
      <div className="w-full">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center gap-2 overflow-x-auto py-4">
          {stages.map((stage, idx) => {
            const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            const isHovered = hoveredStage === stage.id;
            return (
              <React.Fragment key={stage.id}>
                <div
                  className={`flex flex-col items-center min-w-[120px] p-3 rounded-xl transition-all cursor-pointer ${isHovered ? 'bg-gray-50 shadow-md scale-105' : 'hover:bg-gray-50'}`}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                  onClick={() => onStageClick?.(stage)}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                    style={{
                      backgroundColor: stage.color,
                      transform: `scale(${0.5 + percentage / 200})`,
                    }}
                  >
                    {stage.icon || formatNumber(stage.value)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <span className="text-xs text-gray-500">{formatNumber(stage.value)}</span>
                  {showPercentages && (
                    <span className="text-xs font-medium" style={{ color: stage.color }}>
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
                {idx < stages.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="text-gray-400 text-lg">→</div>
                    {showDropOff && (
                      <span className="text-xs text-red-500">
                        -{getDropOffRate(idx + 1).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
          <span className="text-sm text-blue-700 font-medium">
            Overall Conversion: {overallConversion.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-blue-600 font-medium">
            Overall: {overallConversion.toFixed(2)}%
          </span>
        </div>
      )}

      <div className="space-y-2" style={{ maxHeight: height }}>
        {stages.map((stage, idx) => {
          const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const width = animatedWidths[idx] || 0;
          const isHovered = hoveredStage === stage.id;
          getDropOffRate(idx);
          const compStage = comparisonStages?.[idx];

          return (
            <div key={stage.id}>
              <div
                className={`relative transition-all duration-200 ${isHovered ? 'transform scale-[1.01]' : ''}`}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
                onClick={() => onStageClick?.(stage)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-32 flex items-center gap-2">
                    {stage.icon && <span className="text-lg">{stage.icon}</span>}
                    <span className="text-sm font-medium text-gray-700 truncate">{stage.name}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative cursor-pointer">
                      <div
                        className="h-full rounded-lg transition-all duration-700 ease-out flex items-center"
                        style={{
                          width: `${width}%`,
                          backgroundColor: stage.color,
                          opacity: isHovered ? 1 : 0.85,
                        }}
                      >
                        <span className="text-white text-sm font-bold px-3 whitespace-nowrap">
                          {formatNumber(stage.value)}
                        </span>
                      </div>
                      {compStage && (
                        <div
                          className="absolute inset-y-0 border-r-2 border-dashed border-gray-400"
                          style={{ left: `${(compStage.value / maxValue) * 100}%` }}
                          title={`${comparisonLabel}: ${formatNumber(compStage.value)}`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    {showPercentages && (
                      <span className="text-sm font-medium" style={{ color: stage.color }}>
                        {percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {isHovered && stage.metadata && (
                  <div className="absolute right-0 top-full mt-1 bg-gray-900 text-white text-xs py-2 px-3 rounded-lg z-10 shadow-lg">
                    {Object.entries(stage.metadata).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="opacity-70">{key}:</span>
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showDropOff && idx < stages.length - 1 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-32" />
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-4 h-4 flex items-center justify-center">↓</div>
                    <span className="text-red-500 font-medium">
                      -{getDropOffRate(idx + 1).toFixed(1)}% drop-off
                    </span>
                    <span className="text-gray-400">
                      ({formatNumber((stages[idx]?.value ?? 0) - (stages[idx + 1]?.value ?? 0))}{' '}
                      lost)
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {comparisonStages && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span className="w-4 border-t-2 border-dashed border-gray-400" />
          <span>{comparisonLabel}</span>
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
