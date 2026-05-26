// ============================================================================
// Moderation - CSAM Matcher
// NCMEC PhotoDNA-compatible interface for CSAM detection
// ============================================================================

import type { CSAMMatcherInterface } from '../types';

/**
 * NoOpCSAMMatcher - No-operation CSAM matcher implementation
 *
 * This is a placeholder implementation that always returns not-matched.
 * In production, this would be replaced with a real NCMEC PhotoDNA
 * or similar hash-matching integration.
 */
export class NoOpCSAMMatcher implements CSAMMatcherInterface {
  async checkHash(_hash: string): Promise<{ matched: boolean; reportId?: string }> {
    return { matched: false };
  }

  async reportMatch(_params: { hash: string; source: string }): Promise<void> {
    // No-op in this implementation
  }
}
