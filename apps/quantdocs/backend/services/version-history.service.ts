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

    // Character-level diff using longest common subsequence (LCS)
    const { added, removed } = this.computeCharDiff(textA, textB);

    return {
      checkpointA: checkpointIdA,
      checkpointB: checkpointIdB,
      addedChars: added,
      removedChars: removed,
    };
  }

  /**
   * Compute the number of added and removed characters between two strings
   * using a simple edit-distance approach (Myers-like greedy).
   * Returns the count of characters that were inserted and deleted.
   */
  private computeCharDiff(a: string, b: string): { added: number; removed: number } {
    // Compute LCS length using a space-optimized DP approach
    const m = a.length;
    const n = b.length;

    // For very large strings, fall back to a simpler heuristic
    if (m * n > 10_000_000) {
      // Approximate using line-level comparison
      return this.approximateCharDiff(a, b);
    }

    // Standard DP for LCS length (two-row optimization)
    let prev = new Uint32Array(n + 1);
    let curr = new Uint32Array(n + 1);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1]! + 1;
        } else {
          curr[j] = Math.max(prev[j]!, curr[j - 1]!);
        }
      }
      [prev, curr] = [curr, prev];
      curr.fill(0);
    }

    const lcsLength = prev[n]!;
    const removed = m - lcsLength;
    const added = n - lcsLength;

    return { added, removed };
  }

  /**
   * Approximate diff for very large strings by splitting into lines
   * and counting character changes per added/removed lines.
   */
  private approximateCharDiff(a: string, b: string): { added: number; removed: number } {
    const linesA = new Set(a.split('\n'));
    const linesB = new Set(b.split('\n'));

    let removed = 0;
    let added = 0;

    for (const line of linesA) {
      if (!linesB.has(line)) {
        removed += line.length + 1; // +1 for newline
      }
    }

    for (const line of linesB) {
      if (!linesA.has(line)) {
        added += line.length + 1;
      }
    }

    return { added, removed };
  }
}
