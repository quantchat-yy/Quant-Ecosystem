'use client';

import { useState, useEffect } from 'react';

interface ErrorEntry {
  timestamp: string;
  service: string;
  message: string;
  statusCode: number;
  traceId: string;
}

interface HealthData {
  apps?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
  services?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
}

interface Props {
  healthData?: HealthData | null;
  loading?: boolean;
}

const FALLBACK_ERRORS: ErrorEntry[] = [
  {
    timestamp: '2024-01-15 10:23:45',
    service: 'quantai',
    message: 'Model inference timeout after 30s',
    statusCode: 504,
    traceId: 'abc123def456',
  },
  {
    timestamp: '2024-01-15 10:22:12',
    service: 'quantmail',
    message: 'Failed to connect to SMTP relay',
    statusCode: 502,
    traceId: 'fed987cba654',
  },
  {
    timestamp: '2024-01-15 10:20:01',
    service: 'quantchat',
    message: 'WebSocket upgrade failed: connection reset',
    statusCode: 500,
    traceId: '112233aabbcc',
  },
  {
    timestamp: '2024-01-15 10:18:30',
    service: 'quantai',
    message: 'Rate limit exceeded for embedding endpoint',
    statusCode: 429,
    traceId: 'dd4455ee6677',
  },
  {
    timestamp: '2024-01-15 10:15:22',
    service: 'ws-gateway',
    message: 'Redis connection pool exhausted',
    statusCode: 503,
    traceId: '889900aabb11',
  },
  {
    timestamp: '2024-01-15 10:12:44',
    service: 'quantmail',
    message: 'Attachment size exceeds 25MB limit',
    statusCode: 413,
    traceId: 'cc2233dd4455',
  },
  {
    timestamp: '2024-01-15 10:10:15',
    service: 'admin',
    message: 'Database query timeout on users table',
    statusCode: 504,
    traceId: 'ee5566ff7788',
  },
  {
    timestamp: '2024-01-15 10:08:03',
    service: 'quantchat',
    message: 'Message delivery failed: recipient offline',
    statusCode: 500,
    traceId: '9900aabb1122',
  },
];

function deriveErrors(json: HealthData): ErrorEntry[] {
  const items: ErrorEntry[] = [];
  const now = new Date();
  if (json.apps) {
    json.apps.forEach((app) => {
      if (app.status === 'down') {
        items.push({
          timestamp: new Date(app.lastCheck || now).toLocaleString(),
          service: app.name.toLowerCase(),
          message: `Service ${app.name} is unreachable (health check failed)`,
          statusCode: 503,
          traceId: Math.random().toString(36).slice(2, 14),
        });
      }
    });
  }
  if (json.services) {
    json.services.forEach((svc) => {
      if (svc.status === 'stopped') {
        items.push({
          timestamp: new Date(svc.lastCheck || now).toLocaleString(),
          service: svc.name,
          message: `Service ${svc.name} is stopped (connection refused)`,
          statusCode: 502,
          traceId: Math.random().toString(36).slice(2, 14),
        });
      }
    });
  }
  return items;
}

export function ErrorTracker({ healthData, loading: externalLoading }: Props) {
  const [errors, setErrors] = useState<ErrorEntry[]>(FALLBACK_ERRORS);
  const [loading, setLoading] = useState(externalLoading ?? true);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (externalLoading !== undefined) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    if (healthData) {
      const items = deriveErrors(healthData);
      if (items.length > 0) setErrors(items);
      setLoading(false);
    } else if (healthData === null && externalLoading === false) {
      setLoading(false);
    }
  }, [healthData, externalLoading]);

  const sorted = [...errors].sort((a, b) => {
    const cmp = a.timestamp.localeCompare(b.timestamp);
    return sortAsc ? cmp : -cmp;
  });

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
              <th
                className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)] cursor-pointer hover:text-[var(--quant-foreground)]"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Timestamp {sortAsc ? '\u2191' : '\u2193'}
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Service
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Error Message
              </th>
              <th className="px-3 py-2 text-center font-medium text-[var(--quant-muted-foreground)]">
                Status
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Trace ID
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((error) => (
              <tr
                key={error.traceId}
                className="border-b border-[var(--quant-border)] last:border-0 hover:bg-[var(--quant-muted)]/50"
              >
                <td className="px-3 py-2 font-mono text-[var(--quant-muted-foreground)] whitespace-nowrap">
                  {error.timestamp}
                </td>
                <td className="px-3 py-2 text-[var(--quant-foreground)]">{error.service}</td>
                <td className="px-3 py-2 text-[var(--quant-foreground)] max-w-xs truncate">
                  {error.message}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      error.statusCode >= 500
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}
                  >
                    {error.statusCode}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[var(--quant-muted-foreground)]">
                  {error.traceId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
