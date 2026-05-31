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

// Shared singleton instances for the economy subsystem.
// All route plugins import from here so they operate on the same state.

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

export {
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
