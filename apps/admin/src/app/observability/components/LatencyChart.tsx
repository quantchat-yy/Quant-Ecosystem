'use client';

interface LatencyData {
  service: string;
  intervals: { time: string; p50: number; p95: number; p99: number }[];
}

const latencyData: LatencyData[] = [
  {
    service: 'quantmail',
    intervals: [
      { time: '10:00', p50: 12, p95: 45, p99: 89 },
      { time: '10:05', p50: 14, p95: 52, p99: 95 },
      { time: '10:10', p50: 11, p95: 42, p99: 78 },
      { time: '10:15', p50: 13, p95: 48, p99: 92 },
      { time: '10:20', p50: 15, p95: 55, p99: 110 },
    ],
  },
  {
    service: 'quantchat',
    intervals: [
      { time: '10:00', p50: 8, p95: 32, p99: 65 },
      { time: '10:05', p50: 9, p95: 35, p99: 70 },
      { time: '10:10', p50: 7, p95: 28, p99: 58 },
      { time: '10:15', p50: 10, p95: 38, p99: 75 },
      { time: '10:20', p50: 8, p95: 30, p99: 62 },
    ],
  },
  {
    service: 'quantai',
    intervals: [
      { time: '10:00', p50: 120, p95: 350, p99: 680 },
      { time: '10:05', p50: 135, p95: 380, p99: 720 },
      { time: '10:10', p50: 115, p95: 320, p99: 640 },
      { time: '10:15', p50: 140, p95: 400, p99: 750 },
      { time: '10:20', p50: 125, p95: 360, p99: 700 },
    ],
  },
  {
    service: 'ws-gateway',
    intervals: [
      { time: '10:00', p50: 3, p95: 12, p99: 25 },
      { time: '10:05', p50: 4, p95: 14, p99: 28 },
      { time: '10:10', p50: 3, p95: 11, p99: 22 },
      { time: '10:15', p50: 5, p95: 15, p99: 30 },
      { time: '10:20', p50: 4, p95: 13, p99: 26 },
    ],
  },
];

function getLatencyColor(ms: number) {
  if (ms < 100) return 'text-green-500';
  if (ms < 300) return 'text-yellow-500';
  return 'text-red-500';
}

export function LatencyChart() {
  return (
    <div className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--quant-border)] bg-[var(--quant-muted)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Service
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--quant-muted-foreground)]">
                Time
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p50
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p95
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--quant-muted-foreground)]">
                p99
              </th>
            </tr>
          </thead>
          <tbody>
            {latencyData.map((service) =>
              service.intervals.map((interval, idx) => (
                <tr
                  key={`${service.service}-${interval.time}`}
                  className="border-b border-[var(--quant-border)] last:border-0"
                >
                  {idx === 0 && (
                    <td
                      rowSpan={service.intervals.length}
                      className="px-3 py-1.5 font-medium text-[var(--quant-foreground)] align-middle"
                    >
                      {service.service}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-[var(--quant-muted-foreground)]">
                    {interval.time}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p50)}`}
                  >
                    {interval.p50}ms
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p95)}`}
                  >
                    {interval.p95}ms
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono ${getLatencyColor(interval.p99)}`}
                  >
                    {interval.p99}ms
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
