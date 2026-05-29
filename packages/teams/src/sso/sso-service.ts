import type { SSOConfig } from '../types.js';

export interface SAMLConfigInput {
  entityId: string;
  metadataUrl: string;
  certificate: string;
  mappings?: Record<string, string>;
}

export interface OIDCConfigInput {
  entityId: string;
  metadataUrl: string;
  certificate: string;
  mappings?: Record<string, string>;
}

export class SSOService {
  private configs = new Map<string, SSOConfig>();

  async configureSAML(orgId: string, config: SAMLConfigInput): Promise<SSOConfig> {
    const ssoConfig: SSOConfig = {
      id: crypto.randomUUID(),
      orgId,
      provider: 'saml',
      entityId: config.entityId,
      metadataUrl: config.metadataUrl,
      certificate: config.certificate,
      mappings: config.mappings ?? {},
    };
    this.configs.set(orgId, ssoConfig);
    return ssoConfig;
  }

  async configureOIDC(orgId: string, config: OIDCConfigInput): Promise<SSOConfig> {
    const ssoConfig: SSOConfig = {
      id: crypto.randomUUID(),
      orgId,
      provider: 'oidc',
      entityId: config.entityId,
      metadataUrl: config.metadataUrl,
      certificate: config.certificate,
      mappings: config.mappings ?? {},
    };
    this.configs.set(orgId, ssoConfig);
    return ssoConfig;
  }

  /**
   * WARNING: STUB ONLY - NOT IMPLEMENTED
   * This method accepts ANY non-empty string as a valid assertion.
   * It does NOT perform real SAML/OIDC signature verification,
   * certificate validation, expiry checking, or audience restriction.
   * DO NOT use this in production without replacing with real IdP validation.
   *
   * TODO: Replace with real SAML/OIDC signature verification before production use.
   */
  async validateAssertion(
    orgId: string,
    assertion: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    console.warn(
      'NOT_IMPLEMENTED: Real SAML/OIDC signature verification required for production. ' +
        'This stub accepts any non-empty string as valid.',
    );

    const config = this.configs.get(orgId);
    if (!config) return { valid: false };
    if (!assertion || assertion.length === 0) return { valid: false };
    return { valid: true, userId: `user-${orgId}-${assertion.slice(0, 8)}` };
  }

  async getConfig(orgId: string): Promise<SSOConfig | undefined> {
    return this.configs.get(orgId);
  }

  async disable(orgId: string): Promise<boolean> {
    return this.configs.delete(orgId);
  }

  async testConnection(orgId: string): Promise<{ success: boolean; latencyMs: number }> {
    const config = this.configs.get(orgId);
    if (!config) return { success: false, latencyMs: 0 };
    return { success: true, latencyMs: 42 };
  }
}
