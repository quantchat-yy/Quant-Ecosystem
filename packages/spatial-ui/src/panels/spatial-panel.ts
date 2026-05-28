import type { SpatialPanel } from '../types.js';
export class SpatialPanelManager {
  private panels = new Map<string, SpatialPanel>();
  createPanel(opts: Omit<SpatialPanel, 'id'>): SpatialPanel {
    const id = `panel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const panel: SpatialPanel = { id, ...opts };
    this.panels.set(id, panel);
    return panel;
  }
  movePanel(id: string, pos: { x: number; y: number; z: number }): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.position = pos;
    return true;
  }
  resizePanel(id: string, size: { w: number; h: number }): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.size = size;
    return true;
  }
  anchorPanel(id: string, anchor: SpatialPanel['anchor']): boolean {
    const p = this.panels.get(id);
    if (!p) return false;
    p.anchor = anchor;
    return true;
  }
  // prettier-ignore
  removePanel(id: string): boolean { return this.panels.delete(id); }
}
