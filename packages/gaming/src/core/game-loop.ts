// ============================================================================
// Gaming Package - Game Loop
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback for game update logic */
export type UpdateCallback = (deltaTime: number, time: number) => void;

/** Callback for rendering */
export type RenderCallback = (interpolation: number) => void;

/** Loop statistics */
export interface LoopStats {
  fps: number;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  frameCount: number;
  totalTime: number;
  droppedFrames: number;
}

// ---------------------------------------------------------------------------
// Game Loop Implementation
// ---------------------------------------------------------------------------

export class GameLoop {
  private fixedTimestep: number;
  private maxDelta: number;
  private accumulator: number = 0;
  private currentTime: number = 0;
  private previousTime: number = 0;
  private frameCount: number = 0;
  private totalTime: number = 0;
  private running: boolean = false;
  private paused: boolean = false;
  private timeScale: number = 1.0;
  private animFrameId: number | null = null;

  // FPS tracking (rolling average)
  private fpsHistory: number[] = [];
  private fpsHistorySize: number = 60;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  // Timing metrics
  private updateStartTime: number = 0;
  private renderStartTime: number = 0;
  private avgUpdateTime: number = 0;
  private avgRenderTime: number = 0;
  private droppedFrames: number = 0;

  // Callbacks
  private updateCallbacks: UpdateCallback[] = [];
  private renderCallbacks: RenderCallback[] = [];
  private fixedUpdateCallbacks: UpdateCallback[] = [];
  private lateUpdateCallbacks: UpdateCallback[] = [];

  // Frame limiters
  private targetFps: number;
  private minFrameTime: number;

  constructor(config?: {
    fixedTimestep?: number;
    maxDelta?: number;
    targetFps?: number;
    fpsHistorySize?: number;
  }) {
    this.fixedTimestep = config?.fixedTimestep || 1 / 60;
    this.maxDelta = config?.maxDelta || 0.25;
    this.targetFps = config?.targetFps || 60;
    this.minFrameTime = 1 / this.targetFps;
    if (config?.fpsHistorySize) this.fpsHistorySize = config.fpsHistorySize;
  }

  /** Register an update callback (called every frame) */
  onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  /** Register a fixed update callback (called at fixed timestep) */
  onFixedUpdate(callback: UpdateCallback): void {
    this.fixedUpdateCallbacks.push(callback);
  }

  /** Register a late update callback (after main update) */
  onLateUpdate(callback: UpdateCallback): void {
    this.lateUpdateCallbacks.push(callback);
  }

  /** Register a render callback */
  onRender(callback: RenderCallback): void {
    this.renderCallbacks.push(callback);
  }

  /** Remove an update callback */
  removeUpdateCallback(callback: UpdateCallback): void {
    const idx = this.updateCallbacks.indexOf(callback);
    if (idx >= 0) this.updateCallbacks.splice(idx, 1);
  }

  /** Remove a render callback */
  removeRenderCallback(callback: RenderCallback): void {
    const idx = this.renderCallbacks.indexOf(callback);
    if (idx >= 0) this.renderCallbacks.splice(idx, 1);
  }

  /** Start the game loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.previousTime = this.getNow();
    this.currentTime = this.previousTime;
    this.accumulator = 0;
    this.tick();
  }

  /** Stop the game loop completely */
  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      this.cancelFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /** Pause the game loop (updates stop, renders continue) */
  pause(): void {
    this.paused = true;
  }

  /** Resume from pause */
  resume(): void {
    if (this.paused) {
      this.paused = false;
      this.previousTime = this.getNow();
      this.accumulator = 0;
    }
  }

  /** Set time scale (1 = normal, 0.5 = slow motion, 2 = fast forward) */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, Math.min(scale, 10));
  }

  /** Get current time scale */
  getTimeScale(): number {
    return this.timeScale;
  }

  /** Check if running */
  isRunning(): boolean {
    return this.running;
  }

  /** Check if paused */
  isPaused(): boolean {
    return this.paused;
  }

  /** Get current FPS */
  getFps(): number {
    return this.currentFps;
  }

  /** Get detailed loop statistics */
  getStats(): LoopStats {
    return {
      fps: this.currentFps,
      frameTime: this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0,
      updateTime: this.avgUpdateTime,
      renderTime: this.avgRenderTime,
      frameCount: this.frameCount,
      totalTime: this.totalTime,
      droppedFrames: this.droppedFrames,
    };
  }

  /** Get the fixed timestep value */
  getFixedTimestep(): number {
    return this.fixedTimestep;
  }

  /** Set fixed timestep */
  setFixedTimestep(timestep: number): void {
    this.fixedTimestep = Math.max(0.001, timestep);
  }

  /** Set max delta cap */
  setMaxDelta(maxDelta: number): void {
    this.maxDelta = Math.max(this.fixedTimestep, maxDelta);
  }

  /** Get elapsed game time (affected by time scale and pauses) */
  getElapsedTime(): number {
    return this.totalTime;
  }

  /** Get raw frame count */
  getFrameCount(): number {
    return this.frameCount;
  }

  /** Manually step one frame (useful for debugging) */
  stepOnce(deltaTime?: number): void {
    const dt = deltaTime || this.fixedTimestep;
    this.processFrame(dt);
  }

  /** Get interpolation factor for rendering between fixed steps */
  getInterpolation(): number {
    return this.accumulator / this.fixedTimestep;
  }

  // -------------------------------------------------------------------------
  // Private loop logic
  // -------------------------------------------------------------------------

  private tick(): void {
    if (!this.running) return;

    this.animFrameId = this.requestFrame(() => this.tick());

    const now = this.getNow();
    let deltaTime = (now - this.previousTime) / 1000; // Convert to seconds
    this.previousTime = now;

    // Cap delta to prevent spiral of death
    if (deltaTime > this.maxDelta) {
      this.droppedFrames++;
      deltaTime = this.maxDelta;
    }

    // Apply time scale
    deltaTime *= this.timeScale;

    if (this.paused) {
      // Still render when paused (for UI, etc.) but don't update
      this.renderFrame(this.accumulator / this.fixedTimestep);
      return;
    }

    this.processFrame(deltaTime);
  }

  private processFrame(deltaTime: number): void {
    this.frameCount++;
    this.totalTime += deltaTime;

    // Fixed timestep updates
    this.accumulator += deltaTime;

    this.updateStartTime = this.getNow();

    let fixedSteps = 0;
    const maxSteps = 5; // Prevent excessive catch-up
    while (this.accumulator >= this.fixedTimestep && fixedSteps < maxSteps) {
      // Fixed update callbacks (physics, etc.)
      for (const callback of this.fixedUpdateCallbacks) {
        callback(this.fixedTimestep, this.totalTime);
      }
      this.accumulator -= this.fixedTimestep;
      fixedSteps++;
    }

    // If we maxed out steps, discard remaining accumulator
    if (fixedSteps >= maxSteps) {
      this.accumulator = 0;
      this.droppedFrames++;
    }

    // Variable update callbacks (input, UI, etc.)
    for (const callback of this.updateCallbacks) {
      callback(deltaTime, this.totalTime);
    }

    // Late update (camera follow, etc.)
    for (const callback of this.lateUpdateCallbacks) {
      callback(deltaTime, this.totalTime);
    }

    const updateEnd = this.getNow();
    this.avgUpdateTime = this.avgUpdateTime * 0.9 + ((updateEnd - this.updateStartTime) / 1000) * 0.1;

    // Render with interpolation
    const interpolation = this.accumulator / this.fixedTimestep;
    this.renderFrame(interpolation);

    // Update FPS counter
    this.updateFps(deltaTime);
  }

  private renderFrame(interpolation: number): void {
    this.renderStartTime = this.getNow();

    for (const callback of this.renderCallbacks) {
      callback(interpolation);
    }

    const renderEnd = this.getNow();
    this.avgRenderTime = this.avgRenderTime * 0.9 + ((renderEnd - this.renderStartTime) / 1000) * 0.1;
  }

  private updateFps(deltaTime: number): void {
    if (deltaTime > 0) {
      this.fpsHistory.push(deltaTime);
      if (this.fpsHistory.length > this.fpsHistorySize) {
        this.fpsHistory.shift();
      }
    }

    // Update FPS every 500ms
    const now = this.getNow();
    if (now - this.lastFpsUpdate >= 500) {
      if (this.fpsHistory.length > 0) {
        const avgDelta = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        this.currentFps = avgDelta > 0 ? Math.round(1 / avgDelta) : 0;
      }
      this.lastFpsUpdate = now;
    }
  }

  private getNow(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  private requestFrame(callback: () => void): number {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(callback);
    }
    return setTimeout(callback, this.minFrameTime * 1000) as unknown as number;
  }

  private cancelFrame(id: number): void {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }
}
