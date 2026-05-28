import { describe, it, expect } from 'vitest';
import { EditHistory } from '../editors/edit-history.js';

describe('EditHistory', () => {
  it('tracks added entries', () => {
    const history = new EditHistory();
    history.addEntry('erase', 'input.jpg', 'output.jpg');
    expect(history.getHistory()).toHaveLength(1);
    expect(history.getHistory()[0]!.operation).toBe('erase');
  });

  it('undo removes and returns last entry', () => {
    const history = new EditHistory();
    history.addEntry('erase', 'a.jpg', 'b.jpg');
    history.addEntry('unblur', 'b.jpg', 'c.jpg');
    const undone = history.undo();
    expect(undone?.operation).toBe('unblur');
    expect(history.getHistory()).toHaveLength(1);
  });

  it('getOriginalUri always returns first input', () => {
    const history = new EditHistory();
    history.addEntry('erase', 'original.jpg', 'step1.jpg');
    history.addEntry('unblur', 'step1.jpg', 'step2.jpg');
    expect(history.getOriginalUri()).toBe('original.jpg');
  });

  it('exportFinal returns latest output', () => {
    const history = new EditHistory();
    history.addEntry('erase', 'a.jpg', 'b.jpg');
    history.addEntry('cinematic', 'b.jpg', 'c.jpg');
    expect(history.exportFinal()).toBe('c.jpg');
  });

  it('exportFinal returns undefined when empty', () => {
    const history = new EditHistory();
    expect(history.exportFinal()).toBeUndefined();
  });
});
