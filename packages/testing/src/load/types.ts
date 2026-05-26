export interface K6Stage {
  duration: string;
  target: number;
}

export interface K6Threshold {
  metric: string;
  conditions: string[];
  abortOnFail?: boolean;
}

export interface K6Scenario {
  name: string;
  executor: 'ramping-vus' | 'constant-vus' | 'ramping-arrival-rate' | 'constant-arrival-rate';
  stages?: K6Stage[];
  vus?: number;
  duration?: string;
  rate?: number;
  timeUnit?: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
}

export interface K6ScriptConfig {
  name: string;
  description: string;
  scenarios: Record<string, K6Scenario>;
  thresholds: Record<string, string[]>;
  tags: Record<string, string>;
}

export interface LoadTestDefinition {
  config: K6ScriptConfig;
  endpoints: LoadEndpoint[];
  setup?: string;
  teardown?: string;
}

export interface LoadEndpoint {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  expectedStatus?: number;
}
