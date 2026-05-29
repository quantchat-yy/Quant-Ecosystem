import type { AppContext, SessionContext } from './types.js';

export type TransitionCallback = (from: AppContext | null, to: AppContext) => void;

export class ContextTracker {
  private current: SessionContext;
  private currentApp: AppContext | null = null;
  private history: AppContext[] = [];
  private listeners: TransitionCallback[] = [];
  private readonly maxHistory: number;

  constructor(initialContext: SessionContext, maxHistory = 100) {
    this.current = { ...initialContext };
    this.maxHistory = maxHistory;
  }

  update(context: AppContext): void {
    const previous = this.currentApp;

    if (this.currentApp) {
      this.history.push({ ...this.currentApp });
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    }

    this.currentApp = { ...context };
    this.current = {
      ...this.current,
      currentApp: context.app,
      currentScreen: context.screen,
    };

    for (const listener of this.listeners) {
      listener(previous, context);
    }
  }

  getCurrent(): SessionContext {
    return { ...this.current };
  }

  getHistory(): AppContext[] {
    return [...this.history];
  }

  onTransition(callback: TransitionCallback): void {
    this.listeners.push(callback);
  }

  removeTransitionListener(callback: TransitionCallback): void {
    const index = this.listeners.indexOf(callback);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }
}
