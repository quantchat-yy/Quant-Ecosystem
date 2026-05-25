// ============================================================================
// Gaming Package - Tournament System
// ============================================================================

import {
  Tournament,
  TournamentParticipant,
  Bracket,
  Match,
  MatchResult,
  ELORating,
  PrizePool,
  PrizeDistribution,
} from '../types';

// ---------------------------------------------------------------------------
// Tournament System
// ---------------------------------------------------------------------------

export class TournamentSystem {
  private tournaments: Map<string, Tournament> = new Map();
  private ratings: Map<string, ELORating> = new Map();
  private defaultKFactor: number = 32;
  private tournamentIdCounter: number = 0;
  private matchIdCounter: number = 0;

  constructor(config?: { defaultKFactor?: number }) {
    if (config?.defaultKFactor) this.defaultKFactor = config.defaultKFactor;
  }

  /** Create a new tournament */
  createTournament(config: {
    name: string;
    type: 'single_elimination' | 'double_elimination' | 'round_robin';
    maxParticipants: number;
    prizePool: PrizePool;
    startTime?: number;
  }): Tournament {
    const tournament: Tournament = {
      id: `tournament_${++this.tournamentIdCounter}`,
      name: config.name,
      type: config.type,
      status: 'registration',
      maxParticipants: config.maxParticipants,
      participants: [],
      brackets: [],
      prizePool: config.prizePool,
      startTime: config.startTime || Date.now() + 3600000,
      endTime: null,
      currentRound: 0,
    };

    this.tournaments.set(tournament.id, tournament);
    return tournament;
  }

  /** Register a participant for a tournament */
  registerParticipant(tournamentId: string, playerId: string, playerName: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'registration') return false;
    if (tournament.participants.length >= tournament.maxParticipants) return false;
    if (tournament.participants.some((p) => p.playerId === playerId)) return false;

    const rating = this.getRating(playerId);
    tournament.participants.push({
      playerId,
      playerName,
      seed: 0,
      rating: rating.rating,
      wins: 0,
      losses: 0,
      eliminated: false,
    });

    return true;
  }

  /** Start a tournament (generate brackets) */
  startTournament(tournamentId: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'registration') return false;
    if (tournament.participants.length < 2) return false;

    // Seed participants by rating
    this.seedParticipants(tournament);

    // Generate brackets based on type
    switch (tournament.type) {
      case 'single_elimination':
        tournament.brackets = this.generateSingleElimination(tournament);
        break;
      case 'double_elimination':
        tournament.brackets = this.generateDoubleElimination(tournament);
        break;
      case 'round_robin':
        tournament.brackets = this.generateRoundRobin(tournament);
        break;
    }

    tournament.status = 'in_progress';
    tournament.currentRound = 1;
    return true;
  }

  /** Record a match result */
  recordMatchResult(tournamentId: string, matchId: string, result: MatchResult): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'in_progress') return false;

    // Find and update the match
    let matchFound = false;
    for (const bracket of tournament.brackets) {
      for (const match of bracket.matches) {
        if (match.id === matchId) {
          match.result = result;
          match.status = 'completed';
          matchFound = true;
          break;
        }
      }
      if (matchFound) break;
    }

    if (!matchFound) return false;

    // Update participant stats
    const winner = tournament.participants.find((p) => p.playerId === result.winnerId);
    const loser = tournament.participants.find((p) => p.playerId === result.loserId);
    if (winner) winner.wins++;
    if (loser) {
      loser.losses++;
      if (tournament.type === 'single_elimination') {
        loser.eliminated = true;
      }
    }

    // Update ELO ratings
    this.updateELO(result.winnerId, result.loserId);

    // Advance bracket
    this.advanceBracket(tournament);

    // Check if tournament is complete
    this.checkTournamentComplete(tournament);

    return true;
  }

  /** Get ELO rating for a player */
  getRating(playerId: string): ELORating {
    if (!this.ratings.has(playerId)) {
      this.ratings.set(playerId, {
        playerId,
        rating: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        peakRating: 1200,
        lastUpdated: Date.now(),
        kFactor: this.defaultKFactor,
      });
    }
    return this.ratings.get(playerId)!;
  }

  /** Find a match using ELO matchmaking */
  findMatch(playerId: string, pool: string[], maxRatingDiff: number = 200): string | null {
    const playerRating = this.getRating(playerId);
    let bestMatch: string | null = null;
    let bestDiff = Infinity;

    for (const candidateId of pool) {
      if (candidateId === playerId) continue;
      const candidateRating = this.getRating(candidateId);
      const diff = Math.abs(playerRating.rating - candidateRating.rating);
      if (diff <= maxRatingDiff && diff < bestDiff) {
        bestDiff = diff;
        bestMatch = candidateId;
      }
    }

    return bestMatch;
  }

  /** Get tournament standings */
  getStandings(tournamentId: string): TournamentParticipant[] {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return [];

    return [...tournament.participants].sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  }

  /** Get prize distribution for a completed tournament */
  getPrizeDistribution(tournamentId: string): Map<string, number> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'completed') return new Map();

    const standings = this.getStandings(tournamentId);
    const prizes = new Map<string, number>();

    for (const dist of tournament.prizePool.distribution) {
      const placement = dist.placement - 1;
      if (placement < standings.length) {
        prizes.set(standings[placement].playerId, dist.amount);
      }
    }

    return prizes;
  }

  /** Get tournament by ID */
  getTournament(tournamentId: string): Tournament | null {
    return this.tournaments.get(tournamentId) || null;
  }

  /** Get current round matches */
  getCurrentRoundMatches(tournamentId: string): Match[] {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return [];

    const matches: Match[] = [];
    for (const bracket of tournament.brackets) {
      for (const match of bracket.matches) {
        if (match.round === tournament.currentRound && match.status !== 'completed') {
          matches.push(match);
        }
      }
    }
    return matches;
  }

  /** Cancel a tournament */
  cancelTournament(tournamentId: string): boolean {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;
    tournament.status = 'cancelled';
    tournament.endTime = Date.now();
    return true;
  }

  /** Get all active tournaments */
  getActiveTournaments(): Tournament[] {
    const active: Tournament[] = [];
    for (const tournament of this.tournaments.values()) {
      if (tournament.status === 'registration' || tournament.status === 'in_progress') {
        active.push(tournament);
      }
    }
    return active;
  }

  /** Get player tournament history */
  getPlayerTournamentHistory(playerId: string): Array<{ tournamentId: string; placement: number; wins: number; losses: number }> {
    const history: Array<{ tournamentId: string; placement: number; wins: number; losses: number }> = [];

    for (const tournament of this.tournaments.values()) {
      if (tournament.status !== 'completed') continue;
      const standings = this.getStandings(tournament.id);
      const placement = standings.findIndex((p) => p.playerId === playerId);
      if (placement >= 0) {
        const participant = standings[placement];
        history.push({
          tournamentId: tournament.id,
          placement: placement + 1,
          wins: participant.wins,
          losses: participant.losses,
        });
      }
    }

    return history;
  }

  // -------------------------------------------------------------------------
  // Private - Bracket Generation
  // -------------------------------------------------------------------------

  private seedParticipants(tournament: Tournament): void {
    tournament.participants.sort((a, b) => b.rating - a.rating);
    for (let i = 0; i < tournament.participants.length; i++) {
      tournament.participants[i].seed = i + 1;
    }
  }

  private generateSingleElimination(tournament: Tournament): Bracket[] {
    const participants = tournament.participants;
    const n = participants.length;
    const bracketSize = this.nextPowerOf2(n);
    const rounds = Math.ceil(Math.log2(bracketSize));
    const brackets: Bracket[] = [];

    // First round with byes
    const firstRound: Match[] = [];
    const byeCount = bracketSize - n;

    for (let i = 0; i < bracketSize / 2; i++) {
      const p1Index = i;
      const p2Index = bracketSize - 1 - i;

      const player1 = p1Index < n ? participants[p1Index].playerId : null;
      const player2 = p2Index < n ? participants[p2Index].playerId : null;

      const match: Match = {
        id: `match_${++this.matchIdCounter}`,
        bracketId: 'bracket_r1',
        round: 1,
        player1Id: player1,
        player2Id: player2,
        result: null,
        scheduledTime: tournament.startTime,
        status: (!player1 || !player2) ? 'bye' : 'pending',
      };

      // Auto-resolve byes
      if (match.status === 'bye') {
        const winnerId = player1 || player2;
        if (winnerId) {
          match.result = {
            winnerId,
            loserId: '',
            score: [1, 0],
            duration: 0,
            timestamp: Date.now(),
          };
          match.status = 'completed';
        }
      }

      firstRound.push(match);
    }

    brackets.push({
      id: 'bracket_r1',
      round: 1,
      position: 0,
      matches: firstRound,
      isLoserBracket: false,
    });

    // Generate remaining rounds
    for (let round = 2; round <= rounds; round++) {
      const matchCount = bracketSize / Math.pow(2, round);
      const roundMatches: Match[] = [];

      for (let i = 0; i < matchCount; i++) {
        roundMatches.push({
          id: `match_${++this.matchIdCounter}`,
          bracketId: `bracket_r${round}`,
          round,
          player1Id: null,
          player2Id: null,
          result: null,
          scheduledTime: tournament.startTime + (round - 1) * 3600000,
          status: 'pending',
        });
      }

      brackets.push({
        id: `bracket_r${round}`,
        round,
        position: 0,
        matches: roundMatches,
        isLoserBracket: false,
      });
    }

    return brackets;
  }

  private generateDoubleElimination(tournament: Tournament): Bracket[] {
    // Generate winners bracket (same as single elimination)
    const winnersBrackets = this.generateSingleElimination(tournament);

    // Mark winners bracket
    for (const bracket of winnersBrackets) {
      bracket.isLoserBracket = false;
    }

    // Generate losers bracket (one fewer round, feeds into grand finals)
    const n = tournament.participants.length;
    const rounds = Math.ceil(Math.log2(this.nextPowerOf2(n)));
    const loserBrackets: Bracket[] = [];

    for (let round = 1; round < rounds; round++) {
      const matchCount = Math.max(1, Math.ceil(n / Math.pow(2, round + 1)));
      const roundMatches: Match[] = [];

      for (let i = 0; i < matchCount; i++) {
        roundMatches.push({
          id: `match_${++this.matchIdCounter}`,
          bracketId: `loser_bracket_r${round}`,
          round: rounds + round,
          player1Id: null,
          player2Id: null,
          result: null,
          scheduledTime: tournament.startTime + (rounds + round - 1) * 3600000,
          status: 'pending',
        });
      }

      loserBrackets.push({
        id: `loser_bracket_r${round}`,
        round: rounds + round,
        position: 0,
        matches: roundMatches,
        isLoserBracket: true,
      });
    }

    // Grand finals
    const grandFinals: Bracket = {
      id: 'grand_finals',
      round: rounds * 2,
      position: 0,
      matches: [{
        id: `match_${++this.matchIdCounter}`,
        bracketId: 'grand_finals',
        round: rounds * 2,
        player1Id: null,
        player2Id: null,
        result: null,
        scheduledTime: tournament.startTime + (rounds * 2 - 1) * 3600000,
        status: 'pending',
      }],
      isLoserBracket: false,
    };

    return [...winnersBrackets, ...loserBrackets, grandFinals];
  }

  private generateRoundRobin(tournament: Tournament): Bracket[] {
    const participants = tournament.participants;
    const n = participants.length;
    const rounds = n - 1 + (n % 2 === 0 ? 0 : 1);
    const brackets: Bracket[] = [];

    // Generate all-vs-all matches
    for (let round = 1; round <= rounds; round++) {
      const roundMatches: Match[] = [];

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          // Distribute matches across rounds
          const matchRound = ((i + j) % rounds) + 1;
          if (matchRound !== round) continue;

          roundMatches.push({
            id: `match_${++this.matchIdCounter}`,
            bracketId: `rr_round_${round}`,
            round,
            player1Id: participants[i].playerId,
            player2Id: participants[j].playerId,
            result: null,
            scheduledTime: tournament.startTime + (round - 1) * 3600000,
            status: 'pending',
          });
        }
      }

      if (roundMatches.length > 0) {
        brackets.push({
          id: `rr_round_${round}`,
          round,
          position: 0,
          matches: roundMatches,
          isLoserBracket: false,
        });
      }
    }

    return brackets;
  }

  // -------------------------------------------------------------------------
  // Private - ELO Calculation
  // -------------------------------------------------------------------------

  private updateELO(winnerId: string, loserId: string): void {
    const winner = this.getRating(winnerId);
    const loser = this.getRating(loserId);

    const expectedWinner = this.expectedScore(winner.rating, loser.rating);
    const expectedLoser = this.expectedScore(loser.rating, winner.rating);

    // K-factor adjustment based on games played
    const winnerK = this.getKFactor(winner);
    const loserK = this.getKFactor(loser);

    winner.rating = Math.round(winner.rating + winnerK * (1 - expectedWinner));
    loser.rating = Math.round(loser.rating + loserK * (0 - expectedLoser));

    winner.gamesPlayed++;
    winner.wins++;
    loser.gamesPlayed++;
    loser.losses++;

    if (winner.rating > winner.peakRating) {
      winner.peakRating = winner.rating;
    }

    winner.lastUpdated = Date.now();
    loser.lastUpdated = Date.now();
  }

  private expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  private getKFactor(rating: ELORating): number {
    // New players have higher K-factor for faster calibration
    if (rating.gamesPlayed < 10) return 40;
    if (rating.gamesPlayed < 30) return 32;
    if (rating.rating >= 2400) return 16;
    return this.defaultKFactor;
  }

  // -------------------------------------------------------------------------
  // Private - Tournament Progress
  // -------------------------------------------------------------------------

  private advanceBracket(tournament: Tournament): void {
    const currentRound = tournament.currentRound;
    const currentBrackets = tournament.brackets.filter(
      (b) => b.matches.some((m) => m.round === currentRound)
    );

    // Check if all matches in current round are complete
    let allComplete = true;
    for (const bracket of currentBrackets) {
      for (const match of bracket.matches) {
        if (match.round === currentRound && match.status !== 'completed' && match.status !== 'bye') {
          allComplete = false;
          break;
        }
      }
    }

    if (allComplete) {
      tournament.currentRound++;

      // Populate next round matches with winners
      const nextBrackets = tournament.brackets.filter(
        (b) => b.matches.some((m) => m.round === tournament.currentRound)
      );

      for (const bracket of nextBrackets) {
        for (let i = 0; i < bracket.matches.length; i++) {
          const match = bracket.matches[i];
          if (match.player1Id === null || match.player2Id === null) {
            // Find winners from previous round to fill this match
            const prevMatches = this.getPreviousRoundMatches(tournament, match.round, i);
            if (prevMatches.length >= 1 && prevMatches[0].result) {
              match.player1Id = prevMatches[0].result.winnerId;
            }
            if (prevMatches.length >= 2 && prevMatches[1].result) {
              match.player2Id = prevMatches[1].result.winnerId;
            }
          }
        }
      }
    }
  }

  private getPreviousRoundMatches(tournament: Tournament, currentRound: number, matchIndex: number): Match[] {
    const prevRound = currentRound - 1;
    const prevMatches: Match[] = [];

    for (const bracket of tournament.brackets) {
      for (const match of bracket.matches) {
        if (match.round === prevRound && match.status === 'completed') {
          prevMatches.push(match);
        }
      }
    }

    // Return the two matches that feed into this match
    const startIdx = matchIndex * 2;
    return prevMatches.slice(startIdx, startIdx + 2);
  }

  private checkTournamentComplete(tournament: Tournament): void {
    const allMatches = tournament.brackets.flatMap((b) => b.matches);
    const pendingMatches = allMatches.filter(
      (m) => m.status === 'pending' || m.status === 'in_progress'
    );

    // Check if all non-pending matches have players assigned
    const unfilledFutureMatches = allMatches.filter(
      (m) => m.status === 'pending' && (m.player1Id === null && m.player2Id === null)
    );

    if (pendingMatches.length === 0 || (pendingMatches.length === unfilledFutureMatches.length && unfilledFutureMatches.length === 0)) {
      tournament.status = 'completed';
      tournament.endTime = Date.now();
    }
  }

  private nextPowerOf2(n: number): number {
    let power = 1;
    while (power < n) power *= 2;
    return power;
  }
}
