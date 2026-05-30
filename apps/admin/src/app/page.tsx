'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@quant/shared-ui';

interface SystemStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface AppHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  port: number;
  version: string;
}

const defaultStats: SystemStat[] = [
  { label: 'Total Users', value: '24,891', change: '+12%', trend: 'up' },
  { label: 'Active Apps', value: '16/16', change: '100%', trend: 'neutral' },
  { label: 'Requests/min', value: '8,432', change: '+5%', trend: 'up' },
  { label: 'Error Rate', value: '0.12%', change: '-0.03%', trend: 'down' },
];

const defaultAppHealth: AppHealth[] = [
  { name: 'QuantMail', status: 'healthy', port: 3000, version: '1.0.0' },
  { name: 'QuantChat', status: 'healthy', port: 3001, version: '1.0.0' },
  { name: 'QuantDrive', status: 'healthy', port: 3002, version: '1.0.0' },
  { name: 'QuantCalendar', status: 'healthy', port: 3003, version: '1.0.0' },
  { name: 'QuantMeet', status: 'healthy', port: 3004, version: '1.0.0' },
  { name: 'QuantNotes', status: 'healthy', port: 3005, version: '1.0.0' },
  { name: 'QuantTasks', status: 'healthy', port: 3006, version: '1.0.0' },
  { name: 'QuantCode', status: 'degraded', port: 3007, version: '1.0.0' },
  { name: 'QuantCI', status: 'healthy', port: 3008, version: '1.0.0' },
  { name: 'QuantSocial', status: 'healthy', port: 3009, version: '1.0.0' },
  { name: 'QuantAI', status: 'healthy', port: 3010, version: '1.0.0' },
  { name: 'QuantPay', status: 'healthy', port: 3011, version: '1.0.0' },
  { name: 'QuantGames', status: 'healthy', port: 3012, version: '1.0.0' },
  { name: 'QuantForms', status: 'healthy', port: 3013, version: '1.0.0' },
  { name: 'QuantAnalytics', status: 'healthy', port: 3014, version: '1.0.0' },
  { name: 'QuantAdmin', status: 'healthy', port: 3100, version: '1.0.0' },
];

function StatusDot({ status }: { status: AppHealth['status'] }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status]}`} />;
}

export default function DashboardPage() {
  const [systemStats, setSystemStats] = useState<SystemStat[]>(defaultStats);
  const [appHealthData, setAppHealthData] = useState<AppHealth[]>(defaultAppHealth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/health'),
        ]);

        const statsJson = await statsRes.json();
        const healthJson = await healthRes.json();

        if (statsJson.users) {
          const totalApps = healthJson.apps?.length ?? defaultAppHealth.length;
          const healthyApps =
            healthJson.apps?.filter((a: { status: string }) => a.status === 'healthy').length ??
            totalApps;
          setSystemStats([
            {
              label: 'Total Users',
              value: statsJson.users.total.toLocaleString(),
              change: `+${statsJson.users.newToday}`,
              trend: 'up',
            },
            {
              label: 'Active Apps',
              value: `${healthyApps}/${totalApps}`,
              change: `${Math.round((healthyApps / totalApps) * 100)}%`,
              trend: healthyApps === totalApps ? 'neutral' : 'down',
            },
            {
              label: 'Active Users',
              value: statsJson.users.active.toLocaleString(),
              change: 'today',
              trend: 'up',
            },
            {
              label: 'Online Now',
              value: statsJson.users.online.toLocaleString(),
              change: 'live',
              trend: 'neutral',
            },
          ]);
        }

        if (healthJson.apps) {
          setAppHealthData(
            healthJson.apps.map((app: { name: string; status: string; port: number }) => ({
              name: app.name,
              status: app.status,
              port: app.port,
              version: '1.0.0',
            })),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-2">
          <span className="text-yellow-500 text-sm font-medium">&#9888;</span>
          <p className="text-sm text-yellow-600">
            Could not refresh data: {error}. Showing cached data below.
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Overview of the entire Quant Ecosystem
        </p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat) => (
          <Card key={stat.label}>
            <div className="p-5">
              <p className="text-sm text-[var(--quant-muted-foreground)]">{stat.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--quant-foreground)]">
                  {stat.value}
                </span>
                <Badge
                  variant={
                    stat.trend === 'up' ? 'default' : stat.trend === 'down' ? 'default' : 'default'
                  }
                >
                  {stat.change}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Apps Health Grid */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Application Health
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {appHealthData.map((app) => (
            <Card key={app.name}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--quant-foreground)]">
                    {app.name}
                  </span>
                  <StatusDot status={app.status} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--quant-muted-foreground)]">
                  <span>:{app.port}</span>
                  <span>v{app.version}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
