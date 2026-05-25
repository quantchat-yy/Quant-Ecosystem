// ============================================================================
// Gaming Package - Game Template Factory
// ============================================================================

import {
  GameTemplate,
  TemplateType,
  TemplateRule,
  ScoringConfig,
  WinCondition,
  LoseCondition,
} from '../types';

// ---------------------------------------------------------------------------
// Template State Interfaces
// ---------------------------------------------------------------------------

interface QuizState {
  currentQuestion: number;
  totalQuestions: number;
  correctAnswers: number;
  lives: number;
  score: number;
  timeRemaining: number;
  streak: number;
  selectedAnswer: number | null;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  timeLimit: number;
}

interface PuzzleState {
  grid: number[][];
  rows: number;
  cols: number;
  moves: number;
  maxMoves: number;
  score: number;
  completed: boolean;
  selectedCell: { row: number; col: number } | null;
}

interface RunnerState {
  lane: number;
  totalLanes: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  distance: number;
  score: number;
  lives: number;
  obstacles: RunnerObstacle[];
  collectibles: RunnerCollectible[];
  isJumping: boolean;
  jumpHeight: number;
}

interface RunnerObstacle {
  lane: number;
  distance: number;
  type: string;
  height: number;
}

interface RunnerCollectible {
  lane: number;
  distance: number;
  value: number;
  type: string;
}

interface Match3State {
  grid: number[][];
  rows: number;
  cols: number;
  score: number;
  moves: number;
  maxMoves: number;
  combo: number;
  maxCombo: number;
  targetScore: number;
  gemTypes: number;
  selected: { row: number; col: number } | null;
  cascading: boolean;
}

interface WordState {
  letters: string[];
  gridSize: number;
  foundWords: string[];
  currentWord: string;
  score: number;
  timeRemaining: number;
  minWordLength: number;
  maxWordLength: number;
  validWords: Set<string>;
  bonusLetters: Set<number>;
}

// ---------------------------------------------------------------------------
// Game Template Factory
// ---------------------------------------------------------------------------

export class GameTemplateFactory {
  private templates: Map<string, GameTemplate> = new Map();
  private templateStates: Map<string, Record<string, unknown>> = new Map();

  /** Create a quiz template */
  createQuizTemplate(config: {
    id: string;
    name: string;
    questions: QuizQuestion[];
    livesCount?: number;
    timePerQuestion?: number;
    streakBonus?: number;
  }): GameTemplate {
    const template: GameTemplate = {
      id: config.id,
      type: 'quiz',
      name: config.name,
      config: {
        questions: config.questions,
        livesCount: config.livesCount || 3,
        timePerQuestion: config.timePerQuestion || 30,
        streakBonus: config.streakBonus || 50,
      },
      rules: this.getQuizRules(),
      scoring: {
        basePoints: 100,
        multiplierRules: [
          { condition: 'streak >= 3', multiplier: 1.5, stackable: false },
          { condition: 'streak >= 5', multiplier: 2.0, stackable: false },
          { condition: 'time_bonus', multiplier: 1.2, stackable: true },
        ],
        timeBonusPerSecond: 10,
        comboBonusRate: 0.5,
        maxCombo: 10,
      },
      winConditions: [
        { type: 'complete', threshold: config.questions.length, description: 'Answer all questions' },
      ],
      loseConditions: [
        { type: 'lives', threshold: 0, description: 'Run out of lives' },
      ],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /** Create a puzzle template */
  createPuzzleTemplate(config: {
    id: string;
    name: string;
    rows?: number;
    cols?: number;
    maxMoves?: number;
    targetScore?: number;
  }): GameTemplate {
    const rows = config.rows || 8;
    const cols = config.cols || 8;

    const template: GameTemplate = {
      id: config.id,
      type: 'puzzle',
      name: config.name,
      config: { rows, cols, maxMoves: config.maxMoves || 30, targetScore: config.targetScore || 1000 },
      rules: this.getPuzzleRules(),
      scoring: {
        basePoints: 50,
        multiplierRules: [
          { condition: 'chain >= 2', multiplier: 1.5, stackable: true },
          { condition: 'remaining_moves > 5', multiplier: 1.2, stackable: false },
        ],
        timeBonusPerSecond: 0,
        comboBonusRate: 1.0,
        maxCombo: 20,
      },
      winConditions: [
        { type: 'score', threshold: config.targetScore || 1000, description: 'Reach target score' },
      ],
      loseConditions: [
        { type: 'moves', threshold: 0, description: 'Run out of moves' },
      ],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /** Create a runner template */
  createRunnerTemplate(config: {
    id: string;
    name: string;
    lanes?: number;
    startSpeed?: number;
    maxSpeed?: number;
    acceleration?: number;
    lives?: number;
  }): GameTemplate {
    const template: GameTemplate = {
      id: config.id,
      type: 'runner',
      name: config.name,
      config: {
        lanes: config.lanes || 3,
        startSpeed: config.startSpeed || 5,
        maxSpeed: config.maxSpeed || 20,
        acceleration: config.acceleration || 0.01,
        lives: config.lives || 3,
      },
      rules: this.getRunnerRules(),
      scoring: {
        basePoints: 1,
        multiplierRules: [
          { condition: 'speed >= 10', multiplier: 1.5, stackable: false },
          { condition: 'speed >= 15', multiplier: 2.0, stackable: false },
          { condition: 'near_miss', multiplier: 3.0, stackable: false },
        ],
        timeBonusPerSecond: 1,
        comboBonusRate: 0,
        maxCombo: 0,
      },
      winConditions: [
        { type: 'survive', threshold: 300, description: 'Survive for 5 minutes' },
      ],
      loseConditions: [
        { type: 'lives', threshold: 0, description: 'Run out of lives' },
      ],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /** Create a match-3 template */
  createMatch3Template(config: {
    id: string;
    name: string;
    rows?: number;
    cols?: number;
    gemTypes?: number;
    maxMoves?: number;
    targetScore?: number;
  }): GameTemplate {
    const template: GameTemplate = {
      id: config.id,
      type: 'match3',
      name: config.name,
      config: {
        rows: config.rows || 8,
        cols: config.cols || 8,
        gemTypes: config.gemTypes || 6,
        maxMoves: config.maxMoves || 25,
        targetScore: config.targetScore || 5000,
      },
      rules: this.getMatch3Rules(),
      scoring: {
        basePoints: 30,
        multiplierRules: [
          { condition: 'match_4', multiplier: 2.0, stackable: false },
          { condition: 'match_5', multiplier: 3.0, stackable: false },
          { condition: 'cascade', multiplier: 1.5, stackable: true },
        ],
        timeBonusPerSecond: 0,
        comboBonusRate: 1.5,
        maxCombo: 15,
      },
      winConditions: [
        { type: 'score', threshold: config.targetScore || 5000, description: 'Reach target score' },
      ],
      loseConditions: [
        { type: 'moves', threshold: 0, description: 'Run out of moves' },
      ],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /** Create a word game template */
  createWordTemplate(config: {
    id: string;
    name: string;
    gridSize?: number;
    timeLimit?: number;
    minWordLength?: number;
    dictionary?: string[];
  }): GameTemplate {
    const template: GameTemplate = {
      id: config.id,
      type: 'word',
      name: config.name,
      config: {
        gridSize: config.gridSize || 4,
        timeLimit: config.timeLimit || 120,
        minWordLength: config.minWordLength || 3,
        dictionary: config.dictionary || [],
      },
      rules: this.getWordRules(),
      scoring: {
        basePoints: 10,
        multiplierRules: [
          { condition: 'word_length >= 5', multiplier: 2.0, stackable: false },
          { condition: 'word_length >= 7', multiplier: 3.0, stackable: false },
          { condition: 'bonus_letter', multiplier: 1.5, stackable: true },
        ],
        timeBonusPerSecond: 5,
        comboBonusRate: 0.3,
        maxCombo: 5,
      },
      winConditions: [
        { type: 'score', threshold: 500, description: 'Reach target score' },
      ],
      loseConditions: [
        { type: 'time', threshold: 0, description: 'Time runs out' },
      ],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /** Initialize game state from template */
  initializeState(templateId: string): Record<string, unknown> | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let state: Record<string, unknown>;
    switch (template.type) {
      case 'quiz':
        state = this.initQuizState(template);
        break;
      case 'puzzle':
        state = this.initPuzzleState(template);
        break;
      case 'runner':
        state = this.initRunnerState(template);
        break;
      case 'match3':
        state = this.initMatch3State(template);
        break;
      case 'word':
        state = this.initWordState(template);
        break;
      default:
        return null;
    }

    this.templateStates.set(templateId, state);
    return state;
  }

  /** Evaluate win/lose conditions */
  evaluateConditions(templateId: string, state: Record<string, unknown>): 'win' | 'lose' | 'playing' {
    const template = this.templates.get(templateId);
    if (!template) return 'playing';

    for (const condition of template.loseConditions) {
      if (this.checkLoseCondition(condition, state)) return 'lose';
    }
    for (const condition of template.winConditions) {
      if (this.checkWinCondition(condition, state)) return 'win';
    }
    return 'playing';
  }

  /** Calculate score with multipliers */
  calculateScore(templateId: string, baseScore: number, context: Record<string, unknown>): number {
    const template = this.templates.get(templateId);
    if (!template) return baseScore;

    let score = baseScore;
    for (const rule of template.scoring.multiplierRules) {
      if (this.evaluateMultiplierCondition(rule.condition, context)) {
        score *= rule.multiplier;
      }
    }
    return Math.round(score);
  }

  /** Get template by ID */
  getTemplate(templateId: string): GameTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /** Get all templates of a type */
  getTemplatesByType(type: TemplateType): GameTemplate[] {
    const result: GameTemplate[] = [];
    for (const template of this.templates.values()) {
      if (template.type === type) result.push(template);
    }
    return result;
  }

  /** Get template count */
  getTemplateCount(): number {
    return this.templates.size;
  }

  // -------------------------------------------------------------------------
  // Private - State initialization
  // -------------------------------------------------------------------------

  private initQuizState(template: GameTemplate): Record<string, unknown> {
    const config = template.config as Record<string, unknown>;
    return {
      currentQuestion: 0,
      totalQuestions: (config.questions as QuizQuestion[]).length,
      correctAnswers: 0,
      lives: config.livesCount as number,
      score: 0,
      timeRemaining: config.timePerQuestion as number,
      streak: 0,
      selectedAnswer: null,
    };
  }

  private initPuzzleState(template: GameTemplate): Record<string, unknown> {
    const config = template.config as Record<string, unknown>;
    const rows = config.rows as number;
    const cols = config.cols as number;
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.floor(Math.random() * 5))
    );
    return { grid, rows, cols, moves: 0, maxMoves: config.maxMoves, score: 0, completed: false, selectedCell: null };
  }

  private initRunnerState(template: GameTemplate): Record<string, unknown> {
    const config = template.config as Record<string, unknown>;
    return {
      lane: Math.floor((config.lanes as number) / 2),
      totalLanes: config.lanes,
      speed: config.startSpeed,
      maxSpeed: config.maxSpeed,
      acceleration: config.acceleration,
      distance: 0,
      score: 0,
      lives: config.lives,
      obstacles: [],
      collectibles: [],
      isJumping: false,
      jumpHeight: 0,
    };
  }

  private initMatch3State(template: GameTemplate): Record<string, unknown> {
    const config = template.config as Record<string, unknown>;
    const rows = config.rows as number;
    const cols = config.cols as number;
    const gemTypes = config.gemTypes as number;
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.floor(Math.random() * gemTypes))
    );
    return {
      grid, rows, cols, score: 0, moves: 0,
      maxMoves: config.maxMoves, combo: 0, maxCombo: 0,
      targetScore: config.targetScore, gemTypes, selected: null, cascading: false,
    };
  }

  private initWordState(template: GameTemplate): Record<string, unknown> {
    const config = template.config as Record<string, unknown>;
    const gridSize = config.gridSize as number;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letters = Array.from({ length: gridSize * gridSize }, () =>
      alphabet[Math.floor(Math.random() * 26)]
    );
    return {
      letters, gridSize, foundWords: [], currentWord: '',
      score: 0, timeRemaining: config.timeLimit,
      minWordLength: config.minWordLength, bonusLetters: [],
    };
  }

  // -------------------------------------------------------------------------
  // Private - Condition evaluation
  // -------------------------------------------------------------------------

  private checkWinCondition(condition: WinCondition, state: Record<string, unknown>): boolean {
    const value = this.getStateValue(condition.type, state);
    return value >= condition.threshold;
  }

  private checkLoseCondition(condition: LoseCondition, state: Record<string, unknown>): boolean {
    const value = this.getStateValue(condition.type, state);
    return value <= condition.threshold;
  }

  private getStateValue(type: string, state: Record<string, unknown>): number {
    switch (type) {
      case 'score': return (state.score as number) || 0;
      case 'lives': return (state.lives as number) || 0;
      case 'time': return (state.timeRemaining as number) || 0;
      case 'moves': return ((state.maxMoves as number) || 0) - ((state.moves as number) || 0);
      case 'complete': return (state.correctAnswers as number) || (state.completed ? 1 : 0);
      case 'survive': return (state.distance as number) || 0;
      case 'health': return (state.health as number) || 0;
      case 'collect': return (state.collected as number) || 0;
      default: return 0;
    }
  }

  private evaluateMultiplierCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple condition parser: "key >= value" or "key"
    const match = condition.match(/(\w+)\s*(>=|<=|>|<|==)\s*(\d+)/);
    if (match) {
      const [, key, op, valStr] = match;
      const contextVal = (context[key] as number) || 0;
      const threshold = parseInt(valStr, 10);
      switch (op) {
        case '>=': return contextVal >= threshold;
        case '<=': return contextVal <= threshold;
        case '>': return contextVal > threshold;
        case '<': return contextVal < threshold;
        case '==': return contextVal === threshold;
      }
    }
    // Boolean check
    return !!context[condition];
  }

  // -------------------------------------------------------------------------
  // Private - Rules
  // -------------------------------------------------------------------------

  private getQuizRules(): TemplateRule[] {
    return [
      { id: 'answer_correct', description: 'Award points for correct answer', evaluate: (s) => !!(s.selectedAnswer !== null && s.correct), action: 'add_score' },
      { id: 'answer_wrong', description: 'Deduct life for wrong answer', evaluate: (s) => !!(s.selectedAnswer !== null && !s.correct), action: 'lose_life' },
      { id: 'time_up', description: 'Time expires for question', evaluate: (s) => (s.timeRemaining as number) <= 0, action: 'next_question' },
    ];
  }

  private getPuzzleRules(): TemplateRule[] {
    return [
      { id: 'valid_move', description: 'Check if move is valid', evaluate: (s) => !!(s.selectedCell), action: 'swap' },
      { id: 'match_found', description: 'Check for matches after swap', evaluate: (s) => !!(s.matchCount && (s.matchCount as number) > 0), action: 'clear_matches' },
    ];
  }

  private getRunnerRules(): TemplateRule[] {
    return [
      { id: 'collision', description: 'Player hits obstacle', evaluate: (s) => !!(s.collided), action: 'lose_life' },
      { id: 'collect', description: 'Player collects item', evaluate: (s) => !!(s.collected_item), action: 'add_score' },
      { id: 'speed_up', description: 'Increase speed over time', evaluate: () => true, action: 'accelerate' },
    ];
  }

  private getMatch3Rules(): TemplateRule[] {
    return [
      { id: 'match_3', description: '3 in a row/column', evaluate: (s) => (s.matchLength as number) >= 3, action: 'clear_match' },
      { id: 'cascade', description: 'Chain reaction after clear', evaluate: (s) => !!(s.cascading), action: 'cascade_clear' },
      { id: 'no_moves', description: 'No valid moves available', evaluate: (s) => !!(s.noMoves), action: 'shuffle' },
    ];
  }

  private getWordRules(): TemplateRule[] {
    return [
      { id: 'valid_word', description: 'Submitted word is in dictionary', evaluate: (s) => !!(s.wordValid), action: 'add_score' },
      { id: 'invalid_word', description: 'Submitted word is not valid', evaluate: (s) => !!(s.wordSubmitted && !s.wordValid), action: 'reject' },
      { id: 'duplicate', description: 'Word already found', evaluate: (s) => !!(s.duplicate), action: 'reject' },
    ];
  }
}
