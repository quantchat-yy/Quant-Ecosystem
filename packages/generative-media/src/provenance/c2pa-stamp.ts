import type { C2PACredential, ProvenanceManifest, VerificationResult } from '../types.js';
import { SynthIDWatermarker } from './synthid-watermark.js';

export class C2PAStamper {
  private registry = new Map<string, C2PACredential>();

  stamp(
    assetId: string,
    metadata: { model: string; prompt: string; userId: string },
  ): C2PACredential {
    const credential: C2PACredential = {
      assetId,
      model: metadata.model,
      prompt: metadata.prompt,
      timestamp: Date.now(),
      userId: metadata.userId,
      // Placeholder - real implementation uses C2PA SDK with cryptographic signing
      signature: `mock:${Buffer.from(`${assetId}:${metadata.model}:${metadata.userId}`).toString('hex').slice(0, 32)}`,
    };
    this.registry.set(assetId, credential);
    return credential;
  }

  verify(assetId: string): C2PACredential | null {
    return this.registry.get(assetId) ?? null;
  }
}

export class ProvenanceManager {
  private stamper: C2PAStamper;
  private watermarker: SynthIDWatermarker;
  private manifests = new Map<string, ProvenanceManifest>();

  constructor(stamper?: C2PAStamper, watermarker?: SynthIDWatermarker) {
    this.stamper = stamper ?? new C2PAStamper();
    this.watermarker = watermarker ?? new SynthIDWatermarker();
  }

  createManifest(
    assetId: string,
    generationMeta: {
      model: string;
      prompt: string;
      userId: string;
      parentAssets?: string[];
      editHistory?: string[];
    },
  ): ProvenanceManifest {
    const credential = this.stamper.stamp(assetId, {
      model: generationMeta.model,
      prompt: generationMeta.prompt,
      userId: generationMeta.userId,
    });

    const manifest: ProvenanceManifest = {
      assetId,
      generationModel: generationMeta.model,
      prompt: generationMeta.prompt,
      timestamp: credential.timestamp,
      userId: generationMeta.userId,
      c2paSignature: credential.signature,
      synthIdEmbedded: true,
      parentAssets: generationMeta.parentAssets ?? [],
      editHistory: generationMeta.editHistory ?? [],
    };

    this.manifests.set(assetId, manifest);
    return manifest;
  }

  verifyAsset(assetId: string): VerificationResult {
    const manifest = this.manifests.get(assetId) ?? null;
    const c2paCredential = this.stamper.verify(assetId);

    if (!manifest || !c2paCredential) {
      return { assetId, status: 'unverified', confidence: 0, manifest: null };
    }

    const signatureValid = c2paCredential.signature === manifest.c2paSignature;
    if (!signatureValid) {
      return { assetId, status: 'tampered', confidence: 0.9, manifest };
    }

    return { assetId, status: 'verified', confidence: 0.98, manifest };
  }

  getWatermarker(): SynthIDWatermarker {
    return this.watermarker;
  }

  getStamper(): C2PAStamper {
    return this.stamper;
  }
}
