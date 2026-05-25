// ============================================================================
// Gaming Package - Sprite Manager
// ============================================================================

import {
  Sprite,
  SpriteSheet,
  AnimationSequence,
  AnimationFrame,
  AnimationPlayback,
  Vector2D,
  Transform2D,
} from '../types';

// ---------------------------------------------------------------------------
// Sprite Pool for Object Reuse
// ---------------------------------------------------------------------------

class SpritePool {
  private pool: Sprite[] = [];
  private nextId: number = 0;

  acquire(sheetId: string): Sprite {
    let sprite = this.pool.pop();
    if (!sprite) {
      sprite = this.createDefault(sheetId);
    } else {
      sprite.sheetId = sheetId;
      sprite.visible = true;
      sprite.opacity = 1;
      sprite.flipX = false;
      sprite.flipY = false;
      sprite.tint = 0xffffff;
      sprite.zIndex = 0;
    }
    return sprite;
  }

  release(sprite: Sprite): void {
    sprite.visible = false;
    this.pool.push(sprite);
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  private createDefault(sheetId: string): Sprite {
    return {
      id: `sprite_${this.nextId++}`,
      sheetId,
      frameX: 0,
      frameY: 0,
      width: 0,
      height: 0,
      pivot: { x: 0.5, y: 0.5 },
      transform: {
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      zIndex: 0,
      visible: true,
      opacity: 1,
      flipX: false,
      flipY: false,
      tint: 0xffffff,
    };
  }
}

// ---------------------------------------------------------------------------
// Animation Controller
// ---------------------------------------------------------------------------

class AnimationController {
  private sequences: Map<string, AnimationSequence> = new Map();
  private playbacks: Map<string, AnimationPlayback> = new Map();
  private eventCallbacks: Map<string, Array<(spriteId: string, event: string) => void>> = new Map();

  registerSequence(sequence: AnimationSequence): void {
    this.sequences.set(sequence.id, sequence);
  }

  removeSequence(sequenceId: string): void {
    this.sequences.delete(sequenceId);
  }

  play(spriteId: string, sequenceId: string, restart: boolean = false): void {
    const existing = this.playbacks.get(spriteId);
    if (existing && existing.sequenceId === sequenceId && !restart) {
      existing.isPlaying = true;
      existing.isPaused = false;
      return;
    }

    this.playbacks.set(spriteId, {
      sequenceId,
      currentFrame: 0,
      elapsedTime: 0,
      isPlaying: true,
      isPaused: false,
      playCount: 0,
    });
  }

  pause(spriteId: string): void {
    const playback = this.playbacks.get(spriteId);
    if (playback) {
      playback.isPaused = true;
      playback.isPlaying = false;
    }
  }

  resume(spriteId: string): void {
    const playback = this.playbacks.get(spriteId);
    if (playback && playback.isPaused) {
      playback.isPaused = false;
      playback.isPlaying = true;
    }
  }

  stop(spriteId: string): void {
    this.playbacks.delete(spriteId);
  }

  update(deltaTime: number): Map<string, number> {
    const frameUpdates = new Map<string, number>();

    for (const [spriteId, playback] of this.playbacks.entries()) {
      if (!playback.isPlaying || playback.isPaused) continue;

      const sequence = this.sequences.get(playback.sequenceId);
      if (!sequence || sequence.frames.length === 0) continue;

      playback.elapsedTime += deltaTime * sequence.speed;

      const currentFrame = sequence.frames[playback.currentFrame];
      const frameDuration = currentFrame.duration;

      if (playback.elapsedTime >= frameDuration) {
        playback.elapsedTime -= frameDuration;

        // Emit frame event if present
        if (currentFrame.event) {
          this.emitEvent(spriteId, currentFrame.event);
        }

        // Advance to next frame
        playback.currentFrame++;

        if (playback.currentFrame >= sequence.frames.length) {
          playback.playCount++;
          if (sequence.loop) {
            playback.currentFrame = 0;
          } else {
            playback.currentFrame = sequence.frames.length - 1;
            playback.isPlaying = false;

            // Trigger onComplete sequence if configured
            if (sequence.onComplete) {
              this.play(spriteId, sequence.onComplete, true);
            }
          }
        }

        const newFrame = sequence.frames[playback.currentFrame];
        frameUpdates.set(spriteId, newFrame.spriteIndex);
      }
    }

    return frameUpdates;
  }

  onEvent(event: string, callback: (spriteId: string, event: string) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  getPlayback(spriteId: string): AnimationPlayback | null {
    return this.playbacks.get(spriteId) || null;
  }

  isPlaying(spriteId: string): boolean {
    const playback = this.playbacks.get(spriteId);
    return playback ? playback.isPlaying : false;
  }

  private emitEvent(spriteId: string, event: string): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(spriteId, event);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sprite Manager
// ---------------------------------------------------------------------------

export class SpriteManager {
  private sheets: Map<string, SpriteSheet> = new Map();
  private sprites: Map<string, Sprite> = new Map();
  private pool: SpritePool = new SpritePool();
  private animController: AnimationController = new AnimationController();
  private renderOrder: string[] = [];
  private orderDirty: boolean = true;
  private layers: Map<number, Set<string>> = new Map();

  /** Register a sprite sheet */
  registerSheet(sheet: SpriteSheet): void {
    sheet.totalFrames = sheet.columns * sheet.rows;
    this.sheets.set(sheet.id, sheet);
  }

  /** Remove a sprite sheet */
  removeSheet(sheetId: string): void {
    this.sheets.delete(sheetId);
  }

  /** Get sheet info */
  getSheet(sheetId: string): SpriteSheet | null {
    return this.sheets.get(sheetId) || null;
  }

  /** Create a sprite from a sheet */
  createSprite(sheetId: string, frameIndex: number = 0): Sprite {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) throw new Error(`Sheet '${sheetId}' not registered`);

    const sprite = this.pool.acquire(sheetId);
    const col = frameIndex % sheet.columns;
    const row = Math.floor(frameIndex / sheet.columns);

    sprite.frameX = col * (sheet.frameWidth + sheet.padding);
    sprite.frameY = row * (sheet.frameHeight + sheet.padding);
    sprite.width = sheet.frameWidth;
    sprite.height = sheet.frameHeight;

    this.sprites.set(sprite.id, sprite);
    this.orderDirty = true;

    // Add to default layer
    this.addToLayer(sprite.id, sprite.zIndex);

    return sprite;
  }

  /** Destroy a sprite (returns to pool) */
  destroySprite(spriteId: string): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    this.removeFromLayer(spriteId, sprite.zIndex);
    this.sprites.delete(spriteId);
    this.animController.stop(spriteId);
    this.pool.release(sprite);
    this.orderDirty = true;
  }

  /** Get a sprite by ID */
  getSprite(spriteId: string): Sprite | null {
    return this.sprites.get(spriteId) || null;
  }

  /** Set sprite frame by index */
  setSpriteFrame(spriteId: string, frameIndex: number): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    const sheet = this.sheets.get(sprite.sheetId);
    if (!sheet) return;

    const col = frameIndex % sheet.columns;
    const row = Math.floor(frameIndex / sheet.columns);
    sprite.frameX = col * (sheet.frameWidth + sheet.padding);
    sprite.frameY = row * (sheet.frameHeight + sheet.padding);
  }

  /** Set sprite position */
  setPosition(spriteId: string, x: number, y: number): void {
    const sprite = this.sprites.get(spriteId);
    if (sprite) {
      sprite.transform.position.x = x;
      sprite.transform.position.y = y;
    }
  }

  /** Set sprite rotation in radians */
  setRotation(spriteId: string, rotation: number): void {
    const sprite = this.sprites.get(spriteId);
    if (sprite) {
      sprite.transform.rotation = rotation;
    }
  }

  /** Set sprite scale */
  setScale(spriteId: string, sx: number, sy: number): void {
    const sprite = this.sprites.get(spriteId);
    if (sprite) {
      sprite.transform.scale.x = sx;
      sprite.transform.scale.y = sy;
    }
  }

  /** Set sprite flip state */
  setFlip(spriteId: string, flipX: boolean, flipY: boolean): void {
    const sprite = this.sprites.get(spriteId);
    if (sprite) {
      sprite.flipX = flipX;
      sprite.flipY = flipY;
    }
  }

  /** Set sprite z-index */
  setZIndex(spriteId: string, zIndex: number): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    this.removeFromLayer(spriteId, sprite.zIndex);
    sprite.zIndex = zIndex;
    this.addToLayer(spriteId, zIndex);
    this.orderDirty = true;
  }

  /** Register an animation sequence */
  registerAnimation(sequence: AnimationSequence): void {
    this.animController.registerSequence(sequence);
  }

  /** Play an animation on a sprite */
  playAnimation(spriteId: string, sequenceId: string, restart: boolean = false): void {
    this.animController.play(spriteId, sequenceId, restart);
  }

  /** Pause animation on a sprite */
  pauseAnimation(spriteId: string): void {
    this.animController.pause(spriteId);
  }

  /** Resume animation on a sprite */
  resumeAnimation(spriteId: string): void {
    this.animController.resume(spriteId);
  }

  /** Stop animation on a sprite */
  stopAnimation(spriteId: string): void {
    this.animController.stop(spriteId);
  }

  /** Update all animations */
  update(deltaTime: number): void {
    const frameUpdates = this.animController.update(deltaTime);

    // Apply frame updates to sprites
    for (const [spriteId, frameIndex] of frameUpdates.entries()) {
      this.setSpriteFrame(spriteId, frameIndex);
    }
  }

  /** Get sprites in render order (sorted by z-index) */
  getRenderOrder(): Sprite[] {
    if (this.orderDirty) {
      this.rebuildRenderOrder();
      this.orderDirty = false;
    }

    const result: Sprite[] = [];
    for (const id of this.renderOrder) {
      const sprite = this.sprites.get(id);
      if (sprite && sprite.visible) {
        result.push(sprite);
      }
    }
    return result;
  }

  /** Get sprites in a specific layer */
  getLayerSprites(zIndex: number): Sprite[] {
    const layer = this.layers.get(zIndex);
    if (!layer) return [];

    const result: Sprite[] = [];
    for (const id of layer) {
      const sprite = this.sprites.get(id);
      if (sprite && sprite.visible) {
        result.push(sprite);
      }
    }
    return result;
  }

  /** Get total sprite count */
  getSpriteCount(): number {
    return this.sprites.size;
  }

  /** Get pool size (available reusable sprites) */
  getPoolSize(): number {
    return this.pool.getPoolSize();
  }

  /** Register animation event callback */
  onAnimationEvent(event: string, callback: (spriteId: string, event: string) => void): void {
    this.animController.onEvent(event, callback);
  }

  /** Check if animation is playing */
  isAnimationPlaying(spriteId: string): boolean {
    return this.animController.isPlaying(spriteId);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private addToLayer(spriteId: string, zIndex: number): void {
    if (!this.layers.has(zIndex)) {
      this.layers.set(zIndex, new Set());
    }
    this.layers.get(zIndex)!.add(spriteId);
  }

  private removeFromLayer(spriteId: string, zIndex: number): void {
    const layer = this.layers.get(zIndex);
    if (layer) {
      layer.delete(spriteId);
      if (layer.size === 0) {
        this.layers.delete(zIndex);
      }
    }
  }

  private rebuildRenderOrder(): void {
    const sortedLayers = [...this.layers.keys()].sort((a, b) => a - b);
    this.renderOrder = [];
    for (const zIndex of sortedLayers) {
      const layer = this.layers.get(zIndex)!;
      for (const id of layer) {
        this.renderOrder.push(id);
      }
    }
  }
}
