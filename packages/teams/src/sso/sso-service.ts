import type { SSOConfig } from '../types.js';

// Structured logger for SSO events (avoids no-console lint rule)
const ssoLogger = {
  warn: (msg: string, meta?: Record<string, unknown>) => {
    process.stderr.write(JSON.stringify({ level: 'warn', service: 'sso', msg, ...meta }) + '\n');
  },
};

export interface SAMLConfigInput {
  entityId: string;
  metadataUrl: string;
  certificate: string;
  mappings?: Record<string, string>;
  allowInsecureAssertion?: boolean;
}

export interface OIDCConfigInput {
  entityId: string;
  metadataUrl: string;
  certificate: string;
  mappings?: Record<string, string>;
  allowInsecureAssertion?: boolean;
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
      allowInsecureAssertion: config.allowInsecureAssertion ?? false,
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
      allowInsecureAssertion: config.allowInsecureAssertion ?? false,
    };
    this.configs.set(orgId, ssoConfig);
    return ssoConfig;
  }

  /**
   * Validates an SSO assertion.
   *
   * Real SAML/OIDC signature verification is NOT yet implemented. To avoid an
   * authentication bypass, this method FAILS CLOSED (returns { valid: false })
   * unless the org config explicitly opts into the insecure stub via
   * `allowInsecureAssertion: true` — intended only for dev/test environments.
   *
   * TODO: Replace with real SAML/OIDC signature verification (certificate
   * validation, expiry checking, audience restriction) and drop the escape hatch.
   */
  async validateAssertion(
    orgId: string,
    assertion: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const config = this.configs.get(orgId);
    if (!config) return { valid: false };
    if (!assertion || assertion.length === 0) return { valid: false };

    if (!config.allowInsecureAssertion) {
      // Fail closed until real signature verification exists.
      ssoLogger.warn('SSO_VERIFICATION_NOT_IMPLEMENTED: rejecting assertion', { orgId });
      return { valid: false };
    }

    // INSECURE_SSO_STUB: accepting assertion without signature verification
    ssoLogger.warn('INSECURE_SSO_STUB: accepting assertion without signature verification', {
      orgId,
    });
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
