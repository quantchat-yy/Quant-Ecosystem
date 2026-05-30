'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@quant/shared-ui';

interface AuthEvent {
  id: string;
  type: 'login_success' | 'login_failed' | 'token_refresh' | 'password_reset';
  user: string;
  ip: string;
  timestamp: string;
}

interface Alert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
}

const defaultAuthEvents: AuthEvent[] = [
  {
    id: '1',
    type: 'login_success',
    user: 'alice@quant.dev',
    ip: '192.168.1.100',
    timestamp: '2024-01-15 15:42',
  },
  {
    id: '2',
    type: 'login_failed',
    user: 'unknown@test.com',
    ip: '10.0.0.55',
    timestamp: '2024-01-15 15:38',
  },
  {
    id: '3',
    type: 'login_success',
    user: 'bob@quant.dev',
    ip: '192.168.1.101',
    timestamp: '2024-01-15 15:35',
  },
  {
    id: '4',
    type: 'token_refresh',
    user: 'charlie@example.com',
    ip: '192.168.1.50',
    timestamp: '2024-01-15 15:30',
  },
  {
    id: '5',
    type: 'login_failed',
    user: 'admin@quant.dev',
    ip: '45.33.22.11',
    timestamp: '2024-01-15 15:25',
  },
  {
    id: '6',
    type: 'password_reset',
    user: 'diana@example.com',
    ip: '192.168.1.75',
    timestamp: '2024-01-15 15:20',
  },
];

const alerts: Alert[] = [
  {
    id: '1',
    severity: 'high',
    message: 'Multiple failed login attempts from IP 45.33.22.11',
    timestamp: '2024-01-15 15:25',
  },
  {
    id: '2',
    severity: 'medium',
    message: 'Unusual API rate from user bob@quant.dev',
    timestamp: '2024-01-15 14:50',
  },
  {
    id: '3',
    severity: 'low',
    message: 'New device login for alice@quant.dev',
    timestamp: '2024-01-15 14:30',
  },
];

const eventTypeLabels: Record<AuthEvent['type'], string> = {
  login_success: 'Login OK',
  login_failed: 'Login Failed',
  token_refresh: 'Token Refresh',
  password_reset: 'Password Reset',
};

const severityColors: Record<Alert['severity'], string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

function mapAuditToAuthEvent(entry: {
  id: string;
  userId: string;
  action: string;
  ip: string;
  timestamp: string;
}): AuthEvent {
  let type: AuthEvent['type'] = 'login_success';
  if (entry.action === 'LOGIN_FAILED') type = 'login_failed';
  else if (entry.action === 'LOGIN') type = 'login_success';
  else if (entry.action === 'LOGOUT') type = 'token_refresh';
  else if (entry.action === 'SETTINGS_CHANGE') type = 'password_reset';
  return {
    id: entry.id,
    type,
    user: entry.userId,
    ip: entry.ip,
    timestamp: new Date(entry.timestamp).toLocaleString(),
  };
}

export default function SecurityPage() {
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>(defaultAuthEvents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true);
        const res = await fetch('/api/audit?limit=20');
        const json = await res.json();
        if (json.success && json.data) {
          setAuthEvents(json.data.map(mapAuditToAuthEvent));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load security events');
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading security data...</p>
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
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Security Center</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Monitor authentication, rate limiting, and security events
        </p>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Security Score</p>
            <p className="mt-2 text-2xl font-bold text-green-600">94/100</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Active Sessions</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">1,284</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Rate Limit Hits</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">23</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Blocked IPs</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">7</p>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Suspicious Activity Alerts
        </h2>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <div className="flex items-center gap-4 p-4">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[alert.severity]}`}
                >
                  {alert.severity}
                </span>
                <p className="flex-1 text-sm text-[var(--quant-foreground)]">{alert.message}</p>
                <span className="text-xs text-[var(--quant-muted-foreground)]">
                  {alert.timestamp}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Auth Events */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Recent Auth Events
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {authEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Badge variant="default">{eventTypeLabels[event.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-foreground)]">{event.user}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--quant-muted-foreground)]">
                      {event.ip}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {event.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
