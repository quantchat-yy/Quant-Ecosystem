import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingPilot, Meeting } from '../../agents/meeting-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('MeetingPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has ACT_LOW default permission', () => {
    const pilot = new MeetingPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_LOW);
  });

  it('generates prep notes for meetings', async () => {
    const pilot = new MeetingPilot();
    pilot.start();

    const meetings: Meeting[] = [
      {
        id: 'm1',
        title: 'Sprint Planning',
        startTime: Date.now(),
        attendees: ['alice', 'bob'],
        agenda: ['Backlog review', 'Sprint goals'],
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Prep', params: { action: 'prep', meetings } });

    const result = pilot.getMeetingResult();
    expect(result!.prep).toHaveLength(1);
    expect(result!.prep[0]!.prepNotes.some((n) => n.includes('Sprint Planning'))).toBe(true);
  });

  it('generates meeting notes with action items', async () => {
    const pilot = new MeetingPilot();
    pilot.start();

    const meetings: Meeting[] = [
      {
        id: 'm1',
        title: 'Standup',
        startTime: Date.now(),
        attendees: ['alice', 'bob'],
        agenda: ['Updates', 'Blockers'],
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Notes', params: { action: 'notes', meetings } });

    const result = pilot.getMeetingResult();
    expect(result!.notes).toHaveLength(1);
    expect(result!.notes[0]!.actionItems.length).toBeGreaterThan(0);
    expect(result!.followUps.length).toBeGreaterThan(0);
  });

  it('transitions to DONE', async () => {
    const pilot = new MeetingPilot();
    pilot.start();
    await pilot.run({
      id: 'task-1',
      description: 'Prep',
      params: { action: 'prep', meetings: [] },
    });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
