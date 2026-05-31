'use client';

import { Card, Badge, Button } from '@quant/shared-ui';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

interface TargetingRule {
  id: string;
  key: string;
  operator: 'equals' | 'contains' | 'starts-with' | 'regex';
  value: string;
}

interface Variant {
  id: string;
  name: string;
  percentage: number;
}

interface HistoryEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

interface FeatureFlagRecord {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  percentage: number;
  rules: TargetingRule[];
  variants: Variant[];
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const defaultFlags: FeatureFlagRecord[] = [
  {
    id: 'ff-1',
    name: 'dark-mode-v2',
    description: 'New dark mode with improved contrast',
    enabled: true,
    percentage: 75,
    rules: [{ id: 'r1', key: 'country', operator: 'equals', value: 'US' }],
    variants: [
      { id: 'v1', name: 'Control', percentage: 50 },
      { id: 'v2', name: 'Variant A', percentage: 50 },
    ],
    history: [
      {
        id: 'h1',
        user: 'Alice Johnson',
        action: 'Enabled flag',
        timestamp: '2024-01-15T10:30:00Z',
      },
      {
        id: 'h2',
        user: 'Bob Smith',
        action: 'Changed rollout to 75%',
        timestamp: '2024-01-14T14:20:00Z',
      },
    ],
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'ff-2',
    name: 'ai-suggestions',
    description: 'AI-powered smart suggestions in search',
    enabled: false,
    percentage: 25,
    rules: [],
    variants: [
      { id: 'v3', name: 'Control', percentage: 70 },
      { id: 'v4', name: 'GPT-4 model', percentage: 30 },
    ],
    history: [
      { id: 'h3', user: 'Ivan Petrov', action: 'Created flag', timestamp: '2024-01-12T16:00:00Z' },
    ],
    createdAt: '2024-01-12T16:00:00Z',
    updatedAt: '2024-01-12T16:00:00Z',
  },
  {
    id: 'ff-3',
    name: 'realtime-collab',
    description: 'Real-time collaboration features in QuantDocs',
    enabled: true,
    percentage: 100,
    rules: [
      { id: 'r2', key: 'plan', operator: 'equals', value: 'enterprise' },
      { id: 'r3', key: 'email', operator: 'contains', value: '@quant.dev' },
    ],
    variants: [],
    history: [
      {
        id: 'h4',
        user: 'Alice Johnson',
        action: 'Enabled flag globally',
        timestamp: '2024-01-13T09:15:00Z',
      },
    ],
    createdAt: '2024-01-08T11:00:00Z',
    updatedAt: '2024-01-13T09:15:00Z',
  },
];

let nextId = 100;
function genId() {
  return `id-${++nextId}`;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagRecord[]>(defaultFlags);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPercentage, setNewPercentage] = useState(100);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const res = await fetch('/api/feature-flags');
        const data = await res.json();
        if (data.success && data.data) {
          setFlags(
            data.data.map((f: FeatureFlagRecord) => ({
              ...f,
              rules: f.rules ?? [],
              variants: f.variants ?? [],
              history: f.history ?? [],
            })),
          );
        }
      } catch {
        // Use default data
      } finally {
        setLoading(false);
      }
    }
    fetchFlags();
  }, []);

  const toggleFlag = useCallback((id: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newEnabled = !f.enabled;
        return {
          ...f,
          enabled: newEnabled,
          history: [
            {
              id: genId(),
              user: 'System Admin',
              action: newEnabled ? 'Enabled flag' : 'Disabled flag',
              timestamp: new Date().toISOString(),
            },
            ...f.history,
          ],
        };
      }),
    );
  }, []);

  const updatePercentage = useCallback((id: string, percentage: number) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, percentage } : f)));
  }, []);

  const addRule = useCallback((flagId: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id !== flagId) return f;
        return {
          ...f,
          rules: [
            ...f.rules,
            { id: genId(), key: 'email', operator: 'contains' as const, value: '' },
          ],
        };
      }),
    );
  }, []);

  const removeRule = useCallback((flagId: string, ruleId: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id !== flagId) return f;
        return { ...f, rules: f.rules.filter((r) => r.id !== ruleId) };
      }),
    );
  }, []);

  const updateRule = useCallback(
    (flagId: string, ruleId: string, field: keyof TargetingRule, value: string) => {
      setFlags((prev) =>
        prev.map((f) => {
          if (f.id !== flagId) return f;
          return {
            ...f,
            rules: f.rules.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r)),
          };
        }),
      );
    },
    [],
  );

  const addVariant = useCallback((flagId: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id !== flagId) return f;
        return {
          ...f,
          variants: [...f.variants, { id: genId(), name: 'New Variant', percentage: 0 }],
        };
      }),
    );
  }, []);

  const updateVariant = useCallback(
    (flagId: string, variantId: string, field: keyof Variant, value: string | number) => {
      setFlags((prev) =>
        prev.map((f) => {
          if (f.id !== flagId) return f;
          return {
            ...f,
            variants: f.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
          };
        }),
      );
    },
    [],
  );

  const removeVariant = useCallback((flagId: string, variantId: string) => {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.id !== flagId) return f;
        return { ...f, variants: f.variants.filter((v) => v.id !== variantId) };
      }),
    );
  }, []);

  const createFlag = useCallback(() => {
    if (!newName.trim()) return;
    const flag: FeatureFlagRecord = {
      id: genId(),
      name: newName.trim(),
      description: newDescription.trim(),
      enabled: false,
      percentage: newPercentage,
      rules: [],
      variants: [],
      history: [
        {
          id: genId(),
          user: 'System Admin',
          action: 'Created flag',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFlags((prev) => [flag, ...prev]);
    setNewName('');
    setNewDescription('');
    setNewPercentage(100);
    setShowCreate(false);
  }, [newName, newDescription, newPercentage]);

  const deleteFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

      {/* Search */}
      <input
        type="text"
        placeholder="Search flags by name or description..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        aria-label="Search feature flags"
      />

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', ...spring.snappy }}
          >
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
                    className="w-full min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-[var(--quant-muted-foreground)]">Rollout:</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={newPercentage}
                      onChange={(e) => setNewPercentage(Number(e.target.value))}
                      className="flex-1 min-h-[44px]"
                    />
                    <span className="text-sm font-medium text-[var(--quant-foreground)] w-10 text-right">
                      {newPercentage}%
                    </span>
                  </div>
                  <Button onClick={createFlag}>Create</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flags list */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => (
          <motion.div
            key={flag.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', ...spring.gentle }}
          >
            <Card>
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleFlag(flag.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors min-w-[44px] ${
                        flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      aria-label={`Toggle ${flag.name}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--quant-foreground)] truncate">
                        {flag.name}
                      </p>
                      <p className="text-xs text-[var(--quant-muted-foreground)] truncate">
                        {flag.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{flag.percentage}%</Badge>
                    <Button
                      onClick={() => setExpandedFlag(expandedFlag === flag.id ? null : flag.id)}
                    >
                      {expandedFlag === flag.id ? 'Collapse' : 'Expand'}
                    </Button>
                    <Button onClick={() => deleteFlag(flag.id)}>Delete</Button>
                  </div>
                </div>

                {/* Expanded section */}
                <AnimatePresence>
                  {expandedFlag === flag.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', ...spring.snappy }}
                      className="mt-4 space-y-5 border-t border-[var(--quant-border)] pt-4"
                    >
                      {/* Percentage Rollout Slider */}
                      <div>
                        <h4 className="text-sm font-medium text-[var(--quant-foreground)] mb-2">
                          Percentage Rollout
                        </h4>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={flag.percentage}
                            onChange={(e) => updatePercentage(flag.id, Number(e.target.value))}
                            className="flex-1 min-h-[44px]"
                            aria-label="Rollout percentage"
                          />
                          <span className="text-sm font-bold text-[var(--quant-foreground)] w-12 text-right">
                            {flag.percentage}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--quant-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                            style={{ width: `${flag.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Targeting Rules */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-[var(--quant-foreground)]">
                            Targeting Rules
                          </h4>
                          <Button onClick={() => addRule(flag.id)}>Add Rule</Button>
                        </div>
                        {flag.rules.length === 0 && (
                          <p className="text-xs text-[var(--quant-muted-foreground)]">
                            No targeting rules. Flag applies to all users within rollout percentage.
                          </p>
                        )}
                        <div className="space-y-2">
                          {flag.rules.map((rule) => (
                            <div key={rule.id} className="flex items-center gap-2 flex-wrap">
                              <select
                                value={rule.key}
                                onChange={(e) =>
                                  updateRule(flag.id, rule.id, 'key', e.target.value)
                                }
                                className="min-h-[44px] rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-1 text-sm text-[var(--quant-foreground)]"
                                aria-label="Rule key"
                              >
                                <option value="email">Email</option>
                                <option value="country">Country</option>
                                <option value="plan">Plan</option>
                                <option value="role">Role</option>
                                <option value="userId">User ID</option>
                              </select>
                              <select
                                value={rule.operator}
                                onChange={(e) =>
                                  updateRule(flag.id, rule.id, 'operator', e.target.value)
                                }
                                className="min-h-[44px] rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-1 text-sm text-[var(--quant-foreground)]"
                                aria-label="Rule operator"
                              >
                                <option value="equals">equals</option>
                                <option value="contains">contains</option>
                                <option value="starts-with">starts-with</option>
                                <option value="regex">regex</option>
                              </select>
                              <input
                                type="text"
                                value={rule.value}
                                onChange={(e) =>
                                  updateRule(flag.id, rule.id, 'value', e.target.value)
                                }
                                placeholder="Value"
                                className="min-h-[44px] flex-1 min-w-[120px] rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-1 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)]"
                                aria-label="Rule value"
                              />
                              <Button onClick={() => removeRule(flag.id, rule.id)}>Remove</Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Variant Management */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-[var(--quant-foreground)]">
                            Variants (A/B Testing)
                          </h4>
                          <Button onClick={() => addVariant(flag.id)}>Add Variant</Button>
                        </div>
                        {flag.variants.length === 0 && (
                          <p className="text-xs text-[var(--quant-muted-foreground)]">
                            No variants configured. Add variants to split traffic.
                          </p>
                        )}
                        <div className="space-y-2">
                          {flag.variants.map((variant) => (
                            <div key={variant.id} className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) =>
                                  updateVariant(flag.id, variant.id, 'name', e.target.value)
                                }
                                className="min-h-[44px] flex-1 min-w-[120px] rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-1 text-sm text-[var(--quant-foreground)]"
                                aria-label="Variant name"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={variant.percentage}
                                  onChange={(e) =>
                                    updateVariant(
                                      flag.id,
                                      variant.id,
                                      'percentage',
                                      Number(e.target.value),
                                    )
                                  }
                                  className="min-h-[44px] w-16 rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-2 py-1 text-sm text-[var(--quant-foreground)] text-center"
                                  aria-label="Variant percentage"
                                />
                                <span className="text-xs text-[var(--quant-muted-foreground)]">
                                  %
                                </span>
                              </div>
                              <Button onClick={() => removeVariant(flag.id, variant.id)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Flag History */}
                      <div>
                        <h4 className="text-sm font-medium text-[var(--quant-foreground)] mb-2">
                          History
                        </h4>
                        {flag.history.length === 0 ? (
                          <p className="text-xs text-[var(--quant-muted-foreground)]">
                            No history.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {flag.history.slice(0, 5).map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2 text-xs">
                                <span className="text-[var(--quant-muted-foreground)]">
                                  {new Date(entry.timestamp).toLocaleString()}
                                </span>
                                <span className="font-medium text-[var(--quant-foreground)]">
                                  {entry.user}
                                </span>
                                <span className="text-[var(--quant-muted-foreground)]">
                                  {entry.action}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        ))}

        {filteredFlags.length === 0 && (
          <Card>
            <div className="p-8 text-center text-[var(--quant-muted-foreground)]">
              No feature flags found matching your search.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
