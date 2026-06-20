// @vitest-environment node
// ============================================================================
// QuantMail — DKIM provisioning round-trip (sign -> verify)
// ============================================================================
//
// Proves the outbound mail-auth path end to end WITHOUT a network: provision a
// domain's DKIM keypair, sign a message with the provisioned private key, then
// verify that signature through the service's own inbound DKIM verifier using
// the provisioned PUBLIC key as the DNS-published record. A receiver doing the
// same DNS lookup would therefore accept QuantMail's mail.

import { describe, it, expect } from 'vitest';
import {
  DeliverabilityAuthService,
  type DnsResolverPort,
} from '../services/deliverability-auth.service';

interface DomainAuthRow {
  domain: string;
  dkimSelector: string;
  publicKey: string;
  privateKeyRef: string;
  spfRecord: string | null;
  dmarcPolicy: string | null;
}

/** Minimal in-memory `domainAuthKey` delegate (findUnique + upsert). */
function createPrismaMock() {
  const rows = new Map<string, DomainAuthRow>();
  return {
    domainAuthKey: {
      findUnique: async ({ where }: { where: { domain: string } }) =>
        rows.get(where.domain) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { domain: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const existing = rows.get(where.domain);
        const next = (existing ? { ...existing, ...update } : { ...create }) as DomainAuthRow;
        rows.set(where.domain, next);
        return next;
      },
    },
  };
}

/** Fake DNS that serves the provisioned DKIM public key at its _domainkey host. */
function createFakeDns(dkimHost: string, publicKeyDerB64: string): DnsResolverPort {
  return {
    async resolveTxt(hostname: string): Promise<string[][]> {
      if (hostname === dkimHost) {
        return [[`v=DKIM1; k=rsa; p=${publicKeyDerB64}`]];
      }
      throw new Error(`NXDOMAIN ${hostname}`);
    },
    async resolveMx() {
      return [];
    },
    async resolve4() {
      return [];
    },
    async resolve6() {
      return [];
    },
  };
}

const HEADERS = {
  from: 'alice@example.com',
  to: 'bob@dest.example',
  subject: 'Quarterly update',
  date: 'Tue, 20 Jun 2026 10:00:00 +0000',
  'message-id': '<msg-1@example.com>',
};
const BODY = 'Hello Bob,\r\nHere is the update.\r\n';

describe('DeliverabilityAuthService.provisionDomainKey', () => {
  it('returns well-formed DKIM/SPF/DMARC DNS records', async () => {
    const service = new DeliverabilityAuthService(createPrismaMock() as never);
    const result = await service.provisionDomainKey('Example.com', { selector: 'qm2026' });

    expect(result.domain).toBe('example.com');
    expect(result.selector).toBe('qm2026');
    expect(result.publicKey.length).toBeGreaterThan(0);
    expect(result.dnsRecords.dkim.host).toBe('qm2026._domainkey.example.com');
    expect(result.dnsRecords.dkim.value).toBe(`v=DKIM1; k=rsa; p=${result.publicKey}`);
    expect(result.dnsRecords.spf.value).toContain('v=spf1');
    expect(result.dnsRecords.dmarc.host).toBe('_dmarc.example.com');
    expect(result.dnsRecords.dmarc.value).toContain('v=DMARC1');
  });

  it('signs mail that verifies against the provisioned (DNS-published) key', async () => {
    const prisma = createPrismaMock();
    // 1) Provision the domain's key.
    const provisionService = new DeliverabilityAuthService(prisma as never);
    const provisioned = await provisionService.provisionDomainKey('example.com', {
      selector: 'qm2026',
    });

    // 2) Sign a message with the provisioned private key (resolved from the vault).
    const signer = await provisionService.getDkimSigner('example.com');
    const dkimSignature = signer.sign(HEADERS, BODY);
    expect(dkimSignature).toContain('d=example.com');
    expect(dkimSignature).toContain('s=qm2026');
    expect(/(^|;)\s*b=[A-Za-z0-9+/=]+/.test(dkimSignature)).toBe(true);

    // 3) Verify it through the inbound verifier, with the provisioned PUBLIC key
    //    served as the DNS record a receiver would fetch.
    const verifyService = new DeliverabilityAuthService(prisma as never, {
      dns: createFakeDns('qm2026._domainkey.example.com', provisioned.publicKey),
    });
    const verdict = await verifyService.verifyInbound({
      headerFrom: HEADERS.from,
      headers: { ...HEADERS, 'dkim-signature': dkimSignature },
      rawBody: BODY,
    });

    expect(verdict.dkim).toBe('pass');
    expect(verdict.details.dkimDomain).toBe('example.com');
    expect(verdict.details.dkimAligned).toBe(true);
  });

  it('fails verification when the signed body is tampered with', async () => {
    const prisma = createPrismaMock();
    const service = new DeliverabilityAuthService(prisma as never);
    const provisioned = await service.provisionDomainKey('example.com', { selector: 'qm2026' });
    const signer = await service.getDkimSigner('example.com');
    const dkimSignature = signer.sign(HEADERS, BODY);

    const verifyService = new DeliverabilityAuthService(prisma as never, {
      dns: createFakeDns('qm2026._domainkey.example.com', provisioned.publicKey),
    });
    const verdict = await verifyService.verifyInbound({
      headerFrom: HEADERS.from,
      headers: { ...HEADERS, 'dkim-signature': dkimSignature },
      rawBody: `${BODY}TAMPERED`,
    });

    expect(verdict.dkim).toBe('fail');
  });
});
