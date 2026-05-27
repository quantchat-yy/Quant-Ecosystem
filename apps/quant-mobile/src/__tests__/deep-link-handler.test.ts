import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalLinkHandler } from '../deep-linking/deep-link-handler.js';
import type { RouteMap } from '../deep-linking/deep-link-handler.js';

describe('UniversalLinkHandler', () => {
  let handler: UniversalLinkHandler;

  const routes: RouteMap = {
    mail: { pattern: '/mail/:messageId', params: ['messageId'] },
    chat: { pattern: '/chat/:roomId', params: ['roomId'] },
    profile: { pattern: '/profile/:userId', params: ['userId'] },
    home: { pattern: '/', params: [] },
    docs: { pattern: '/docs/:docId/edit', params: ['docId'] },
  };

  beforeEach(() => {
    handler = new UniversalLinkHandler({ scheme: 'https', host: 'quant.app' });
    handler.registerRoutes(routes);
  });

  describe('route registration', () => {
    it('should register routes', () => {
      const registered = handler.getRegisteredRoutes();
      expect(Object.keys(registered)).toHaveLength(5);
      expect(registered['mail']).toBeDefined();
    });

    it('should merge additional routes', () => {
      handler.registerRoutes({ settings: { pattern: '/settings', params: [] } });
      const registered = handler.getRegisteredRoutes();
      expect(Object.keys(registered)).toHaveLength(6);
    });
  });

  describe('URL matching/parsing', () => {
    it('should match a URL to a registered route', () => {
      const result = handler.handleIncomingUrl('https://quant.app/mail/msg-123');
      expect(result.matched).toBe(true);
      expect(result.route).toBe('mail');
      expect(result.params).toEqual({ messageId: 'msg-123' });
    });

    it('should match nested route patterns', () => {
      const result = handler.handleIncomingUrl('https://quant.app/docs/doc-456/edit');
      expect(result.matched).toBe(true);
      expect(result.route).toBe('docs');
      expect(result.params).toEqual({ docId: 'doc-456' });
    });

    it('should return matched false for unknown routes', () => {
      const result = handler.handleIncomingUrl('https://quant.app/unknown/path');
      expect(result.matched).toBe(false);
      expect(result.route).toBeUndefined();
    });

    it('should handle plain paths without scheme', () => {
      const result = handler.handleIncomingUrl('/chat/room-789');
      expect(result.matched).toBe(true);
      expect(result.route).toBe('chat');
      expect(result.params).toEqual({ roomId: 'room-789' });
    });

    it('should match root route', () => {
      const result = handler.handleIncomingUrl('https://quant.app/');
      expect(result.matched).toBe(true);
      expect(result.route).toBe('home');
    });
  });

  describe('link generation', () => {
    it('should generate a full link for a route', () => {
      const link = handler.generateAppLink('mail', { messageId: 'msg-001' });
      expect(link).toBe('https://quant.app/mail/msg-001');
    });

    it('should generate a link with nested params', () => {
      const link = handler.generateAppLink('docs', { docId: 'abc-123' });
      expect(link).toBe('https://quant.app/docs/abc-123/edit');
    });

    it('should throw for unknown routes', () => {
      expect(() => handler.generateAppLink('nonexistent')).toThrow('Route not found');
    });
  });

  describe('iOS association file', () => {
    it('should generate apple-app-site-association format', () => {
      const association = handler.getIOSAssociation() as {
        applinks: { apps: string[]; details: Array<{ appID: string; paths: string[] }> };
      };
      expect(association.applinks).toBeDefined();
      expect(association.applinks.apps).toEqual([]);
      expect(association.applinks.details[0]!.appID).toBe('TEAMID.com.quant.app');
      expect(association.applinks.details[0]!.paths.length).toBeGreaterThan(0);
    });
  });

  describe('Android asset links', () => {
    it('should generate assetlinks.json format', () => {
      const assetLinks = handler.getAndroidAssetLinks() as Array<{
        relation: string[];
        target: { namespace: string; package_name: string };
      }>;
      expect(Array.isArray(assetLinks)).toBe(true);
      expect(assetLinks[0]!.relation).toContain('delegate_permission/common.handle_all_urls');
      expect(assetLinks[0]!.target.namespace).toBe('android_app');
      expect(assetLinks[0]!.target.package_name).toBe('com.quant.app');
    });
  });
});
