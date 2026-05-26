// ============================================================================
// E2E - Safety Numbers
// Verifiable fingerprint between two users
// ============================================================================

import * as crypto from 'node:crypto';

/**
 * Compute a 60-digit numeric fingerprint (safety number) from two identity public keys.
 * Hash both identity public keys with SHA-256, interleave, truncate to 30 bytes,
 * encode as 60 digits.
 */
export function computeSafetyNumber(
  identityKeyA: crypto.KeyObject,
  identityKeyB: crypto.KeyObject,
): string {
  const derA = identityKeyA.export({ type: 'spki', format: 'der' });
  const derB = identityKeyB.export({ type: 'spki', format: 'der' });

  const hashA = crypto.createHash('sha256').update(derA).digest();
  const hashB = crypto.createHash('sha256').update(derB).digest();

  // Sort by hash to ensure both parties compute the same fingerprint
  const [first, second] = Buffer.compare(hashA, hashB) <= 0 ? [hashA, hashB] : [hashB, hashA];

  // Interleave bytes from both hashes
  const interleaved = Buffer.alloc(64);
  for (let i = 0; i < 32; i++) {
    interleaved[i * 2] = first[i] as number;
    interleaved[i * 2 + 1] = second[i] as number;
  }

  // Hash the interleaved result and truncate to 30 bytes
  const finalHash = crypto.createHash('sha256').update(interleaved).digest();
  const truncated = finalHash.subarray(0, 30);

  // Encode each byte as 2 digits (mod 100), producing 60 digits
  let fingerprint = '';
  for (let i = 0; i < 30; i++) {
    const byte = truncated[i] as number;
    fingerprint += byte.toString().padStart(2, '0').slice(-2);
  }

  // Ensure exactly 60 digits by encoding bytes as values 00-99
  return fingerprint.slice(0, 60).padEnd(60, '0');
}
