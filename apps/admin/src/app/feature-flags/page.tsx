'use client';

import { Card, Badge, Button } from '@quant/shared-ui';
import { useState, useEffect } from 'react';

interface FeatureFlagRecord {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  percentage: number;
  rules: unknown[];
  variants: unknown[];
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPercentage, setNewPercentage] = useState(100);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      const res = await fetch('/api/feature-flags');
      const data = await res.json();
      if (data.success) {
        setFlags(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(id: string, enabled: boolean) {
    try {
      await fetch(`/api/feature-flags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
    } catch {
      // silently fail
    }
  }

  async function createFlag() {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          percentage: newPercentage,
          enabled: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFlags((prev) => [...prev, data.data]);
        setNewName('');
        setNewDescription('');
        setNewPercentage(100);
        setShowCreate(false);
      }
    } catch {
      // silently fail
    }
  }

  async function deleteFlag(id: string) {
    try {
      await fetch(`/api/feature-flags/${id}`, { method: 'DELETE' });
      setFlags((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--quant-muted-foreground)]">Loading flags...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Feature Flags</h1>
          <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
            Manage {flags.length} feature flags
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Create Flag'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--quant-foreground)]">
              Create New Flag
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Flag name (e.g. dark-mode-v2)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-[var(--quant-muted-foreground)]">Rollout %:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newPercentage}
                  onChange={(e) => setNewPercentage(Number(e.target.value))}
                  className="w-20 rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>
              <Button onClick={createFlag}>Create</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--quant-border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Enabled
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Percentage
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Updated
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.id} className="border-b border-[var(--quant-border)] last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--quant-foreground)]">{flag.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                    {flag.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleFlag(flag.id, !flag.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{flag.percentage}%</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                    {flag.updatedAt ? new Date(flag.updatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button onClick={() => deleteFlag(flag.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {flags.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                  >
                    No feature flags yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
