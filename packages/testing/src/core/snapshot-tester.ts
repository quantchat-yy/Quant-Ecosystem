// ============================================================================
// Quant Ecosystem - Testing Framework: Snapshot Tester
// Snapshot capture, serialization, diff generation, file management
// ============================================================================

import type { SnapshotData, SnapshotFile, SnapshotDiff } from '../types';

/**
 * Serializes any value into a stable string representation
 * Handles circular references, functions, symbols, and all JS types
 */
function serialize(value: unknown, indent: number = 0, seen: Set<unknown> = new Set()): string {
  const pad = '  '.repeat(indent);
  const innerPad = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    return String(value);
  }
  if (typeof value === 'string') return `"${escapeString(value)}"`;
  if (typeof value === 'symbol') return `Symbol(${value.description ?? ''})`;
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'bigint') return `${value}n`;

  // Circular reference check
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
  }

  if (value instanceof Date) return `Date("${value.toISOString()}")`;
  if (value instanceof RegExp) return `/${value.source}/${value.flags}`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  if (value instanceof Map) {
    if (value.size === 0) return 'Map {}';
    let result = 'Map {\n';
    for (const [k, v] of value) {
      result += `${innerPad}${serialize(k, indent + 1, seen)} => ${serialize(v, indent + 1, seen)},\n`;
    }
    result += `${pad}}`;
    return result;
  }

  if (value instanceof Set) {
    if (value.size === 0) return 'Set {}';
    let result = 'Set {\n';
    for (const v of value) {
      result += `${innerPad}${serialize(v, indent + 1, seen)},\n`;
    }
    result += `${pad}}`;
    return result;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    let result = '[\n';
    for (let i = 0; i < value.length; i++) {
      result += `${innerPad}${serialize(value[i], indent + 1, seen)},\n`;
    }
    result += `${pad}]`;
    return result;
  }

  if (ArrayBuffer.isView(value)) {
    const typedArr = value as unknown as {
      length: number;
      [i: number]: number;
      constructor: { name: string };
    };
    const name = typedArr.constructor.name;
    const items: string[] = [];
    for (let i = 0; i < Math.min(typedArr.length, 20); i++) {
      items.push(String(typedArr[i]));
    }
    if (typedArr.length > 20) items.push('...');
    return `${name} [${items.join(', ')}]`;
  }

  // Plain object
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  if (keys.length === 0) return '{}';

  let result = '{\n';
  for (const key of keys) {
    const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    result += `${innerPad}${keyStr}: ${serialize(obj[key], indent + 1, seen)},\n`;
  }
  result += `${pad}}`;
  return result;
}

/**
 * Escapes special characters in a string for snapshot output
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Generates a unified diff between two strings
 */
function generateDiff(expected: string, received: string): string {
  const expectedLines = expected.split('\n');
  const receivedLines = received.split('\n');
  const diff: string[] = [];

  // Simple line-by-line diff using LCS approach
  const lcs = computeLCS(expectedLines, receivedLines);
  let ei = 0,
    ri = 0,
    li = 0;

  while (ei < expectedLines.length || ri < receivedLines.length) {
    if (li < lcs.length && ei < expectedLines.length && expectedLines[ei] === lcs[li]) {
      if (ri < receivedLines.length && receivedLines[ri] === lcs[li]) {
        diff.push(`  ${lcs[li]}`);
        ei++;
        ri++;
        li++;
      } else {
        diff.push(`+ ${receivedLines[ri]}`);
        ri++;
      }
    } else if (ei < expectedLines.length) {
      if (ri < receivedLines.length && li < lcs.length && receivedLines[ri] === lcs[li]) {
        diff.push(`- ${expectedLines[ei]}`);
        ei++;
      } else if (ri < receivedLines.length) {
        diff.push(`- ${expectedLines[ei]}`);
        diff.push(`+ ${receivedLines[ri]}`);
        ei++;
        ri++;
      } else {
        diff.push(`- ${expectedLines[ei]}`);
        ei++;
      }
    } else if (ri < receivedLines.length) {
      diff.push(`+ ${receivedLines[ri]}`);
      ri++;
    }
  }

  return diff.join('\n');
}

/**
 * Computes Longest Common Subsequence of two string arrays
 */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const result: string[] = [];
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]!);
      i--;
      j--;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * SnapshotTester - Manages snapshot capture, storage, and comparison
 */
export class SnapshotTester {
  private snapshots: Map<string, SnapshotFile> = new Map();
  private currentFile: string = '__default__';
  private counters: Map<string, number> = new Map();
  private usedKeys: Set<string> = new Set();
  private updateMode: boolean = false;

  constructor(config: { updateMode?: boolean } = {}) {
    this.updateMode = config.updateMode ?? false;
  }

  /**
   * Sets the current snapshot file path
   */
  setFile(path: string): void {
    this.currentFile = path;
    if (!this.snapshots.has(path)) {
      this.snapshots.set(path, {
        path,
        snapshots: new Map(),
        obsolete: [],
      });
    }
  }

  /**
   * Matches a value against its stored snapshot
   * Creates the snapshot on first run, compares on subsequent runs
   */
  toMatchSnapshot(value: unknown, key?: string): SnapshotDiff {
    const snapshotKey = key ?? this.generateKey();
    this.usedKeys.add(snapshotKey);

    const file = this.getOrCreateFile();
    const serialized = serialize(value);
    const existing = file.snapshots.get(snapshotKey);

    if (!existing || this.updateMode) {
      // First run or update mode: store the snapshot
      file.snapshots.set(snapshotKey, {
        key: snapshotKey,
        value: serialized,
        timestamp: Date.now(),
        counter: this.getCounter(snapshotKey),
      });
      return { expected: serialized, received: serialized, diff: '', pass: true };
    }

    // Compare with stored snapshot
    if (existing.value === serialized) {
      return { expected: existing.value, received: serialized, diff: '', pass: true };
    }

    // Mismatch
    const diff = generateDiff(existing.value, serialized);
    return { expected: existing.value, received: serialized, diff, pass: false };
  }

  /**
   * Inline snapshot comparison (value embedded in test code)
   */
  toMatchInlineSnapshot(value: unknown, inlineSnapshot: string): SnapshotDiff {
    const serialized = serialize(value);
    const trimmedInline = inlineSnapshot.trim();

    if (serialized === trimmedInline) {
      return { expected: trimmedInline, received: serialized, diff: '', pass: true };
    }

    const diff = generateDiff(trimmedInline, serialized);
    return { expected: trimmedInline, received: serialized, diff, pass: false };
  }

  /**
   * Detects snapshots that are no longer used
   */
  getObsoleteSnapshots(): string[] {
    const file = this.getOrCreateFile();
    const obsolete: string[] = [];

    for (const key of file.snapshots.keys()) {
      if (!this.usedKeys.has(key)) {
        obsolete.push(key);
      }
    }

    file.obsolete = obsolete;
    return obsolete;
  }

  /**
   * Removes obsolete snapshots from storage
   */
  removeObsolete(): number {
    const obsolete = this.getObsoleteSnapshots();
    const file = this.getOrCreateFile();

    for (const key of obsolete) {
      file.snapshots.delete(key);
    }

    return obsolete.length;
  }

  /**
   * Gets all stored snapshots for a file
   */
  getSnapshots(path?: string): Map<string, SnapshotData> {
    const file = this.snapshots.get(path ?? this.currentFile);
    return file?.snapshots ?? new Map();
  }

  /**
   * Updates a specific snapshot
   */
  updateSnapshot(key: string, value: unknown): void {
    const file = this.getOrCreateFile();
    file.snapshots.set(key, {
      key,
      value: serialize(value),
      timestamp: Date.now(),
      counter: this.getCounter(key),
    });
  }

  /**
   * Exports all snapshots as a serialized string (for file writing)
   */
  exportSnapshots(path?: string): string {
    const file = this.snapshots.get(path ?? this.currentFile);
    if (!file) return '';

    let output = '// Snapshot file\n// Auto-generated - do not edit\n\n';
    const entries = [...file.snapshots.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, data] of entries) {
      output += `exports[\`${key}\`] = \`\n${data.value}\n\`;\n\n`;
    }

    return output;
  }

  /**
   * Imports snapshots from serialized string
   */
  importSnapshots(path: string, content: string): void {
    const file: SnapshotFile = { path, snapshots: new Map(), obsolete: [] };
    const regex = /exports\[`(.+?)`\]\s*=\s*`\n([\s\S]*?)\n`/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      file.snapshots.set(match[1]!, {
        key: match[1]!,
        value: match[2]!,
        timestamp: 0,
        counter: 0,
      });
    }

    this.snapshots.set(path, file);
  }

  /**
   * Resets counters for a new test run
   */
  resetCounters(): void {
    this.counters.clear();
    this.usedKeys.clear();
  }

  private getOrCreateFile(): SnapshotFile {
    if (!this.snapshots.has(this.currentFile)) {
      this.snapshots.set(this.currentFile, {
        path: this.currentFile,
        snapshots: new Map(),
        obsolete: [],
      });
    }
    return this.snapshots.get(this.currentFile)!;
  }

  private generateKey(): string {
    const base = this.currentFile;
    const count = this.getCounter(base);
    return `${base} ${count}`;
  }

  private getCounter(key: string): number {
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }
}

export { serialize, generateDiff };
