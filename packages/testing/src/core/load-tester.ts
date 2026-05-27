// ============================================================================
// Quant Ecosystem - Testing Framework: Load Tester
// Virtual user simulation, ramp-up patterns, real percentile calculation
// ============================================================================

import type {
  LoadTestConfig,
  LoadTestResult,
  LatencyStats,
  LatencyBucket,
  LoadScenario,
  LoadStep,
} from '../types';

interface VirtualUser {
  id: number;
  startedAt: number;
  requests: number;
  errors: number;
  latencies: number[];
  active: boolean;
}

interface RequestResult {
  userId: number;
  latency: number;
  success: boolean;
  statusCode: number;
  timestamp: number;
  step: string;
}

/**
 * LoadTester - Simulates concurrent user load with real metrics
 */
export class LoadTester {
  private config: LoadTestConfig;
  private users: VirtualUser[] = [];
  private results: RequestResult[] = [];
  private running: boolean = false;
  private startTime: number = 0;
  private requestHandler:
    | ((step: LoadStep) => Promise<{ latency: number; status: number }>)
    | null = null;

  constructor(config: Partial<LoadTestConfig> = {}) {
    this.config = {
      targetUrl: config.targetUrl ?? 'http://localhost:3000',
      virtualUsers: config.virtualUsers ?? 10,
      duration: config.duration ?? 30000,
      rampUp: config.rampUp ?? { pattern: 'linear', duration: 5000 },
      thinkTime: config.thinkTime ?? 1000,
      requestsPerSecond: config.requestsPerSecond ?? 100,
      timeout: config.timeout ?? 5000,
      scenarios: config.scenarios ?? [
        { name: 'default', weight: 1, steps: [{ method: 'GET', path: '/' }] },
      ],
    };
  }

  /**
   * Sets a custom request handler for simulation
   */
  setRequestHandler(
    handler: (step: LoadStep) => Promise<{ latency: number; status: number }>,
  ): void {
    this.requestHandler = handler;
  }

  /**
   * Runs the load test and returns results
   */
  async run(): Promise<LoadTestResult> {
    this.results = [];
    this.users = [];
    this.running = true;
    this.startTime = Date.now();

    // Create virtual users based on ramp-up pattern
    const userSchedule = this.calculateRampUp();

    // Simulate load
    const endTime = this.startTime + this.config.duration;
    let currentUsers = 0;
    let scheduleIndex = 0;

    while (this.running && Date.now() < endTime) {
      // Ramp up users according to schedule
      while (
        scheduleIndex < userSchedule.length &&
        userSchedule[scheduleIndex]!.time <= Date.now() - this.startTime
      ) {
        const usersToAdd = userSchedule[scheduleIndex]!.users - currentUsers;
        for (let i = 0; i < usersToAdd; i++) {
          this.users.push(this.createUser(currentUsers + i));
        }
        currentUsers = userSchedule[scheduleIndex]!.users;
        scheduleIndex++;
      }

      // Execute requests for active users
      const activeUsers = this.users.filter((u) => u.active);
      const batchSize = Math.min(activeUsers.length, Math.ceil(this.config.requestsPerSecond / 10));

      const batch = activeUsers.slice(0, batchSize);
      await Promise.all(batch.map((user) => this.executeUserRequest(user)));

      // Think time between batches
      await this.sleep(Math.max(10, this.config.thinkTime / 10));
    }

    this.running = false;
    return this.calculateResults();
  }

  /**
   * Stops the running test
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Calculates ramp-up schedule based on pattern
   */
  private calculateRampUp(): { time: number; users: number }[] {
    const schedule: { time: number; users: number }[] = [];
    const { pattern, duration, steps } = this.config.rampUp;
    const totalUsers = this.config.virtualUsers;

    switch (pattern) {
      case 'linear': {
        const interval = duration / 10;
        for (let i = 0; i <= 10; i++) {
          schedule.push({
            time: i * interval,
            users: Math.ceil((totalUsers / 10) * i),
          });
        }
        break;
      }
      case 'step': {
        const numSteps = steps ?? 5;
        const stepDuration = duration / numSteps;
        const usersPerStep = Math.ceil(totalUsers / numSteps);
        for (let i = 0; i < numSteps; i++) {
          schedule.push({
            time: i * stepDuration,
            users: Math.min((i + 1) * usersPerStep, totalUsers),
          });
        }
        break;
      }
      case 'spike': {
        // Stay low for 80% of ramp-up, then spike
        schedule.push({ time: 0, users: Math.ceil(totalUsers * 0.1) });
        schedule.push({ time: duration * 0.8, users: Math.ceil(totalUsers * 0.1) });
        schedule.push({ time: duration * 0.85, users: totalUsers });
        break;
      }
    }

    return schedule;
  }

  /**
   * Creates a virtual user
   */
  private createUser(id: number): VirtualUser {
    return {
      id,
      startedAt: Date.now(),
      requests: 0,
      errors: 0,
      latencies: [],
      active: true,
    };
  }

  /**
   * Executes a single request for a user
   */
  private async executeUserRequest(user: VirtualUser): Promise<void> {
    const scenario = this.selectScenario();
    const step = scenario.steps[user.requests % scenario.steps.length]!;

    let latency: number;
    let statusCode: number;

    if (this.requestHandler) {
      try {
        const result = await this.requestHandler(step);
        latency = result.latency;
        statusCode = result.status;
      } catch (err) {
        latency = this.config.timeout;
        statusCode = 0;
      }
    } else {
      // Simulate realistic latency distribution (log-normal)
      latency = this.simulateLatency();
      statusCode = this.simulateStatusCode();
    }

    const success = statusCode >= 200 && statusCode < 400;
    user.requests++;
    user.latencies.push(latency);
    if (!success) user.errors++;

    this.results.push({
      userId: user.id,
      latency,
      success,
      statusCode,
      timestamp: Date.now(),
      step: `${step.method} ${step.path}`,
    });
  }

  /**
   * Selects a scenario based on weight
   */
  private selectScenario(): LoadScenario {
    const totalWeight = this.config.scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of this.config.scenarios) {
      random -= scenario.weight;
      if (random <= 0) return scenario;
    }

    return this.config.scenarios[0]!;
  }

  /**
   * Simulates realistic latency using log-normal distribution
   */
  private simulateLatency(): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Log-normal: median ~50ms, with tail
    const median = 50;
    const sigma = 0.5;
    const latency = median * Math.exp(sigma * normal);

    return Math.max(1, Math.round(latency));
  }

  /**
   * Simulates HTTP status codes (mostly success, some errors)
   */
  private simulateStatusCode(): number {
    const rand = Math.random();
    if (rand < 0.95) return 200;
    if (rand < 0.97) return 404;
    if (rand < 0.99) return 500;
    return 503;
  }

  /**
   * Calculates final test results with real percentiles
   */
  private calculateResults(): LoadTestResult {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const duration = Date.now() - this.startTime;
    const throughput = totalRequests / (duration / 1000);
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    const latencies = this.results.map((r) => r.latency);
    const latencyStats = this.calculateLatencyStats(latencies);
    const saturationPoint = this.detectSaturation();

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      duration,
      throughput,
      latency: latencyStats,
      errorRate,
      saturationPoint,
    };
  }

  /**
   * Calculates latency statistics with real percentile computation
   * Uses sorted array method for accurate percentile calculation
   */
  private calculateLatencyStats(latencies: number[]): LatencyStats {
    if (latencies.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        buckets: [],
      };
    }

    // Sort for percentile calculation
    const sorted = [...latencies].sort((a, b) => a - b);
    const n = sorted.length;

    const min = sorted[0]!;
    const max = sorted[n - 1]!;
    const mean = latencies.reduce((sum, l) => sum + l, 0) / n;

    // Percentile calculation using nearest-rank method
    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * n) - 1;
      return sorted[Math.max(0, Math.min(index, n - 1))]!;
    };

    const median = percentile(50);
    const p75 = percentile(75);
    const p90 = percentile(90);
    const p95 = percentile(95);
    const p99 = percentile(99);

    // Generate histogram buckets
    const buckets = this.generateBuckets(sorted);

    return { min, max, mean, median, p75, p90, p95, p99, buckets };
  }

  /**
   * Generates histogram buckets for latency distribution
   */
  private generateBuckets(sorted: number[]): LatencyBucket[] {
    if (sorted.length === 0) return [];

    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    const bucketCount = Math.min(10, Math.ceil(Math.sqrt(sorted.length)));
    const bucketSize = Math.max(1, Math.ceil((max - min + 1) / bucketCount));
    const buckets: LatencyBucket[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const rangeStart = min + i * bucketSize;
      const rangeEnd = rangeStart + bucketSize - 1;
      const count = sorted.filter((v) => v >= rangeStart && v <= rangeEnd).length;
      buckets.push({
        rangeStart,
        rangeEnd,
        count,
        percentage: (count / sorted.length) * 100,
      });
    }

    return buckets;
  }

  /**
   * Detects saturation point where latency starts degrading
   * Returns the request rate at which p95 latency exceeds 2x the initial p95
   */
  private detectSaturation(): number | null {
    if (this.results.length < 20) return null;

    // Split results into time windows
    const windowSize = Math.max(1000, this.config.duration / 10);
    const windows: RequestResult[][] = [];
    let windowStart = this.startTime;

    while (windowStart < this.startTime + this.config.duration) {
      const windowEnd = windowStart + windowSize;
      const windowResults = this.results.filter(
        (r) => r.timestamp >= windowStart && r.timestamp < windowEnd,
      );
      if (windowResults.length > 0) {
        windows.push(windowResults);
      }
      windowStart = windowEnd;
    }

    if (windows.length < 3) return null;

    // Calculate p95 for first window as baseline
    const firstWindowLatencies = windows[0]!.map((r) => r.latency).sort((a, b) => a - b);
    const baselineP95 =
      firstWindowLatencies[Math.ceil(firstWindowLatencies.length * 0.95) - 1] ?? 0;

    // Find first window where p95 exceeds 2x baseline
    for (let i = 1; i < windows.length; i++) {
      const latencies = windows[i]!.map((r) => r.latency).sort((a, b) => a - b);
      const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1] ?? 0;

      if (p95 > baselineP95 * 2) {
        // Return the request rate at this point
        return windows[i]!.length / (windowSize / 1000);
      }
    }

    return null; // No saturation detected
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
