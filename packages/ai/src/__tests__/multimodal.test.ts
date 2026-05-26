import { describe, it, expect, beforeEach } from 'vitest';
import { MultimodalAI } from '../advanced/multimodal';

describe('MultimodalAI', () => {
  let ai: MultimodalAI;

  beforeEach(() => {
    ai = new MultimodalAI({ modelId: 'test-multimodal' });
  });

  describe('analyzeImage', () => {
    it('analyzes an image and returns vision result', async () => {
      const result = await ai.analyzeImage('base64_image_data');

      expect(result.description).toBeDefined();
      expect(result.objects).toBeDefined();
      expect(result.objects.length).toBeGreaterThan(0);
      expect(result.labels).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('uses custom prompt for analysis', async () => {
      const result = await ai.analyzeImage('base64_image_data', 'Count the people');

      expect(result.metadata?.prompt).toBe('Count the people');
    });

    it('handles buffer input', async () => {
      const buffer = Buffer.from('fake_image_data');
      const result = await ai.analyzeImage(buffer);

      expect(result.description).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('describeVideo', () => {
    it('analyzes video and returns scenes', async () => {
      const result = await ai.describeVideo('base64_video_data');

      expect(result.description).toBeDefined();
      expect(result.scenes).toBeDefined();
      expect(result.scenes.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('supports detailed option', async () => {
      const result = await ai.describeVideo('video_data', { detailed: true });

      expect(result.metadata?.detailed).toBe(true);
    });

    it('supports timestamps option', async () => {
      const result = await ai.describeVideo('video_data', { timestamps: true });

      expect(result.metadata?.timestamps).toBe(true);
      expect(result.scenes[0]?.startMs).toBeDefined();
      expect(result.scenes[0]?.endMs).toBeDefined();
    });
  });

  describe('transcribeAudio', () => {
    it('transcribes audio to text', async () => {
      const result = await ai.transcribeAudio('audio_data');

      expect(result.transcript).toBeDefined();
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('supports specifying language', async () => {
      const result = await ai.transcribeAudio('audio_data', 'fr');

      expect(result.language).toBe('fr');
    });

    it('returns segments with timing', async () => {
      const result = await ai.transcribeAudio('audio_data');

      expect(result.segments).toBeDefined();
      expect(result.segments!.length).toBeGreaterThan(0);
      expect(result.segments![0]?.startMs).toBeDefined();
      expect(result.segments![0]?.endMs).toBeDefined();
    });
  });

  describe('generateImage', () => {
    it('generates an image from prompt', async () => {
      const result = await ai.generateImage('A sunset over mountains');

      expect(result.id).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.format).toBe('png');
      expect(result.size).toBeGreaterThan(0);
    });

    it('supports custom dimensions', async () => {
      const result = await ai.generateImage('Test', { width: 512, height: 512 });

      expect(result.metadata?.width).toBe(512);
      expect(result.metadata?.height).toBe(512);
    });

    it('supports style configuration', async () => {
      const result = await ai.generateImage('Test', { style: 'photorealistic' });

      expect(result.metadata?.style).toBe('photorealistic');
    });
  });

  describe('generateSpeech', () => {
    it('generates speech from text', async () => {
      const result = await ai.generateSpeech('Hello world');

      expect(result.id).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.format).toBe('mp3');
      expect(result.size).toBeGreaterThan(0);
    });

    it('supports custom voice', async () => {
      const result = await ai.generateSpeech('Hello', 'alloy');

      expect(result.metadata?.voice).toBe('alloy');
    });

    it('supports speech config', async () => {
      const result = await ai.generateSpeech('Hello', undefined, { speed: 1.5, format: 'wav' });

      expect(result.format).toBe('wav');
      expect(result.metadata?.speed).toBe(1.5);
    });
  });

  describe('imageToText', () => {
    it('extracts text from image', async () => {
      const result = await ai.imageToText('image_data');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('textToImage', () => {
    it('converts text to image', async () => {
      const result = await ai.textToImage('Hello World');

      expect(result.id).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata?.quality).toBe('hd');
    });

    it('supports style parameter', async () => {
      const result = await ai.textToImage('Hello', 'watercolor');

      expect(result.metadata?.style).toBe('watercolor');
    });
  });

  describe('videoUnderstanding', () => {
    it('answers questions about video', async () => {
      const questions = ['What is happening?', 'How many people?'];
      const result = await ai.videoUnderstanding('video_data', questions);

      expect(result.answers).toBeDefined();
      expect(result.answers!.length).toBe(2);
      expect(result.scenes).toBeDefined();
    });
  });

  describe('generateVideo', () => {
    it('generates video from prompt', async () => {
      const result = await ai.generateVideo('A cat playing piano');

      expect(result.id).toBeDefined();
      expect(result.format).toBe('mp4');
      expect(result.size).toBeGreaterThan(0);
    });

    it('supports duration and resolution', async () => {
      const result = await ai.generateVideo('Test', { duration: 10, resolution: '4k' });

      expect(result.metadata?.duration).toBe(10);
      expect(result.metadata?.resolution).toBe('4k');
    });
  });
});
