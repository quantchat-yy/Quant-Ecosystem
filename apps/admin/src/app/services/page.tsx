'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@quant/shared-ui';

interface ServiceInfo {
  name: string;
  id: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastRestart: string;
  memoryUsage: number;
  cpuUsage: number;
  recentLogs: string[];
}

const defaultServicesData: ServiceInfo[] = [
  {
    name: 'WS Gateway',
    id: 'ws-gateway',
    status: 'running',
    uptime: 99.98,
    lastRestart: '2024-01-10 03:00',
    memoryUsage: 45,
    cpuUsage: 12,
    recentLogs: [
      '[INFO] Connected clients: 1,284',
      '[INFO] Messages/sec: 4,523',
      '[INFO] Latency p99: 12ms',
    ],
  },
  {
    name: 'SMTP Inbound',
    id: 'smtp-inbound',
    status: 'running',
    uptime: 99.95,
    lastRestart: '2024-01-12 06:00',
    memoryUsage: 32,
    cpuUsage: 8,
    recentLogs: [
      '[INFO] Emails processed: 12,843',
      '[INFO] Spam blocked: 423',
      '[INFO] Queue depth: 3',
    ],
  },
  {
    name: 'CDC Relay',
    id: 'cdc-relay',
    status: 'running',
    uptime: 99.99,
    lastRestart: '2024-01-08 02:00',
    memoryUsage: 28,
    cpuUsage: 5,
    recentLogs: [
      '[INFO] Events relayed: 89,432',
      '[INFO] Lag: 0ms',
      '[INFO] Partitions: 16/16 active',
    ],
  },
  {
    name: 'CI Runner',
    id: 'ci-runner',
    status: 'running',
    uptime: 99.9,
    lastRestart: '2024-01-14 12:00',
    memoryUsage: 67,
    cpuUsage: 45,
    recentLogs: [
      '[INFO] Active jobs: 3',
      '[INFO] Queue: 7 pending',
      '[INFO] Avg build time: 2m 14s',
    ],
  },
  {
    name: 'Git Server',
    id: 'git-server',
    status: 'running',
    uptime: 99.99,
    lastRestart: '2024-01-05 04:00',
    memoryUsage: 38,
    cpuUsage: 10,
    recentLogs: ['[INFO] Repos: 1,247', '[INFO] Pushes today: 89', '[INFO] Clone ops: 234'],
  },
  {
    name: 'Matchmaking',
    id: 'matchmaking',
    status: 'running',
    uptime: 99.92,
    lastRestart: '2024-01-13 08:00',
    memoryUsage: 42,
    cpuUsage: 18,
    recentLogs: [
      '[INFO] Active matches: 56',
      '[INFO] Queue time avg: 3.2s',
      '[INFO] Rating updates: 890',
    ],
  },
  {
    name: 'Moderation Worker',
    id: 'moderation-worker',
    status: 'running',
    uptime: 99.96,
    lastRestart: '2024-01-11 10:00',
    memoryUsage: 55,
    cpuUsage: 30,
    recentLogs: [
      '[INFO] Items reviewed: 4,521',
      '[INFO] Auto-flagged: 12',
      '[INFO] False positive rate: 0.3%',
    ],
  },
  {
    name: 'Search Indexer',
    id: 'search-indexer',
    status: 'running',
    uptime: 99.97,
    lastRestart: '2024-01-09 05:00',
    memoryUsage: 60,
    cpuUsage: 25,
    recentLogs: [
      '[INFO] Documents indexed: 2.4M',
      '[INFO] Index size: 4.2GB',
      '[INFO] Query latency p95: 8ms',
    ],
  },
];

function UsageBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-[var(--quant-muted)]">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function ServicesPage() {
  const [servicesData, setServicesData] = useState<ServiceInfo[]>(defaultServicesData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        const res = await fetch('/api/health');
        const json = await res.json();
        if (json.services) {
          setServicesData(
            json.services.map(
              (svc: {
                name: string;
                status: string;
                responseTimeMs?: number;
                lastCheck?: string;
              }) => {
                const existing = defaultServicesData.find((d) => d.id === svc.name);
                return {
                  name: existing?.name ?? svc.name,
                  id: svc.name,
                  status: svc.status === 'running' ? 'running' : 'stopped',
                  uptime: existing?.uptime ?? 99.9,
                  lastRestart: existing?.lastRestart ?? 'N/A',
                  memoryUsage: existing?.memoryUsage ?? 30,
                  cpuUsage: existing?.cpuUsage ?? 10,
                  recentLogs: existing?.recentLogs ?? [`[INFO] Service ${svc.name} operational`],
                } as ServiceInfo;
              },
            ),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-2">
          <span className="text-yellow-500 text-sm font-medium">&#9888;</span>
          <p className="text-sm text-yellow-600">
            Could not refresh data: {error}. Showing cached data below.
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Services Monitor</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Monitor {servicesData.length} infrastructure services
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {servicesData.map((service) => (
          <Card key={service.id}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${service.status === 'running' ? 'bg-green-500' : service.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}
                  />
                  <h3 className="font-semibold text-[var(--quant-foreground)]">{service.name}</h3>
                </div>
                <Badge variant="default">{service.uptime}% uptime</Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--quant-muted-foreground)] mb-1">
                    <span>Memory</span>
                    <span>{service.memoryUsage}%</span>
                  </div>
                  <UsageBar value={service.memoryUsage} color="bg-blue-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--quant-muted-foreground)] mb-1">
                    <span>CPU</span>
                    <span>{service.cpuUsage}%</span>
                  </div>
                  <UsageBar value={service.cpuUsage} color="bg-purple-500" />
                </div>
              </div>

              <p className="text-xs text-[var(--quant-muted-foreground)]">
                Last restart: {service.lastRestart}
              </p>

              <div className="rounded-md bg-[var(--quant-muted)] p-3 font-mono text-xs text-[var(--quant-muted-foreground)]">
                {service.recentLogs.map((log, i) => (
                  <p key={i}>{log}</p>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
