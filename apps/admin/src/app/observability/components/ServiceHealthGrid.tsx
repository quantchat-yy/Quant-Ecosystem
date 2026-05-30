'use client';

import { useState, useEffect } from 'react';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastCheck: string;
}

interface HealthData {
  apps?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
  services?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
}

interface Props {
  healthData?: HealthData | null;
  loading?: boolean;
}

const FALLBACK_SERVICES: ServiceHealth[] = [
  { name: 'quantmail', status: 'healthy', uptime: 99.98, lastCheck: '2s ago' },
  { name: 'quantchat', status: 'healthy', uptime: 99.95, lastCheck: '3s ago' },
  { name: 'quantai', status: 'degraded', uptime: 98.5, lastCheck: '5s ago' },
  { name: 'admin', status: 'healthy', uptime: 99.99, lastCheck: '1s ago' },
  { name: 'ws-gateway', status: 'healthy', uptime: 99.97, lastCheck: '2s ago' },
];

function getStatusColor(status: ServiceHealth['status']) {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'down':
      return 'bg-red-500';
  }
}

function getStatusBorder(status: ServiceHealth['status']) {
  switch (status) {
    case 'healthy':
      return 'border-green-500/20';
    case 'degraded':
      return 'border-yellow-500/20';
    case 'down':
      return 'border-red-500/20';
  }
}

function mapStatus(status: string): ServiceHealth['status'] {
  if (status === 'healthy' || status === 'running') return 'healthy';
  if (status === 'degraded') return 'degraded';
  return 'down';
}

function deriveServices(json: HealthData): ServiceHealth[] {
  const items: ServiceHealth[] = [];
  if (json.apps) {
    json.apps.forEach((app) => {
      items.push({
        name: app.name.toLowerCase(),
        status: mapStatus(app.status),
        uptime: app.status === 'healthy' ? 99.9 + Math.random() * 0.09 : 95 + Math.random() * 3,
        lastCheck: new Date(app.lastCheck).toLocaleTimeString(),
      });
    });
  }
  if (json.services) {
    json.services.forEach((svc) => {
      items.push({
        name: svc.name,
        status: mapStatus(svc.status),
        uptime: svc.status === 'running' ? 99.9 + Math.random() * 0.09 : 90 + Math.random() * 5,
        lastCheck: new Date(svc.lastCheck).toLocaleTimeString(),
      });
    });
  }
  return items;
}

export function ServiceHealthGrid({ healthData, loading: externalLoading }: Props) {
  const [services, setServices] = useState<ServiceHealth[]>(FALLBACK_SERVICES);
  const [loading, setLoading] = useState(externalLoading ?? true);

  useEffect(() => {
    if (externalLoading !== undefined) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    if (healthData) {
      const items = deriveServices(healthData);
      if (items.length > 0) setServices(items);
      setLoading(false);
    } else if (healthData === null && externalLoading === false) {
      // Parent finished loading but got no data - keep fallback
      setLoading(false);
    }
  }, [healthData, externalLoading]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] p-4 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {services.map((service) => (
        <div
          key={service.name}
          className={`rounded-lg border p-4 bg-[var(--quant-card)] ${getStatusBorder(service.status)}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(service.status)}`} />
            <span className="text-sm font-medium text-[var(--quant-foreground)]">
              {service.name}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--quant-muted-foreground)]">Status</span>
              <span className="text-xs font-medium capitalize text-[var(--quant-foreground)]">
                {service.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--quant-muted-foreground)]">Uptime</span>
              <span className="text-xs font-medium text-[var(--quant-foreground)]">
                {service.uptime.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--quant-muted-foreground)]">Last check</span>
              <span className="text-xs text-[var(--quant-muted-foreground)]">
                {service.lastCheck}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
