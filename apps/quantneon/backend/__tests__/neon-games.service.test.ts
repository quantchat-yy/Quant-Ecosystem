import { describe, it, expect } from 'vitest';
import { NeonGamesService, GameError } from '../services/neon-games.service';

function startAndFill(svc: NeonGamesService): { id: string } {
  const session = svc.startGame('tic-tac-toe', 'alice');
  svc.joinGame(session.id, 'bob');
  return session;
}

describe('NeonGamesService', () => {
  describe('catalog', () => {
    it('lists games and marks tic-tac-toe playable', () => {
      const svc = new NeonGamesService();
      const games = svc.listGames();
      expect(games.find((g) => g.id === 'tic-tac-toe')?.status).toBe('playable');
      expect(games.find((g) => g.id === 'uno')?.status).toBe('coming_soon');
    });
  });

  describe('session lifecycle', () => {
    it('starts a waiting session hosted by the caller', () => {
      const svc = new NeonGamesService();
      const s = svc.startGame('tic-tac-toe', 'alice');
      expect(s.state).toBe('waiting');
      expect(s.host).toBe('alice');
      expect(s.players).toEqual(['alice']);
    });

    it('refuses to start a coming-soon game', () => {
      const svc = new NeonGamesService();
      expect(() => svc.startGame('uno', 'alice')).toThrowError(GameError);
    });

    it('refuses to start an unknown game', () => {
      const svc = new NeonGamesService();
      try {
        svc.startGame('nope', 'alice');
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('GAME_NOT_FOUND');
      }
    });

    it('activates the session and sets the host to move first when the 2nd player joins', () => {
      const svc = new NeonGamesService();
      const s = svc.startGame('tic-tac-toe', 'alice');
      const joined = svc.joinGame(s.id, 'bob');
      expect(joined.state).toBe('active');
      expect(joined.turn).toBe('alice');
      expect(joined.players).toEqual(['alice', 'bob']);
    });

    it('rejects joining a full session', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      try {
        svc.joinGame(s.id, 'carol');
        expect.unreachable();
      } catch (e) {
        // session is active (full) once 2 players joined
        expect(['SESSION_FULL', 'SESSION_NOT_ACTIVE']).toContain((e as GameError).code);
      }
    });

    it('rejects double-join', () => {
      const svc = new NeonGamesService();
      const s = svc.startGame('tic-tac-toe', 'alice');
      try {
        svc.joinGame(s.id, 'alice');
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('ALREADY_JOINED');
      }
    });
  });

  describe('gameplay (tic-tac-toe)', () => {
    it('enforces turn order', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      // bob tries to move first, but it's alice's turn
      try {
        svc.submitMove(s.id, 'bob', { cell: 0 });
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('NOT_YOUR_TURN');
      }
    });

    it('rejects taking an occupied cell', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      svc.submitMove(s.id, 'alice', { cell: 4 });
      try {
        svc.submitMove(s.id, 'bob', { cell: 4 });
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('INVALID_MOVE');
      }
    });

    it('detects a win and finishes the session', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      // alice: 0,1,2 (top row); bob: 3,4
      svc.submitMove(s.id, 'alice', { cell: 0 });
      svc.submitMove(s.id, 'bob', { cell: 3 });
      svc.submitMove(s.id, 'alice', { cell: 1 });
      svc.submitMove(s.id, 'bob', { cell: 4 });
      const final = svc.submitMove(s.id, 'alice', { cell: 2 });
      expect(final.state).toBe('finished');
      expect(final.winner).toBe('alice');
      expect(final.turn).toBeNull();
    });

    it('detects a draw', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      // Fill to a draw: X=alice O=bob
      // board: X O X / X O O / O X X  -> no 3-in-a-row
      const moves: [string, number][] = [
        ['alice', 0],
        ['bob', 1],
        ['alice', 2],
        ['bob', 4],
        ['alice', 3],
        ['bob', 5],
        ['alice', 7],
        ['bob', 6],
        ['alice', 8],
      ];
      let last;
      for (const [u, c] of moves) last = svc.submitMove(s.id, u, { cell: c });
      expect(last!.state).toBe('finished');
      expect(last!.isDraw).toBe(true);
      expect(last!.winner).toBeNull();
    });

    it('rejects moves after the game is finished', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      svc.submitMove(s.id, 'alice', { cell: 0 });
      svc.submitMove(s.id, 'bob', { cell: 3 });
      svc.submitMove(s.id, 'alice', { cell: 1 });
      svc.submitMove(s.id, 'bob', { cell: 4 });
      svc.submitMove(s.id, 'alice', { cell: 2 }); // alice wins
      try {
        svc.submitMove(s.id, 'bob', { cell: 5 });
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('SESSION_NOT_ACTIVE');
      }
    });
  });

  describe('leaving', () => {
    it('awards the win by forfeit when a player leaves an active game', () => {
      const svc = new NeonGamesService();
      const s = startAndFill(svc);
      const after = svc.leaveGame(s.id, 'bob');
      expect(after.state).toBe('finished');
      expect(after.winner).toBe('alice');
    });

    it('abandons a waiting session when the host leaves', () => {
      const svc = new NeonGamesService();
      const s = svc.startGame('tic-tac-toe', 'alice');
      const after = svc.leaveGame(s.id, 'alice');
      expect(after.state).toBe('abandoned');
    });
  });

  describe('listing', () => {
    it('lists active sessions filtered by game', () => {
      const svc = new NeonGamesService();
      svc.startGame('tic-tac-toe', 'alice');
      expect(svc.listActiveSessions('tic-tac-toe')).toHaveLength(1);
      expect(svc.listActiveSessions('uno')).toHaveLength(0);
    });

    it('throws for an unknown session', () => {
      const svc = new NeonGamesService();
      try {
        svc.getSession('missing');
        expect.unreachable();
      } catch (e) {
        expect((e as GameError).code).toBe('SESSION_NOT_FOUND');
      }
    });
  });
});
