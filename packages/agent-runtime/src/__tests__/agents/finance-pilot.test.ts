import { describe, it, expect, beforeEach } from 'vitest';
import { FinancePilot, Expense } from '../../agents/finance-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('FinancePilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has OBSERVE default permission', () => {
    const pilot = new FinancePilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.OBSERVE);
  });

  it('analyzes expense categories', async () => {
    const pilot = new FinancePilot();
    pilot.start();

    const expenses: Expense[] = [
      {
        id: '1',
        amount: 50,
        category: 'food',
        description: 'Lunch',
        date: Date.now(),
        recurring: false,
      },
      {
        id: '2',
        amount: 100,
        category: 'food',
        description: 'Dinner',
        date: Date.now(),
        recurring: false,
      },
      {
        id: '3',
        amount: 30,
        category: 'transport',
        description: 'Uber',
        date: Date.now(),
        recurring: false,
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Analyze', params: { expenses } });

    const insight = pilot.getInsight();
    expect(insight!.totalSpending).toBe(180);
    expect(insight!.topCategory).toBe('food');
    expect(insight!.categoryBreakdown['food']).toBe(150);
  });

  it('calculates recurring totals', async () => {
    const pilot = new FinancePilot();
    pilot.start();

    const expenses: Expense[] = [
      {
        id: '1',
        amount: 10,
        category: 'subscriptions',
        description: 'Netflix',
        date: Date.now(),
        recurring: true,
      },
      {
        id: '2',
        amount: 15,
        category: 'subscriptions',
        description: 'Spotify',
        date: Date.now(),
        recurring: true,
      },
      {
        id: '3',
        amount: 50,
        category: 'food',
        description: 'Dinner',
        date: Date.now(),
        recurring: false,
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Analyze', params: { expenses } });

    const insight = pilot.getInsight();
    expect(insight!.recurringTotal).toBe(25);
  });

  it('transitions to DONE', async () => {
    const pilot = new FinancePilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Analyze', params: { expenses: [] } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
