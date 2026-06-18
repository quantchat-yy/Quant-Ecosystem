// ============================================================================
// QuantTube - PlaylistService (in-memory)
// ----------------------------------------------------------------------------
// Minimal, dependency-free in-memory service backing the Library "Playlists"
// and "Watch Later" surfaces and the playlist/[id] detail page.
//
// Design notes (see .kiro/specs/quantube-real-data-wiring/design.md):
//   * All state is held in-memory, keyed by userId (mirrors the in-memory style
//     of packages/creator-economy's TierService and the as-shipped
//     HistoryService). No DB schema is introduced.
//   * This service has NO dependency on VideoService or prisma. It stores only
//     raw videoIds + positions + timestamps. Enrichment of video metadata
//     (title/thumbnail/channelName/duration) happens at the ROUTE layer
//     (Task 3), which is why getPlaylist / listWatchLater return thin entries
//     ({ id, videoId, position, addedAt } / { id, videoId, addedAt }).
//   * Watch Later is modeled as a server-reserved *system playlist* per user
//     (isSystem = true, server-set). Its videos ARE the watch-later entries;
//     listWatchLater returns those entries most-recently-added-first. This keeps
//     a single consistent model (Req 3.3).
//   * The internal model holds enough to produce BOTH the Library list shape
//     (PlaylistListItem) and the detail shape (PlaylistDetailMeta). Fields that
//     depend on video metadata enrichment (totalDuration) are returned as 0 and
//     recomputed by the route after enrichment.
// ============================================================================

/** Visibility values accepted for a playlist (mirrors library.tsx PlaylistData). */
export type PlaylistVisibility = 'public' | 'private' | 'unlisted';

/**
 * Input accepted by {@link PlaylistService.createPlaylist}. `isSystem` is
 * intentionally NOT part of the input — it is always server-assigned. If a
 * client supplies it the service ignores it (Req 2.16, 3.3).
 */
export interface CreatePlaylistInput {
  title: string;
  visibility?: PlaylistVisibility;
  description?: string;
  // Any client-supplied `isSystem` is ignored; declared here only so callers
  // forwarding raw bodies type-check. It is never read.
  isSystem?: boolean;
}

/**
 * Library "Playlists" tab list shape — structurally matches the page-local
 * `PlaylistData` exported from src/pages/library.tsx (Req 8.1, 8.4).
 */
export interface PlaylistListItem {
  id: string;
  title: string;
  thumbnail: string;
  videoCount: number;
  visibility: PlaylistVisibility;
  isSystem: boolean;
  updatedAt: string; // ISO-8601 UTC
}

/**
 * Playlist detail meta — structurally matches the page-local `PlaylistData`
 * (detail variant) exported from src/pages/playlist/[id].tsx.
 *
 * `totalDuration` is returned as 0 here; the route recomputes it from the
 * enriched per-video durations (the service holds no durations).
 */
export interface PlaylistDetailMeta {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  creatorName: string;
  creatorAvatar: string;
  videoCount: number;
  totalDuration: number;
  isPublic: boolean;
  collaborative: boolean;
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
}

/**
 * A thin, un-enriched playlist video entry. The route enriches each into the
 * page-local `PlaylistVideo` using VideoService(videoId).
 */
export interface PlaylistVideoEntry {
  id: string;
  videoId: string;
  position: number; // contiguous 1..n, unique, no gaps
  addedAt: string; // ISO-8601 UTC
}

/** Result of {@link PlaylistService.getPlaylist}. */
export interface PlaylistDetailResult {
  playlist: PlaylistDetailMeta;
  videos: PlaylistVideoEntry[];
}

/**
 * A thin, un-enriched watch-later entry. The route enriches each into the
 * page-local `WatchLaterItem` using VideoService(videoId).
 */
export interface WatchLaterEntry {
  id: string;
  videoId: string;
  addedAt: string; // ISO-8601 UTC
}

/**
 * Validation failure raised by the service (e.g. an out-of-range title). The
 * route maps this class to a deterministic 400 envelope. Defined locally so the
 * pure service has no dependency on @quant/server-core (and therefore no
 * transitive @quant/database import chain — keeps unit/property tests boot-free).
 */
export class PlaylistValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'PlaylistValidationError';
  }
}

// ---------------------------------------------------------------------------
// Internal model (never returned directly; mapped to the shapes above)
// ---------------------------------------------------------------------------

interface InternalVideo {
  id: string;
  videoId: string;
  position: number;
  addedAt: Date;
  // Monotonic insertion sequence. Used to order "most-recently-added-first"
  // deterministically even when several adds land in the same millisecond
  // (Date resolution is coarser than the add rate in tests).
  seq: number;
}

interface InternalPlaylist {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  visibility: PlaylistVisibility;
  isSystem: boolean;
  thumbnail: string;
  coverUrl: string;
  creatorName: string;
  creatorAvatar: string;
  collaborative: boolean;
  createdAt: Date;
  updatedAt: Date;
  videos: InternalVideo[];
}

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const WATCH_LATER_TITLE = 'Watch Later';

export class PlaylistService {
  /** All playlists, isolated per user. The Map key IS the ownership boundary. */
  private playlistsByUser = new Map<string, InternalPlaylist[]>();
  /** Monotonic id source — opaque ids, never derived from userId. */
  private idCounter = 0;
  /** Monotonic insertion-sequence source for stable recency ordering. */
  private seqCounter = 0;

  // --- public API (exactly the six operations required by Req 5.6) ---------

  /**
   * Return the list-shape playlists owned by `userId` (Req 2.5, 5.12). Always
   * includes the reserved "Watch Later" system playlist for that user.
   */
  listPlaylists(userId: string): PlaylistListItem[] {
    const playlists = this.ensureUser(userId);
    return playlists.map((p) => this.toListItem(p));
  }

  /**
   * Return the detail meta + ordered video entries for the playlist `id` owned
   * by `userId`, or `null` when the id is unknown OR owned by another user
   * (Req 2.8, 5.9). Returning `null` in both cases prevents existence leakage —
   * the route maps `null` to a 404 that is indistinguishable across the two
   * cases.
   */
  getPlaylist(userId: string, id: string): PlaylistDetailResult | null {
    const playlist = this.findOwned(userId, id);
    if (!playlist) {
      return null;
    }
    return {
      playlist: this.toDetailMeta(playlist),
      videos: this.orderedVideos(playlist).map((v) => this.toVideoEntry(v)),
    };
  }

  /**
   * Create a new (non-system) playlist owned by `userId` and return its
   * list shape (Req 2.14, 2.15, 2.16). The title is trimmed and validated to
   * 1..200 chars; visibility defaults to 'private'; `isSystem` is always
   * server-assigned to false (any client value is ignored).
   */
  createPlaylist(userId: string, input: CreatePlaylistInput): PlaylistListItem {
    const title = typeof input?.title === 'string' ? input.title.trim() : '';
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      throw new PlaylistValidationError(
        `Playlist title must be between ${TITLE_MIN} and ${TITLE_MAX} characters after trimming`,
      );
    }

    const visibility = input?.visibility ?? 'private';
    if (visibility !== 'public' && visibility !== 'private' && visibility !== 'unlisted') {
      throw new PlaylistValidationError(`Invalid visibility: ${String(visibility)}`);
    }

    const playlists = this.ensureUser(userId);
    const now = new Date();
    const playlist: InternalPlaylist = {
      id: this.nextId('pl'),
      ownerId: userId,
      title,
      description: typeof input?.description === 'string' ? input.description : '',
      visibility,
      isSystem: false, // SERVER-assigned; client `isSystem` is ignored.
      thumbnail: '',
      coverUrl: '',
      creatorName: '',
      creatorAvatar: '',
      collaborative: false,
      createdAt: now,
      updatedAt: now,
      videos: [],
    };
    playlists.push(playlist);
    return this.toListItem(playlist);
  }

  /**
   * Return the watch-later entries owned by `userId`, ordered
   * most-recently-added-first (Req 3.7, 5.12).
   */
  listWatchLater(userId: string): WatchLaterEntry[] {
    const wl = this.watchLaterPlaylist(userId);
    return [...wl.videos]
      .sort((a, b) => b.seq - a.seq)
      .map((v) => ({ id: v.id, videoId: v.videoId, addedAt: v.addedAt.toISOString() }));
  }

  /**
   * Add `videoId` to `userId`'s Watch Later. Idempotent: if the video is
   * already present, the existing entry is returned unchanged and no duplicate
   * is created and the existing order is preserved (Req 3.8, 3.10, 5.15).
   */
  addToWatchLater(userId: string, videoId: string): WatchLaterEntry {
    const wl = this.watchLaterPlaylist(userId);

    const existing = wl.videos.find((v) => v.videoId === videoId);
    if (existing) {
      // Idempotent: no new row, order untouched.
      return {
        id: existing.id,
        videoId: existing.videoId,
        addedAt: existing.addedAt.toISOString(),
      };
    }

    const now = new Date();
    const entry: InternalVideo = {
      id: this.nextId('wl'),
      videoId,
      position: wl.videos.length + 1, // contiguous append
      addedAt: now,
      seq: this.nextSeq(),
    };
    wl.videos.push(entry);
    wl.updatedAt = now;
    return { id: entry.id, videoId: entry.videoId, addedAt: entry.addedAt.toISOString() };
  }

  /**
   * Remove the watch-later entry `entryId` from `userId`'s Watch Later.
   * Idempotent no-op when the entry is absent (Req 3.9, 3.10, 5.15). After a
   * removal the remaining videos are re-indexed so positions stay a contiguous
   * 1..n permutation (Req 2.10).
   */
  removeFromWatchLater(userId: string, entryId: string): void {
    const wl = this.watchLaterPlaylist(userId);
    const index = wl.videos.findIndex((v) => v.id === entryId);
    if (index < 0) {
      return; // idempotent no-op
    }
    wl.videos.splice(index, 1);
    this.reindex(wl);
    wl.updatedAt = new Date();
  }

  // --- internal helpers ----------------------------------------------------

  /** Get (creating if needed) the per-user playlist list, with WL reserved. */
  private ensureUser(userId: string): InternalPlaylist[] {
    let playlists = this.playlistsByUser.get(userId);
    if (!playlists) {
      playlists = [];
      this.playlistsByUser.set(userId, playlists);
    }
    if (!playlists.some((p) => p.isSystem && p.title === WATCH_LATER_TITLE)) {
      const now = new Date();
      playlists.unshift({
        id: this.nextId('wl-pl'),
        ownerId: userId,
        title: WATCH_LATER_TITLE,
        description: '',
        visibility: 'private',
        isSystem: true, // SERVER-set reserved system playlist (Req 3.3).
        thumbnail: '',
        coverUrl: '',
        creatorName: '',
        creatorAvatar: '',
        collaborative: false,
        createdAt: now,
        updatedAt: now,
        videos: [],
      });
    }
    return playlists;
  }

  /** Find a playlist by id but only if owned by `userId` (else undefined). */
  private findOwned(userId: string, id: string): InternalPlaylist | undefined {
    const playlists = this.ensureUser(userId);
    return playlists.find((p) => p.id === id);
  }

  /** The reserved Watch Later system playlist for a user. */
  private watchLaterPlaylist(userId: string): InternalPlaylist {
    const playlists = this.ensureUser(userId);
    // ensureUser guarantees presence.
    return playlists.find((p) => p.isSystem && p.title === WATCH_LATER_TITLE)!;
  }

  /** Videos ordered by their (already contiguous) position 1..n. */
  private orderedVideos(playlist: InternalPlaylist): InternalVideo[] {
    return [...playlist.videos].sort((a, b) => a.position - b.position);
  }

  /** Re-assign contiguous 1..n positions in current order (no gaps/dupes). */
  private reindex(playlist: InternalPlaylist): void {
    playlist.videos
      .sort((a, b) => a.position - b.position)
      .forEach((v, i) => {
        v.position = i + 1;
      });
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  private nextSeq(): number {
    this.seqCounter += 1;
    return this.seqCounter;
  }

  private toListItem(p: InternalPlaylist): PlaylistListItem {
    return {
      id: p.id,
      title: p.title,
      thumbnail: p.thumbnail,
      videoCount: p.videos.length,
      visibility: p.visibility,
      isSystem: p.isSystem,
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toDetailMeta(p: InternalPlaylist): PlaylistDetailMeta {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      coverUrl: p.coverUrl,
      creatorName: p.creatorName,
      creatorAvatar: p.creatorAvatar,
      videoCount: p.videos.length,
      totalDuration: 0, // route recomputes from enriched durations
      isPublic: p.visibility === 'public',
      collaborative: p.collaborative,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toVideoEntry(v: InternalVideo): PlaylistVideoEntry {
    return {
      id: v.id,
      videoId: v.videoId,
      position: v.position,
      addedAt: v.addedAt.toISOString(),
    };
  }
}
