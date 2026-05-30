import { NextResponse } from 'next/server';

interface AppHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  port: number;
  responseTimeMs: number;
  lastCheck: string;
}

const APP_REGISTRY = [
  { name: 'QuantMail', port: 3000 },
  { name: 'QuantChat', port: 3001 },
  { name: 'QuantDrive', port: 3002 },
  { name: 'QuantCalendar', port: 3003 },
  { name: 'QuantAds', port: 3004 },
  { name: 'QuantDocs', port: 3005 },
  { name: 'QuantSync', port: 3006 },
  { name: 'QuantMeet', port: 3007 },
  { name: 'QuantAI', port: 3020 },
  { name: 'QuantMax', port: 3030 },
  { name: 'QuantNeon', port: 3031 },
  { name: 'QuantEdits', port: 3032 },
  { name: 'Quantube', port: 3033 },
  { name: 'Admin', port: 3100 },
];

const SERVICE_REGISTRY = [
  { name: 'ws-gateway', port: 3040 },
  { name: 'smtp-inbound', port: 3050 },
  { name: 'cdc-relay', port: 3060 },
  { name: 'ci-runner', port: 3070 },
  { name: 'git-server', port: 3080 },
  { name: 'matchmaking', port: 3090 },
  { name: 'moderation-worker', port: 3091 },
  { name: 'search-indexer', port: 3092 },
];

async function checkHealth(
  port: number,
): Promise<{ status: 'healthy' | 'down'; responseTimeMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://localhost:${port}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return { status: res.ok ? 'healthy' : 'down', responseTimeMs: Date.now() - start };
  } catch {
    return { status: 'down', responseTimeMs: Date.now() - start };
  }
}

export async function GET() {
  const now = new Date().toISOString();

  const appChecks = await Promise.allSettled(
    APP_REGISTRY.map(async (app) => {
      const health = await checkHealth(app.port);
      return { name: app.name, port: app.port, ...health, lastCheck: now } as AppHealth;
    }),
  );

  const apps: AppHealth[] = appChecks.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      name: APP_REGISTRY[i].name,
      port: APP_REGISTRY[i].port,
      status: 'down' as const,
      responseTimeMs: 0,
      lastCheck: now,
    };
  });

  const serviceChecks = await Promise.allSettled(
    SERVICE_REGISTRY.map(async (svc) => {
      const health = await checkHealth(svc.port);
      return {
        name: svc.name,
        status: health.status === 'healthy' ? ('running' as const) : ('stopped' as const),
        responseTimeMs: health.responseTimeMs,
        lastCheck: now,
      };
    }),
  );

  const services = serviceChecks.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      name: SERVICE_REGISTRY[i].name,
      status: 'stopped' as const,
      responseTimeMs: 0,
      lastCheck: now,
    };
  });

  const hasDown = apps.some((a) => a.status === 'down');
  const overall = hasDown ? 'degraded' : 'healthy';

  return NextResponse.json({ timestamp: now, overall, apps, services });
}
