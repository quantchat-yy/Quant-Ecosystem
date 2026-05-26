import { describe, it, expect, beforeEach } from 'vitest';
import { HealthPilot, HealthMetric } from '../../agents/health-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('HealthPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has OBSERVE default permission', () => {
    const pilot = new HealthPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.OBSERVE);
  });

  it('tracks health metrics and detects trends', async () => {
    const pilot = new HealthPilot();
    pilot.start();

    const metrics: HealthMetric[] = [
      { type: 'steps', value: 5000, unit: 'count', timestamp: 1000 },
      { type: 'steps', value: 7000, unit: 'count', timestamp: 2000 },
      { type: 'steps', value: 9000, unit: 'count', timestamp: 3000 },
    ];

    await pilot.run({ id: 'task-1', description: 'Track', params: { metrics, reminders: [] } });

    const result = pilot.getHealthResult();
    expect(result!.metrics).toHaveLength(3);
    expect(result!.trends).toHaveLength(1);
    expect(result!.trends[0]!.metric).toBe('steps');
    expect(result!.trends[0]!.trend).toBe('up');
  });

  it('detects downward trend', async () => {
    const pilot = new HealthPilot();
    pilot.start();

    const metrics: HealthMetric[] = [
      { type: 'weight', value: 80, unit: 'kg', timestamp: 1000 },
      { type: 'weight', value: 78, unit: 'kg', timestamp: 2000 },
    ];

    await pilot.run({ id: 'task-1', description: 'Track', params: { metrics, reminders: [] } });

    const result = pilot.getHealthResult();
    expect(result!.trends[0]!.trend).toBe('down');
  });

  it('transitions to DONE', async () => {
    const pilot = new HealthPilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Track', params: { metrics: [], reminders: [] } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
