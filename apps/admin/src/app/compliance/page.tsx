'use client';

import { Card, Button } from '@quant/shared-ui';
import { useState, useEffect } from 'react';

interface RetentionPolicyRecord {
  resource: string;
  maxAgeDays: number;
  enabled: boolean;
}

export default function CompliancePage() {
  const [exportUserId, setExportUserId] = useState('');
  const [deleteUserId, setDeleteUserId] = useState('');
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicyRecord[]>([]);
  const [newResource, setNewResource] = useState('');
  const [newMaxAge, setNewMaxAge] = useState(90);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      const res = await fetch('/api/compliance');
      const data = await res.json();
      if (data.success) {
        setPolicies(data.data.policies ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!exportUserId.trim()) return;
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-data', userId: exportUserId }),
      });
      const data = await res.json();
      setExportResult(data.success ? 'Data export initiated successfully.' : 'Export failed.');
    } catch {
      setExportResult('Export request failed.');
    }
  }

  async function handleDelete() {
    if (!deleteUserId.trim()) return;
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-data', userId: deleteUserId }),
      });
      const data = await res.json();
      setDeleteResult(data.success ? 'Data deletion scheduled.' : 'Deletion failed.');
      setShowDeleteConfirm(false);
    } catch {
      setDeleteResult('Deletion request failed.');
    }
  }

  async function addPolicy() {
    if (!newResource.trim()) return;
    const updatedPolicies = [
      ...policies,
      { resource: newResource, maxAgeDays: newMaxAge, enabled: true },
    ];
    try {
      await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-retention', policies: updatedPolicies }),
      });
      setPolicies(updatedPolicies);
      setNewResource('');
      setNewMaxAge(90);
    } catch {
      // silently fail
    }
  }

  async function removePolicy(resource: string) {
    const updatedPolicies = policies.filter((p) => p.resource !== resource);
    try {
      await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-retention', policies: updatedPolicies }),
      });
      setPolicies(updatedPolicies);
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--quant-muted-foreground)]">Loading compliance settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Compliance & GDPR</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Manage data export, deletion, and retention policies
        </p>
      </div>

      {/* Data Export Section */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-[var(--quant-foreground)]">GDPR Data Export</h3>
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Export all data associated with a user for GDPR compliance.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="User ID"
              value={exportUserId}
              onChange={(e) => setExportUserId(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <Button onClick={handleExport}>Export Data</Button>
          </div>
          {exportResult && <p className="text-sm text-green-600">{exportResult}</p>}
        </div>
      </Card>

      {/* Data Deletion Section */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-[var(--quant-foreground)]">
            GDPR Data Deletion
          </h3>
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Request deletion of all user data. This action is irreversible.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="User ID"
              value={deleteUserId}
              onChange={(e) => setDeleteUserId(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <Button onClick={() => setShowDeleteConfirm(true)}>Request Deletion</Button>
          </div>
          {showDeleteConfirm && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <p className="text-sm text-red-800 mb-3">
                Are you sure? This will permanently delete all data for user &quot;{deleteUserId}
                &quot;.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDelete}>Confirm Deletion</Button>
                <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {deleteResult && <p className="text-sm text-green-600">{deleteResult}</p>}
        </div>
      </Card>

      {/* Retention Policies Section */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-[var(--quant-foreground)]">
            Retention Policies
          </h3>
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Configure how long data is retained per resource type.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Max Age (days)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Enabled
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr
                    key={policy.resource}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--quant-foreground)]">{policy.resource}</td>
                    <td className="px-4 py-3 text-[var(--quant-foreground)]">
                      {policy.maxAgeDays}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          policy.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {policy.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button onClick={() => removePolicy(policy.resource)}>Remove</Button>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                    >
                      No retention policies configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-end gap-3 pt-4 border-t border-[var(--quant-border)]">
            <div>
              <label className="text-xs text-[var(--quant-muted-foreground)]">Resource</label>
              <input
                type="text"
                placeholder="e.g., auth_logs"
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--quant-muted-foreground)]">Max Age (days)</label>
              <input
                type="number"
                min={1}
                value={newMaxAge}
                onChange={(e) => setNewMaxAge(Number(e.target.value))}
                className="w-24 rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm text-[var(--quant-foreground)]"
              />
            </div>
            <Button onClick={addPolicy}>Add Policy</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
