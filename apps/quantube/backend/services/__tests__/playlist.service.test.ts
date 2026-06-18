// ============================================================================
// Unit tests — PlaylistService (pure in-memory service, no app boot)
// Spec: quantube-real-data-wiring, Task 2.2
// Requirements: 5.6, 5.9, 5.13, 2.14, 2.15, 2.16, 3.3, 3.8, 3.9
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PlaylistService, PlaylistValidationError } from '../playlist.service';

describe('PlaylistService', () => {
  let service: PlaylistService;

  beforeEach(() => {
    service = new PlaylistService();
  });

  describe('exposes exactly the required operations (Req 5.6)', () => {
    it('has the six named methods', () => {
      expect(typeof service.listPlaylists).toBe('function');
      expect(typeof service.getPlaylist).toBe('function');
      expect(typeof service.createPlaylist).toBe('function');
      expect(typeof service.listWatchLater).toBe('function');
      expect(typeof service.addToWatchLater).toBe('function');
      expect(typeof service.removeFromWatchLater).toBe('function');
    });
  });

  describe('createPlaylist + listPlaylists + getPlaylist', () => {
    it('creates a playlist and returns it in the list', () => {
      const created = service.createPlaylist('user-1', { title: 'My Mix' });
      const list = service.listPlaylists('user-1');

      expect(created.title).toBe('My Mix');
      expect(list.some((p) => p.id === created.id && p.title === 'My Mix')).toBe(true);
    });

    it('getPlaylist returns detail meta + empty videos for a new playlist (Req 2.11)', () => {
      const created = service.createPlaylist('user-1', { title: 'Empty PL' });
      const detail = service.getPlaylist('user-1', created.id);

      expect(detail).not.toBeNull();
      expect(detail!.playlist.id).toBe(created.id);
      expect(detail!.playlist.title).toBe('Empty PL');
      expect(detail!.videos).toEqual([]);
    });

    it('getPlaylist returns null for an unknown id (Req 5.9)', () => {
      expect(service.getPlaylist('user-1', 'does-not-exist')).toBeNull();
    });
  });

  describe('Watch Later system-playlist reservation (Req 3.3)', () => {
    it('reserves a "Watch Later" system playlist per user with server-set isSystem=true', () => {
      const list = service.listPlaylists('user-1');
      const wl = list.find((p) => p.title === 'Watch Later');

      expect(wl).toBeDefined();
      expect(wl!.isSystem).toBe(true);
      expect(wl!.visibility).toBe('private');
    });

    it('each user gets their own isolated Watch Later', () => {
      const a = service.listPlaylists('user-a').find((p) => p.title === 'Watch Later')!;
      const b = service.listPlaylists('user-b').find((p) => p.title === 'Watch Later')!;
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('createPlaylist defaults + server assignment (Req 2.15, 2.16)', () => {
    it('defaults visibility to private when omitted (Req 2.15)', () => {
      const created = service.createPlaylist('user-1', { title: 'No Visibility' });
      expect(created.visibility).toBe('private');
    });

    it('honors a supplied valid visibility', () => {
      const created = service.createPlaylist('user-1', {
        title: 'Public PL',
        visibility: 'public',
      });
      expect(created.visibility).toBe('public');
    });

    it('server-assigns isSystem=false and ignores a client-supplied isSystem (Req 2.16)', () => {
      const created = service.createPlaylist('user-1', {
        title: 'Sneaky',
        // A client may forward isSystem; the server must ignore it.
        isSystem: true,
      });
      expect(created.isSystem).toBe(false);
    });
  });

  describe('createPlaylist title trim + length validation (Req 2.14)', () => {
    it('trims whitespace around the title', () => {
      const created = service.createPlaylist('user-1', { title: '  Trimmed  ' });
      expect(created.title).toBe('Trimmed');
    });

    it('rejects an empty title', () => {
      expect(() => service.createPlaylist('user-1', { title: '' })).toThrow(
        PlaylistValidationError,
      );
    });

    it('rejects a whitespace-only title (trimmed length 0)', () => {
      expect(() => service.createPlaylist('user-1', { title: '    ' })).toThrow(
        PlaylistValidationError,
      );
    });

    it('rejects a title longer than 200 characters after trimming', () => {
      expect(() => service.createPlaylist('user-1', { title: 'x'.repeat(201) })).toThrow(
        PlaylistValidationError,
      );
    });

    it('accepts a title of exactly 200 characters (boundary)', () => {
      const created = service.createPlaylist('user-1', { title: 'x'.repeat(200) });
      expect(created.title.length).toBe(200);
    });

    it('does not create a playlist when validation fails', () => {
      const before = service.listPlaylists('user-1').length;
      expect(() => service.createPlaylist('user-1', { title: '' })).toThrow();
      const after = service.listPlaylists('user-1').length;
      expect(after).toBe(before);
    });
  });

  describe('user isolation (Req 5.13)', () => {
    it('cross-user getPlaylist returns null (no existence leakage)', () => {
      const created = service.createPlaylist('owner', { title: 'Owned' });
      // Another user requesting the same id sees exactly null — same as unknown.
      expect(service.getPlaylist('intruder', created.id)).toBeNull();
    });

    it('listPlaylists for one user excludes another user-created playlist', () => {
      const created = service.createPlaylist('owner', { title: 'Owned' });
      const otherList = service.listPlaylists('intruder');
      expect(otherList.some((p) => p.id === created.id)).toBe(false);
    });
  });

  describe('watch later: add idempotency + ordering (Req 3.8, 3.7)', () => {
    it('adding the same videoId twice creates no duplicate and returns the existing entry', () => {
      const first = service.addToWatchLater('user-1', 'vid-1');
      const second = service.addToWatchLater('user-1', 'vid-1');

      expect(second.id).toBe(first.id);
      const list = service.listWatchLater('user-1');
      expect(list.filter((e) => e.videoId === 'vid-1')).toHaveLength(1);
      expect(list).toHaveLength(1);
    });

    it('returns watch-later entries most-recently-added-first', () => {
      service.addToWatchLater('user-1', 'vid-1');
      service.addToWatchLater('user-1', 'vid-2');
      service.addToWatchLater('user-1', 'vid-3');

      const list = service.listWatchLater('user-1');
      expect(list.map((e) => e.videoId)).toEqual(['vid-3', 'vid-2', 'vid-1']);
    });

    it('re-adding an existing video preserves the original order', () => {
      service.addToWatchLater('user-1', 'vid-1');
      service.addToWatchLater('user-1', 'vid-2');
      service.addToWatchLater('user-1', 'vid-1'); // idempotent re-add

      const list = service.listWatchLater('user-1');
      expect(list.map((e) => e.videoId)).toEqual(['vid-2', 'vid-1']);
    });
  });

  describe('watch later: remove idempotency (Req 3.9)', () => {
    it('removes an existing entry', () => {
      const entry = service.addToWatchLater('user-1', 'vid-1');
      service.removeFromWatchLater('user-1', entry.id);
      expect(service.listWatchLater('user-1')).toHaveLength(0);
    });

    it('removing an absent entry is a no-op (does not throw)', () => {
      service.addToWatchLater('user-1', 'vid-1');
      expect(() => service.removeFromWatchLater('user-1', 'no-such-entry')).not.toThrow();
      expect(service.listWatchLater('user-1')).toHaveLength(1);
    });

    it('watch-later mutations on one user do not affect another (Req 5.13)', () => {
      service.addToWatchLater('user-a', 'vid-1');
      service.addToWatchLater('user-b', 'vid-2');

      service.removeFromWatchLater('user-a', service.listWatchLater('user-a')[0]!.id);

      expect(service.listWatchLater('user-a')).toHaveLength(0);
      expect(service.listWatchLater('user-b').map((e) => e.videoId)).toEqual(['vid-2']);
    });
  });
});
