import { describe, it, expect } from 'vitest';
import { zapConfig, createZapConfig } from '../security/owasp-zap';
import { snykConfig, createSnykConfig } from '../security/snyk';

describe('Security Config', () => {
  it('ZAP config targets all 13 apps', () => {
    expect(zapConfig.apps).toHaveLength(13);
    const appNames = zapConfig.apps.map((app) => app.name);
    expect(appNames).toContain('quantchat');
    expect(appNames).toContain('quantmail');
    expect(appNames).toContain('quantai');
    expect(appNames).toContain('quantads');
    expect(appNames).toContain('quantube');
    expect(appNames).toContain('quantneon');
    expect(appNames).toContain('quantsync');
    expect(appNames).toContain('quantdocs');
    expect(appNames).toContain('quantdrive');
    expect(appNames).toContain('quantmeet');
    expect(appNames).toContain('quantcalendar');
    expect(appNames).toContain('quantedits');
    expect(appNames).toContain('quantmax');
  });

  it('ZAP config has SQL injection and XSS scan policies enabled', () => {
    const sqlInjection = zapConfig.scanPolicies.find((p) => p.name === 'SQL Injection');
    const xss = zapConfig.scanPolicies.find((p) => p.name === 'XSS');

    expect(sqlInjection).toBeDefined();
    expect(sqlInjection!.enabled).toBe(true);
    expect(sqlInjection!.strength).toBe('high');

    expect(xss).toBeDefined();
    expect(xss!.enabled).toBe(true);
    expect(xss!.strength).toBe('high');
  });

  it('ZAP alert thresholds allow zero high-severity findings', () => {
    expect(zapConfig.alertThresholds.maxHigh).toBe(0);
    expect(zapConfig.alertThresholds.failOnHigh).toBe(true);
  });

  it('Snyk config lists package manifests for all workspace packages', () => {
    expect(zapConfig.apps.length).toBe(13);
    // Verify manifests cover apps, packages, and services
    const appManifests = snykConfig.packageManifests.filter((m) => m.startsWith('apps/'));
    const packageManifests = snykConfig.packageManifests.filter((m) => m.startsWith('packages/'));
    const serviceManifests = snykConfig.packageManifests.filter((m) => m.startsWith('services/'));

    expect(appManifests.length).toBe(13);
    expect(packageManifests.length).toBeGreaterThanOrEqual(10);
    expect(serviceManifests.length).toBeGreaterThanOrEqual(1);
    expect(snykConfig.packageManifests).toContain('package.json');
  });

  it("Snyk severity threshold is 'high'", () => {
    expect(snykConfig.severity).toBe('high');
  });

  it('Snyk license compliance denies GPL-3.0', () => {
    expect(snykConfig.licenseCompliance.deniedLicenses).toContain('GPL-3.0');
  });

  it('createZapConfig merges overrides correctly', () => {
    const custom = createZapConfig({
      target: 'http://staging.quant.app',
      contextName: 'staging',
    });

    expect(custom.target).toBe('http://staging.quant.app');
    expect(custom.contextName).toBe('staging');
    // Original complex fields preserved
    expect(custom.apps).toHaveLength(13);
    expect(custom.scanPolicies).toHaveLength(5);
  });

  it('createSnykConfig merges overrides correctly', () => {
    const custom = createSnykConfig({
      organization: 'custom-org',
      severity: 'critical',
      autoFix: true,
    });

    expect(custom.organization).toBe('custom-org');
    expect(custom.severity).toBe('critical');
    expect(custom.autoFix).toBe(true);
    // Original license compliance preserved
    expect(custom.licenseCompliance.deniedLicenses).toContain('GPL-3.0');
  });
});
