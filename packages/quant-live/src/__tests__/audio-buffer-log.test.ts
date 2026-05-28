import { describe, it, expect, vi } from 'vitest';
import { AudioBufferLog } from '../privacy/audio-buffer-log.js';

describe('AudioBufferLog', () => {
  it('append adds entries and getSize reflects count', () => {
    const log = new AudioBufferLog();
    log.append({ data: new Float32Array(10), timestamp: Date.now(), duration: 100 });
    log.append({ data: new Float32Array(10), timestamp: Date.now(), duration: 100 });
    expect(log.getSize()).toBe(2);
  });

  it('auto-purges unstarred entries older than buffer duration', () => {
    const log = new AudioBufferLog(1000); // 1 second buffer
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    log.append({ data: new Float32Array(10), timestamp: now - 2000, duration: 100 });

    // This entry is older than 1s and unstarred, should be purged on next append
    vi.spyOn(Date, 'now').mockReturnValue(now);
    log.append({ data: new Float32Array(10), timestamp: now, duration: 100 });
    expect(log.getSize()).toBe(1);
    vi.restoreAllMocks();
  });

  it('starred entries survive auto-purge', () => {
    const log = new AudioBufferLog(1000);
    const now = Date.now();
    // At time of first append, the entry is within buffer window
    vi.spyOn(Date, 'now').mockReturnValue(now);
    log.append({ data: new Float32Array(10), timestamp: now, duration: 100 });
    log.star(now, now);

    // Advance time so entry is now older than buffer duration
    vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
    log.append({ data: new Float32Array(10), timestamp: now + 2000, duration: 100 });
    // Starred entry survives purge
    expect(log.getSize()).toBe(2);
    vi.restoreAllMocks();
  });

  it('forget(seconds) removes entries from last N seconds', () => {
    const log = new AudioBufferLog();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    log.append({ data: new Float32Array(10), timestamp: now - 5000, duration: 100 });
    log.append({ data: new Float32Array(10), timestamp: now - 500, duration: 100 });

    log.forget(2); // forget last 2 seconds
    expect(log.getSize()).toBe(1);
    vi.restoreAllMocks();
  });

  it('getLastN returns correct subset', () => {
    const log = new AudioBufferLog();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    log.append({ data: new Float32Array(10), timestamp: now - 10000, duration: 100 });
    log.append({ data: new Float32Array(10), timestamp: now - 3000, duration: 100 });
    log.append({ data: new Float32Array(10), timestamp: now - 500, duration: 100 });

    const last5 = log.getLastN(5);
    expect(last5.length).toBe(2);
    vi.restoreAllMocks();
  });

  it('clear removes all entries', () => {
    const log = new AudioBufferLog();
    log.append({ data: new Float32Array(10), timestamp: Date.now(), duration: 100 });
    log.append({ data: new Float32Array(10), timestamp: Date.now(), duration: 100 });
    log.clear();
    expect(log.getSize()).toBe(0);
  });
});
