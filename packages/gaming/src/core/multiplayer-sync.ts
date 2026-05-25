// ============================================================================
// Gaming Package - Multiplayer Sync
// ============================================================================

import {
  MultiplayerState,
  EntityState,
  GameEvent,
  InputBuffer,
  PlayerInput,
  StateSnapshot,
  ServerUpdate,
  Vector2D,
} from '../types';

// ---------------------------------------------------------------------------
// Ring Buffer for Snapshot History
// ---------------------------------------------------------------------------

class SnapshotRingBuffer {
  private buffer: (StateSnapshot | null)[];
  private head: number = 0;
  private size: number;
  private count: number = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Array(size).fill(null);
  }

  push(snapshot: StateSnapshot): void {
    this.buffer[this.head] = snapshot;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;
  }

  get(tick: number): StateSnapshot | null {
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.size) % this.size;
      const snapshot = this.buffer[idx];
      if (snapshot && snapshot.tick === tick) return snapshot;
    }
    return null;
  }

  getLatest(): StateSnapshot | null {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + this.size) % this.size;
    return this.buffer[idx];
  }

  getRange(fromTick: number, toTick: number): StateSnapshot[] {
    const results: StateSnapshot[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.size) % this.size;
      const snapshot = this.buffer[idx];
      if (snapshot && snapshot.tick >= fromTick && snapshot.tick <= toTick) {
        results.push(snapshot);
      }
    }
    return results.sort((a, b) => a.tick - b.tick);
  }

  getCount(): number {
    return this.count;
  }

  clear(): void {
    this.buffer = new Array(this.size).fill(null);
    this.head = 0;
    this.count = 0;
  }
}

// ---------------------------------------------------------------------------
// Multiplayer Sync
// ---------------------------------------------------------------------------

export class MultiplayerSync {
  private localPlayerId: string;
  private currentState: MultiplayerState;
  private snapshotHistory: SnapshotRingBuffer;
  private inputBuffer: InputBuffer[] = [];
  private pendingInputs: InputBuffer[] = [];
  private lastProcessedInput: Map<string, number> = new Map();
  private sequenceNumber: number = 0;
  private currentTick: number = 0;
  private tickRate: number;
  private interpolationDelay: number;
  private maxPredictionTicks: number;
  private serverStateBuffer: ServerUpdate[] = [];
  private interpolationTime: number = 0;
  private previousState: MultiplayerState | null = null;
  private targetState: MultiplayerState | null = null;
  private reconciliationCallbacks: Array<(correction: Vector2D) => void> = [];
  private stateUpdateCallbacks: Array<(state: MultiplayerState) => void> = [];
  private inputProcessor: ((input: PlayerInput, entity: EntityState) => EntityState) | null = null;

  constructor(config: {
    playerId: string;
    tickRate?: number;
    historySize?: number;
    interpolationDelay?: number;
    maxPredictionTicks?: number;
  }) {
    this.localPlayerId = config.playerId;
    this.tickRate = config.tickRate || 20;
    this.interpolationDelay = config.interpolationDelay || 100;
    this.maxPredictionTicks = config.maxPredictionTicks || 10;
    this.snapshotHistory = new SnapshotRingBuffer(config.historySize || 128);
    this.currentState = {
      tick: 0,
      timestamp: Date.now(),
      entities: {},
      events: [],
    };
  }

  /** Set the input processing function */
  setInputProcessor(processor: (input: PlayerInput, entity: EntityState) => EntityState): void {
    this.inputProcessor = processor;
  }

  /** Register a reconciliation callback */
  onReconciliation(callback: (correction: Vector2D) => void): void {
    this.reconciliationCallbacks.push(callback);
  }

  /** Register a state update callback */
  onStateUpdate(callback: (state: MultiplayerState) => void): void {
    this.stateUpdateCallbacks.push(callback);
  }

  /** Submit local player input (client-side prediction) */
  submitInput(actions: string[], direction: Vector2D): InputBuffer {
    this.sequenceNumber++;
    const input: InputBuffer = {
      sequenceNumber: this.sequenceNumber,
      tick: this.currentTick,
      inputs: [{
        playerId: this.localPlayerId,
        actions,
        direction,
        timestamp: Date.now(),
      }],
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.inputBuffer.push(input);
    this.pendingInputs.push(input);

    // Client-side prediction: apply input locally
    this.applyInputLocally(input);

    // Save snapshot after prediction
    this.saveSnapshot();

    return input;
  }

  /** Receive authoritative state from server */
  receiveServerUpdate(update: ServerUpdate): void {
    this.serverStateBuffer.push(update);
    this.serverStateBuffer.sort((a, b) => a.tick - b.tick);

    // Mark acknowledged inputs
    const lastProcessed = update.lastProcessedInput[this.localPlayerId] || 0;
    this.lastProcessedInput.set(this.localPlayerId, lastProcessed);

    // Remove acknowledged inputs from pending
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.sequenceNumber > lastProcessed
    );

    // Server reconciliation
    this.reconcile(update);
  }

  /** Update interpolation for remote entities */
  update(deltaTime: number): MultiplayerState {
    this.interpolationTime += deltaTime * 1000;

    // Find two server states to interpolate between
    const renderTime = this.interpolationTime - this.interpolationDelay;
    const interpState = this.interpolateState(renderTime);

    if (interpState) {
      // Merge interpolated remote entities with predicted local entity
      const mergedState = this.mergeStates(interpState);
      this.currentState = mergedState;

      for (const callback of this.stateUpdateCallbacks) {
        callback(mergedState);
      }
    }

    this.currentTick++;
    return this.currentState;
  }

  /** Get the current game state */
  getState(): MultiplayerState {
    return this.currentState;
  }

  /** Get entity state by ID */
  getEntity(entityId: string): EntityState | null {
    return this.currentState.entities[entityId] || null;
  }

  /** Get local player entity */
  getLocalEntity(): EntityState | null {
    return this.currentState.entities[this.localPlayerId] || null;
  }

  /** Get current tick */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /** Get pending input count */
  getPendingInputCount(): number {
    return this.pendingInputs.length;
  }

  /** Get snapshot history size */
  getSnapshotCount(): number {
    return this.snapshotHistory.getCount();
  }

  /** Get interpolation delay */
  getInterpolationDelay(): number {
    return this.interpolationDelay;
  }

  /** Set interpolation delay */
  setInterpolationDelay(delay: number): void {
    this.interpolationDelay = Math.max(0, delay);
  }

  /** Get server buffer size */
  getServerBufferSize(): number {
    return this.serverStateBuffer.length;
  }

  /** Add/update entity in state */
  setEntityState(entityId: string, state: EntityState): void {
    this.currentState.entities[entityId] = state;
  }

  /** Remove entity from state */
  removeEntity(entityId: string): void {
    delete this.currentState.entities[entityId];
  }

  /** Emit a game event */
  emitEvent(type: string, data: Record<string, unknown>): void {
    this.currentState.events.push({
      type,
      tick: this.currentTick,
      playerId: this.localPlayerId,
      data,
    });
  }

  /** Generate a delta-compressed state for network transmission */
  generateDelta(fromTick: number): ServerUpdate | null {
    const fromSnapshot = this.snapshotHistory.get(fromTick);
    if (!fromSnapshot) return null;

    const delta: ServerUpdate = {
      tick: this.currentTick,
      timestamp: Date.now(),
      state: this.computeDelta(fromSnapshot.state, this.currentState),
      lastProcessedInput: Object.fromEntries(this.lastProcessedInput),
      deltaCompressed: true,
      previousTick: fromTick,
    };

    return delta;
  }

  /** Calculate state checksum for validation */
  calculateChecksum(state: MultiplayerState): number {
    let hash = 0;
    const entities = Object.values(state.entities);
    for (const entity of entities) {
      hash = ((hash << 5) - hash + Math.round(entity.position.x * 100)) | 0;
      hash = ((hash << 5) - hash + Math.round(entity.position.y * 100)) | 0;
      hash = ((hash << 5) - hash + Math.round(entity.health * 10)) | 0;
    }
    return hash >>> 0;
  }

  /** Reset the sync system */
  reset(): void {
    this.currentTick = 0;
    this.sequenceNumber = 0;
    this.inputBuffer = [];
    this.pendingInputs = [];
    this.serverStateBuffer = [];
    this.snapshotHistory.clear();
    this.lastProcessedInput.clear();
    this.previousState = null;
    this.targetState = null;
    this.currentState = {
      tick: 0,
      timestamp: Date.now(),
      entities: {},
      events: [],
    };
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private applyInputLocally(inputBuffer: InputBuffer): void {
    if (!this.inputProcessor) return;

    for (const input of inputBuffer.inputs) {
      if (input.playerId !== this.localPlayerId) continue;

      const entity = this.currentState.entities[this.localPlayerId];
      if (entity) {
        const newState = this.inputProcessor(input, entity);
        this.currentState.entities[this.localPlayerId] = newState;
      }
    }
  }

  private reconcile(serverUpdate: ServerUpdate): void {
    const serverEntity = serverUpdate.state.entities[this.localPlayerId];
    if (!serverEntity) return;

    const localEntity = this.currentState.entities[this.localPlayerId];
    if (!localEntity) return;

    // Find the snapshot at the server's tick
    const serverTick = serverUpdate.tick;
    const snapshot = this.snapshotHistory.get(serverTick);

    if (snapshot) {
      const snapshotEntity = snapshot.state.entities[this.localPlayerId];
      if (snapshotEntity) {
        // Calculate position error
        const errorX = serverEntity.position.x - snapshotEntity.position.x;
        const errorY = serverEntity.position.y - snapshotEntity.position.y;
        const errorMagnitude = Math.sqrt(errorX * errorX + errorY * errorY);

        // Only reconcile if error exceeds threshold
        if (errorMagnitude > 0.1) {
          // Rewind to server state
          this.currentState.entities[this.localPlayerId] = { ...serverEntity };

          // Replay pending inputs
          for (const pending of this.pendingInputs) {
            this.applyInputLocally(pending);
          }

          // Notify about correction
          const correction: Vector2D = { x: errorX, y: errorY };
          for (const callback of this.reconciliationCallbacks) {
            callback(correction);
          }
        }
      }
    } else {
      // No snapshot found, just apply server state
      this.currentState.entities[this.localPlayerId] = { ...serverEntity };

      // Replay pending inputs
      for (const pending of this.pendingInputs) {
        this.applyInputLocally(pending);
      }
    }
  }

  private interpolateState(renderTime: number): MultiplayerState | null {
    if (this.serverStateBuffer.length < 2) return null;

    // Find two states to interpolate between
    let from: ServerUpdate | null = null;
    let to: ServerUpdate | null = null;

    for (let i = 0; i < this.serverStateBuffer.length - 1; i++) {
      if (this.serverStateBuffer[i].timestamp <= renderTime &&
          this.serverStateBuffer[i + 1].timestamp >= renderTime) {
        from = this.serverStateBuffer[i];
        to = this.serverStateBuffer[i + 1];
        break;
      }
    }

    if (!from || !to) {
      // Use latest available state
      return this.serverStateBuffer[this.serverStateBuffer.length - 1]?.state || null;
    }

    // Calculate interpolation factor
    const duration = to.timestamp - from.timestamp;
    const elapsed = renderTime - from.timestamp;
    const t = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;

    // Interpolate entity positions
    const interpolated: MultiplayerState = {
      tick: Math.round(from.tick + (to.tick - from.tick) * t),
      timestamp: renderTime,
      entities: {},
      events: to.state.events,
    };

    // Interpolate each entity (except local player)
    const allEntityIds = new Set([
      ...Object.keys(from.state.entities),
      ...Object.keys(to.state.entities),
    ]);

    for (const entityId of allEntityIds) {
      if (entityId === this.localPlayerId) continue;

      const fromEntity = from.state.entities[entityId];
      const toEntity = to.state.entities[entityId];

      if (fromEntity && toEntity) {
        interpolated.entities[entityId] = {
          id: entityId,
          ownerId: toEntity.ownerId,
          position: {
            x: fromEntity.position.x + (toEntity.position.x - fromEntity.position.x) * t,
            y: fromEntity.position.y + (toEntity.position.y - fromEntity.position.y) * t,
          },
          velocity: {
            x: fromEntity.velocity.x + (toEntity.velocity.x - fromEntity.velocity.x) * t,
            y: fromEntity.velocity.y + (toEntity.velocity.y - fromEntity.velocity.y) * t,
          },
          rotation: fromEntity.rotation + (toEntity.rotation - fromEntity.rotation) * t,
          health: toEntity.health,
          data: toEntity.data,
        };
      } else if (toEntity) {
        interpolated.entities[entityId] = { ...toEntity };
      }
    }

    // Cleanup old server states
    while (this.serverStateBuffer.length > 30) {
      this.serverStateBuffer.shift();
    }

    return interpolated;
  }

  private mergeStates(interpolated: MultiplayerState): MultiplayerState {
    const merged: MultiplayerState = {
      tick: this.currentTick,
      timestamp: Date.now(),
      entities: { ...interpolated.entities },
      events: interpolated.events,
    };

    // Keep local player's predicted state
    const localEntity = this.currentState.entities[this.localPlayerId];
    if (localEntity) {
      merged.entities[this.localPlayerId] = localEntity;
    }

    return merged;
  }

  private saveSnapshot(): void {
    const snapshot: StateSnapshot = {
      tick: this.currentTick,
      timestamp: Date.now(),
      state: this.deepCopyState(this.currentState),
      inputs: [...this.pendingInputs],
      checksum: this.calculateChecksum(this.currentState),
    };
    this.snapshotHistory.push(snapshot);
  }

  private computeDelta(from: MultiplayerState, to: MultiplayerState): MultiplayerState {
    // For delta compression, only include changed entities
    const delta: MultiplayerState = {
      tick: to.tick,
      timestamp: to.timestamp,
      entities: {},
      events: to.events,
    };

    for (const [id, entity] of Object.entries(to.entities)) {
      const prev = from.entities[id];
      if (!prev || this.entityChanged(prev, entity)) {
        delta.entities[id] = entity;
      }
    }

    return delta;
  }

  private entityChanged(a: EntityState, b: EntityState): boolean {
    if (Math.abs(a.position.x - b.position.x) > 0.01) return true;
    if (Math.abs(a.position.y - b.position.y) > 0.01) return true;
    if (Math.abs(a.velocity.x - b.velocity.x) > 0.01) return true;
    if (Math.abs(a.velocity.y - b.velocity.y) > 0.01) return true;
    if (a.health !== b.health) return true;
    if (Math.abs(a.rotation - b.rotation) > 0.01) return true;
    return false;
  }

  private deepCopyState(state: MultiplayerState): MultiplayerState {
    return {
      tick: state.tick,
      timestamp: state.timestamp,
      entities: Object.fromEntries(
        Object.entries(state.entities).map(([id, entity]) => [
          id,
          {
            ...entity,
            position: { ...entity.position },
            velocity: { ...entity.velocity },
            data: { ...entity.data },
          },
        ])
      ),
      events: [...state.events],
    };
  }
}
