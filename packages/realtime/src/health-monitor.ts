// ============================================================================
// Connection Health Monitor - Real-time connection quality tracking
// ============================================================================

/** Health monitor configuration */
export interface HealthMonitorConfig {
  /** Interval between health checks in ms */
  checkIntervalMs: number;
  /** Number of latency samples to retain */
  maxSamples: number;
  /** Threshold for degraded connection quality (ms) */
  degradedThresholdMs: number;
  /** Threshold for poor connection quality (ms) */
  poorThresholdMs: number;
  /** Max reconnection attempts before giving up */
  maxReconnections: number;
}

/** Connection health state */
export type HealthState = 'healthy' | 'degraded' | 'poor' | 'disconnected';

/** Connection health metrics */
export interface HealthMetrics {
  state: HealthState;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  packetLossEstimate: number;
  uptimeMs: number;
  reconnectionCount: number;
  connectionQualityScore: number;
  lastCheckAt: number;
  sampleCount: number;
}

/** Reconnection strategy recommendation */
export interface ReconnectionStrategy {
  shouldReconnect: boolean;
  delayMs: number;
  attempt: number;
  maxAttempts: number;
  backoffMultiplier: number;
}

/** Health change callback */
export type HealthChangeCallback = (
  newState: HealthState,
  previousState: HealthState,
  metrics: HealthMetrics,
) => void;

const DEFAULT_CONFIG: HealthMonitorConfig = {
  checkIntervalMs: 5000,
  maxSamples: 100,
  degradedThresholdMs: 200,
  poorThresholdMs: 500,
  maxReconnections: 10,
};

/**
 * ConnectionHealthMonitor - Tracks connection quality and recommends actions
 *
 * Records latency measurements, calculates connection quality scores,
 * detects degradation, and provides reconnection strategy recommendations
 * with exponential backoff.
 */
export class ConnectionHealthMonitor {
  private config: HealthMonitorConfig;
  private latencySamples: number[] = [];
  private state: HealthState = 'disconnected';
  private reconnectionCount = 0;
  private startedAt: number | null = null;
  private lastCheckAt = 0;
  private listeners: HealthChangeCallback[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private expectedPings = 0;
  private receivedPongs = 0;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start health monitoring
   */
  startMonitoring(config?: Partial<HealthMonitorConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startedAt = Date.now();
    this.state = 'healthy';
    this.lastCheckAt = Date.now();

    // Start periodic health evaluations
    this.checkInterval = setInterval(() => {
      this.evaluate();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.updateState('disconnected');
  }

  /**
   * Get current health status
   */
  getHealth(): { state: HealthState; latency: number; uptime: number; reconnections: number } {
    return {
      state: this.state,
      latency: this.getAverageLatency(),
      uptime: this.getUptime(),
      reconnections: this.reconnectionCount,
    };
  }

  /**
   * Register a listener for health state changes
   */
  onHealthChange(callback: HealthChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get detailed health metrics
   */
  getMetrics(): HealthMetrics {
    const samples = this.latencySamples;
    const sorted = [...samples].sort((a, b) => a - b);

    return {
      state: this.state,
      averageLatencyMs: this.getAverageLatency(),
      minLatencyMs: sorted.length > 0 ? sorted[0] : 0,
      maxLatencyMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      p95LatencyMs: this.getPercentile(sorted, 95),
      packetLossEstimate: this.getPacketLossEstimate(),
      uptimeMs: this.getUptime(),
      reconnectionCount: this.reconnectionCount,
      connectionQualityScore: this.calculateQualityScore(),
      lastCheckAt: this.lastCheckAt,
      sampleCount: samples.length,
    };
  }

  /**
   * Get recommended reconnection strategy based on current conditions
   */
  getReconnectionStrategy(): ReconnectionStrategy {
    const attempt = this.reconnectionCount;
    const maxAttempts = this.config.maxReconnections;
    const backoffMultiplier = 1.5;

    // Exponential backoff with jitter
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delayMs = Math.min(exponentialDelay + jitter, 30000);

    return {
      shouldReconnect: attempt < maxAttempts,
      delayMs: Math.round(delayMs),
      attempt,
      maxAttempts,
      backoffMultiplier,
    };
  }

  /**
   * Record a latency measurement
   */
  recordLatency(latencyMs: number): void {
    if (latencyMs < 0) return;

    this.latencySamples.push(latencyMs);
    this.receivedPongs++;

    // Keep only the most recent samples
    if (this.latencySamples.length > this.config.maxSamples) {
      this.latencySamples.shift();
    }

    this.lastCheckAt = Date.now();
  }

  /**
   * Record an expected ping (for packet loss estimation)
   */
  recordPingSent(): void {
    this.expectedPings++;
  }

  /**
   * Record a reconnection event
   */
  recordReconnection(): void {
    this.reconnectionCount++;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencySamples = [];
    this.state = 'disconnected';
    this.reconnectionCount = 0;
    this.startedAt = null;
    this.lastCheckAt = 0;
    this.expectedPings = 0;
    this.receivedPongs = 0;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // ---- Private Methods ----

  private evaluate(): void {
    const avgLatency = this.getAverageLatency();
    let newState: HealthState;

    if (this.latencySamples.length === 0) {
      newState = this.startedAt ? 'degraded' : 'disconnected';
    } else if (avgLatency >= this.config.poorThresholdMs) {
      newState = 'poor';
    } else if (avgLatency >= this.config.degradedThresholdMs) {
      newState = 'degraded';
    } else {
      newState = 'healthy';
    }

    this.lastCheckAt = Date.now();
    this.updateState(newState);
  }

  private updateState(newState: HealthState): void {
    if (newState === this.state) return;

    const previousState = this.state;
    this.state = newState;

    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(newState, previousState, metrics);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private getAverageLatency(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  private getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getPacketLossEstimate(): number {
    if (this.expectedPings === 0) return 0;
    const loss = 1 - this.receivedPongs / this.expectedPings;
    return Math.max(0, Math.min(1, loss));
  }

  private getUptime(): number {
    if (!this.startedAt) return 0;
    return Date.now() - this.startedAt;
  }

  private calculateQualityScore(): number {
    // Score from 0-100 based on latency, packet loss, and reconnections
    const avgLatency = this.getAverageLatency();
    const packetLoss = this.getPacketLossEstimate();

    // Latency component (0-50 points): 0ms = 50pts, 500ms+ = 0pts
    const latencyScore = Math.max(0, 50 - (avgLatency / this.config.poorThresholdMs) * 50);

    // Packet loss component (0-30 points): 0% = 30pts, 10%+ = 0pts
    const lossScore = Math.max(0, 30 - packetLoss * 300);

    // Stability component (0-20 points): 0 reconnections = 20pts
    const stabilityScore = Math.max(
      0,
      20 - (this.reconnectionCount / this.config.maxReconnections) * 20,
    );

    return Math.round(latencyScore + lossScore + stabilityScore);
  }
}
