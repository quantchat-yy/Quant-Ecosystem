// ============================================================================
// QuantTube - Segment Service (AI segment-skip foundation)
// ============================================================================
//
// The deterministic backbone for "play only the useful parts" playback. An AI
// pipeline (or a creator, or community votes) labels a video's timeline into
// segments (intro, content, sponsor, recap, outro, filler). This service stores
// those segments and computes a SKIP-PLAN: the playable time ranges that remain
// after removing the kinds the viewer wants to skip.
//
// Pure interval math + an injected narrow prisma interface, so it is fully
// unit-testable with a mock.

import { createAppError } from '@quant/server-core';

export type SegmentKind = 'intro' | 'content' | 'sponsor' | 'recap' | 'outro' | 'filler';

export const SEGMENT_KINDS: readonly SegmentKind[] = [
  'intro',
  'content',
  'sponsor',
  'recap',
  'outro',
  'filler',
];

/** Kinds skipped by default (everything that isn't core content). */
export const DEFAULT_SKIP_KINDS: readonly SegmentKind[] = [
  'intro',
  'sponsor',
  'recap',
  'outro',
  'filler',
];

export interface SegmentInput {
  kind: SegmentKind;
  startSec: number;
  endSec: number;
  label?: string;
  source?: 'ai' | 'creator' | 'community';
}

export interface SegmentRow {
  id: string;
  videoId: string;
  kind: string;
  label: string | null;
  startSec: number;
  endSec: number;
  source: string;
}

export interface TimeRange {
  startSec: number;
  endSec: number;
}

export interface SkipPlan {
  videoId: string;
  durationSec: number;
  skipKinds: SegmentKind[];
  /** Ranges that will be SKIPPED (merged, sorted). */
  skipRanges: TimeRange[];
  /** Ranges that will actually PLAY (the complement within [0, duration]). */
  playRanges: TimeRange[];
  skippedSec: number;
  playableSec: number;
}

export interface SegmentPrisma {
  videoSegment: {
    findMany: (args: Record<string, unknown>) => Promise<SegmentRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<SegmentRow>;
    deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  };
}

function isValidKind(k: unknown): k is SegmentKind {
  return typeof k === 'string' && (SEGMENT_KINDS as readonly string[]).includes(k);
}

/** Merge overlapping/adjacent ranges into a sorted, non-overlapping set. */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges]
    .filter((r) => r.endSec > r.startSec)
    .sort((a, b) => a.startSec - b.startSec);
  const merged: TimeRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.startSec <= last.endSec) {
      last.endSec = Math.max(last.endSec, r.endSec);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/** The complement of `skip` within [0, duration] — the ranges that play. */
export function invertRanges(skip: TimeRange[], durationSec: number): TimeRange[] {
  const play: TimeRange[] = [];
  let cursor = 0;
  for (const r of skip) {
    const start = Math.max(0, Math.min(r.startSec, durationSec));
    const end = Math.max(0, Math.min(r.endSec, durationSec));
    if (start > cursor) play.push({ startSec: cursor, endSec: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < durationSec) play.push({ startSec: cursor, endSec: durationSec });
  return play;
}

export class SegmentService {
  constructor(private readonly prisma: SegmentPrisma) {}

  /** Replace all segments for a video (validated). */
  async setSegments(videoId: string, segments: SegmentInput[]): Promise<SegmentRow[]> {
    if (!videoId) throw createAppError('videoId is required', 400, 'VIDEO_ID_REQUIRED');
    for (const s of segments) {
      if (!isValidKind(s.kind)) {
        throw createAppError(
          `Invalid segment kind '${String(s.kind)}'`,
          400,
          'INVALID_SEGMENT_KIND',
        );
      }
      if (
        typeof s.startSec !== 'number' ||
        typeof s.endSec !== 'number' ||
        !Number.isFinite(s.startSec) ||
        !Number.isFinite(s.endSec) ||
        s.startSec < 0 ||
        s.endSec <= s.startSec
      ) {
        throw createAppError(
          'Each segment needs 0 <= startSec < endSec',
          400,
          'INVALID_SEGMENT_RANGE',
        );
      }
    }

    await this.prisma.videoSegment.deleteMany({ where: { videoId } });
    const created: SegmentRow[] = [];
    for (const s of segments) {
      created.push(
        await this.prisma.videoSegment.create({
          data: {
            videoId,
            kind: s.kind,
            label: s.label ?? null,
            startSec: s.startSec,
            endSec: s.endSec,
            source: s.source ?? 'ai',
          },
        }),
      );
    }
    return created.sort((a, b) => a.startSec - b.startSec);
  }

  /** List a video's segments, sorted by start time. */
  async listSegments(videoId: string): Promise<SegmentRow[]> {
    const rows = await this.prisma.videoSegment.findMany({ where: { videoId } });
    return [...rows].sort((a, b) => a.startSec - b.startSec);
  }

  /**
   * Compute the skip-plan for a video: the play ranges that remain after
   * removing the segments whose kind is in `skipKinds` (defaults to everything
   * that isn't core content).
   */
  async getSkipPlan(
    videoId: string,
    options: { durationSec: number; skipKinds?: SegmentKind[] },
  ): Promise<SkipPlan> {
    const durationSec = options.durationSec;
    if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) {
      throw createAppError('durationSec must be a positive number', 400, 'INVALID_DURATION');
    }
    const skipKinds = (options.skipKinds ?? [...DEFAULT_SKIP_KINDS]).filter(isValidKind);
    const skipSet = new Set<string>(skipKinds);

    const segments = await this.listSegments(videoId);
    const rawSkip = segments
      .filter((s) => skipSet.has(s.kind))
      .map((s) => ({ startSec: s.startSec, endSec: s.endSec }));

    const skipRanges = mergeRanges(rawSkip).map((r) => ({
      startSec: Math.max(0, Math.min(r.startSec, durationSec)),
      endSec: Math.max(0, Math.min(r.endSec, durationSec)),
    }));
    const playRanges = invertRanges(skipRanges, durationSec);

    const skippedSec = skipRanges.reduce((sum, r) => sum + (r.endSec - r.startSec), 0);
    const playableSec = playRanges.reduce((sum, r) => sum + (r.endSec - r.startSec), 0);

    return {
      videoId,
      durationSec,
      skipKinds,
      skipRanges,
      playRanges,
      skippedSec,
      playableSec,
    };
  }
}
