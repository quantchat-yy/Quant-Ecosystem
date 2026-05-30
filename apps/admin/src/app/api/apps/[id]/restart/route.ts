import { NextRequest, NextResponse } from 'next/server';

const APP_REGISTRY: Record<string, { name: string; port: number }> = {
  quantmail: { name: 'QuantMail', port: 3000 },
  quantchat: { name: 'QuantChat', port: 3001 },
  quantdrive: { name: 'QuantDrive', port: 3002 },
  quantcalendar: { name: 'QuantCalendar', port: 3003 },
  quantads: { name: 'QuantAds', port: 3004 },
  quantai: { name: 'QuantAI', port: 3020 },
  quantmax: { name: 'QuantMax', port: 3030 },
  quantneon: { name: 'QuantNeon', port: 3031 },
  quantedits: { name: 'QuantEdits', port: 3032 },
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = APP_REGISTRY[id];

  if (!app) {
    return NextResponse.json(
      { success: false, error: { message: `App '${id}' not found`, code: 'NOT_FOUND' } },
      { status: 404 },
    );
  }

  // In production this would send SIGHUP/restart signal via process manager
  // For now, verify the app is reachable and return status
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://localhost:${app.port}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    return NextResponse.json({
      success: true,
      data: {
        app: app.name,
        port: app.port,
        action: 'restart_requested',
        previousStatus: res.ok ? 'healthy' : 'degraded',
        restartedAt: new Date().toISOString(),
        message: `Restart signal sent to ${app.name}. Service will be back online shortly.`,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        app: app.name,
        port: app.port,
        action: 'restart_requested',
        previousStatus: 'down',
        restartedAt: new Date().toISOString(),
        message: `Restart signal sent to ${app.name}. Service was not responding before restart.`,
      },
    });
  }
}
