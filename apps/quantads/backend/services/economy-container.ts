import type { FastifyInstance } from 'fastify';
import {
  CoinWallet,
  BuyCoinService,
  EarnCoinService,
  VirtualGoodsCatalog,
  CrossAppInventory,
  StorePurchaseService,
  CreatorListingService,
  RevenueSplitEngine,
  CreatorPayoutService,
  SelfBoostEngine,
  BoostPackRegistry,
  GiftingService,
  TippingService,
  SubscriptionManager,
  EntitlementService,
} from '@quant/quant-economy';

// ============================================================================
// Economy container — the QuantAds economy subsystem, built per Fastify
// instance instead of as module-load singletons.
// ============================================================================
//
// WHY THIS SHAPE
//   Previously this module constructed `const wallet = new CoinWallet()` (and
//   ~14 other services) at module-load time and exported them as shared
//   singletons. That is a de-risk blocker for the upcoming migration onto the
//   ecosystem-wide `@quant/credits` ledger: a `CreditWallet` needs a
//   `PrismaClient`, which is only available on the Fastify instance — not at
//   module load. So we move construction into a factory that is invoked once
//   per app instance (via `app.decorate('economy', ...)`), threading an
//   optional `prisma` dependency in for the future swap.
//
//   BEHAVIOUR IS UNCHANGED: exactly one container (hence one in-memory
//   `CoinWallet` and friends) is built per Fastify instance, so state is shared
//   across requests within a process exactly as the module singleton was. This
//   PR only changes the construction SHAPE — it stays on `@quant/quant-economy`
//   and does not touch the credit ledger.

/** The fully-wired set of economy services shared across a QuantAds instance. */
export interface EconomyContainer {
  wallet: CoinWallet;
  catalog: VirtualGoodsCatalog;
  inventory: CrossAppInventory;
  packRegistry: BoostPackRegistry;
  subscriptionManager: SubscriptionManager;
  buyCoinService: BuyCoinService;
  earnCoinService: EarnCoinService;
  purchaseService: StorePurchaseService;
  listingService: CreatorListingService;
  revenueSplitEngine: RevenueSplitEngine;
  payoutService: CreatorPayoutService;
  boostEngine: SelfBoostEngine;
  giftingService: GiftingService;
  tippingService: TippingService;
  entitlementService: EntitlementService;
}

/** Injectable dependencies for {@link createEconomyContainer}. */
export interface EconomyContainerDeps {
  /**
   * Reserved for the upcoming `@quant/credits` migration: when present, the
   * container will build `CreditWallet`-backed services against this Prisma
   * client. Unused today — behaviour intentionally stays on the in-memory
   * `CoinWallet` (this PR only moves construction off the module singleton).
   */
  prisma?: unknown;
}

/**
 * Build a fresh, fully-wired economy container. Invoked once per Fastify
 * instance. The wiring mirrors the previous module-level singletons exactly.
 */
export function createEconomyContainer(_deps: EconomyContainerDeps = {}): EconomyContainer {
  const wallet = new CoinWallet();
  const catalog = new VirtualGoodsCatalog();
  const inventory = new CrossAppInventory();
  const packRegistry = new BoostPackRegistry();
  const subscriptionManager = new SubscriptionManager();

  const buyCoinService = new BuyCoinService(wallet);
  const earnCoinService = new EarnCoinService(wallet);
  const purchaseService = new StorePurchaseService(wallet, catalog, inventory);
  const listingService = new CreatorListingService();
  const revenueSplitEngine = new RevenueSplitEngine();
  const payoutService = new CreatorPayoutService(revenueSplitEngine);
  const boostEngine = new SelfBoostEngine(wallet, packRegistry);
  const giftingService = new GiftingService(wallet, catalog, inventory);
  const tippingService = new TippingService(wallet);
  const entitlementService = new EntitlementService(subscriptionManager);

  return {
    wallet,
    catalog,
    inventory,
    packRegistry,
    subscriptionManager,
    buyCoinService,
    earnCoinService,
    purchaseService,
    listingService,
    revenueSplitEngine,
    payoutService,
    boostEngine,
    giftingService,
    tippingService,
    entitlementService,
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    /** The per-instance economy container (see {@link EconomyContainer}). */
    economy: EconomyContainer;
  }
}

/**
 * Decorate a Fastify instance with a single shared {@link EconomyContainer}.
 * Idempotent — safe to call more than once on the same instance. Must run
 * before the economy routes are registered so the child plugins inherit it.
 */
export function registerEconomyContainer(
  app: FastifyInstance,
  deps: EconomyContainerDeps = {},
): void {
  if (!app.hasDecorator('economy')) {
    app.decorate('economy', createEconomyContainer(deps));
  }
}
