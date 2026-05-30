'use client';

import { useState, useEffect } from 'react';

interface ServiceDependency {
  service: string;
  dependencies: string[];
}

const FALLBACK_DEPS: ServiceDependency[] = [
  { service: 'quantmail', dependencies: ['postgres', 'redis', 'smtp-relay'] },
  { service: 'quantchat', dependencies: ['redis', 'postgres', 'ws-gateway'] },
  { service: 'quantai', dependencies: ['postgres', 'redis', 'model-api'] },
  { service: 'admin', dependencies: ['postgres', 'quantmail', 'quantchat', 'quantai'] },
  { service: 'ws-gateway', dependencies: ['redis'] },
];

const KNOWN_DEPS: Record<string, string[]> = {
  quantmail: ['postgres', 'redis', 'smtp-inbound'],
  quantchat: ['redis', 'postgres', 'ws-gateway'],
  quantai: ['postgres', 'redis', 'model-api'],
  quantdrive: ['postgres', 'redis'],
  quantcalendar: ['postgres', 'redis'],
  quantads: ['postgres', 'redis', 'search-indexer'],
  quantdocs: ['postgres', 'redis'],
  quantsync: ['postgres', 'redis', 'cdc-relay'],
  quantmeet: ['redis', 'ws-gateway', 'matchmaking'],
  quantmax: ['postgres', 'redis'],
  quantneon: ['postgres', 'redis'],
  quantedits: ['postgres', 'redis'],
  quantube: ['postgres', 'redis', 'search-indexer'],
  admin: ['postgres', 'quantmail', 'quantchat', 'quantai'],
  'ws-gateway': ['redis'],
  'smtp-inbound': ['redis'],
  'cdc-relay': ['postgres', 'redis'],
  'ci-runner': ['postgres'],
  'git-server': ['postgres'],
  matchmaking: ['redis'],
  'moderation-worker': ['redis', 'postgres'],
  'search-indexer': ['postgres', 'redis'],
};

function getDepColor(dep: string) {
  switch (dep) {
    case 'postgres':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'redis':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'smtp-inbound':
    case 'smtp-relay':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'ws-gateway':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'model-api':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'search-indexer':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'cdc-relay':
      return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    case 'matchmaking':
      return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

export function ServiceMap() {
  const [serviceDeps, setServiceDeps] = useState<ServiceDependency[]>(FALLBACK_DEPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((json) => {
        const items: ServiceDependency[] = [];
        if (json.apps) {
          json.apps.forEach((app: { name: string }) => {
            const key = app.name.toLowerCase();
            const deps = KNOWN_DEPS[key] || ['postgres', 'redis'];
            items.push({ service: key, dependencies: deps });
          });
        }
        if (json.services) {
          json.services.forEach((svc: { name: string }) => {
            const deps = KNOWN_DEPS[svc.name] || ['redis'];
            items.push({ service: svc.name, dependencies: deps });
          });
        }
        if (items.length > 0) setServiceDeps(items);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 bg-[var(--quant-muted)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] p-4 space-y-3">
      {serviceDeps.map((item) => (
        <div key={item.service} className="flex items-center gap-3">
          <div className="w-24 shrink-0">
            <span className="text-xs font-medium text-[var(--quant-foreground)]">
              {item.service}
            </span>
          </div>
          <div className="text-[var(--quant-muted-foreground)] text-xs shrink-0">&rarr;</div>
          <div className="flex flex-wrap gap-1.5">
            {item.dependencies.map((dep) => (
              <span
                key={dep}
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDepColor(dep)}`}
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
