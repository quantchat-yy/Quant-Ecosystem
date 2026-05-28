import { describe, it, expect } from 'vitest';
import type {
  MagicEraserEditor,
  UnblurEditor,
  CinematicEditor,
  BestTakeEditor,
} from '../editors/editor-types.js';

describe('Editor interfaces', () => {
  it('MagicEraserEditor', async () => {
    const e: MagicEraserEditor = {
      async erase() {
        return { success: true, outputUri: 'out.jpg' };
      },
    };
    expect((await e.erase('p.jpg', 'm.png')).success).toBe(true);
  });

  it('UnblurEditor', async () => {
    const e: UnblurEditor = {
      async enhance() {
        return { success: true, outputUri: 'e.jpg' };
      },
    };
    expect((await e.enhance('b.jpg')).success).toBe(true);
  });

  it('CinematicEditor', async () => {
    const e: CinematicEditor = {
      async applyBokeh() {
        return { success: true, outputUri: 'b.jpg' };
      },
    };
    expect((await e.applyBokeh('p.jpg')).success).toBe(true);
  });

  it('BestTakeEditor', async () => {
    const e: BestTakeEditor = {
      async selectBest(uris) {
        return { success: true, outputUri: uris[0] };
      },
    };
    expect((await e.selectBest(['a.jpg', 'b.jpg'])).outputUri).toBe('a.jpg');
  });
});
