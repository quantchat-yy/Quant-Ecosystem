'use client';

import { Card, Button } from '@quant/shared-ui';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

type ActionType = 'create' | 'update' | 'delete' | 'login' | 'export';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: ActionType;
  target: string;
  details: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

const ACTION_OPTIONS: ActionType[] = ['create', 'update', 'delete', 'login', 'export'];

const actionColors: Record<ActionType, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
  export: 'bg-orange-100 text-orange-700',
};

const defaultEntries: AuditEntry[] = [
  {
    id: 'ae-1',
    userId: 'u-1',
    userName: 'Alice Johnson',
    userAvatar: 'AJ',
    action: 'update',
    target: 'Feature Flag: dark-mode-v2',
    details: 'Changed rollout percentage from 50% to 75%',
    payload: { flagId: 'ff-1', field: 'percentage', oldValue: 50, newValue: 75 },
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    id: 'ae-2',
    userId: 'u-2',
    userName: 'Bob Smith',
    userAvatar: 'BS',
    action: 'login',
    target: 'Admin Panel',
    details: 'Authenticated via SSO from 192.168.1.42',
    payload: { ip: '192.168.1.42', method: 'SSO' },
    timestamp: '2024-01-15T09:15:00Z',
  },
  {
    id: 'ae-3',
    userId: 'u-1',
    userName: 'Alice Johnson',
    userAvatar: 'AJ',
    action: 'create',
    target: 'User: kevin.wu@example.com',
    details: 'Created new user account with role User',
    payload: { email: 'kevin.wu@example.com', role: 'User' },
    timestamp: '2024-01-15T08:45:00Z',
  },
  {
    id: 'ae-4',
    userId: 'u-3',
    userName: 'Ivan Petrov',
    userAvatar: 'IP',
    action: 'delete',
    target: 'Feature Flag: old-dashboard',
    details: 'Permanently deleted feature flag after 90 days inactive',
    payload: { flagId: 'ff-old', reason: 'Inactive for 90 days' },
    timestamp: '2024-01-14T16:20:00Z',
  },
  {
    id: 'ae-5',
    userId: 'u-2',
    userName: 'Bob Smith',
    userAvatar: 'BS',
    action: 'export',
    target: 'Users Report',
    details: 'Exported 24,891 user records to CSV',
    payload: { format: 'CSV', recordCount: 24891 },
    timestamp: '2024-01-14T14:00:00Z',
  },
  {
    id: 'ae-6',
    userId: 'u-1',
    userName: 'Alice Johnson',
    userAvatar: 'AJ',
    action: 'update',
    target: 'User: diana@example.com',
    details: 'Changed status from active to suspended',
    payload: { userId: 'u-4', field: 'status', oldValue: 'active', newValue: 'suspended' },
    timestamp: '2024-01-14T11:30:00Z',
  },
  {
    id: 'ae-7',
    userId: 'u-3',
    userName: 'Ivan Petrov',
    userAvatar: 'IP',
    action: 'create',
    target: 'Feature Flag: ai-suggestions',
    details: 'Created new feature flag with 25% rollout',
    payload: { flagName: 'ai-suggestions', percentage: 25 },
    timestamp: '2024-01-12T16:00:00Z',
  },
  {
    id: 'ae-8',
    userId: 'u-2',
    userName: 'Bob Smith',
    userAvatar: 'BS',
    action: 'login',
    target: 'Admin Panel',
    details: 'Authenticated via password from 10.0.0.15',
    payload: { ip: '10.0.0.15', method: 'password' },
    timestamp: '2024-01-12T09:00:00Z',
  },
  {
    id: 'ae-9',
    userId: 'u-1',
    userName: 'Alice Johnson',
    userAvatar: 'AJ',
    action: 'update',
    target: 'System Settings',
    details: 'Increased session timeout from 30m to 60m',
    payload: { setting: 'sessionTimeout', oldValue: '30m', newValue: '60m' },
    timestamp: '2024-01-11T15:45:00Z',
  },
  {
    id: 'ae-10',
    userId: 'u-3',
    userName: 'Ivan Petrov',
    userAvatar: 'IP',
    action: 'export',
    target: 'Audit Log',
    details: 'Exported last 30 days of audit records for compliance review',
    payload: { format: 'JSON', dateRange: '30d' },
    timestamp: '2024-01-10T10:00:00Z',
  },
];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>(defaultEntries);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (actionFilter) params.set('action', actionFilter);
        if (userSearch) params.set('userId', userSearch);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        params.set('limit', '50');
        params.set('offset', '0');

        const res = await fetch(`/api/audit?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.data) {
          setEntries(
            data.data.map((e: AuditEntry & { resource?: string; ip?: string }) => ({
              id: e.id,
              userId: e.userId,
              userName: e.userName ?? e.userId,
              userAvatar: e.userAvatar ?? (e.userName ?? e.userId).slice(0, 2).toUpperCase(),
              action: e.action as ActionType,
              target: e.target ?? e.resource ?? '',
              details: e.details ?? '',
              payload: e.payload,
              timestamp: e.timestamp,
            })),
          );
        }
      } catch {
        // Use default data on failure
      } finally {
        setLoading(false);
      }
    }
    fetchAuditLogs();
  }, [actionFilter, userSearch, startDate, endDate]);

  const filteredEntries = entries.filter((entry) => {
    if (actionFilter && entry.action !== actionFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!entry.userName.toLowerCase().includes(q) && !entry.userId.toLowerCase().includes(q))
        return false;
    }
    if (startDate && entry.timestamp < startDate) return false;
    if (endDate && entry.timestamp > endDate + 'T23:59:59Z') return false;
    return true;
  });

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEntries.length;

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 5);
      setLoadingMore(false);
    }, 300);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--quant-muted-foreground)]">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Audit Log</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Track all system activity and access events ({filteredEntries.length} entries)
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-[var(--quant-foreground)]">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setVisibleCount(5);
              }}
              className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
              aria-label="Filter by action type"
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search by user name..."
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setVisibleCount(5);
              }}
              className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)]"
              aria-label="Search by user"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setVisibleCount(5);
              }}
              className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
              aria-label="From date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setVisibleCount(5);
              }}
              className="min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
              aria-label="To date"
            />
          </div>
        </div>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--quant-border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Action
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Target
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <motion.tr
                  key={entry.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-[var(--quant-border)] last:border-0 hover:bg-[var(--quant-muted)]/30 cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                >
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--quant-muted)] text-xs font-medium text-[var(--quant-foreground)]">
                        {entry.userAvatar}
                      </div>
                      <span className="text-[var(--quant-foreground)] font-medium">
                        {entry.userName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[entry.action]}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--quant-foreground)]">{entry.target}</td>
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)] max-w-[200px] truncate">
                    {entry.details}
                  </td>
                </motion.tr>
              ))}
              {visibleEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                  >
                    No audit log entries found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expandedRow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="border-t border-[var(--quant-border)] px-4 py-3"
            >
              {(() => {
                const entry = visibleEntries.find((e) => e.id === expandedRow);
                if (!entry) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[var(--quant-foreground)]">
                      Full Details
                    </h4>
                    <p className="text-sm text-[var(--quant-muted-foreground)]">{entry.details}</p>
                    {entry.payload && (
                      <div className="mt-2">
                        <h5 className="text-xs font-medium text-[var(--quant-muted-foreground)] mb-1">
                          JSON Payload
                        </h5>
                        <pre className="rounded-lg bg-[var(--quant-muted)] p-3 text-xs text-[var(--quant-foreground)] overflow-x-auto">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load More */}
        {hasMore && (
          <div className="border-t border-[var(--quant-border)] px-4 py-3 text-center">
            <Button onClick={loadMore} disabled={loadingMore}>
              {loadingMore
                ? 'Loading...'
                : `Load More (${filteredEntries.length - visibleCount} remaining)`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
