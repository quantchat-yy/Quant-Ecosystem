import type { HUDElement } from '../types.js';

export type HUDLayout = 'top-bar' | 'center' | 'bottom-bar' | 'corners' | 'full';

export class HUDEngine {
  private elements: Map<string, HUDElement> = new Map();
  private layout: HUDLayout = 'top-bar';

  render(elements: HUDElement[]): void {
    for (const el of elements) {
      this.elements.set(el.id, el);
    }
  }

  addElement(element: HUDElement): void {
    this.elements.set(element.id, element);
  }

  removeElement(id: string): boolean {
    return this.elements.delete(id);
  }

  clear(): void {
    this.elements.clear();
  }

  setLayout(layout: HUDLayout): void {
    this.layout = layout;
  }

  getLayout(): HUDLayout {
    return this.layout;
  }

  getActiveElements(): HUDElement[] {
    return Array.from(this.elements.values()).sort((a, b) => b.priority - a.priority);
  }

  getElementById(id: string): HUDElement | undefined {
    return this.elements.get(id);
  }
}
