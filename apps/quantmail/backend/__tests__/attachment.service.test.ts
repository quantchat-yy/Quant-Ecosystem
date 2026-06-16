import { describe, it, expect, beforeEach } from 'vitest';
import { AttachmentService } from '../services/attachment.service';

describe('AttachmentService', () => {
  let service: AttachmentService;

  beforeEach(() => {
    service = new AttachmentService();
  });

  describe('generateUploadUrl', () => {
    it('generates a presigned upload URL', async () => {
      const result = await service.generateUploadUrl(
        'user-1',
        'document.pdf',
        'application/pdf',
        102400,
      );

      expect(result.attachmentId).toMatch(/^att_/);
      expect(result.uploadUrl).toContain('quantmail-attachments');
      expect(result.uploadUrl).toContain('user-1');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects files exceeding 25MB', async () => {
      await expect(
        service.generateUploadUrl('user-1', 'huge.zip', 'application/zip', 26 * 1024 * 1024),
      ).rejects.toThrow('exceeds maximum of 25MB');
    });

    it('rejects zero-size files', async () => {
      await expect(
        service.generateUploadUrl('user-1', 'empty.txt', 'text/plain', 0),
      ).rejects.toThrow('greater than 0');
    });

    it('rejects negative-size files', async () => {
      await expect(
        service.generateUploadUrl('user-1', 'neg.txt', 'text/plain', -1),
      ).rejects.toThrow('greater than 0');
    });

    it('rejects empty filename', async () => {
      await expect(service.generateUploadUrl('user-1', '', 'text/plain', 1024)).rejects.toThrow(
        'Filename is required',
      );
    });

    it('sets 15-minute expiry on upload URL', async () => {
      const before = Date.now();
      const result = await service.generateUploadUrl('user-1', 'test.txt', 'text/plain', 1024);
      const after = Date.now();

      const expiryMs = result.expiresAt.getTime();
      expect(expiryMs).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
      expect(expiryMs).toBeLessThanOrEqual(after + 15 * 60 * 1000 + 100);
    });

    it('generates unique attachment IDs', async () => {
      const r1 = await service.generateUploadUrl('user-1', 'a.txt', 'text/plain', 100);
      const r2 = await service.generateUploadUrl('user-1', 'b.txt', 'text/plain', 200);

      expect(r1.attachmentId).not.toBe(r2.attachmentId);
    });
  });

  describe('getAttachment', () => {
    it('returns attachment metadata', async () => {
      const result = await service.getAttachment('att_123', 'user-1');

      expect(result.id).toBe('att_123');
      expect(result.userId).toBe('user-1');
      expect(result.url).toContain('att_123');
    });

    it('throws for empty attachment ID', async () => {
      await expect(service.getAttachment('', 'user-1')).rejects.toThrow('Attachment not found');
    });
  });

  describe('deleteAttachment', () => {
    it('deletes an attachment', async () => {
      const result = await service.deleteAttachment('att_123', 'user-1');
      expect(result.deleted).toBe(true);
    });

    it('throws for empty attachment ID', async () => {
      await expect(service.deleteAttachment('', 'user-1')).rejects.toThrow('Attachment not found');
    });
  });
});
