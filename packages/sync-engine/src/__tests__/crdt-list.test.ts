import { describe, it, expect, vi } from 'vitest';
import { CRDTList } from '../crdt-list.js';

describe('CRDTList', () => {
  it('should push items and verify array', () => {
    const list = new CRDTList<string>();
    list.push('a');
    list.push('b');
    list.push('c');
    expect(list.toArray()).toEqual(['a', 'b', 'c']);
    expect(list.length).toBe(3);
  });

  it('should insert at index', () => {
    const list = new CRDTList<number>();
    list.push(1);
    list.push(3);
    list.insert(1, 2);
    expect(list.toArray()).toEqual([1, 2, 3]);
  });

  it('should delete items', () => {
    const list = new CRDTList<string>();
    list.push('a');
    list.push('b');
    list.push('c');
    list.delete(1);
    expect(list.toArray()).toEqual(['a', 'c']);
  });

  it('should delete multiple items with length parameter', () => {
    const list = new CRDTList<number>();
    list.push(1);
    list.push(2);
    list.push(3);
    list.push(4);
    list.delete(1, 2);
    expect(list.toArray()).toEqual([1, 4]);
  });

  it('should get item at index', () => {
    const list = new CRDTList<string>();
    list.push('hello');
    list.push('world');
    expect(list.get(0)).toBe('hello');
    expect(list.get(1)).toBe('world');
  });

  it('should merge concurrent pushes from two lists correctly', () => {
    const list1 = new CRDTList<string>();
    const list2 = new CRDTList<string>();

    list1.push('from-list1');
    list2.push('from-list2');

    const state1 = list1.encodeState();
    const state2 = list2.encodeState();

    list1.applyUpdate(state2);
    list2.applyUpdate(state1);

    // Both should have both items
    expect(list1.toArray()).toContain('from-list1');
    expect(list1.toArray()).toContain('from-list2');
    expect(list1.length).toBe(2);
    // Same content in both
    expect(list1.toArray().sort()).toEqual(list2.toArray().sort());
  });

  it('should call observe callback on mutations', () => {
    const list = new CRDTList<string>();
    const callback = vi.fn();
    const unsub = list.observe(callback);

    list.push('item');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]![0].added).toContain('item');

    unsub();
    list.push('another');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle 100 offline actions correctly', () => {
    const offlineList = new CRDTList<number>();

    // Simulate 100 offline pushes
    for (let i = 0; i < 100; i++) {
      offlineList.push(i);
    }

    expect(offlineList.length).toBe(100);

    // Encode state and apply to another list (simulating sync)
    const state = offlineList.encodeState();
    const onlineList = new CRDTList<number>();
    onlineList.applyUpdate(state);

    // Verify all 100 items are present
    expect(onlineList.length).toBe(100);
    const arr = onlineList.toArray();
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(i);
    }
  });
});
