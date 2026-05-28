import type { GenerationRequest, SafetyResult, SensitivityLevel } from '../types.js';

const NSFW_PATTERNS = /\b(nude|naked|porn|nsfw|explicit|sexual|xxx)\b/i;
const VIOLENCE_PATTERNS = /\b(gore|murder|torture|mutilat|dismember)\b/i;
const IMPERSONATION_PATTERNS =
  /\b(deepfake|impersonat|as\s+\w+\s+(celebrity|president|actor|singer))\b/i;
const COPYRIGHT_PATTERNS = /\b(mickey\s*mouse|harry\s*potter|spider[-\s]?man|batman|superman)\b/i;

export class ContentSafetyGate {
  constructor(private sensitivity: SensitivityLevel = 'moderate') {}

  check(request: GenerationRequest): SafetyResult {
    const reasons: string[] = [];
    const prompt = request.prompt;

    if (NSFW_PATTERNS.test(prompt)) reasons.push('nsfw_content');
    if (VIOLENCE_PATTERNS.test(prompt)) reasons.push('violence');
    if (IMPERSONATION_PATTERNS.test(prompt)) reasons.push('impersonation');
    if (COPYRIGHT_PATTERNS.test(prompt)) reasons.push('copyright_violation');

    // Threshold: strict=block any match, moderate=allow borderline (1 flag), permissive=allow up to 2 flags
    const threshold = this.sensitivity === 'strict' ? 0 : this.sensitivity === 'moderate' ? 1 : 2;
    const allowed = reasons.length <= threshold;
    const confidence = reasons.length === 0 ? 1.0 : 0.9;

    return { allowed, reasons, confidence };
  }
}
