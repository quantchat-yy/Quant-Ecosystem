import { ModalityRouter } from '../any-to-any/modality-router.js';
import {
  TextToImageTransform,
  TextToVideoTransform,
  TextToMusicTransform,
  TextTo3DTransform,
  ImageToVideoTransform,
  ImageTo3DTransform,
  ImageCaptionTransform,
  VideoSummaryTransform,
  AudioTranscriptionTransform,
} from '../any-to-any/transform-providers.js';

describe('ModalityRouter', () => {
  let router: ModalityRouter;

  beforeEach(() => {
    router = new ModalityRouter();
    router.register(new TextToImageTransform());
    router.register(new TextToVideoTransform());
    router.register(new TextToMusicTransform());
    router.register(new TextTo3DTransform());
    router.register(new ImageToVideoTransform());
    router.register(new ImageTo3DTransform());
    router.register(new ImageCaptionTransform());
    router.register(new VideoSummaryTransform());
    router.register(new AudioTranscriptionTransform());
  });

  it('routes text->image to TextToImageTransform', () => {
    const provider = router.route('text', 'image');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('text-to-image');
  });

  it('routes text->video to TextToVideoTransform', () => {
    const provider = router.route('text', 'video');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('text-to-video');
  });

  it('routes text->music to TextToMusicTransform', () => {
    const provider = router.route('text', 'music');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('text-to-music');
  });

  it('routes text->3d to TextTo3DTransform', () => {
    const provider = router.route('text', '3d');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('text-to-3d');
  });

  it('routes image->video to ImageToVideoTransform', () => {
    const provider = router.route('image', 'video');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('image-to-video');
  });

  it('routes image->3d to ImageTo3DTransform', () => {
    const provider = router.route('image', '3d');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('image-to-3d');
  });

  it('routes image->text to ImageCaptionTransform', () => {
    const provider = router.route('image', 'text');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('image-to-text');
  });

  it('routes video->text to VideoSummaryTransform', () => {
    const provider = router.route('video', 'text');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('video-to-text');
  });

  it('routes audio->text to AudioTranscriptionTransform', () => {
    const provider = router.route('audio', 'text');
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe('audio-to-text');
  });

  it('returns null for unsupported modality pair', () => {
    const provider = router.route('3d', 'music');
    expect(provider).toBeNull();
  });

  it('transform returns result for supported pair', async () => {
    const result = await router.transform('text', 'image', 'a cat');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('text-to-image');
  });

  it('transform returns null for unsupported pair', async () => {
    const result = await router.transform('3d', 'audio', 'test');
    expect(result).toBeNull();
  });

  it('lists all supported transforms', () => {
    const transforms = router.getSupportedTransforms();
    expect(transforms).toHaveLength(9);
  });

  it('supportsTransform returns correct boolean', () => {
    expect(router.supportsTransform('text', 'image')).toBe(true);
    expect(router.supportsTransform('3d', 'music')).toBe(false);
  });
});
