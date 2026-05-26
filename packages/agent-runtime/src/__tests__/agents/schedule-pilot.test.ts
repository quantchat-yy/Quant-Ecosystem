import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulePilot, CalendarEvent } from '../../agents/schedule-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('SchedulePilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has correct default configuration', () => {
    const pilot = new SchedulePilot();
    expect(pilot.name).toBe('Schedule Pilot');
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_LOW);
  });

  it('adds non-conflicting events', async () => {
    const pilot = new SchedulePilot();
    pilot.start();

    const events: CalendarEvent[] = [
      { id: 'e1', title: 'Standup', start: 1000, end: 2000, attendees: ['alice'] },
      { id: 'e2', title: 'Lunch', start: 3000, end: 4000, attendees: ['bob'] },
    ];

    await pilot.run({ id: 'task-1', description: 'Add events', params: { action: 'add', events } });

    const result = pilot.getScheduleResult();
    expect(result!.created).toHaveLength(2);
    expect(result!.conflicts).toHaveLength(0);
  });

  it('detects conflicting events', async () => {
    const pilot = new SchedulePilot();
    pilot.start();

    const events: CalendarEvent[] = [
      { id: 'e1', title: 'Meeting A', start: 1000, end: 3000, attendees: ['alice'] },
      { id: 'e2', title: 'Meeting B', start: 2000, end: 4000, attendees: ['bob'] },
    ];

    await pilot.run({ id: 'task-1', description: 'Add events', params: { action: 'add', events } });

    const result = pilot.getScheduleResult();
    // First event added, second conflicts
    expect(result!.created).toHaveLength(1);
    expect(result!.conflicts).toHaveLength(1);
  });

  it('transitions to DONE on success', async () => {
    const pilot = new SchedulePilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Organize', params: { action: 'organize' } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
