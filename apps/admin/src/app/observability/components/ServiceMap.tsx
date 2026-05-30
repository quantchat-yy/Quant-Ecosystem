'use client';

interface ServiceDependency {
  service: string;
  dependencies: string[];
}

const serviceDeps: ServiceDependency[] = [
  { service: 'quantmail', dependencies: ['postgres', 'redis', 'smtp-relay'] },
  { service: 'quantchat', dependencies: ['redis', 'postgres', 'ws-gateway'] },
  { service: 'quantai', dependencies: ['postgres', 'redis', 'model-api'] },
  { service: 'admin', dependencies: ['postgres', 'quantmail', 'quantchat', 'quantai'] },
  { service: 'ws-gateway', dependencies: ['redis'] },
];

function getDepColor(dep: string) {
  switch (dep) {
    case 'postgres':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'redis':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'smtp-relay':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'ws-gateway':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'model-api':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

export function ServiceMap() {
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
