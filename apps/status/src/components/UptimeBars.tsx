import React, { useState } from 'react';
import type { UptimeMetric } from '../types.js';

export interface UptimeBarsProps {
  serviceId: string;
  serviceName: string;
  metrics: UptimeMetric[];
  overallUptime: number;
}

type DayStatus = 'operational' | 'degraded' | 'outage';

function getDayStatus(metric: UptimeMetric): DayStatus {
  if (metric.uptimePercentage >= 99.5) return 'operational';
  if (metric.uptimePercentage >= 95) return 'degraded';
  return 'outage';
}

function getStatusColor(status: DayStatus): string {
  switch (status) {
    case 'operational':
      return '#10B981';
    case 'degraded':
      return '#F59E0B';
    case 'outage':
      return '#EF4444';
  }
}

export function UptimeBars({
  serviceName,
  metrics,
  overallUptime,
}: UptimeBarsProps): React.ReactElement {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Pad to 90 days with empty operational days if fewer metrics
  const paddedMetrics: (UptimeMetric | null)[] = Array.from({ length: 90 }, (_, i) => {
    const index = i - (90 - metrics.length);
    return index >= 0 ? (metrics[index] ?? null) : null;
  });

  return (
    <div className="uptime-bars">
      <div className="uptime-bars__header">
        <span className="uptime-bars__service-name">{serviceName}</span>
        <span className="uptime-bars__percentage">{overallUptime.toFixed(2)}% uptime</span>
      </div>

      <div
        className="uptime-bars__bar"
        role="img"
        aria-label={`${serviceName} 90-day uptime: ${overallUptime.toFixed(2)}%`}
      >
        {paddedMetrics.map((metric, index) => {
          const status: DayStatus = metric ? getDayStatus(metric) : 'operational';
          const color = getStatusColor(status);

          return (
            <div
              key={index}
              className={`uptime-bars__day uptime-bars__day--${status}`}
              style={{ backgroundColor: color }}
              onMouseEnter={() => setHoveredDay(index)}
              onMouseLeave={() => setHoveredDay(null)}
              aria-hidden="true"
            >
              {hoveredDay === index && metric && (
                <div className="uptime-bars__tooltip" role="tooltip">
                  <span className="uptime-bars__tooltip-date">{metric.date}</span>
                  <span className="uptime-bars__tooltip-uptime">
                    {metric.uptimePercentage.toFixed(2)}% uptime
                  </span>
                  <span className="uptime-bars__tooltip-response">
                    Avg: {metric.averageResponseTime}ms
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="uptime-bars__legend">
        <span className="uptime-bars__legend-label">90 days ago</span>
        <span className="uptime-bars__legend-label">Today</span>
      </div>
    </div>
  );
}
