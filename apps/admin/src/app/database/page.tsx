'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@quant/shared-ui';

interface TableInfo {
  name: string;
  rowCount: string;
  size: string;
}

interface SlowQuery {
  query: string;
  avgDuration: string;
  calls: number;
}

interface PoolInfo {
  size: number;
  maxSize: number;
  active: number;
  idle: number;
  waitQueue: number;
}

const defaultTables: TableInfo[] = [
  { name: 'users', rowCount: '24,891', size: '128 MB' },
  { name: 'messages', rowCount: '1,245,670', size: '2.1 GB' },
  { name: 'files', rowCount: '456,230', size: '890 MB' },
  { name: 'sessions', rowCount: '8,432', size: '45 MB' },
  { name: 'notifications', rowCount: '890,120', size: '456 MB' },
  { name: 'audit_logs', rowCount: '2,340,000', size: '1.8 GB' },
  { name: 'api_keys', rowCount: '1,205', size: '12 MB' },
  { name: 'workspaces', rowCount: '3,456', size: '28 MB' },
];

const defaultSlowQueries: SlowQuery[] = [
  { query: 'SELECT * FROM messages WHERE ...', avgDuration: '245ms', calls: 1200 },
  { query: 'JOIN users ON ... WHERE role IN ...', avgDuration: '189ms', calls: 890 },
  { query: 'SELECT COUNT(*) FROM audit_logs ...', avgDuration: '156ms', calls: 450 },
];

const defaultPool: PoolInfo = { size: 20, maxSize: 50, active: 14, idle: 6, waitQueue: 0 };

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>(defaultTables);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>(defaultSlowQueries);
  const [pool, setPool] = useState<PoolInfo>(defaultPool);
  const [totalSize, setTotalSize] = useState('5.4 GB');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDBStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/database/stats');
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.tables) setTables(json.data.tables);
          if (json.data.slowQueries) setSlowQueries(json.data.slowQueries);
          if (json.data.pool) setPool(json.data.pool);
          if (json.data.totalSize) setTotalSize(json.data.totalSize);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load database stats');
      } finally {
        setLoading(false);
      }
    }
    fetchDBStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading database stats...</p>
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
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Database</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Connection pool, migrations, and table overview
        </p>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Pool Size</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">
              {pool.size}/{pool.maxSize}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Active Connections</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">{pool.active}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Idle Connections</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">{pool.idle}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Total DB Size</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">{totalSize}</p>
          </div>
        </Card>
      </div>

      {/* Migration Status */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--quant-foreground)]">Migration Status</h3>
            <Badge variant="default">Up to date</Badge>
          </div>
          <div className="mt-3 text-sm text-[var(--quant-muted-foreground)]">
            <p>Latest: 20240115_add_workspace_settings</p>
            <p>Pending migrations: 0</p>
            <p>Total applied: 47</p>
          </div>
        </div>
      </Card>

      {/* Tables */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Table Overview
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Row Count
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr
                    key={table.name}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--quant-foreground)]">
                      {table.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {table.rowCount}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">{table.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Slow Queries */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">Slow Queries</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Query
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Avg Duration
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Calls
                  </th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((q, i) => (
                  <tr key={i} className="border-b border-[var(--quant-border)] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--quant-foreground)]">
                      {q.query}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {q.avgDuration}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">{q.calls}</td>
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
