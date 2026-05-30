import { ServiceHealthGrid } from './components/ServiceHealthGrid';
import { LatencyChart } from './components/LatencyChart';
import { ErrorTracker } from './components/ErrorTracker';
import { ServiceMap } from './components/ServiceMap';

export default function ObservabilityPage() {
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
        <ServiceHealthGrid />
      </section>

      {/* Latency and Errors side by side on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">
            Latency Percentiles
          </h2>
          <LatencyChart />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">
            Service Dependencies
          </h2>
          <ServiceMap />
        </section>
      </div>

      {/* Error Tracker full width */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-3">Recent Errors</h2>
        <ErrorTracker />
      </section>
    </div>
  );
}
