import { describe, it, expect } from 'vitest';
import { chatFanoutConfig } from '../load/chat-fanout';
import { feedRankingConfig } from '../load/feed-ranking';
import { searchConfig } from '../load/search';
import type { LoadTestDefinition } from '../load/types';

describe('Load Scripts', () => {
  it('chat fanout has ramping-vus scenario with correct stages', () => {
    const scenario = chatFanoutConfig.config.scenarios['chat-fanout'];
    expect(scenario).toBeDefined();
    expect(scenario!.executor).toBe('ramping-vus');
    expect(scenario!.stages).toHaveLength(3);
    expect(scenario!.stages![0]).toEqual({ duration: '30s', target: 50 });
    expect(scenario!.stages![1]).toEqual({ duration: '2m', target: 50 });
    expect(scenario!.stages![2]).toEqual({ duration: '10s', target: 0 });
  });

  it('chat fanout has p95 < 500ms threshold', () => {
    const thresholds = chatFanoutConfig.config.thresholds;
    expect(thresholds['http_req_duration']).toContain('p(95) < 500');
  });

  it('feed ranking uses constant-vus with 100 users', () => {
    const scenario = feedRankingConfig.config.scenarios['feed-ranking'];
    expect(scenario).toBeDefined();
    expect(scenario!.executor).toBe('constant-vus');
    expect(scenario!.vus).toBe(100);
    expect(scenario!.duration).toBe('3m');
  });

  it('feed ranking has p95 < 1000ms and p99 < 2000ms thresholds', () => {
    const thresholds = feedRankingConfig.config.thresholds;
    expect(thresholds['http_req_duration']).toContain('p(95) < 1000');
    expect(thresholds['http_req_duration']).toContain('p(99) < 2000');
  });

  it('search uses ramping-arrival-rate executor', () => {
    const scenario = searchConfig.config.scenarios['search'];
    expect(scenario).toBeDefined();
    expect(scenario!.executor).toBe('ramping-arrival-rate');
    expect(scenario!.preAllocatedVUs).toBe(50);
    expect(scenario!.maxVUs).toBe(300);
  });

  it('search has p95 < 300ms threshold', () => {
    const thresholds = searchConfig.config.thresholds;
    expect(thresholds['http_req_duration']).toContain('p(95) < 300');
  });

  it('all load configs have valid endpoint definitions', () => {
    const configs: LoadTestDefinition[] = [chatFanoutConfig, feedRankingConfig, searchConfig];

    for (const config of configs) {
      expect(config.endpoints.length).toBeGreaterThan(0);
      for (const endpoint of config.endpoints) {
        expect(endpoint.method).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
        expect(endpoint.path).toBeTruthy();
        expect(endpoint.expectedStatus).toBeGreaterThanOrEqual(200);
        expect(endpoint.expectedStatus).toBeLessThan(600);
      }
    }
  });

  it('all load configs have non-empty tags', () => {
    const configs: LoadTestDefinition[] = [chatFanoutConfig, feedRankingConfig, searchConfig];

    for (const config of configs) {
      expect(Object.keys(config.config.tags).length).toBeGreaterThan(0);
      expect(config.config.tags['testType']).toBe('load');
      expect(config.config.tags['feature']).toBeTruthy();
    }
  });
});
