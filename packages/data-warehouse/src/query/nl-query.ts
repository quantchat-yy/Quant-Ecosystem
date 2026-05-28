import type {
  DataQuery,
  QueryResult,
  ParsedQuery,
  QueryIntent,
  QueryFilter,
  TimeRange,
  TimeSeriesPoint,
} from '../types.js';

const METRICS = [
  'emails',
  'meetings',
  'tasks',
  'messages',
  'files',
  'contacts',
  'events',
  'sessions',
];
const PERIODS = ['today', 'week', 'month', 'quarter', 'year'];
const INTENTS: { pattern: RegExp; intent: QueryIntent }[] = [
  { pattern: /how many|count|total number/i, intent: 'count' },
  { pattern: /sum|total\s+(?:amount|value)/i, intent: 'sum' },
  { pattern: /average|avg|mean/i, intent: 'avg' },
  { pattern: /maximum|max|highest|most/i, intent: 'max' },
  { pattern: /minimum|min|lowest|least/i, intent: 'min' },
  { pattern: /list|show|display|get/i, intent: 'list' },
];

function parseTimeExpression(nl: string): { period: string; timeRange: TimeRange | null } {
  const lower = nl.toLowerCase();
  const now = Date.now();
  const day = 86400000;

  if (lower.includes('last 7 days') || lower.includes('past week')) {
    return { period: 'week', timeRange: { start: now - 7 * day, end: now } };
  }
  if (
    lower.includes('last 30 days') ||
    lower.includes('this month') ||
    lower.includes('past month')
  ) {
    return { period: 'month', timeRange: { start: now - 30 * day, end: now } };
  }
  if (lower.includes('today')) {
    const startOfDay = now - (now % day);
    return { period: 'today', timeRange: { start: startOfDay, end: now } };
  }

  const period = PERIODS.find((p) => lower.includes(p)) ?? null;
  return { period: period ?? 'all', timeRange: null };
}

function parseFilters(nl: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const lower = nl.toLowerCase();

  const fromApp = lower.match(/from\s+(\w+)/);
  if (fromApp?.[1]) {
    filters.push({ field: 'app', operator: 'eq', value: fromApp[1] });
  }

  const byUser = lower.match(/by\s+(?:user\s+)?(\w+)/);
  if (byUser?.[1]) {
    filters.push({ field: 'user', operator: 'eq', value: byUser[1] });
  }

  return filters;
}

export class NLQueryEngine {
  private store: TimeSeriesPoint[] = [];

  setStore(data: TimeSeriesPoint[]): void {
    this.store = data;
  }

  parse(nl: string): DataQuery {
    const lower = nl.toLowerCase();
    const metric = METRICS.find((m) => new RegExp(`\\b${m}\\b`).test(lower)) ?? null;
    const { period, timeRange } = parseTimeExpression(nl);

    let intent: QueryIntent = 'count';
    for (const { pattern, intent: i } of INTENTS) {
      if (pattern.test(lower)) {
        intent = i;
        break;
      }
    }

    const filters = parseFilters(nl);
    const parsed: ParsedQuery | null = metric
      ? { metric, period, intent, filters, timeRange }
      : null;

    return { id: crypto.randomUUID(), naturalLanguage: nl, parsed };
  }

  execute(q: DataQuery): QueryResult {
    if (!q.parsed) {
      return { queryId: q.id, data: [], summary: 'Could not parse query', executedAt: Date.now() };
    }

    let filtered = [...this.store];

    if (q.parsed.timeRange) {
      filtered = filtered.filter(
        (p) => p.timestamp >= q.parsed!.timeRange!.start && p.timestamp <= q.parsed!.timeRange!.end,
      );
    }

    if (q.parsed.metric) {
      filtered = filtered.filter(
        (p) => p.action === q.parsed!.metric || p.app === q.parsed!.metric,
      );
    }

    for (const filter of q.parsed.filters) {
      filtered = filtered.filter((p) => {
        const val = filter.field === 'app' ? p.app : String(p.metadata?.[filter.field] ?? '');
        if (filter.operator === 'eq') return val === filter.value;
        if (filter.operator === 'neq') return val !== filter.value;
        return val.includes(filter.value);
      });
    }

    let data: unknown[];
    let summary: string;

    switch (q.parsed.intent) {
      case 'count':
        data = [{ count: filtered.length }];
        summary = `Count: ${filtered.length}`;
        break;
      case 'sum': {
        const total = filtered.reduce((acc, p) => acc + p.value, 0);
        data = [{ sum: total }];
        summary = `Sum: ${total}`;
        break;
      }
      case 'avg': {
        const avg =
          filtered.length > 0 ? filtered.reduce((acc, p) => acc + p.value, 0) / filtered.length : 0;
        data = [{ avg }];
        summary = `Average: ${avg}`;
        break;
      }
      case 'max': {
        const max = filtered.length > 0 ? Math.max(...filtered.map((p) => p.value)) : 0;
        data = [{ max }];
        summary = `Max: ${max}`;
        break;
      }
      case 'min': {
        const min = filtered.length > 0 ? Math.min(...filtered.map((p) => p.value)) : 0;
        data = [{ min }];
        summary = `Min: ${min}`;
        break;
      }
      case 'list':
        data = filtered.slice(0, 100);
        summary = `Listed ${Math.min(filtered.length, 100)} records`;
        break;
    }

    return { queryId: q.id, data, summary, executedAt: Date.now() };
  }

  getSupportedMetrics(): string[] {
    return [...METRICS];
  }
  getSupportedPeriods(): string[] {
    return [...PERIODS];
  }
}
