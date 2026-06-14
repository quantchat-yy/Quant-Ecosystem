import { describe, it, expect } from 'vitest';
import { registerQuanttubeVoice, dispatchCommand } from './voice-registration';

describe('QuantTube voice registration', () => {
  it('registers the quanttube app and executes a navigate action', async () => {
    registerQuanttubeVoice();

    const results = await dispatchCommand({
      source: 'agent',
      targetApp: 'quanttube',
      action: 'navigate',
      params: { target: 'library' },
      userId: 'user-1',
    });

    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result?.success).toBe(true);
    expect(result?.message).toContain('library');
    expect(result?.app).toBe('quanttube');
  });

  it('executes create, search and summarize actions', async () => {
    registerQuanttubeVoice();

    const createResults = await dispatchCommand({
      source: 'agent',
      targetApp: 'quanttube',
      action: 'create',
      params: { type: 'clip' },
      userId: 'user-1',
    });
    expect(createResults[0]?.success).toBe(true);
    expect(createResults[0]?.data).toEqual({ type: 'clip' });

    const searchResults = await dispatchCommand({
      source: 'agent',
      targetApp: 'quanttube',
      action: 'search',
      params: { query: 'gaming' },
      userId: 'user-1',
    });
    expect(searchResults[0]?.success).toBe(true);
    expect(searchResults[0]?.message).toContain('gaming');

    const summarizeResults = await dispatchCommand({
      source: 'agent',
      targetApp: 'quanttube',
      action: 'summarize',
      params: { target: 'live-stream' },
      userId: 'user-1',
    });
    expect(summarizeResults[0]?.success).toBe(true);
    expect(summarizeResults[0]?.message).toContain('live-stream');
  });
});
