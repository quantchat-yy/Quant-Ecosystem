interface Hist {
  value: unknown;
  writerId: string;
  timestamp: number;
}
export class SharedScratchpad {
  private data = new Map<string, Map<string, unknown>>();
  private hist = new Map<string, Map<string, Hist[]>>();
  write(gid: string, key: string, value: unknown, writerId: string): void {
    if (!this.data.has(gid)) this.data.set(gid, new Map());
    if (!this.hist.has(gid)) this.hist.set(gid, new Map());
    this.data.get(gid)!.set(key, value);
    const h = this.hist.get(gid)!;
    if (!h.has(key)) h.set(key, []);
    h.get(key)!.push({ value, writerId, timestamp: Date.now() });
  }
  // prettier-ignore
  read(gid: string, key: string): unknown | null { return this.data.get(gid)?.get(key) ?? null; }
  getAll(gid: string): Record<string, unknown> {
    const m = this.data.get(gid);
    return m ? Object.fromEntries(m.entries()) : {};
  }
  merge(gid: string, entries: Record<string, unknown>, writerId: string): void {
    for (const [k, v] of Object.entries(entries)) this.write(gid, k, v, writerId);
  }
  // prettier-ignore
  getHistory(gid: string, key: string): Hist[] { return this.hist.get(gid)?.get(key) ?? []; }
}
