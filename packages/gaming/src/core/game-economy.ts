// ============================================================================
// Gaming Package - Game Economy
// ============================================================================

import {
  Currency,
  Transaction,
  PowerUp,
  PowerUpEffect,
  GameEconomyConfig,
  ConversionRate,
  DailyReward,
  LivesConfig,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerEconomy {
  playerId: string;
  balances: Map<string, number>;
  transactions: Transaction[];
  activePowerUps: ActivePowerUp[];
  lives: number;
  lastLifeRegenTime: number;
  dailyRewardDay: number;
  lastDailyRewardClaim: number;
  loginStreak: number;
}

interface ActivePowerUp {
  powerUpId: string;
  activatedAt: number;
  expiresAt: number;
  stacks: number;
}

// ---------------------------------------------------------------------------
// Game Economy
// ---------------------------------------------------------------------------

export class GameEconomy {
  private currencies: Map<string, Currency> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private players: Map<string, PlayerEconomy> = new Map();
  private conversionRates: ConversionRate[] = [];
  private dailyRewards: DailyReward[] = [];
  private livesConfig: LivesConfig;
  private transactionIdCounter: number = 0;
  private maxTransactionHistory: number = 500;
  private earnRateTracking: Map<string, number[]> = new Map();
  private spendRateTracking: Map<string, number[]> = new Map();

  constructor(config?: GameEconomyConfig) {
    this.livesConfig = config?.livesConfig || {
      maxLives: 5,
      regenerationTimeMs: 1800000, // 30 minutes
      overflowAllowed: false,
      purchaseCost: { currencyId: 'gems', amount: 5 },
    };

    if (config?.currencies) {
      for (const currency of config.currencies) {
        this.currencies.set(currency.id, currency);
      }
    }
    if (config?.conversionRates) {
      this.conversionRates = config.conversionRates;
    }
    if (config?.dailyRewards) {
      this.dailyRewards = config.dailyRewards;
    }
  }

  /** Register a currency */
  registerCurrency(currency: Currency): void {
    this.currencies.set(currency.id, currency);
  }

  /** Register a power-up */
  registerPowerUp(powerUp: PowerUp): void {
    this.powerUps.set(powerUp.id, powerUp);
  }

  /** Initialize a player's economy */
  initPlayer(playerId: string, startingBalances?: Record<string, number>): void {
    const balances = new Map<string, number>();
    for (const [id, currency] of this.currencies.entries()) {
      balances.set(id, startingBalances?.[id] || 0);
    }

    this.players.set(playerId, {
      playerId,
      balances,
      transactions: [],
      activePowerUps: [],
      lives: this.livesConfig.maxLives,
      lastLifeRegenTime: Date.now(),
      dailyRewardDay: 0,
      lastDailyRewardClaim: 0,
      loginStreak: 0,
    });
  }

  /** Get player balance for a currency */
  getBalance(playerId: string, currencyId: string): number {
    const player = this.players.get(playerId);
    if (!player) return 0;
    return player.balances.get(currencyId) || 0;
  }

  /** Earn currency (add to balance) */
  earn(playerId: string, currencyId: string, amount: number, source: string): Transaction | null {
    const player = this.players.get(playerId);
    if (!player || amount <= 0) return null;

    const currency = this.currencies.get(currencyId);
    if (!currency) return null;

    const currentBalance = player.balances.get(currencyId) || 0;
    const newBalance = Math.min(currentBalance + amount, currency.maxBalance);
    player.balances.set(currencyId, newBalance);

    const transaction = this.createTransaction(playerId, currencyId, amount, 'earn', source, newBalance);
    this.recordTransaction(player, transaction);
    this.trackEarnRate(currencyId, amount);

    return transaction;
  }

  /** Spend currency (deduct from balance) */
  spend(playerId: string, currencyId: string, amount: number, source: string): Transaction | null {
    const player = this.players.get(playerId);
    if (!player || amount <= 0) return null;

    const currentBalance = player.balances.get(currencyId) || 0;
    if (currentBalance < amount) return null;

    const newBalance = currentBalance - amount;
    player.balances.set(currencyId, newBalance);

    const transaction = this.createTransaction(playerId, currencyId, -amount, 'spend', source, newBalance);
    this.recordTransaction(player, transaction);
    this.trackSpendRate(currencyId, amount);

    return transaction;
  }

  /** Convert one currency to another */
  convert(playerId: string, fromCurrency: string, toCurrency: string, amount: number): Transaction | null {
    const rate = this.conversionRates.find((r) => r.from === fromCurrency && r.to === toCurrency);
    if (!rate || amount < rate.minAmount) return null;

    const spendResult = this.spend(playerId, fromCurrency, amount, `convert_to_${toCurrency}`);
    if (!spendResult) return null;

    const convertedAmount = Math.floor(amount * rate.rate);
    const earnResult = this.earn(playerId, toCurrency, convertedAmount, `convert_from_${fromCurrency}`);
    return earnResult;
  }

  /** Purchase a power-up */
  purchasePowerUp(playerId: string, powerUpId: string): boolean {
    const player = this.players.get(playerId);
    const powerUp = this.powerUps.get(powerUpId);
    if (!player || !powerUp) return false;

    // Check if on cooldown
    const existingActive = player.activePowerUps.find((p) => p.powerUpId === powerUpId);
    if (existingActive && !powerUp.stackable) return false;
    if (existingActive && existingActive.stacks >= powerUp.maxStacks) return false;

    // Attempt to spend
    const spendResult = this.spend(playerId, powerUp.cost.currencyId, powerUp.cost.amount, `purchase_${powerUpId}`);
    if (!spendResult) return false;

    // Activate power-up
    this.activatePowerUp(player, powerUp);
    return true;
  }

  /** Get active power-ups for a player */
  getActivePowerUps(playerId: string): ActivePowerUp[] {
    const player = this.players.get(playerId);
    if (!player) return [];

    const now = Date.now();
    // Remove expired power-ups
    player.activePowerUps = player.activePowerUps.filter((p) => p.expiresAt > now);
    return [...player.activePowerUps];
  }

  /** Check if a power-up effect is active */
  isPowerUpActive(playerId: string, powerUpId: string): boolean {
    const activePowerUps = this.getActivePowerUps(playerId);
    return activePowerUps.some((p) => p.powerUpId === powerUpId);
  }

  /** Get current lives */
  getLives(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player) return 0;

    this.regenerateLives(player);
    return player.lives;
  }

  /** Use a life */
  useLife(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    this.regenerateLives(player);
    if (player.lives <= 0) return false;

    player.lives--;
    return true;
  }

  /** Purchase extra lives */
  purchaseLife(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    if (!this.livesConfig.overflowAllowed && player.lives >= this.livesConfig.maxLives) {
      return false;
    }

    const spendResult = this.spend(
      playerId,
      this.livesConfig.purchaseCost.currencyId,
      this.livesConfig.purchaseCost.amount,
      'purchase_life'
    );

    if (!spendResult) return false;

    player.lives++;
    return true;
  }

  /** Claim daily reward */
  claimDailyReward(playerId: string): DailyReward | null {
    const player = this.players.get(playerId);
    if (!player || this.dailyRewards.length === 0) return null;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const timeSinceLastClaim = now - player.lastDailyRewardClaim;

    // Check if already claimed today
    if (timeSinceLastClaim < dayMs && player.lastDailyRewardClaim > 0) {
      return null;
    }

    // Check if streak is broken (more than 48 hours)
    if (timeSinceLastClaim > dayMs * 2 && player.lastDailyRewardClaim > 0) {
      player.loginStreak = 0;
      player.dailyRewardDay = 0;
    }

    // Get today's reward
    const rewardIndex = player.dailyRewardDay % this.dailyRewards.length;
    const reward = this.dailyRewards[rewardIndex];

    // Grant reward
    this.earn(playerId, reward.currencyId, reward.amount, 'daily_reward');

    // Update player state
    player.lastDailyRewardClaim = now;
    player.dailyRewardDay++;
    player.loginStreak++;

    return reward;
  }

  /** Get transaction history */
  getTransactionHistory(playerId: string, limit?: number): Transaction[] {
    const player = this.players.get(playerId);
    if (!player) return [];
    const transactions = [...player.transactions];
    if (limit) return transactions.slice(-limit);
    return transactions;
  }

  /** Refund a transaction */
  refund(playerId: string, transactionId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const transaction = player.transactions.find((t) => t.id === transactionId);
    if (!transaction || transaction.type !== 'spend') return false;

    const amount = Math.abs(transaction.amount);
    this.earn(playerId, transaction.currencyId, amount, `refund_${transactionId}`);
    return true;
  }

  /** Get economy balance analysis */
  getEconomyAnalysis(): { earnRates: Record<string, number>; spendRates: Record<string, number>; ratio: Record<string, number> } {
    const earnRates: Record<string, number> = {};
    const spendRates: Record<string, number> = {};
    const ratio: Record<string, number> = {};

    for (const [currencyId, amounts] of this.earnRateTracking.entries()) {
      const avg = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      earnRates[currencyId] = avg;
    }

    for (const [currencyId, amounts] of this.spendRateTracking.entries()) {
      const avg = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      spendRates[currencyId] = avg;
    }

    for (const currencyId of this.currencies.keys()) {
      const earn = earnRates[currencyId] || 0;
      const spend = spendRates[currencyId] || 0;
      ratio[currencyId] = spend > 0 ? earn / spend : earn > 0 ? Infinity : 1;
    }

    return { earnRates, spendRates, ratio };
  }

  /** Get daily login streak */
  getLoginStreak(playerId: string): number {
    const player = this.players.get(playerId);
    return player ? player.loginStreak : 0;
  }

  /** Get next daily reward info */
  getNextDailyReward(playerId: string): { reward: DailyReward; availableIn: number } | null {
    const player = this.players.get(playerId);
    if (!player || this.dailyRewards.length === 0) return null;

    const rewardIndex = player.dailyRewardDay % this.dailyRewards.length;
    const reward = this.dailyRewards[rewardIndex];

    const dayMs = 24 * 60 * 60 * 1000;
    const timeSinceLastClaim = Date.now() - player.lastDailyRewardClaim;
    const availableIn = Math.max(0, dayMs - timeSinceLastClaim);

    return { reward, availableIn };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private createTransaction(
    playerId: string,
    currencyId: string,
    amount: number,
    type: 'earn' | 'spend' | 'convert' | 'refund' | 'gift',
    source: string,
    balanceAfter: number
  ): Transaction {
    return {
      id: `tx_${++this.transactionIdCounter}`,
      playerId,
      currencyId,
      amount,
      type,
      source,
      timestamp: Date.now(),
      balanceAfter,
    };
  }

  private recordTransaction(player: PlayerEconomy, transaction: Transaction): void {
    player.transactions.push(transaction);
    if (player.transactions.length > this.maxTransactionHistory) {
      player.transactions.shift();
    }
  }

  private activatePowerUp(player: PlayerEconomy, powerUp: PowerUp): void {
    const existing = player.activePowerUps.find((p) => p.powerUpId === powerUp.id);
    if (existing && powerUp.stackable) {
      existing.stacks++;
      existing.expiresAt = Date.now() + powerUp.duration;
    } else {
      player.activePowerUps.push({
        powerUpId: powerUp.id,
        activatedAt: Date.now(),
        expiresAt: Date.now() + powerUp.duration,
        stacks: 1,
      });
    }
  }

  private regenerateLives(player: PlayerEconomy): void {
    if (player.lives >= this.livesConfig.maxLives) {
      player.lastLifeRegenTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsed = now - player.lastLifeRegenTime;
    const livesRegen = Math.floor(elapsed / this.livesConfig.regenerationTimeMs);

    if (livesRegen > 0) {
      player.lives = Math.min(player.lives + livesRegen, this.livesConfig.maxLives);
      player.lastLifeRegenTime = now - (elapsed % this.livesConfig.regenerationTimeMs);
    }
  }

  private trackEarnRate(currencyId: string, amount: number): void {
    if (!this.earnRateTracking.has(currencyId)) {
      this.earnRateTracking.set(currencyId, []);
    }
    const tracking = this.earnRateTracking.get(currencyId)!;
    tracking.push(amount);
    if (tracking.length > 1000) tracking.shift();
  }

  private trackSpendRate(currencyId: string, amount: number): void {
    if (!this.spendRateTracking.has(currencyId)) {
      this.spendRateTracking.set(currencyId, []);
    }
    const tracking = this.spendRateTracking.get(currencyId)!;
    tracking.push(amount);
    if (tracking.length > 1000) tracking.shift();
  }
}
