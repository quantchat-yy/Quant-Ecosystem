// ============================================================================
// Moderation Worker - Image Handler
// Classifies images and checks perceptual hashes against known-bad list
// ============================================================================

import type {
  ImageClassifier,
  PerceptualHasher,
  PolicyEngine,
  ModerationResult,
} from '@quant/moderation';
import type { ModerationJob } from '@quant/queue';
import type { ActionExecutor } from '../action-executor';

export interface ImageHandlerDeps {
  classifier: ImageClassifier;
  hasher: PerceptualHasher;
  policyEngine: PolicyEngine;
  actionExecutor: ActionExecutor;
  knownBadHashes?: Set<string>;
}

export class ImageModerationHandler {
  private readonly classifier: ImageClassifier;
  private readonly hasher: PerceptualHasher;
  private readonly policyEngine: PolicyEngine;
  private readonly actionExecutor: ActionExecutor;
  private readonly knownBadHashes: Set<string>;

  constructor(deps: ImageHandlerDeps) {
    this.classifier = deps.classifier;
    this.hasher = deps.hasher;
    this.policyEngine = deps.policyEngine;
    this.actionExecutor = deps.actionExecutor;
    this.knownBadHashes = deps.knownBadHashes ?? new Set();
  }

  async handle(job: ModerationJob): Promise<ModerationResult> {
    // In production, the image would be fetched from job.content (URL) first.
    // Here we compute a perceptual image hash from the content bytes.
    const imageHash = this.hasher.computeImageHash(Buffer.from(job.content));

    // Check against known-bad hashes
    if (this.knownBadHashes.has(imageHash)) {
      const immediateResult: ModerationResult = {
        id: `imgmod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        contentId: job.contentId,
        contentType: 'image',
        categories: [{ category: 'nsfw', score: 1.0, confidence: 1.0, detected: true }],
        overallScore: 1.0,
        action: 'remove',
        confidence: 1.0,
        automated: true,
        flags: ['known_bad_hash'],
        metadata: { hash: imageHash, matchType: 'known_bad' },
        createdAt: Date.now(),
      };

      await this.actionExecutor.execute({
        action: 'remove',
        contentId: job.contentId,
        userId: job.userId,
        severity: 'critical',
        reason: 'Known-bad perceptual hash match',
        classificationResult: immediateResult,
      });

      return immediateResult;
    }

    // Classify via ML
    const classificationResult = await this.classifier.classify(
      { url: job.content },
      job.contentId,
    );

    const policyDecision = this.policyEngine.evaluate(classificationResult, job.appId);

    if (policyDecision.action !== 'approve') {
      await this.actionExecutor.execute({
        action: policyDecision.action,
        contentId: job.contentId,
        userId: job.userId,
        severity: policyDecision.severity,
        reason: `Image policy matched: ${policyDecision.matchedRules.map((r) => r.category).join(', ')}`,
        classificationResult,
      });
    }

    return {
      ...classificationResult,
      action: policyDecision.action,
    };
  }
}
