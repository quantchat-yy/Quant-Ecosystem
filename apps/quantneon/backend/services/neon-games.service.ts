// ============================================================================
// QuantNeon - In-feed Games Service (Prisma-backed, durable)
// ============================================================================
//
// Lets users play quick games with friends from the QuantNeon feed (the
// Instagram "play games in chat/feed" pattern). This is the per-app session
// host for feed-embedded games; cross-app shared sessions/leaderboards
// (@quant/cross-app-gaming) are a follow-up.
//
// Ships one fully-playable, real game (Tic-Tac-Toe) end-to-end: catalog -> start
// -> join -> turn-based moves -> win/draw detection. Other catalog entries are
// honestly marked `coming_soon`.
//
// GAME SESSIONS are now DURABLE: previously the service kept every session in an
// in-memory `Map<string, GameSession>`, so all sessions — and whose turn it was
// — were lost on restart/redeploy and never shared across backend instances.
// This rewrite persists sessions to the Prisma `NeonGameSession` model
// (@@map neon_game_sessions). `board` and `players` are JSON columns, parsed to
// arrays on read and passed as arrays on write.
//
// The game CATALOG and `listGames`/`getGame` remain in-memory/sync (static
// data). Everything that touches a session (`startGame`, `getSession`,
// `listActiveSessions`, `joinGame`, `submitMove`, `leaveGame`) is now ASYNC.
// All game logic (Tic-Tac-Toe win/draw detection, turn advance, forfeit-on-leave,
// auto-start at minPlayers) and every GameError code are preserved EXACTLY; the
// only change is STORAGE.
//
// The Prisma client is injected through a NARROW interface (`NeonGamePrisma`)
// covering only the `neonGameSession` delegate operations this service issues,
// mirroring the repo's established DI pattern (see RoomService /
// PrismaKeyStorage). This keeps the service unit-testable against an in-memory
// fake with no live Postgres. The injectable clock (`now`) is retained.

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

// ---------------------------------------------------------------------------
// Persisted row shape (the subset of columns this service reads/writes).
// `players` and `board` are JSON columns (stored as arrays).
// ---------------------------------------------------------------------------

/** A persisted `NeonGameSession` row. */
export interface NeonGameSessionRow {
  id: string;
  gameId: string;
  host: string;
  players: unknown;
  state: string;
  turn: string | null;
  board: unknown;
  winner: string | null;
  isDraw: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Narrow view of the Prisma client — exactly the `neonGameSession` delegate
 * operations {@link NeonGamesService} issues. Injected via the constructor so
 * the service can run against the real client in production and an in-memory
 * fake in tests.
 */
export interface NeonGamePrisma {
  neonGameSession: {
    create(args: { data: Record<string, unknown> }): Promise<NeonGameSessionRow>;
    findUnique(args: { where: { id: string } }): Promise<NeonGameSessionRow | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<NeonGameSessionRow>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    }): Promise<NeonGameSessionRow[]>;
  };
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
  constructor(
    private readonly prisma: NeonGamePrisma,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // --- Static catalog (in-memory / sync) ----------------------------------

  listGames(): GameCatalogEntry[] {
    return CATALOG.map((g) => ({ ...g }));
  }

  getGame(gameId: string): GameCatalogEntry | undefined {
    return CATALOG.find((g) => g.id === gameId);
  }

  // --- Durable sessions (Prisma-backed / async) ---------------------------

  async listActiveSessions(gameId?: string): Promise<GameSession[]> {
    const where: Record<string, unknown> = { state: { in: ['waiting', 'active'] } };
    if (gameId) where['gameId'] = gameId;
    const rows = await this.prisma.neonGameSession.findMany({ where });
    return rows.map((row) => this.toSession(row));
  }

  async getSession(sessionId: string): Promise<GameSession> {
    const row = await this.prisma.neonGameSession.findUnique({ where: { id: sessionId } });
    if (!row) throw new GameError('Session not found', 'SESSION_NOT_FOUND');
    return this.toSession(row);
  }

  async startGame(gameId: string, hostId: string): Promise<GameSession> {
    const game = this.getGame(gameId);
    if (!game) throw new GameError('Game not found', 'GAME_NOT_FOUND');
    if (game.status !== 'playable') {
      throw new GameError(`${game.name} is not playable yet`, 'GAME_NOT_PLAYABLE');
    }
    const t = this.now();
    const row = await this.prisma.neonGameSession.create({
      data: {
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
      },
    });
    return this.toSession(row);
  }

  async joinGame(sessionId: string, userId: string): Promise<GameSession> {
    const session = await this.getSession(sessionId);
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
    return this.persist(session);
  }

  /**
   * Apply a move. For tic-tac-toe, `action.cell` is 0..8. Validates the session
   * is active, it is the caller's turn, and the cell is empty; then places the
   * caller's mark, checks win/draw, and advances the turn.
   */
  async submitMove(
    sessionId: string,
    userId: string,
    action: { cell: number },
  ): Promise<GameSession> {
    const session = await this.getSession(sessionId);
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
    return this.persist(session);
  }

  /** Leave/abandon a session. */
  async leaveGame(sessionId: string, userId: string): Promise<GameSession> {
    const session = await this.getSession(sessionId);
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
    return this.persist(session);
  }

  private hasWon(board: (string | null)[], mark: string): boolean {
    return WIN_LINES.some((line) => line.every((i) => board[i] === mark));
  }

  // -------------------------------------------------------------------------
  // Persistence helpers
  // -------------------------------------------------------------------------

  /** Persist the mutated session fields and return the mapped result. */
  private async persist(session: GameSession): Promise<GameSession> {
    const row = await this.prisma.neonGameSession.update({
      where: { id: session.id },
      data: {
        host: session.host,
        players: session.players,
        state: session.state,
        turn: session.turn,
        board: session.board,
        winner: session.winner,
        isDraw: session.isDraw,
        updatedAt: session.updatedAt,
      },
    });
    return this.toSession(row);
  }

  /** Map a persisted row (parsing players/board JSON) to the GameSession shape. */
  private toSession(row: NeonGameSessionRow): GameSession {
    return {
      id: row.id,
      gameId: row.gameId,
      host: row.host,
      players: this.parseStringArray(row.players),
      state: this.parseState(row.state),
      turn: row.turn ?? null,
      board: this.parseBoard(row.board),
      winner: row.winner ?? null,
      isDraw: row.isDraw,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private parseState(value: string): SessionState {
    return value === 'active' || value === 'finished' || value === 'abandoned' ? value : 'waiting';
  }

  /** Coerce a JSON column into a string[] (players). */
  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((v) => String(v));
    return [];
  }

  /** Coerce a JSON column into the 9-cell board (null | 'X' | 'O'). */
  private parseBoard(value: unknown): (string | null)[] {
    if (Array.isArray(value)) {
      return value.map((c) => (c === null || c === undefined ? null : String(c)));
    }
    return Array(9).fill(null);
  }
}
