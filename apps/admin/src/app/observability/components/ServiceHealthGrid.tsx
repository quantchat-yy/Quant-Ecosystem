'use client';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastCheck: string;
}

const services: ServiceHealth[] = [
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

export function ServiceHealthGrid() {
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
                {service.uptime}%
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
