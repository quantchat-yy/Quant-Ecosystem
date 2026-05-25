// ============================================================================
// Gaming Package - Game State Machine
// ============================================================================

import {
  GameState,
  StateTransition,
  StateCondition,
  StateCallbacks,
} from '../types';

// ---------------------------------------------------------------------------
// State Registration Entry
// ---------------------------------------------------------------------------

interface StateRegistration {
  state: GameState;
  callbacks: StateCallbacks;
  children: string[];
}

// ---------------------------------------------------------------------------
// Game State Machine
// ---------------------------------------------------------------------------

export class GameStateMachine {
  private states: Map<string, StateRegistration> = new Map();
  private transitions: Map<string, StateTransition[]> = new Map();
  private activeStates: Set<string> = new Set();
  private stateHistory: string[] = [];
  private maxHistory: number = 100;
  private context: Record<string, unknown> = {};
  private timers: Map<string, number> = new Map();
  private eventQueue: Array<{ event: string; data: Record<string, unknown> }> = [];
  private running: boolean = false;

  constructor(config?: { maxHistory?: number; context?: Record<string, unknown> }) {
    if (config?.maxHistory) this.maxHistory = config.maxHistory;
    if (config?.context) this.context = { ...config.context };
  }

  /** Register a new state with optional callbacks */
  registerState(
    id: string,
    name: string,
    options?: {
      parentId?: string;
      isParallel?: boolean;
      callbacks?: StateCallbacks;
      timerDuration?: number;
      timerTarget?: string;
      data?: Record<string, unknown>;
    }
  ): void {
    const state: GameState = {
      id,
      name,
      parentId: options?.parentId || null,
      isParallel: options?.isParallel || false,
      data: options?.data || {},
      enterTime: 0,
      timerDuration: options?.timerDuration || null,
      timerTarget: options?.timerTarget || null,
    };

    const registration: StateRegistration = {
      state,
      callbacks: options?.callbacks || {},
      children: [],
    };

    this.states.set(id, registration);

    // Register as child of parent
    if (state.parentId) {
      const parent = this.states.get(state.parentId);
      if (parent) {
        parent.children.push(id);
      }
    }
  }

  /** Define a transition between states */
  addTransition(
    from: string,
    to: string,
    event: string,
    options?: {
      conditions?: StateCondition[];
      priority?: number;
    }
  ): string {
    const transitionId = `${from}_${event}_${to}`;
    const transition: StateTransition = {
      id: transitionId,
      from,
      to,
      event,
      conditions: options?.conditions || [],
      priority: options?.priority || 0,
    };

    const existing = this.transitions.get(from) || [];
    existing.push(transition);
    existing.sort((a, b) => b.priority - a.priority);
    this.transitions.set(from, existing);

    return transitionId;
  }

  /** Start the state machine with an initial state */
  start(initialStateId: string): void {
    const registration = this.states.get(initialStateId);
    if (!registration) {
      throw new Error(`State '${initialStateId}' not found`);
    }

    this.running = true;
    this.enterState(initialStateId);
  }

  /** Stop the state machine */
  stop(): void {
    this.running = false;
    for (const stateId of this.activeStates) {
      this.exitState(stateId);
    }
    this.activeStates.clear();
  }

  /** Trigger an event-based transition */
  trigger(event: string, data?: Record<string, unknown>): boolean {
    if (!this.running) return false;

    if (data) {
      this.eventQueue.push({ event, data });
    }

    let transitioned = false;

    // Check transitions from all active states
    const activeStatesCopy = [...this.activeStates];
    for (const stateId of activeStatesCopy) {
      const transitions = this.transitions.get(stateId) || [];

      for (const transition of transitions) {
        if (transition.event !== event) continue;

        // Evaluate all conditions
        const allConditionsMet = transition.conditions.every((condition) =>
          condition.evaluate(this.context)
        );

        if (allConditionsMet) {
          this.performTransition(transition);
          transitioned = true;
          break;
        }
      }
    }

    return transitioned;
  }

  /** Update the state machine (process timers and state updates) */
  update(deltaTime: number): void {
    if (!this.running) return;

    // Process event queue
    while (this.eventQueue.length > 0) {
      const { data } = this.eventQueue.shift()!;
      Object.assign(this.context, data);
    }

    // Update active states
    for (const stateId of this.activeStates) {
      const registration = this.states.get(stateId);
      if (registration?.callbacks.onUpdate) {
        registration.callbacks.onUpdate(registration.state, deltaTime, this.context);
      }
    }

    // Process timers
    for (const stateId of this.activeStates) {
      const registration = this.states.get(stateId);
      if (!registration) continue;

      const { state } = registration;
      if (state.timerDuration !== null && state.timerTarget !== null) {
        const elapsed = Date.now() - state.enterTime;
        if (elapsed >= state.timerDuration) {
          // Auto-transition on timer expiry
          this.performTransition({
            id: `timer_${stateId}_${state.timerTarget}`,
            from: stateId,
            to: state.timerTarget,
            event: '__timer__',
            conditions: [],
            priority: 0,
          });
        }
      }
    }
  }

  /** Get the current active state IDs */
  getActiveStates(): string[] {
    return [...this.activeStates];
  }

  /** Get the primary active state (non-parallel) */
  getCurrentState(): string | null {
    for (const stateId of this.activeStates) {
      const reg = this.states.get(stateId);
      if (reg && !reg.state.isParallel) {
        return stateId;
      }
    }
    return this.activeStates.size > 0 ? [...this.activeStates][0] : null;
  }

  /** Get state history */
  getHistory(): string[] {
    return [...this.stateHistory];
  }

  /** Get shared context */
  getContext(): Record<string, unknown> {
    return { ...this.context };
  }

  /** Update shared context */
  setContext(key: string, value: unknown): void {
    this.context[key] = value;
  }

  /** Check if a state is active */
  isStateActive(stateId: string): boolean {
    return this.activeStates.has(stateId);
  }

  /** Get registered state info */
  getStateInfo(stateId: string): GameState | null {
    const reg = this.states.get(stateId);
    return reg ? { ...reg.state } : null;
  }

  /** Get all children of a state */
  getChildren(stateId: string): string[] {
    const reg = this.states.get(stateId);
    return reg ? [...reg.children] : [];
  }

  /** Get available transitions from current state */
  getAvailableTransitions(): StateTransition[] {
    const available: StateTransition[] = [];
    for (const stateId of this.activeStates) {
      const transitions = this.transitions.get(stateId) || [];
      for (const transition of transitions) {
        const conditionsMet = transition.conditions.every((c) =>
          c.evaluate(this.context)
        );
        if (conditionsMet) {
          available.push({ ...transition });
        }
      }
    }
    return available;
  }

  /** Reset the state machine to initial conditions */
  reset(initialStateId?: string): void {
    this.stop();
    this.stateHistory = [];
    this.timers.clear();
    this.eventQueue = [];
    this.context = {};

    if (initialStateId) {
      this.start(initialStateId);
    }
  }

  /** Enter a parallel state alongside the current active states */
  enterParallelState(stateId: string): void {
    const registration = this.states.get(stateId);
    if (!registration) {
      throw new Error(`State '${stateId}' not found`);
    }
    registration.state.isParallel = true;
    this.enterState(stateId);
  }

  /** Exit a parallel state without affecting other active states */
  exitParallelState(stateId: string): void {
    if (this.activeStates.has(stateId)) {
      this.exitState(stateId);
      this.activeStates.delete(stateId);
    }
  }

  /** Check if machine is currently running */
  isRunning(): boolean {
    return this.running;
  }

  /** Get total number of registered states */
  getStateCount(): number {
    return this.states.size;
  }

  /** Get total number of registered transitions */
  getTransitionCount(): number {
    let count = 0;
    for (const transitions of this.transitions.values()) {
      count += transitions.length;
    }
    return count;
  }

  /** Remove a state and its transitions */
  removeState(stateId: string): void {
    if (this.activeStates.has(stateId)) {
      this.exitState(stateId);
      this.activeStates.delete(stateId);
    }
    this.states.delete(stateId);
    this.transitions.delete(stateId);

    // Remove transitions targeting this state
    for (const [from, transitions] of this.transitions.entries()) {
      const filtered = transitions.filter((t) => t.to !== stateId);
      this.transitions.set(from, filtered);
    }
  }

  /** Serialize the state machine for persistence */
  serialize(): Record<string, unknown> {
    return {
      activeStates: [...this.activeStates],
      history: [...this.stateHistory],
      context: { ...this.context },
      running: this.running,
    };
  }

  /** Restore state machine from serialized data */
  deserialize(data: Record<string, unknown>): void {
    const activeStates = data.activeStates as string[];
    const history = data.history as string[];
    const context = data.context as Record<string, unknown>;
    const running = data.running as boolean;

    this.activeStates = new Set(activeStates);
    this.stateHistory = history;
    this.context = context;
    this.running = running;
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private enterState(stateId: string): void {
    const registration = this.states.get(stateId);
    if (!registration) return;

    this.activeStates.add(stateId);
    registration.state.enterTime = Date.now();

    // Record in history
    this.stateHistory.push(stateId);
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    // Call enter callback
    if (registration.callbacks.onEnter) {
      registration.callbacks.onEnter(registration.state, this.context);
    }

    // Enter child states if hierarchical
    if (registration.children.length > 0) {
      for (const childId of registration.children) {
        const child = this.states.get(childId);
        if (child && child.state.isParallel) {
          this.enterState(childId);
        }
      }
      // Enter first non-parallel child as default
      const firstNonParallel = registration.children.find((id) => {
        const c = this.states.get(id);
        return c && !c.state.isParallel;
      });
      if (firstNonParallel) {
        this.enterState(firstNonParallel);
      }
    }

    // Setup timer if configured
    if (registration.state.timerDuration !== null) {
      this.timers.set(stateId, Date.now());
    }
  }

  private exitState(stateId: string): void {
    const registration = this.states.get(stateId);
    if (!registration) return;

    // Exit children first
    for (const childId of registration.children) {
      if (this.activeStates.has(childId)) {
        this.exitState(childId);
        this.activeStates.delete(childId);
      }
    }

    // Call exit callback
    if (registration.callbacks.onExit) {
      registration.callbacks.onExit(registration.state, this.context);
    }

    // Remove timer
    this.timers.delete(stateId);
  }

  private performTransition(transition: StateTransition): void {
    const { from, to } = transition;

    // Exit the source state
    this.exitState(from);
    this.activeStates.delete(from);

    // Also exit parent chain if transitioning to a state outside the hierarchy
    const fromReg = this.states.get(from);
    const toReg = this.states.get(to);
    if (fromReg?.state.parentId && fromReg.state.parentId !== toReg?.state.parentId) {
      const parentId = fromReg.state.parentId;
      if (this.activeStates.has(parentId)) {
        this.exitState(parentId);
        this.activeStates.delete(parentId);
      }
    }

    // Enter the target state
    this.enterState(to);
  }
}
