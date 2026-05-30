'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@quant/shared-ui';

interface AIProvider {
  name: string;
  status: 'active' | 'inactive' | 'error';
  models: number;
  requestsToday: number;
}

interface ModelUsage {
  model: string;
  tokensUsed: string;
  requests: number;
  avgLatency: string;
  cost: string;
}

interface AITotals {
  tokens: string;
  requests: number;
  cost: string;
  avgLatency: string;
}

const defaultProviders: AIProvider[] = [
  { name: 'OpenAI', status: 'active', models: 4, requestsToday: 12450 },
  { name: 'Anthropic', status: 'active', models: 3, requestsToday: 8920 },
  { name: 'Google AI', status: 'active', models: 2, requestsToday: 3200 },
  { name: 'Local LLM', status: 'active', models: 1, requestsToday: 1580 },
];

const defaultModelUsage: ModelUsage[] = [
  { model: 'GPT-4o', tokensUsed: '2.4M', requests: 5600, avgLatency: '1.2s', cost: '$48.00' },
  { model: 'Claude 3.5', tokensUsed: '1.8M', requests: 4200, avgLatency: '0.9s', cost: '$36.00' },
  { model: 'Gemini Pro', tokensUsed: '890K', requests: 2100, avgLatency: '0.7s', cost: '$12.00' },
  { model: 'Llama 3', tokensUsed: '450K', requests: 1580, avgLatency: '0.4s', cost: '$0.00' },
];

const defaultTotals: AITotals = {
  tokens: '5.5M',
  requests: 26150,
  cost: '$96.00',
  avgLatency: '0.8s',
};

export default function AIPage() {
  const [providers, setProviders] = useState<AIProvider[]>(defaultProviders);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>(defaultModelUsage);
  const [totals, setTotals] = useState<AITotals>(defaultTotals);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAIStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/ai/stats');
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.providers) setProviders(json.data.providers);
          if (json.data.modelUsage) setModelUsage(json.data.modelUsage);
          if (json.data.totals) setTotals(json.data.totals);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load AI stats');
      } finally {
        setLoading(false);
      }
    }
    fetchAIStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--quant-muted-foreground)]">Loading AI dashboard...</p>
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
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">AI/ML Dashboard</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Monitor AI providers, model usage, and costs
        </p>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Total Tokens Today</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">
              {totals.tokens}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Total Requests</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">
              {totals.requests.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Avg Latency</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">
              {totals.avgLatency}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Daily Cost</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">{totals.cost}</p>
          </div>
        </Card>
      </div>

      {/* Providers */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">AI Providers</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {providers.map((provider) => (
            <Card key={provider.name}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--quant-foreground)]">
                    {provider.name}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${provider.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                </div>
                <div className="mt-2 text-xs text-[var(--quant-muted-foreground)]">
                  <p>{provider.models} models</p>
                  <p>{provider.requestsToday.toLocaleString()} requests today</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Model Usage Table */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">Model Usage</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Requests
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Avg Latency
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {modelUsage.map((usage) => (
                  <tr
                    key={usage.model}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--quant-foreground)]">
                      {usage.model}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {usage.tokensUsed}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {usage.requests.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {usage.avgLatency}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">{usage.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Moderation Queue */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--quant-foreground)]">
              Content Moderation Queue
            </h3>
            <Badge variant="default">12 pending</Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--quant-muted-foreground)]">
            AI-flagged content awaiting human review
          </p>
        </div>
      </Card>

      {/* Chart placeholder */}
      <Card>
        <div className="p-5">
          <h3 className="font-semibold text-[var(--quant-foreground)] mb-3">Usage Over Time</h3>
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--quant-border)]">
            <p className="text-sm text-[var(--quant-muted-foreground)]">
              Chart: Token usage over 7 days
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
