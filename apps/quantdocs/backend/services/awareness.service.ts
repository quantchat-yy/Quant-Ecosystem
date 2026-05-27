/**
 * AwarenessService - Manages per-document awareness state (cursors, selections, user info).
 * Implements the awareness protocol for Yjs collaboration.
 */

export interface AwarenessState {
  clientId: string;
  userId: string;
  cursor?: {
    anchor: number;
    head: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  user: {
    name: string;
    color: string;
  };
  lastUpdated: number;
}

export class AwarenessService {
  private readonly states: Map<string, Map<string, AwarenessState>> = new Map();
  private readonly staleThresholdMs: number;

  constructor(staleThresholdMs = 30000) {
    this.staleThresholdMs = staleThresholdMs;
  }

  updateAwareness(
    docId: string,
    clientId: string,
    state: Omit<AwarenessState, 'clientId' | 'lastUpdated'>,
  ): void {
    let docStates = this.states.get(docId);
    if (!docStates) {
      docStates = new Map();
      this.states.set(docId, docStates);
    }

    docStates.set(clientId, {
      ...state,
      clientId,
      lastUpdated: Date.now(),
    });
  }

  removeClient(docId: string, clientId: string): void {
    const docStates = this.states.get(docId);
    if (docStates) {
      docStates.delete(clientId);
      if (docStates.size === 0) {
        this.states.delete(docId);
      }
    }
  }

  getAwareness(docId: string): AwarenessState[] {
    const docStates = this.states.get(docId);
    if (!docStates) {
      return [];
    }
    return Array.from(docStates.values());
  }

  cleanupStaleClients(): number {
    const now = Date.now();
    let removed = 0;

    for (const [docId, docStates] of this.states.entries()) {
      for (const [clientId, state] of docStates.entries()) {
        if (now - state.lastUpdated >= this.staleThresholdMs) {
          docStates.delete(clientId);
          removed++;
        }
      }
      if (docStates.size === 0) {
        this.states.delete(docId);
      }
    }

    return removed;
  }
}
