import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingPilot, Product } from '../../agents/shopping-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('ShoppingPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has ACT_HIGH default permission', () => {
    const pilot = new ShoppingPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_HIGH);
  });

  it('finds best deal from products', async () => {
    const pilot = new ShoppingPilot();
    pilot.start();

    const products: Product[] = [
      {
        id: '1',
        name: 'Widget',
        price: 29.99,
        currency: 'USD',
        store: 'StoreA',
        rating: 4.5,
        inStock: true,
      },
      {
        id: '2',
        name: 'Widget',
        price: 19.99,
        currency: 'USD',
        store: 'StoreB',
        rating: 4.0,
        inStock: true,
      },
      {
        id: '3',
        name: 'Widget',
        price: 14.99,
        currency: 'USD',
        store: 'StoreC',
        rating: 3.5,
        inStock: false,
      },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Compare',
      params: { query: 'Widget', products },
    });

    const result = pilot.getShoppingResult();
    expect(result!.bestDeal!.price).toBe(19.99);
    expect(result!.products).toHaveLength(2); // only in-stock
  });

  it('computes savings for each store', async () => {
    const pilot = new ShoppingPilot();
    pilot.start();

    const products: Product[] = [
      {
        id: '1',
        name: 'Phone',
        price: 999,
        currency: 'USD',
        store: 'Apple',
        rating: 5,
        inStock: true,
      },
      {
        id: '2',
        name: 'Phone',
        price: 899,
        currency: 'USD',
        store: 'Amazon',
        rating: 4.8,
        inStock: true,
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Compare', params: { query: 'Phone', products } });

    const result = pilot.getShoppingResult();
    expect(result!.comparison).toHaveLength(2);
    const amazonDeal = result!.comparison.find((c) => c.store === 'Amazon');
    expect(amazonDeal!.savings).toBe(100);
  });

  it('transitions to DONE', async () => {
    const pilot = new ShoppingPilot();
    pilot.start();
    await pilot.run({
      id: 'task-1',
      description: 'Search',
      params: { query: 'test', products: [] },
    });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
