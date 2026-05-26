import { describe, it, expect, beforeEach } from 'vitest';
import { LearningPilot, LearningResource } from '../../agents/learning-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('LearningPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has SUGGEST default permission', () => {
    const pilot = new LearningPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.SUGGEST);
  });

  it('recommends resources based on level', async () => {
    const pilot = new LearningPilot();
    pilot.start();

    const resources: LearningResource[] = [
      {
        id: '1',
        title: 'Intro to Python',
        type: 'course',
        topic: 'python',
        difficulty: 'beginner',
        estimatedHours: 10,
        completed: false,
      },
      {
        id: '2',
        title: 'Advanced Python',
        type: 'course',
        topic: 'python',
        difficulty: 'advanced',
        estimatedHours: 20,
        completed: false,
      },
      {
        id: '3',
        title: 'Intermediate Python',
        type: 'article',
        topic: 'python',
        difficulty: 'intermediate',
        estimatedHours: 5,
        completed: true,
      },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Recommend',
      params: { goal: 'Learn Python', resources, level: 'beginner' },
    });

    const result = pilot.getLearningResult();
    expect(result!.recommendations.length).toBeGreaterThan(0);
    expect(result!.recommendations[0]!.difficulty).toBe('beginner');
  });

  it('identifies next step in learning path', async () => {
    const pilot = new LearningPilot();
    pilot.start();

    const resources: LearningResource[] = [
      {
        id: '1',
        title: 'Done',
        type: 'course',
        topic: 'js',
        difficulty: 'beginner',
        estimatedHours: 5,
        completed: true,
      },
      {
        id: '2',
        title: 'Next',
        type: 'course',
        topic: 'js',
        difficulty: 'intermediate',
        estimatedHours: 10,
        completed: false,
      },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Recommend',
      params: { goal: 'Learn JS', resources, level: 'intermediate' },
    });

    const result = pilot.getLearningResult();
    expect(result!.nextStep!.title).toBe('Next');
  });

  it('calculates progress', async () => {
    const pilot = new LearningPilot();
    pilot.start();

    const resources: LearningResource[] = [
      {
        id: '1',
        title: 'A',
        type: 'course',
        topic: 'ts',
        difficulty: 'beginner',
        estimatedHours: 10,
        completed: true,
      },
      {
        id: '2',
        title: 'B',
        type: 'course',
        topic: 'ts',
        difficulty: 'beginner',
        estimatedHours: 10,
        completed: false,
      },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Recommend',
      params: { goal: 'TS', resources, level: 'beginner' },
    });

    const result = pilot.getLearningResult();
    expect(result!.path!.progress).toBe(50);
  });

  it('transitions to DONE', async () => {
    const pilot = new LearningPilot();
    pilot.start();
    await pilot.run({
      id: 'task-1',
      description: 'Recommend',
      params: { goal: 'test', resources: [] },
    });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
