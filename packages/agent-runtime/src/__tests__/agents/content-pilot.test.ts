import { describe, it, expect, beforeEach } from 'vitest';
import { ContentPilot } from '../../agents/content-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('ContentPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has SUGGEST default permission', () => {
    const pilot = new ContentPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.SUGGEST);
  });

  it('creates content draft with outline', async () => {
    const pilot = new ContentPilot();
    pilot.start();

    await pilot.run({
      id: 'task-1',
      description: 'Create content',
      params: { topic: 'machine learning', format: 'article', keywords: ['AI', 'ML'] },
    });

    const result = pilot.getContentResult();
    expect(result!.drafts).toHaveLength(1);
    expect(result!.drafts[0]!.format).toBe('article');
    expect(result!.outline.length).toBeGreaterThan(0);
    expect(result!.estimatedReadTime).toBeGreaterThan(0);
  });

  it('generates social format with shorter outline', async () => {
    const pilot = new ContentPilot();
    pilot.start();

    await pilot.run({
      id: 'task-1',
      description: 'Create content',
      params: { topic: 'tech', format: 'social' },
    });

    const result = pilot.getContentResult();
    expect(result!.outline).toHaveLength(3);
  });

  it('transitions to DONE', async () => {
    const pilot = new ContentPilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Create', params: { topic: 'test' } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
