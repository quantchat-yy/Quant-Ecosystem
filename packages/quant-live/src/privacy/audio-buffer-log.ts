import type { AudioBufferEntry } from '../types.js';

let idCounter = 0;

export class AudioBufferLog {
  private entries: AudioBufferEntry[] = [];
  private bufferDurationMs: number;

  constructor(bufferDurationMs = 300000) {
    this.bufferDurationMs = bufferDurationMs;
  }

  append(chunk: { data: Float32Array; timestamp: number; duration: number }): void {
    const entry: AudioBufferEntry = {
      id: `buf-${++idCounter}`,
      data: chunk.data,
      timestamp: chunk.timestamp,
      duration: chunk.duration,
      starred: false,
    };
    this.entries.push(entry);
    this.purge();
  }

  getLastN(seconds: number): AudioBufferEntry[] {
    const cutoff = Date.now() - seconds * 1000;
    return this.entries.filter((e) => e.timestamp >= cutoff);
  }

  star(startTime: number, endTime: number): void {
    for (const entry of this.entries) {
      if (entry.timestamp >= startTime && entry.timestamp <= endTime) {
        entry.starred = true;
      }
    }
  }

  forget(seconds: number): void {
    const cutoff = Date.now() - seconds * 1000;
    this.entries = this.entries.filter((e) => e.timestamp < cutoff);
  }

  clear(): void {
    this.entries = [];
  }

  getSize(): number {
    return this.entries.length;
  }

  private purge(): void {
    const cutoff = Date.now() - this.bufferDurationMs;
    this.entries = this.entries.filter((e) => e.starred || e.timestamp >= cutoff);
  }
}
