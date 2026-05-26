import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { CRDTState } from '../crdt-state.js';

const TestStateSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
});

type TestState = z.infer<typeof TestStateSchema>;

describe('CRDTState', () => {
  it('should get and set values', () => {
    const state = new CRDTState<TestState>(TestStateSchema);
    state.set('name', 'Alice');
    state.set('age', 30);
    state.set('active', true);

    expect(state.get('name')).toBe('Alice');
    expect(state.get('age')).toBe(30);
    expect(state.get('active')).toBe(true);
  });

  it('should fire subscribe callback on change', () => {
    const state = new CRDTState<TestState>(TestStateSchema);
    state.set('name', 'Bob');
    state.set('age', 25);
    state.set('active', true);

    const callback = vi.fn();
    const unsub = state.subscribe('name', callback);

    state.set('name', 'Charlie');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('name', 'Charlie');

    unsub();
    state.set('name', 'Dave');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should snapshot roundtrip', () => {
    const state1 = new CRDTState<TestState>(TestStateSchema);
    state1.set('name', 'Test');
    state1.set('age', 42);
    state1.set('active', false);

    const encoded = state1.encodeState();

    const state2 = new CRDTState<TestState>(TestStateSchema);
    state2.applyUpdate(encoded);

    expect(state2.get('name')).toBe('Test');
    expect(state2.get('age')).toBe(42);
    expect(state2.get('active')).toBe(false);
  });

  it('should merge two states without conflict', () => {
    const state1 = new CRDTState<TestState>(TestStateSchema);
    state1.set('name', 'User1');
    state1.set('age', 20);
    state1.set('active', true);

    const state2 = new CRDTState<TestState>(TestStateSchema);
    state2.set('name', 'User2');
    state2.set('age', 30);
    state2.set('active', false);

    const update1 = state1.encodeState();
    const update2 = state2.encodeState();

    state1.applyUpdate(update2);
    state2.applyUpdate(update1);

    // Both should converge to same state
    expect(state1.getSnapshot()).toEqual(state2.getSnapshot());
  });

  it('should reject invalid values via Zod schema', () => {
    const state = new CRDTState<TestState>(TestStateSchema);
    state.set('name', 'Valid');
    state.set('age', 25);
    state.set('active', true);

    // Setting invalid type should throw
    expect(() => state.set('age', 'not a number' as unknown as number)).toThrow();
  });

  it('should apply partial snapshot', () => {
    const state = new CRDTState<TestState>(TestStateSchema);
    state.set('name', 'Initial');
    state.set('age', 10);
    state.set('active', true);

    state.applySnapshot({ name: 'Updated', age: 99 });
    expect(state.get('name')).toBe('Updated');
    expect(state.get('age')).toBe(99);
    expect(state.get('active')).toBe(true);
  });
});
