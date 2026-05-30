import { describe, it, expect } from 'vitest';
import { IPReputationService } from '../ip-reputation.js';
import type { IPReputationRule } from '../types.js';

const rules: IPReputationRule[] = [
  {
    name: 'private-network',
    pattern: '^10\\.',
    scoreImpact: 10,
    description: 'Private network IP',
  },
  {
    name: 'localhost',
    pattern: '^127\\.',
    scoreImpact: 5,
    description: 'Localhost address',
  },
  {
    name: 'suspicious-range',
    pattern: '^192\\.168\\.1\\.',
    scoreImpact: 30,
    description: 'Suspicious subnet',
  },
];

describe('IPReputationService', () => {
  it('should score an IP based on matching rules', () => {
    const service = new IPReputationService(rules);
    const result = service.score('10.0.0.1');

    expect(result.ip).toBe('10.0.0.1');
    expect(result.score).toBe(10);
    expect(result.reasons).toContain('Private network IP');
  });

  it('should return score 0 for non-matching IPs', () => {
    const service = new IPReputationService(rules);
    const result = service.score('8.8.8.8');

    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it('should block and unblock IPs', () => {
    const service = new IPReputationService(rules);

    service.block('1.2.3.4', 'brute force', 60000);
    expect(service.isBlocked('1.2.3.4')).toBe(true);

    service.unblock('1.2.3.4');
    expect(service.isBlocked('1.2.3.4')).toBe(false);
  });

  it('should return max score for blocked IPs', () => {
    const service = new IPReputationService(rules);
    service.block('5.5.5.5', 'abuse', 60000);

    const result = service.score('5.5.5.5');
    expect(result.score).toBe(100);
    expect(result.blockedUntil).toBeDefined();
  });

  it('should list all blocked IPs', () => {
    const service = new IPReputationService(rules);

    service.block('1.1.1.1', 'reason1', 60000);
    service.block('2.2.2.2', 'reason2', 60000);
    service.block('3.3.3.3', 'reason3', 60000);

    const blocked = service.getBlockedIPs();
    expect(blocked.length).toBe(3);
    expect(blocked).toContain('1.1.1.1');
    expect(blocked).toContain('2.2.2.2');
    expect(blocked).toContain('3.3.3.3');
  });

  it('should add new rules dynamically', () => {
    const service = new IPReputationService([]);
    expect(service.score('10.0.0.1').score).toBe(0);

    service.addRule({
      name: 'new-rule',
      pattern: '^10\\.',
      scoreImpact: 50,
      description: 'New rule',
    });

    expect(service.score('10.0.0.1').score).toBe(50);
  });

  it('should clamp scores between 0 and 100', () => {
    const highScoreRules: IPReputationRule[] = [
      { name: 'rule1', pattern: '.*', scoreImpact: 60, description: 'High 1' },
      { name: 'rule2', pattern: '.*', scoreImpact: 60, description: 'High 2' },
    ];
    const service = new IPReputationService(highScoreRules);
    const result = service.score('1.2.3.4');

    expect(result.score).toBe(100);
  });
});
