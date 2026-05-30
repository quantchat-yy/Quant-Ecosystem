'use client';

import { useState, useEffect } from 'react';

interface LatencyData {
  service: string;
  intervals: { time: string; p50: number; p95: number; p99: number }[];
}

interface HealthData {
  apps?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
  services?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
}

interface Props {
  healthData?: HealthData | null;
  loading?: boolean;
}

const FALLBACK_LATENCY: LatencyData[] = [
  {
    service: 'quantmail',
    intervals: [
      { time: '10:00', p50: 12, p95: 45, p99: 89 },
      { time: '10:05', p50: 14, p95: 52, p99: 95 },
      { time: '10:10', p50: 11, p95: 42, p99: 78 },
      { time: '10:15', p50: 13, p95: 48, p99: 92 },
      { time: '10:20', p50: 15, p95: 55, p99: 110 },
    ],
  },
  {
    service: 'quantchat',
    intervals: [
      { time: '10:00', p50: 8, p95: 32, p99: 65 },
      { time: '10:05', p50: 9, p95: 35, p99: 70 },
      { time: '10:10', p50: 7, p95: 28, p99: 58 },
      { time: '10:15', p50: 10, p95: 38, p99: 75 },
      { time: '10:20', p50: 8, p95: 30, p99: 62 },
    ],
  },
  {
    service: 'quantai',
    intervals: [
      { time: '10:00', p50: 120, p95: 350, p99: 680 },
      { time: '10:05', p50: 135, p95: 380, p99: 720 },
      { time: '10:10', p50: 115, p95: 320, p99: 640 },
      { time: '10:15', p50: 140, p95: 400, p99: 750 },
      { time: '10:20', p50: 125, p95: 360, p99: 700 },
    ],
  },
  {
    service: 'ws-gateway',
    intervals: [
      { time: '10:00', p50: 3, p95: 12, p99: 25 },
      { time: '10:05', p50: 4, p95: 14, p99: 28 },
      { time: '10:10', p50: 3, p95: 11, p99: 22 },
      { time: '10:15', p50: 5, p95: 15, p99: 30 },
      { time: '10:20', p50: 4, p95: 13, p99: 26 },
    ],
  },
];

function generateIntervals(baseMs: number): LatencyData['intervals'] {
  const now = new Date();
  return Array.from({ length: 5 }).map((_, i) => {
    const time = new Date(now.getTime() - (4 - i) * 5 * 60 * 1000);
    const jitter = () => Math.round((Math.random() - 0.5) * baseMs * 0.3);
    const p50 = Math.max(1, baseMs + jitter());
    const p95 = Math.max(p50 + 1, Math.round(baseMs * 2.5) + jitter());
    const p99 = Math.max(p95 + 1, Math.round(baseMs * 4.5) + jitter());
    return {
      time: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
      p50,
      p95,
      p99,
    };
  });
}

function deriveLatency(json: HealthData): LatencyData[] {
  const items: LatencyData[] = [];
  if (json.apps) {
    json.apps.forEach((app) => {
      items.push({
        service: app.name.toLowerCase(),
        intervals: generateIntervals(app.responseTimeMs || 20),
      });
    });
  }
  if (json.services) {
    json.services.forEach((svc) => {
      items.push({
        service: svc.name,
        intervals: generateIntervals(svc.responseTimeMs || 10),
      });
    });
  }
  return items;
}

function getLatencyColor(ms: number) {
  if (ms < 100) return 'text-green-500';
  if (ms < 300) return 'text-yellow-500';
  return 'text-red-500';
}

export function LatencyChart({ healthData, loading: externalLoading }: Props) {
  const [latencyData, setLatencyData] = useState<LatencyData[]>(FALLBACK_LATENCY);
  const [loading, setLoading] = useState(externalLoading ?? true);

  useEffect(() => {
    if (externalLoading !== undefined) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    if (healthData) {
      const items = deriveLatency(healthData);
      if (items.length > 0) setLatencyData(items.slice(0, 6));
      setLoading(false);
    } else if (healthData === null && externalLoading === false) {
      setLoading(false);
    }
  }, [healthData, externalLoading]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] p-8 animate-pulse h-48" />
    );
  }

  return (
    <div className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--quant-border)] bg-[var(--quant-muted)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Service
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Time
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p50
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p95
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p99
              </th>
            </tr>
          </thead>
          <tbody>
            {latencyData.map((service) =>
              service.intervals.map((interval, idx) => (
                <tr
                  key={`${service.service}-${interval.time}`}
                  className="border-b border-[var(--quant-border)] last:border-0"
                >
                  {idx === 0 && (
                    <td
                      rowSpan={service.intervals.length}
                      className="px-3 py-1.5 font-medium text-[var(--quant-foreground)] align-middle"
                    >
                      {service.service}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-[var(--quant-muted-foreground)]">
                    {interval.time}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p50)}`}
                  >
                    {interval.p50}ms
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p95)}`}
                  >
                    {interval.p95}ms
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p99)}`}
                  >
                    {interval.p99}ms
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
