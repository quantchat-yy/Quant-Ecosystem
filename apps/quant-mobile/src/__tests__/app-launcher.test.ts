import { describe, it, expect, beforeEach } from 'vitest';
import { AppLauncher, QUANT_APPS } from '../app-launcher.js';

describe('AppLauncher', () => {
  let launcher: AppLauncher;

  beforeEach(() => {
    launcher = new AppLauncher();
  });

  describe('getApps', () => {
    it('should return all 13 Quant apps', () => {
      const apps = launcher.getApps();
      expect(apps).toHaveLength(13);
    });

    it('should include all expected app IDs', () => {
      const apps = launcher.getApps();
      const ids = apps.map((a) => a.id);
      expect(ids).toContain('quantmail');
      expect(ids).toContain('quantchat');
      expect(ids).toContain('quantai');
      expect(ids).toContain('quantads');
      expect(ids).toContain('quantneon');
      expect(ids).toContain('quantsync');
      expect(ids).toContain('quantube');
      expect(ids).toContain('quantmax');
      expect(ids).toContain('quantedits');
      expect(ids).toContain('quantdocs');
      expect(ids).toContain('quantdrive');
      expect(ids).toContain('quantcalendar');
      expect(ids).toContain('quantmeet');
    });

    it('should have name, icon, route, color, description for each app', () => {
      const apps = launcher.getApps();
      for (const app of apps) {
        expect(app.name).toBeTruthy();
        expect(app.icon).toBeTruthy();
        expect(app.route).toBeTruthy();
        expect(app.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(app.description).toBeTruthy();
      }
    });
  });

  describe('QUANT_APPS constant', () => {
    it('should export 13 apps', () => {
      expect(QUANT_APPS).toHaveLength(13);
    });
  });

  describe('launchApp', () => {
    it('should successfully launch a valid app', () => {
      const result = launcher.launchApp('quantmail');
      expect(result.success).toBe(true);
      expect(result.route).toBe('/mail');
    });

    it('should return failure for unknown app', () => {
      const result = launcher.launchApp('nonexistent');
      expect(result.success).toBe(false);
      expect(result.route).toBe('');
    });

    it('should track launched app in recent apps', () => {
      launcher.launchApp('quantchat');
      const recent = launcher.getRecentApps();
      expect(recent).toHaveLength(1);
      expect(recent[0]!.id).toBe('quantchat');
    });
  });

  describe('getAppStatus', () => {
    it('should return ready for all apps by default', () => {
      expect(launcher.getAppStatus('quantmail')).toBe('ready');
      expect(launcher.getAppStatus('quantai')).toBe('ready');
    });

    it('should return error for unknown apps', () => {
      expect(launcher.getAppStatus('unknown')).toBe('error');
    });
  });

  describe('searchApps', () => {
    it('should search by name', () => {
      const results = launcher.searchApps('mail');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.id).toBe('quantmail');
    });

    it('should search by description', () => {
      const results = launcher.searchApps('encrypted');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.id).toBe('quantchat');
    });

    it('should be case-insensitive', () => {
      const results = launcher.searchApps('CALENDAR');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.id).toBe('quantcalendar');
    });

    it('should return empty for no matches', () => {
      const results = launcher.searchApps('xyznonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getRecentApps', () => {
    it('should return empty when no apps launched', () => {
      expect(launcher.getRecentApps()).toHaveLength(0);
    });

    it('should return last 5 launched apps', () => {
      launcher.launchApp('quantmail');
      launcher.launchApp('quantchat');
      launcher.launchApp('quantai');
      launcher.launchApp('quantads');
      launcher.launchApp('quantneon');
      launcher.launchApp('quantsync');

      const recent = launcher.getRecentApps();
      expect(recent).toHaveLength(5);
      expect(recent[0]!.id).toBe('quantsync');
    });

    it('should deduplicate recent apps', () => {
      launcher.launchApp('quantmail');
      launcher.launchApp('quantchat');
      launcher.launchApp('quantmail');

      const recent = launcher.getRecentApps();
      expect(recent).toHaveLength(2);
      expect(recent[0]!.id).toBe('quantmail');
      expect(recent[1]!.id).toBe('quantchat');
    });
  });
});
