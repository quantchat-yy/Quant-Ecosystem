// ============================================================================
// Property test — PlaylistService playlist position invariant
// Spec: quantube-real-data-wiring, Task 2.3
//
// Feature: quantube-real-data-wiring, Property 7: In any PlaylistDetailResponse,
// videos positions form a contiguous permutation of 1..n with no duplicates.
//
// **Validates: Requirements 2.10, 2.11**
//
// Convention: fast-check is NOT a quantube dependency. This follows the repo's
// realized property-test convention — a seeded deterministic mulberry32 RNG loop
// with >=100 samples (see creator-tier-upgrade.bug3.seam.test.ts).
//
// The only service operations that populate a playlist's videos are the
// Watch Later add/remove operations (Watch Later is itself a reserved system
// playlist). So this test drives random add/remove sequences against a user's
// Watch Later playlist, reads it back via getPlaylist, and asserts the position
// invariant — including the empty (n=0) case where it holds vacuously.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { PlaylistService } from '../playlist.service';

// Deterministic seeded RNG (mulberry32) — mirrors the repo PBT convention.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLES = 120; // >= 100 cases

function watchLaterId(service: PlaylistService, userId: string): string {
  const wl = service.listPlaylists(userId).find((p) => p.title === 'Watch Later');
  if (!wl) throw new Error('Watch Later playlist not reserved');
  return wl.id;
}

describe('Property 7: playlist video positions form a contiguous permutation of 1..n', () => {
  it('holds across >=100 randomized add/remove sequences (incl. empty)', () => {
    const rand = mulberry32(0x504c_3037); // "PL07"
    let emptyCasesSeen = 0;
    let nonEmptyCasesSeen = 0;

    for (let s = 0; s < SAMPLES; s += 1) {
      const service = new PlaylistService();
      const userId = `user-${s}`;

      // Random number of distinct videos to add (0..25), so n includes 0.
      const addCount = Math.floor(rand() * 26);
      for (let i = 0; i < addCount; i += 1) {
        service.addToWatchLater(userId, `vid-${i}`);
      }

      // Random number of removals of currently-present entries (0..addCount+3,
      // some may target already-removed/absent ids => idempotent no-ops).
      const removeCount = Math.floor(rand() * (addCount + 4));
      for (let r = 0; r < removeCount; r += 1) {
        const current = service.listWatchLater(userId);
        if (current.length === 0) break;
        const victim = current[Math.floor(rand() * current.length)]!;
        service.removeFromWatchLater(userId, victim.id);
      }

      const wlId = watchLaterId(service, userId);
      const detail = service.getPlaylist(userId, wlId);
      expect(detail).not.toBeNull();
      const positions = detail!.videos.map((v) => v.position);
      const n = positions.length;

      if (n === 0) {
        emptyCasesSeen += 1;
        // Invariant holds vacuously; videos must be exactly [].
        expect(detail!.videos).toEqual([]);
        continue;
      }
      nonEmptyCasesSeen += 1;

      // Sorted positions equal [1..n] exactly => unique, no gaps, contiguous.
      const sorted = [...positions].sort((a, b) => a - b);
      const expected = Array.from({ length: n }, (_, i) => i + 1);
      expect(sorted).toEqual(expected);
      // Unique (no duplicates).
      expect(new Set(positions).size).toBe(n);
    }

    // Sanity: the generator exercised both empty and non-empty playlists.
    expect(nonEmptyCasesSeen).toBeGreaterThan(0);
    expect(emptyCasesSeen).toBeGreaterThan(0);
  });
});
