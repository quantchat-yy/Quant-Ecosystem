import type { CapabilityProvider } from './types.js';

export interface ScreenElement {
  id: string;
  type: string;
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface AccessibilityCapability extends CapabilityProvider<'accessibility'> {
  getScreenContent(): Promise<ScreenElement[]>;
  tap(x: number, y: number): Promise<void>;
  type(text: string): Promise<void>;
  scroll(direction: 'up' | 'down' | 'left' | 'right'): Promise<void>;
  findElement(query: string): Promise<ScreenElement | null>;
}
