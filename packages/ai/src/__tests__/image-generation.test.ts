import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImageGenerationService } from '../services/image-generation';

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;

  beforeEach(() => {
    service = new ImageGenerationService();
  });

  afterEach(() => {
    // cleanup
  });

  describe('isAvailable', () => {
    it('returns false when no API key is set', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('generate', () => {
    it('returns a stub result', async () => {
      const result = await service.generate(
        { prompt: 'A beautiful sunset over mountains' },
        'user-1',
      );

      expect(result.id).toBeDefined();
      expect(result.url).toContain('placeholder.quant.ai');
      expect(result.revisedPrompt).toBe('A beautiful sunset over mountains');
      expect(result.size).toBe('1024x1024');
      expect(result.style).toBe('natural');
      expect(result.quality).toBe('standard');
      expect(result.model).toBe('dall-e-3-stub');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('uses specified size, style, and quality', async () => {
      const result = await service.generate(
        {
          prompt: 'A robot',
          size: '512x512',
          style: 'digital-art',
          quality: 'hd',
        },
        'user-1',
      );

      expect(result.size).toBe('512x512');
      expect(result.style).toBe('digital-art');
      expect(result.quality).toBe('hd');
    });
  });

  describe('edit', () => {
    it('returns a stub edit result', async () => {
      const result = await service.edit(
        {
          prompt: 'Add a hat',
          imageUrl: 'https://example.com/image.png',
        },
        'user-1',
      );

      expect(result.id).toBeDefined();
      expect(result.url).toContain('edit');
      expect(result.revisedPrompt).toBe('Add a hat');
    });
  });

  describe('createVariation', () => {
    it('returns the requested number of variations', async () => {
      const results = await service.createVariation('https://example.com/image.png', 'user-1', 3);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.id).toContain('img_var');
        expect(result.url).toContain('variation');
      }
    });

    it('defaults to 1 variation', async () => {
      const results = await service.createVariation('https://example.com/image.png', 'user-1');

      expect(results).toHaveLength(1);
    });
  });

  describe('getSupportedSizes', () => {
    it('returns all supported sizes', () => {
      const sizes = service.getSupportedSizes();
      expect(sizes).toContain('256x256');
      expect(sizes).toContain('1024x1024');
      expect(sizes).toContain('1792x1024');
      expect(sizes.length).toBe(5);
    });
  });

  describe('getSupportedStyles', () => {
    it('returns all supported styles', () => {
      const styles = service.getSupportedStyles();
      expect(styles).toContain('natural');
      expect(styles).toContain('vivid');
      expect(styles).toContain('anime');
      expect(styles.length).toBe(5);
    });
  });
});
