/**
 * VersionHistoryService - Named checkpoints for document version history.
 * Supports creating, listing, restoring, and diffing checkpoints.
 */
import * as Y from 'yjs';

export interface Checkpoint {
  id: string;
  docId: string;
  name: string;
  userId: string;
  state: Uint8Array;
  createdAt: Date;
}

export interface CheckpointDiff {
  checkpointA: string;
  checkpointB: string;
  addedChars: number;
  removedChars: number;
}

export class VersionHistoryService {
  private readonly checkpoints: Map<string, Checkpoint[]> = new Map();
  private nextId = 1;

  createCheckpoint(docId: string, name: string, userId: string, state: Uint8Array): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `cp-${this.nextId++}`,
      docId,
      name,
      userId,
      state: new Uint8Array(state),
      createdAt: new Date(),
    };

    let docCheckpoints = this.checkpoints.get(docId);
    if (!docCheckpoints) {
      docCheckpoints = [];
      this.checkpoints.set(docId, docCheckpoints);
    }

    docCheckpoints.push(checkpoint);
    return checkpoint;
  }

  listCheckpoints(docId: string): Omit<Checkpoint, 'state'>[] {
    const docCheckpoints = this.checkpoints.get(docId) ?? [];
    return docCheckpoints.map(({ state: _state, ...rest }) => rest);
  }

  restoreCheckpoint(docId: string, checkpointId: string): Uint8Array | null {
    const docCheckpoints = this.checkpoints.get(docId) ?? [];
    const checkpoint = docCheckpoints.find((cp) => cp.id === checkpointId);
    return checkpoint ? new Uint8Array(checkpoint.state) : null;
  }

  diffCheckpoints(checkpointIdA: string, checkpointIdB: string): CheckpointDiff | null {
    let cpA: Checkpoint | undefined;
    let cpB: Checkpoint | undefined;

    for (const checkpoints of this.checkpoints.values()) {
      for (const cp of checkpoints) {
        if (cp.id === checkpointIdA) cpA = cp;
        if (cp.id === checkpointIdB) cpB = cp;
      }
    }

    if (!cpA || !cpB) {
      return null;
    }

    // Reconstruct docs from states and compare text content
    const docA = new Y.Doc();
    Y.applyUpdate(docA, cpA.state);
    const textA = docA.getText('content').toString();

    const docB = new Y.Doc();
    Y.applyUpdate(docB, cpB.state);
    const textB = docB.getText('content').toString();

    docA.destroy();
    docB.destroy();

    // Simple diff: count character additions and removals
    const addedChars = Math.max(0, textB.length - textA.length);
    const removedChars = Math.max(0, textA.length - textB.length);

    return {
      checkpointA: checkpointIdA,
      checkpointB: checkpointIdB,
      addedChars,
      removedChars,
    };
  }
}
