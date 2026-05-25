// ============================================================================
// Gaming Package - Input Handler
// ============================================================================

import {
  InputEvent,
  InputType,
  GestureType,
  KeyBinding,
  InputBufferEntry,
  AccelerometerData,
  Vector2D,
} from '../types';

// ---------------------------------------------------------------------------
// Gesture Recognizer
// ---------------------------------------------------------------------------

interface TouchPoint {
  id: number;
  startPosition: Vector2D;
  currentPosition: Vector2D;
  startTime: number;
  lastMoveTime: number;
}

class GestureRecognizer {
  private touches: Map<number, TouchPoint> = new Map();
  private tapTimeout: number = 300;
  private longPressThreshold: number = 500;
  private swipeThreshold: number = 50;
  private pinchStartDistance: number = 0;
  private lastTapTime: number = 0;
  private lastTapPosition: Vector2D = { x: 0, y: 0 };
  private doubleTapThreshold: number = 300;
  private doubleTapDistance: number = 30;

  onTouchStart(id: number, position: Vector2D, time: number): void {
    this.touches.set(id, {
      id,
      startPosition: { ...position },
      currentPosition: { ...position },
      startTime: time,
      lastMoveTime: time,
    });

    // Track pinch start distance for two-finger gestures
    if (this.touches.size === 2) {
      const points = [...this.touches.values()];
      this.pinchStartDistance = this.distance(
        points[0].currentPosition,
        points[1].currentPosition
      );
    }
  }

  onTouchMove(id: number, position: Vector2D, time: number): void {
    const touch = this.touches.get(id);
    if (touch) {
      touch.currentPosition = { ...position };
      touch.lastMoveTime = time;
    }
  }

  onTouchEnd(id: number, time: number): GestureType | null {
    const touch = this.touches.get(id);
    if (!touch) return null;

    this.touches.delete(id);
    const duration = time - touch.startTime;
    const dx = touch.currentPosition.x - touch.startPosition.x;
    const dy = touch.currentPosition.y - touch.startPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Long press detection
    if (duration >= this.longPressThreshold && dist < this.swipeThreshold) {
      return 'long_press';
    }

    // Swipe detection
    if (dist >= this.swipeThreshold) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy) {
        return dx > 0 ? 'swipe_right' : 'swipe_left';
      } else {
        return dy > 0 ? 'swipe_down' : 'swipe_up';
      }
    }

    // Tap / double-tap detection
    if (duration < this.tapTimeout && dist < this.swipeThreshold) {
      const timeSinceLastTap = time - this.lastTapTime;
      const distFromLastTap = this.distance(touch.startPosition, this.lastTapPosition);

      if (timeSinceLastTap < this.doubleTapThreshold && distFromLastTap < this.doubleTapDistance) {
        this.lastTapTime = 0;
        return 'double_tap';
      }

      this.lastTapTime = time;
      this.lastTapPosition = { ...touch.startPosition };
      return 'tap';
    }

    return null;
  }

  checkPinch(): { type: 'pinch' | 'rotate'; scale: number; angle: number } | null {
    if (this.touches.size !== 2) return null;

    const points = [...this.touches.values()];
    const currentDistance = this.distance(
      points[0].currentPosition,
      points[1].currentPosition
    );

    if (this.pinchStartDistance === 0) return null;

    const scale = currentDistance / this.pinchStartDistance;

    // Calculate rotation angle
    const startAngle = Math.atan2(
      points[1].startPosition.y - points[0].startPosition.y,
      points[1].startPosition.x - points[0].startPosition.x
    );
    const currentAngle = Math.atan2(
      points[1].currentPosition.y - points[0].currentPosition.y,
      points[1].currentPosition.x - points[0].currentPosition.x
    );
    const angle = currentAngle - startAngle;

    if (Math.abs(scale - 1) > 0.1) {
      return { type: 'pinch', scale, angle };
    }
    if (Math.abs(angle) > 0.1) {
      return { type: 'rotate', scale, angle };
    }

    return null;
  }

  getActiveTouchCount(): number {
    return this.touches.size;
  }

  private distance(a: Vector2D, b: Vector2D): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ---------------------------------------------------------------------------
// Input Handler
// ---------------------------------------------------------------------------

export class InputHandler {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();
  private keyBindings: Map<string, KeyBinding> = new Map();
  private actionBindings: Map<string, string[]> = new Map();
  private gestureRecognizer: GestureRecognizer = new GestureRecognizer();
  private inputBuffer: InputBufferEntry[] = [];
  private bufferSize: number = 60;
  private currentFrame: number = 0;
  private eventListeners: Map<string, Array<(event: InputEvent) => void>> = new Map();
  private accelerometer: AccelerometerData = { x: 0, y: 0, z: 0, timestamp: 0 };
  private deadZone: number = 0.15;
  private mousePosition: Vector2D = { x: 0, y: 0 };
  private mouseButtons: Set<number> = new Set();
  private enabled: boolean = true;

  constructor(config?: { bufferSize?: number; deadZone?: number }) {
    if (config?.bufferSize) this.bufferSize = config.bufferSize;
    if (config?.deadZone) this.deadZone = config.deadZone;
  }

  /** Process a keyboard key down event */
  handleKeyDown(key: string): void {
    if (!this.enabled) return;
    if (!this.keysDown.has(key)) {
      this.keysPressed.add(key);
    }
    this.keysDown.add(key);

    const event: InputEvent = {
      type: 'keyboard',
      action: 'down',
      key,
      timestamp: Date.now(),
    };
    this.bufferInput(event);
    this.emit('keydown', event);
    this.checkActionTrigger(key, 'down');
  }

  /** Process a keyboard key up event */
  handleKeyUp(key: string): void {
    if (!this.enabled) return;
    this.keysDown.delete(key);
    this.keysReleased.add(key);

    const event: InputEvent = {
      type: 'keyboard',
      action: 'up',
      key,
      timestamp: Date.now(),
    };
    this.bufferInput(event);
    this.emit('keyup', event);
    this.checkActionTrigger(key, 'up');
  }

  /** Process touch start */
  handleTouchStart(pointerId: number, position: Vector2D): void {
    if (!this.enabled) return;
    const now = Date.now();
    this.gestureRecognizer.onTouchStart(pointerId, position, now);

    const event: InputEvent = {
      type: 'touch',
      action: 'down',
      position: { ...position },
      timestamp: now,
      pointerId,
    };
    this.bufferInput(event);
    this.emit('touchstart', event);
  }

  /** Process touch move */
  handleTouchMove(pointerId: number, position: Vector2D): void {
    if (!this.enabled) return;
    const now = Date.now();
    this.gestureRecognizer.onTouchMove(pointerId, position, now);

    const event: InputEvent = {
      type: 'touch',
      action: 'move',
      position: { ...position },
      timestamp: now,
      pointerId,
    };
    this.emit('touchmove', event);
  }

  /** Process touch end */
  handleTouchEnd(pointerId: number): void {
    if (!this.enabled) return;
    const now = Date.now();
    const gesture = this.gestureRecognizer.onTouchEnd(pointerId, now);

    const event: InputEvent = {
      type: 'touch',
      action: 'up',
      timestamp: now,
      pointerId,
    };
    this.bufferInput(event);
    this.emit('touchend', event);

    // Emit gesture event if detected
    if (gesture) {
      const gestureEvent: InputEvent = {
        type: 'touch',
        action: 'gesture',
        gesture,
        timestamp: now,
        pointerId,
      };
      this.bufferInput(gestureEvent);
      this.emit('gesture', gestureEvent);
      this.emit(`gesture:${gesture}`, gestureEvent);
    }
  }

  /** Process accelerometer data */
  handleAccelerometer(x: number, y: number, z: number): void {
    if (!this.enabled) return;
    this.accelerometer = { x, y, z, timestamp: Date.now() };

    // Apply dead zone
    const processedX = this.applyDeadZone(x);
    const processedY = this.applyDeadZone(y);

    if (processedX !== 0 || processedY !== 0) {
      const event: InputEvent = {
        type: 'accelerometer',
        action: 'move',
        delta: { x: processedX, y: processedY },
        timestamp: Date.now(),
      };
      this.emit('accelerometer', event);
    }
  }

  /** Process mouse move */
  handleMouseMove(position: Vector2D): void {
    if (!this.enabled) return;
    const delta = {
      x: position.x - this.mousePosition.x,
      y: position.y - this.mousePosition.y,
    };
    this.mousePosition = { ...position };

    const event: InputEvent = {
      type: 'mouse',
      action: 'move',
      position: { ...position },
      delta,
      timestamp: Date.now(),
    };
    this.emit('mousemove', event);
  }

  /** Register a key binding */
  bindKey(action: string, primary: string, secondary?: string, category: string = 'default'): void {
    const binding: KeyBinding = { action, primary, secondary, category };
    this.keyBindings.set(action, binding);

    // Map keys to actions
    if (!this.actionBindings.has(primary)) this.actionBindings.set(primary, []);
    this.actionBindings.get(primary)!.push(action);

    if (secondary) {
      if (!this.actionBindings.has(secondary)) this.actionBindings.set(secondary, []);
      this.actionBindings.get(secondary)!.push(action);
    }
  }

  /** Check if a key is currently held down */
  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  /** Check if a key was just pressed this frame */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  /** Check if a key was just released this frame */
  isKeyReleased(key: string): boolean {
    return this.keysReleased.has(key);
  }

  /** Check if an action is active (via bound keys) */
  isActionActive(action: string): boolean {
    const binding = this.keyBindings.get(action);
    if (!binding) return false;
    if (this.keysDown.has(binding.primary)) return true;
    if (binding.secondary && this.keysDown.has(binding.secondary)) return true;
    return false;
  }

  /** Get current accelerometer data */
  getAccelerometer(): AccelerometerData {
    return { ...this.accelerometer };
  }

  /** Get mouse position */
  getMousePosition(): Vector2D {
    return { ...this.mousePosition };
  }

  /** Listen for an input event */
  on(event: string, callback: (event: InputEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /** Remove an event listener */
  off(event: string, callback: (event: InputEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    }
  }

  /** Get input buffer (for combo detection) */
  getBuffer(): InputBufferEntry[] {
    return [...this.inputBuffer];
  }

  /** Check for a sequence in the buffer (combo detection) */
  checkSequence(keys: string[], maxFrameGap: number = 10): boolean {
    let keyIdx = 0;
    let lastFrame = -maxFrameGap;

    for (const entry of this.inputBuffer) {
      if (entry.consumed) continue;
      if (entry.event.key === keys[keyIdx] && entry.event.action === 'down') {
        if (entry.frame - lastFrame <= maxFrameGap) {
          keyIdx++;
          lastFrame = entry.frame;
          if (keyIdx >= keys.length) return true;
        } else if (keyIdx > 0) {
          // Reset if gap is too large
          keyIdx = 0;
          if (entry.event.key === keys[0]) {
            keyIdx = 1;
            lastFrame = entry.frame;
          }
        } else {
          keyIdx = 1;
          lastFrame = entry.frame;
        }
      }
    }
    return false;
  }

  /** Clear frame-specific state (call at end of frame) */
  endFrame(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.currentFrame++;
  }

  /** Enable or disable input processing */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.keysReleased.clear();
    }
  }

  /** Check if input is enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Set dead zone threshold */
  setDeadZone(deadZone: number): void {
    this.deadZone = Math.max(0, Math.min(deadZone, 1));
  }

  /** Clear all input state */
  clear(): void {
    this.keysDown.clear();
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.inputBuffer = [];
    this.mouseButtons.clear();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private bufferInput(event: InputEvent): void {
    this.inputBuffer.push({
      event,
      frame: this.currentFrame,
      consumed: false,
    });

    // Trim buffer to max size
    while (this.inputBuffer.length > this.bufferSize) {
      this.inputBuffer.shift();
    }
  }

  private emit(eventName: string, event: InputEvent): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  private checkActionTrigger(key: string, action: 'down' | 'up'): void {
    const actions = this.actionBindings.get(key);
    if (actions) {
      for (const actionName of actions) {
        const event: InputEvent = {
          type: 'keyboard',
          action,
          key: actionName,
          timestamp: Date.now(),
        };
        this.emit(`action:${actionName}`, event);
      }
    }
  }

  private applyDeadZone(value: number): number {
    if (Math.abs(value) < this.deadZone) return 0;
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - this.deadZone) / (1 - this.deadZone);
  }
}
