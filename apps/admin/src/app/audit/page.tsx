'use client';

import { Card, Button } from '@quant/shared-ui';
import { useState, useEffect } from 'react';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  timestamp: string;
}

const ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'DATA_ACCESS',
  'DATA_MODIFY',
  'DATA_DELETE',
  'PERMISSION_CHANGE',
  'SETTINGS_CHANGE',
  'USER_CREATE',
  'USER_DELETE',
  'FLAG_TOGGLE',
];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, userFilter, startDate, endDate, offset]);

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (userFilter) params.set('userId', userFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setTotal(data.total ?? data.data.length);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Audit Log</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Track all system activity and access events
        </p>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[var(--quant-foreground)]">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
            >
              <option value="">All Actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="User ID"
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)]"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[var(--quant-muted-foreground)]">Loading audit logs...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--quant-foreground)]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-foreground)]">{entry.userId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {entry.resource}
                      {entry.resourceId ? `/${entry.resourceId}` : ''}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {entry.ip ?? '-'}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                    >
                      No audit log entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--quant-border)] px-4 py-3">
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
              Previous
            </Button>
            <Button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
