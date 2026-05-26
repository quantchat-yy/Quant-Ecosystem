import { describe, it, expect, beforeEach } from 'vitest';
import { CodePilot, CodeChange } from '../../agents/code-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('CodePilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has correct default configuration', () => {
    const pilot = new CodePilot();
    expect(pilot.name).toBe('Code Pilot');
    expect(pilot.defaultPermission).toBe(PermissionLevel.SUGGEST);
  });

  it('detects console.log issues', async () => {
    const pilot = new CodePilot();
    pilot.start();

    const changes: CodeChange[] = [
      {
        file: 'src/app.ts',
        additions: 5,
        deletions: 0,
        content: 'console.log("debug");\nconst x = 1;',
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Review', params: { changes } });

    const review = pilot.getLastReview();
    expect(review).not.toBeNull();
    expect(review!.issues.some((i) => i.message.includes('console.log'))).toBe(true);
  });

  it('suggests tests for large additions', async () => {
    const pilot = new CodePilot();
    pilot.start();

    const changes: CodeChange[] = [
      { file: 'src/big-feature.ts', additions: 100, deletions: 0, content: 'const x = 1;' },
    ];

    await pilot.run({ id: 'task-1', description: 'Review', params: { changes } });

    const review = pilot.getLastReview();
    expect(review!.suggestions.some((s) => s.reason.includes('test coverage'))).toBe(true);
  });

  it('gives high score for clean code', async () => {
    const pilot = new CodePilot();
    pilot.start();

    const changes: CodeChange[] = [
      {
        file: 'src/clean.ts',
        additions: 10,
        deletions: 0,
        content: 'const x: number = 1;\nconst y = x + 2;',
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Review', params: { changes } });

    const review = pilot.getLastReview();
    expect(review!.score).toBe(100);
  });

  it('transitions to DONE on success', async () => {
    const pilot = new CodePilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Review', params: { changes: [] } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
