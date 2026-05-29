import { SynthIDWatermarker } from '../provenance/synthid-watermark.js';
import { ProvenanceManager } from '../provenance/c2pa-stamp.js';

describe('SynthIDWatermarker', () => {
  let watermarker: SynthIDWatermarker;

  beforeEach(() => {
    watermarker = new SynthIDWatermarker({ strength: 0.9, algorithm: 'hybrid' });
  });

  it('embeds and detects watermark in image buffer', () => {
    const original = Buffer.from('fake-image-data');
    const metadata = { model: 'sd3', timestamp: Date.now(), userId: 'user-1' };

    const watermarked = watermarker.embedImage(original, metadata);
    expect(watermarked.length).toBeGreaterThan(original.length);

    const detection = watermarker.detect(watermarked, 'image');
    expect(detection.isWatermarked).toBe(true);
    expect(detection.confidence).toBeGreaterThan(0);
    expect(detection.metadata?.model).toBe('sd3');
    expect(detection.metadata?.userId).toBe('user-1');
  });

  it('embeds and detects watermark in audio buffer', () => {
    const original = Buffer.from('fake-audio-data');
    const metadata = { model: 'musicgen', timestamp: Date.now(), userId: 'user-2' };

    const watermarked = watermarker.embedAudio(original, metadata);
    expect(watermarked.length).toBeGreaterThan(original.length);

    const detection = watermarker.detect(watermarked, 'audio');
    expect(detection.isWatermarked).toBe(true);
    expect(detection.metadata?.model).toBe('musicgen');
  });

  it('reports not watermarked for plain buffer', () => {
    const plain = Buffer.from('no watermark here');
    const detection = watermarker.detect(plain, 'image');
    expect(detection.isWatermarked).toBe(false);
    expect(detection.confidence).toBeGreaterThan(0);
  });

  it('uses configured strength', () => {
    const config = watermarker.getConfig();
    expect(config.strength).toBe(0.9);
    expect(config.algorithm).toBe('hybrid');
  });
});

describe('ProvenanceManager', () => {
  let manager: ProvenanceManager;

  beforeEach(() => {
    manager = new ProvenanceManager();
  });

  it('creates a manifest with all fields', () => {
    const manifest = manager.createManifest(
      'asset-001',
      {
        model: 'flux',
        prompt: 'sunset over mountains',
        userId: 'creator-1',
      },
      { data: Buffer.from('fake-image-data'), mediaType: 'image' },
    );

    expect(manifest.assetId).toBe('asset-001');
    expect(manifest.generationModel).toBe('flux');
    expect(manifest.prompt).toBe('sunset over mountains');
    expect(manifest.userId).toBe('creator-1');
    expect(manifest.c2paSignature).toBeTruthy();
    expect(manifest.synthIdEmbedded).toBe(true);
    expect(manifest.parentAssets).toEqual([]);
    expect(manifest.editHistory).toEqual([]);
  });

  it('reports synthIdEmbedded=false when no asset data is provided', () => {
    const manifest = manager.createManifest('asset-no-wm', {
      model: 'flux',
      prompt: 'no watermark',
      userId: 'creator-1',
    });
    expect(manifest.synthIdEmbedded).toBe(false);

    // Without SynthID evidence, verification must not report "verified".
    const result = manager.verifyAsset('asset-no-wm');
    expect(result.status).toBe('unverified');
  });

  it('creates manifest with parent assets and edit history', () => {
    const manifest = manager.createManifest('asset-002', {
      model: 'sd3',
      prompt: 'enhanced version',
      userId: 'editor-1',
      parentAssets: ['asset-001'],
      editHistory: ['upscale', 'color-correct'],
    });

    expect(manifest.parentAssets).toEqual(['asset-001']);
    expect(manifest.editHistory).toEqual(['upscale', 'color-correct']);
  });

  it('verifies a previously created asset', () => {
    manager.createManifest(
      'asset-003',
      {
        model: 'flux',
        prompt: 'a dog',
        userId: 'user-1',
      },
      { data: Buffer.from('fake-image-data'), mediaType: 'image' },
    );

    const result = manager.verifyAsset('asset-003');
    expect(result.status).toBe('verified');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.manifest).not.toBeNull();
    expect(result.manifest!.assetId).toBe('asset-003');
  });

  it('returns unverified for unknown asset', () => {
    const result = manager.verifyAsset('unknown-asset');
    expect(result.status).toBe('unverified');
    expect(result.confidence).toBe(0);
    expect(result.manifest).toBeNull();
  });

  it('exposes watermarker and stamper', () => {
    expect(manager.getWatermarker()).toBeDefined();
    expect(manager.getStamper()).toBeDefined();
  });
});
