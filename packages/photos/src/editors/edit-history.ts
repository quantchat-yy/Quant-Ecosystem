export interface EditHistoryEntry {
  operation: string;
  inputUri: string;
  outputUri: string;
  timestamp: number;
}

export class EditHistory {
  private entries: EditHistoryEntry[] = [];

  addEntry(operation: string, inputUri: string, outputUri: string): void {
    this.entries.push({ operation, inputUri, outputUri, timestamp: Date.now() });
  }

  undo(): EditHistoryEntry | undefined {
    return this.entries.pop();
  }

  getHistory(): EditHistoryEntry[] {
    return [...this.entries];
  }

  getOriginalUri(): string | undefined {
    return this.entries[0]?.inputUri;
  }

  exportFinal(): string | undefined {
    if (this.entries.length === 0) return undefined;
    return this.entries[this.entries.length - 1]!.outputUri;
  }
}
