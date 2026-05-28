import { describe, it, expect } from 'vitest';
import { buildTileUrl, createTileConfig } from '../tiles/tile-config.js';

describe('TileConfig', () => {
  it('builds tile URL correctly', () => {
    expect(buildTileUrl('https://tiles.example.com', 5, 12, 8)).toBe(
      'https://tiles.example.com/5/12/8.pbf',
    );
  });

  it('creates config with India center and default layers', () => {
    const config = createTileConfig();
    expect(config.center.lat).toBeCloseTo(20.5937);
    expect(config.center.lng).toBeCloseTo(78.9629);
    expect(config.source.type).toBe('pmtiles');
    expect(config.layers).toHaveLength(4);
    expect(config.layers.map((l) => l.type)).toEqual(['land', 'water', 'road', 'building']);
  });

  it('uses self-hosted URL when provided', () => {
    const config = createTileConfig('https://my-server.local/tiles');
    expect(config.source.url).toBe('https://my-server.local/tiles');
  });
});
