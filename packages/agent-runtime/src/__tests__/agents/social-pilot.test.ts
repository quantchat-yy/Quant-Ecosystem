import { describe, it, expect, beforeEach } from 'vitest';
import { SocialPilot, SocialPost } from '../../agents/social-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('SocialPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has SUGGEST default permission', () => {
    const pilot = new SocialPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.SUGGEST);
  });

  it('generates content suggestions for a topic', async () => {
    const pilot = new SocialPilot();
    pilot.start();

    await pilot.run({
      id: 'task-1',
      description: 'Draft',
      params: { action: 'draft', topic: 'AI trends', posts: [] },
    });

    const result = pilot.getSocialResult();
    expect(result!.suggestions.length).toBeGreaterThan(0);
    expect(result!.suggestions.some((s) => s.includes('AI trends'))).toBe(true);
  });

  it('schedules posts with optimal times', async () => {
    const pilot = new SocialPilot();
    pilot.start();

    const posts: SocialPost[] = [
      { id: 'p1', platform: 'twitter', content: 'Hello world', hashtags: ['tech'] },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Schedule',
      params: { action: 'schedule', posts },
    });

    const result = pilot.getSocialResult();
    expect(result!.scheduled).toHaveLength(1);
    expect(result!.scheduled[0]!.scheduledTime).toBeGreaterThan(0);
  });

  it('transitions to DONE', async () => {
    const pilot = new SocialPilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Draft', params: { action: 'draft', posts: [] } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
