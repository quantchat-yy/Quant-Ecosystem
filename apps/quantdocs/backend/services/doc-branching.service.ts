/**
 * DocBranchingService - Experimental document branching.
 * Supports forking a Y.Doc into a branch, independent editing, and merging back.
 */
import * as Y from 'yjs';

export interface DocBranch {
  id: string;
  docId: string;
  branchName: string;
  userId: string;
  state: Uint8Array;
  createdAt: Date;
}

export class DocBranchingService {
  private readonly branches: Map<string, DocBranch[]> = new Map();
  private nextId = 1;

  createBranch(
    docId: string,
    branchName: string,
    userId: string,
    sourceState: Uint8Array,
  ): DocBranch {
    const branch: DocBranch = {
      id: `branch-${this.nextId++}`,
      docId,
      branchName,
      userId,
      state: new Uint8Array(sourceState),
      createdAt: new Date(),
    };

    let docBranches = this.branches.get(docId);
    if (!docBranches) {
      docBranches = [];
      this.branches.set(docId, docBranches);
    }

    docBranches.push(branch);
    return branch;
  }

  listBranches(docId: string): Omit<DocBranch, 'state'>[] {
    const docBranches = this.branches.get(docId) ?? [];
    return docBranches.map(({ state: _state, ...rest }) => rest);
  }

  getBranchState(branchId: string): Uint8Array | null {
    for (const branches of this.branches.values()) {
      const branch = branches.find((b) => b.id === branchId);
      if (branch) {
        return new Uint8Array(branch.state);
      }
    }
    return null;
  }

  updateBranchState(branchId: string, state: Uint8Array): boolean {
    for (const branches of this.branches.values()) {
      const branch = branches.find((b) => b.id === branchId);
      if (branch) {
        branch.state = new Uint8Array(state);
        return true;
      }
    }
    return false;
  }

  /**
   * Merge a branch back into the target document by computing the diff
   * between the branch state and target state, then applying it.
   * Returns the merged state.
   */
  mergeBranch(branchId: string, targetState: Uint8Array): Uint8Array | null {
    const branchState = this.getBranchState(branchId);
    if (!branchState) {
      return null;
    }

    // Create target doc and apply branch changes
    const targetDoc = new Y.Doc();
    Y.applyUpdate(targetDoc, targetState);

    // Create branch doc
    const branchDoc = new Y.Doc();
    Y.applyUpdate(branchDoc, branchState);

    // Compute diff from target's perspective and apply branch updates
    const targetSV = Y.encodeStateVector(targetDoc);
    const branchUpdate = Y.encodeStateAsUpdate(branchDoc, targetSV);
    Y.applyUpdate(targetDoc, branchUpdate);

    const mergedState = Y.encodeStateAsUpdate(targetDoc);

    targetDoc.destroy();
    branchDoc.destroy();

    return mergedState;
  }
}
