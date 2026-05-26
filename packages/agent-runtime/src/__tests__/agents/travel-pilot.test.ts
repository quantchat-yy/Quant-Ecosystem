import { describe, it, expect, beforeEach } from 'vitest';
import { TravelPilot } from '../../agents/travel-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('TravelPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has ACT_HIGH default permission', () => {
    const pilot = new TravelPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_HIGH);
  });

  it('plans a trip within budget', async () => {
    const pilot = new TravelPilot();
    pilot.start();

    await pilot.run({
      id: 'task-1',
      description: 'Plan trip',
      params: {
        destination: 'Paris',
        budget: 5000,
        startDate: Date.now(),
        endDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      },
    });

    const result = pilot.getTravelResult();
    expect(result!.plan!.destination).toBe('Paris');
    expect(result!.totalEstimatedCost).toBeGreaterThan(0);
    expect(result!.withinBudget).toBe(true);
  });

  it('detects over-budget trips', async () => {
    const pilot = new TravelPilot();
    pilot.start();

    await pilot.run({
      id: 'task-1',
      description: 'Plan trip',
      params: {
        destination: 'Tokyo',
        budget: 100,
        startDate: Date.now(),
        endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });

    const result = pilot.getTravelResult();
    expect(result!.withinBudget).toBe(false);
    expect(result!.suggestions.some((s) => s.includes('budget'))).toBe(true);
  });

  it('transitions to DONE', async () => {
    const pilot = new TravelPilot();
    pilot.start();
    await pilot.run({
      id: 'task-1',
      description: 'Plan',
      params: { destination: 'London', budget: 2000 },
    });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
