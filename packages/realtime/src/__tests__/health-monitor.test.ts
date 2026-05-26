// ============================================================================
// Connection Health Monitor - Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionHealthMonitor } from '../health-monitor';
import type { HealthState } from '../health-monitor';

describe('ConnectionHealthMonitor', () => {
  let monitor: ConnectionHealthMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      maxSamples: 50,
      degradedThresholdMs: 200,
      poorThresholdMs: 500,
      maxReconnections: 5,
    });
  });

  afterEach(() => {
    monitor.reset();
    vi.useRealTimers();
  });

  describe('startMonitoring', () => {
    it('should start in healthy state', () => {
      monitor.startMonitoring();
      const health = monitor.getHealth();
      expect(health.state).toBe('healthy');
    });

    it('should track uptime after starting', () => {
      monitor.startMonitoring();
      vi.advanceTimersByTime(5000);
      const health = monitor.getHealth();
      expect(health.uptime).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('stopMonitoring', () => {
    it('should transition to disconnected state', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();
      expect(monitor.getHealth().state).toBe('disconnected');
    });
  });

  describe('recordLatency', () => {
    it('should track latency measurements', () => {
      monitor.startMonitoring();
      monitor.recordLatency(50);
      monitor.recordLatency(100);
      monitor.recordLatency(75);

      const metrics = monitor.getMetrics();
      expect(metrics.averageLatencyMs).toBe(75);
      expect(metrics.minLatencyMs).toBe(50);
      expect(metrics.maxLatencyMs).toBe(100);
      expect(metrics.sampleCount).toBe(3);
    });

    it('should ignore negative latency values', () => {
      monitor.startMonitoring();
      monitor.recordLatency(-10);
      expect(monitor.getMetrics().sampleCount).toBe(0);
    });

    it('should cap samples at maxSamples', () => {
      monitor.startMonitoring();
      for (let i = 0; i < 60; i++) {
        monitor.recordLatency(i * 10);
      }
      expect(monitor.getMetrics().sampleCount).toBe(50);
    });
  });

  describe('getMetrics', () => {
    it('should calculate p95 latency', () => {
      monitor.startMonitoring();
      for (let i = 1; i <= 100; i++) {
        monitor.recordLatency(i);
      }
      const metrics = monitor.getMetrics();
      expect(metrics.p95LatencyMs).toBeGreaterThanOrEqual(45);
    });

    it('should return zero metrics when no data', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.averageLatencyMs).toBe(0);
      expect(metrics.minLatencyMs).toBe(0);
      expect(metrics.maxLatencyMs).toBe(0);
      expect(metrics.p95LatencyMs).toBe(0);
    });

    it('should estimate packet loss', () => {
      monitor.startMonitoring();
      monitor.recordPingSent();
      monitor.recordPingSent();
      monitor.recordPingSent();
      monitor.recordPingSent();
      // Only record 3 pong responses (latency)
      monitor.recordLatency(50);
      monitor.recordLatency(50);
      monitor.recordLatency(50);

      const metrics = monitor.getMetrics();
      expect(metrics.packetLossEstimate).toBeCloseTo(0.25, 1);
    });

    it('should calculate connection quality score', () => {
      monitor.startMonitoring();
      // Good latency
      monitor.recordLatency(30);
      monitor.recordLatency(40);
      monitor.recordLatency(35);

      const metrics = monitor.getMetrics();
      expect(metrics.connectionQualityScore).toBeGreaterThan(50);
    });
  });

  describe('health state transitions', () => {
    it('should transition to degraded when latency exceeds threshold', () => {
      const listener = vi.fn();
      monitor.onHealthChange(listener);
      monitor.startMonitoring();

      // Record high latency
      monitor.recordLatency(250);
      monitor.recordLatency(300);
      monitor.recordLatency(280);

      // Trigger evaluation
      vi.advanceTimersByTime(1000);

      expect(listener).toHaveBeenCalledWith(
        'degraded',
        'healthy',
        expect.objectContaining({ state: 'degraded' }),
      );
    });

    it('should transition to poor when latency is very high', () => {
      const listener = vi.fn();
      monitor.onHealthChange(listener);
      monitor.startMonitoring();

      monitor.recordLatency(600);
      monitor.recordLatency(700);
      monitor.recordLatency(800);

      vi.advanceTimersByTime(1000);

      expect(listener).toHaveBeenCalledWith(
        'poor',
        'healthy',
        expect.objectContaining({ state: 'poor' }),
      );
    });

    it('should recover to healthy when latency drops', () => {
      const listener = vi.fn();
      monitor.onHealthChange(listener);
      monitor.startMonitoring();

      // First go to degraded
      monitor.recordLatency(300);
      monitor.recordLatency(300);
      vi.advanceTimersByTime(1000);

      // Now add many low-latency samples to bring average down
      for (let i = 0; i < 50; i++) {
        monitor.recordLatency(30);
      }
      vi.advanceTimersByTime(1000);

      const calls = listener.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('healthy');
    });
  });

  describe('onHealthChange', () => {
    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = monitor.onHealthChange(listener);
      monitor.startMonitoring();

      monitor.recordLatency(600);
      vi.advanceTimersByTime(1000);
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();

      // Record more samples and advance again
      for (let i = 0; i < 50; i++) {
        monitor.recordLatency(30);
      }
      vi.advanceTimersByTime(1000);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getReconnectionStrategy', () => {
    it('should recommend reconnection when under max attempts', () => {
      monitor.startMonitoring();
      const strategy = monitor.getReconnectionStrategy();
      expect(strategy.shouldReconnect).toBe(true);
      expect(strategy.attempt).toBe(0);
      expect(strategy.maxAttempts).toBe(5);
    });

    it('should increase delay with each reconnection', () => {
      monitor.startMonitoring();
      const strategy1 = monitor.getReconnectionStrategy();

      monitor.recordReconnection();
      monitor.recordReconnection();
      const strategy2 = monitor.getReconnectionStrategy();

      // Delay should increase (exponential backoff)
      // strategy2 delay should be larger on average, though jitter adds randomness
      expect(strategy2.attempt).toBe(2);
      expect(strategy2.delayMs).toBeGreaterThan(strategy1.delayMs * 1.2);
    });

    it('should stop recommending reconnection at max attempts', () => {
      monitor.startMonitoring();
      for (let i = 0; i < 5; i++) {
        monitor.recordReconnection();
      }
      const strategy = monitor.getReconnectionStrategy();
      expect(strategy.shouldReconnect).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all metrics and state', () => {
      monitor.startMonitoring();
      monitor.recordLatency(100);
      monitor.recordLatency(200);
      monitor.recordReconnection();

      monitor.reset();

      const health = monitor.getHealth();
      expect(health.state).toBe('disconnected');
      expect(health.latency).toBe(0);
      expect(health.reconnections).toBe(0);
      expect(monitor.getMetrics().sampleCount).toBe(0);
    });
  });
});
