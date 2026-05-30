'use client';

import { useState, useEffect } from 'react';
import { ServiceHealthGrid } from './components/ServiceHealthGrid';
import { LatencyChart } from './components/LatencyChart';
import { ErrorTracker } from './components/ErrorTracker';
import { ServiceMap } from './components/ServiceMap';

interface HealthData {
  apps?: Array<{
    name: string;
    status: string;
    port: number;
    responseTimeMs: number;
    lastCheck: string;
  }>;
  services?: Array<{ name: string; status: string; responseTimeMs: number; lastCheck: string }>;
}

export default function ObservabilityPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((json) => setHealthData(json))
      .catch(() => {
        /* components will use their fallbacks */
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Observability</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Monitor service health, latency, errors, and trace dependencies across the ecosystem
        </p>
      </div>

      {/* Service Health Grid */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">
          Service Health
        </h2>
        <ServiceHealthGrid healthData={healthData} loading={loading} />
      </section>

      {/* Latency and Errors side by side on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">
            Latency Percentiles
          </h2>
          <LatencyChart healthData={healthData} loading={loading} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">
            Service Dependencies
          </h2>
          <ServiceMap healthData={healthData} loading={loading} />
        </section>
      </div>

      {/* Error Tracker full width */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">Recent Errors</h2>
        <ErrorTracker healthData={healthData} loading={loading} />
      </section>
    </div>
  );
}
