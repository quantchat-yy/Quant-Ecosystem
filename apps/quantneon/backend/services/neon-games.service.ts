// ============================================================================
// QuantNeon - In-feed Games Service
// ============================================================================
//
// Lets users play quick games with friends from the QuantNeon feed (the
// Instagram "play games in chat/feed" pattern). This is the per-app session
// host for feed-embedded games; cross-app shared sessions/leaderboards
// (@quant/cross-app-gaming) are a follow-up.
//
// Ships one fully-playable, real game (Tic-Tac-Toe) end-to-end: catalog -> start
// -> join -> turn-based moves -> win/draw detection. Other catalog entries are
// honestly marked `coming_soon`. State is in-memory (decorated singleton); a
// persistent store is a production follow-up.

import { randomUUID } from 'node:crypto';

export type GameStatus = 'playable' | 'coming_soon';
export type SessionState = 'waiting' | 'active' | 'finished' | 'abandoned';

export interface GameCatalogEntry {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  turnBased: boolean;
  status: GameStatus;
}

export interface GameSession {
  id: string;
  gameId: string;
  host: string;
  players: string[];
  state: SessionState;
  /** userId whose turn it is (turn-based games, while active). */
  turn: string | null;
  /** Tic-Tac-Toe board: 9 cells, each null | 'X' | 'O'. */
  board: (string | null)[];
  winner: string | null;
  isDraw: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GameError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'GAME_NOT_FOUND'
      | 'GAME_NOT_PLAYABLE'
      | 'SESSION_NOT_FOUND'
      | 'SESSION_FULL'
      | 'SESSION_NOT_ACTIVE'
      | 'NOT_YOUR_TURN'
      | 'INVALID_MOVE'
      | 'ALREADY_JOINED',
  ) {
    super(message);
    this.name = 'GameError';
  }
}

const CATALOG: GameCatalogEntry[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Classic 3x3. First to line up three wins.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: true,
    status: 'playable',
  },
  {
    id: 'uno',
    name: 'Uno',
    description: 'Match colors and numbers. Last card wins.',
    minPlayers: 2,
    maxPlayers: 4,
    turnBased: true,
    status: 'coming_soon',
  },
  {
    id: 'ludo',
    name: 'Ludo',
    description: 'Race your tokens home.',
    minPlayers: 2,
    maxPlayers: 4,
    turnBased: true,
    status: 'coming_soon',
  },
];

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export class NeonGamesService {
  private readonly sessions = new Map<string, GameSession>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  listGames(): GameCatalogEntry[] {
    return CATALOG.map((g) => ({ ...g }));
  }

  getGame(gameId: string): GameCatalogEntry | undefined {
    return CATALOG.find((g) => g.id === gameId);
  }

  listActiveSessions(gameId?: string): GameSession[] {
    return [...this.sessions.values()].filter(
      (s) =>
        (s.state === 'waiting' || s.state === 'active') && (gameId ? s.gameId === gameId : true),
    );
  }

  getSession(sessionId: string): GameSession {
    const s = this.sessions.get(sessionId);
    if (!s) throw new GameError('Session not found', 'SESSION_NOT_FOUND');
    return s;
  }

  startGame(gameId: string, hostId: string): GameSession {
    const game = this.getGame(gameId);
    if (!game) throw new GameError('Game not found', 'GAME_NOT_FOUND');
    if (game.status !== 'playable') {
      throw new GameError(`${game.name} is not playable yet`, 'GAME_NOT_PLAYABLE');
    }
    const t = this.now();
    const session: GameSession = {
      id: `gs_${randomUUID()}`,
      gameId,
      host: hostId,
      players: [hostId],
      state: 'waiting',
      turn: null,
      board: Array(9).fill(null),
      winner: null,
      isDraw: false,
      createdAt: t,
      updatedAt: t,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  joinGame(sessionId: string, userId: string): GameSession {
    const session = this.getSession(sessionId);
    const game = this.getGame(session.gameId)!;
    if (session.players.includes(userId)) {
      throw new GameError('Already joined this session', 'ALREADY_JOINED');
    }
    if (session.state !== 'waiting') {
      throw new GameError('Session is not accepting players', 'SESSION_NOT_ACTIVE');
    }
    if (session.players.length >= game.maxPlayers) {
      throw new GameError('Session is full', 'SESSION_FULL');
    }
    session.players.push(userId);
    // Auto-start once minimum players have joined (turn goes to the host first).
    if (session.players.length >= game.minPlayers) {
      session.state = 'active';
      session.turn = session.players[0]!;
    }
    session.updatedAt = this.now();
    return session;
  }

  /**
   * Apply a move. For tic-tac-toe, `action.cell` is 0..8. Validates the session
   * is active, it is the caller's turn, and the cell is empty; then places the
   * caller's mark, checks win/draw, and advances the turn.
   */
  submitMove(sessionId: string, userId: string, action: { cell: number }): GameSession {
    const session = this.getSession(sessionId);
    if (session.gameId !== 'tic-tac-toe') {
      throw new GameError('Moves are only implemented for Tic-Tac-Toe', 'GAME_NOT_PLAYABLE');
    }
    if (session.state !== 'active') {
      throw new GameError('Session is not active', 'SESSION_NOT_ACTIVE');
    }
    if (session.turn !== userId) {
      throw new GameError('It is not your turn', 'NOT_YOUR_TURN');
    }
    const { cell } = action;
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
      throw new GameError('Cell must be an integer 0..8', 'INVALID_MOVE');
    }
    if (session.board[cell] !== null) {
      throw new GameError('Cell already taken', 'INVALID_MOVE');
    }

    const mark = session.players[0] === userId ? 'X' : 'O';
    session.board[cell] = mark;

    if (this.hasWon(session.board, mark)) {
      session.state = 'finished';
      session.winner = userId;
      session.turn = null;
    } else if (session.board.every((c) => c !== null)) {
      session.state = 'finished';
      session.isDraw = true;
      session.turn = null;
    } else {
      // Advance to the other player.
      session.turn = session.players.find((p) => p !== userId) ?? null;
    }
    session.updatedAt = this.now();
    return session;
  }

  /** Leave/abandon a session. */
  leaveGame(sessionId: string, userId: string): GameSession {
    const session = this.getSession(sessionId);
    if (!session.players.includes(userId)) return session;
    session.players = session.players.filter((p) => p !== userId);
    if (session.state !== 'finished') {
      if (session.players.length === 0) {
        session.state = 'abandoned';
        session.turn = null;
      } else if (session.state === 'active') {
        // Remaining player wins by forfeit.
        session.state = 'finished';
        session.winner = session.players[0]!;
        session.turn = null;
      } else {
        session.host = session.players[0]!;
      }
    }
    session.updatedAt = this.now();
    return session;
  }

  private hasWon(board: (string | null)[], mark: string): boolean {
    return WIN_LINES.some((line) => line.every((i) => board[i] === mark));
  }
}
