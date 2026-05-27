// ============================================================================
// Payments Package - Type Definitions
// Comprehensive types for payment processing, subscriptions, wallets, invoicing
// ============================================================================

/** Supported payment method types */
export type PaymentMethodType = 'card' | 'bank' | 'crypto' | 'wallet' | 'paypal' | 'wire';

/** Card brand identifiers */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'unionpay' | 'jcb';

/** Transaction status lifecycle */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'cancelled';

/** Subscription status lifecycle */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'incomplete';

/** Invoice status */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'overdue';

/** Refund status */
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** Wallet transaction type */
export type WalletTransactionType =
  | 'credit'
  | 'debit'
  | 'transfer_in'
  | 'transfer_out'
  | 'refund'
  | 'fee'
  | 'reward';

/** Currency codes (ISO 4217) */
export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'JPY'
  | 'CNY'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'BRL';

/** Payment gateway provider */
export type GatewayProvider = 'stripe' | 'paypal' | 'razorpay' | 'square' | 'braintree' | 'adyen';

/** Billing interval for subscriptions */
export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Tax type */
export type TaxType = 'vat' | 'gst' | 'sales_tax' | 'service_tax' | 'withholding';

/** Payout status */
export type PayoutStatus = 'pending' | 'held' | 'processing' | 'completed' | 'failed';

/** Payment method interface */
export interface PaymentMethod {
  id: string;
  customerId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  card?: CardDetails;
  bank?: BankDetails;
  crypto?: CryptoDetails;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, string>;
}

/** Card details */
export interface CardDetails {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  fingerprint: string;
  country: string;
  funding: 'credit' | 'debit' | 'prepaid';
  cvcCheck: 'pass' | 'fail' | 'unchecked';
}

/** Bank account details */
export interface BankDetails {
  bankName: string;
  accountType: 'checking' | 'savings';
  last4: string;
  routingNumber: string;
  country: string;
  currency: CurrencyCode;
  verified: boolean;
}

/** Crypto wallet details */
export interface CryptoDetails {
  network: string;
  address: string;
  currency: string;
}

/** Transaction record */
export interface Transaction {
  id: string;
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  description: string;
  gateway: GatewayProvider;
  gatewayTransactionId: string;
  idempotencyKey: string;
  failureReason?: string;
  failureCode?: string;
  refundedAmount: number;
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

/** Subscription plan definition */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  interval: BillingInterval;
  intervalCount: number;
  trialDays: number;
  features: string[];
  limits: Record<string, number>;
  active: boolean;
  metadata: Record<string, string>;
  createdAt: number;
}

/** Active subscription */
export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  trialStart?: number;
  trialEnd?: number;
  cancelledAt?: number;
  cancelAtPeriodEnd: boolean;
  pausedAt?: number;
  resumeAt?: number;
  quantity: number;
  discount?: DiscountInfo;
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Invoice record */
export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: InvoiceStatus;
  number: string;
  lineItems: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: CurrencyCode;
  dueDate: number;
  paidAt?: number;
  voidedAt?: number;
  notes: string;
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Invoice line item */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  periodStart?: number;
  periodEnd?: number;
}

/** Wallet record */
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: CurrencyCode;
  frozen: boolean;
  frozenAt?: number;
  frozenReason?: string;
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  totalCredits: number;
  totalDebits: number;
  createdAt: number;
  updatedAt: number;
}

/** Wallet transaction */
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  counterpartyWalletId?: string;
  metadata: Record<string, string>;
  createdAt: number;
}

/** Refund request */
export interface RefundRequest {
  id: string;
  transactionId: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  processedBy?: string;
  processedAt?: number;
  createdAt: number;
}

/** Revenue share configuration */
export interface RevenueShare {
  id: string;
  creatorId: string;
  platformSharePercent: number;
  creatorSharePercent: number;
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  currency: CurrencyCode;
  totalEarned: number;
  totalPaid: number;
  pendingPayout: number;
  heldAmount: number;
  active: boolean;
  createdAt: number;
}

/** Payout record */
export interface Payout {
  id: string;
  creatorId: string;
  amount: number;
  currency: CurrencyCode;
  status: PayoutStatus;
  paymentMethodId: string;
  period: { start: number; end: number };
  itemCount: number;
  processedAt?: number;
  createdAt: number;
}

/** Tax rate definition */
export interface TaxRate {
  id: string;
  name: string;
  type: TaxType;
  rate: number;
  jurisdiction: string;
  country: string;
  state?: string;
  city?: string;
  active: boolean;
  inclusive: boolean;
  description: string;
}

/** Tax jurisdiction */
export interface TaxJurisdiction {
  country: string;
  state?: string;
  city?: string;
  taxTypes: TaxType[];
  rates: TaxRate[];
  registrationRequired: boolean;
  thresholdAmount?: number;
  thresholdCurrency?: CurrencyCode;
}

/** Discount information */
export interface DiscountInfo {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  maxUses: number;
  usedCount: number;
  validFrom: number;
  validUntil: number;
  applicablePlans: string[];
}

/** Payment gateway configuration */
export interface PaymentGatewayConfig {
  provider: GatewayProvider;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  currency: CurrencyCode;
  retryAttempts: number;
  retryDelayMs: number;
  idempotencyTTL: number;
  metadata: Record<string, string>;
}

/** Charge request */
export interface ChargeRequest {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

/** Charge result */
export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  status: TransactionStatus;
  failureReason?: string;
  failureCode?: string;
}

/** Customer record */
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: Address;
  taxId?: string;
  defaultPaymentMethodId?: string;
  metadata: Record<string, string>;
  createdAt: number;
}

/** Address */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// Creator Economy Types
// ============================================================================

/** Creator account verification status */
export type CreatorAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';

/** Creator account linked via Stripe Connect */
export interface CreatorAccount {
  id: string;
  creatorId: string;
  stripeAccountId: string;
  status: CreatorAccountStatus;
  email: string;
  country: string;
  onboardingUrl: string;
  createdAt: number;
}

/** Revenue share entry type */
export type RevShareType = 'ad_revenue' | 'tip';

/** Revenue share ledger entry */
export interface RevShareEntry {
  id: string;
  type: RevShareType;
  creatorId: string;
  grossAmount: number;
  creatorShare: number;
  platformShare: number;
  referenceId: string;
  createdAt: number;
}

/** Creator wallet balance breakdown */
export interface CreatorWalletBalance {
  earnings: number;
  pending: number;
  available: number;
  currency: CurrencyCode;
}

/** Creator subscription tier */
export interface CreatorSubscriptionTier {
  id: string;
  creatorId: string;
  name: string;
  priceMonthly: number;
  benefits: string[];
  subscriberCount: number;
  active: boolean;
  createdAt: number;
}

/** Creator subscription (fan subscribing to creator) */
export interface CreatorSubscription {
  id: string;
  fanId: string;
  creatorId: string;
  tierId: string;
  status: 'active' | 'cancelled';
  startedAt: number;
  cancelledAt?: number;
}

/** Tip record */
export interface TipRecord {
  id: string;
  fromUserId: string;
  toCreatorId: string;
  amount: number;
  creatorShare: number;
  platformShare: number;
  message?: string;
  createdAt: number;
}

/** Cashout status lifecycle */
export type CashoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Cashout method */
export type CashoutMethod = 'bank_transfer' | 'instant';

/** Cashout request */
export interface CashoutRequest {
  id: string;
  creatorId: string;
  amount: number;
  method: CashoutMethod;
  status: CashoutStatus;
  requestedAt: number;
  processedAt?: number;
}

/** Ledger entry type */
export type LedgerEntryType = 'credit' | 'debit' | 'transfer' | 'fee' | 'revenue' | 'payout';

/** Immutable ledger entry */
export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

// ============================================================================
// Fraud Detection Types
// ============================================================================

/** Risk level for fraud detection */
export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Individual fraud signal detected during analysis */
export interface FraudSignal {
  type: string;
  score: number;
  description: string;
  timestamp: number;
}

/** Result of a fraud check on a transaction */
export interface FraudCheckResult {
  transactionId: string;
  riskLevel: FraudRiskLevel;
  riskScore: number;
  signals: FraudSignal[];
  action: 'allow' | 'flag' | 'block' | 'review';
  checkedAt: number;
}

// ============================================================================
// Ad Billing Types
// ============================================================================

/** Ad campaign status */
export type AdCampaignStatus = 'active' | 'paused' | 'exhausted' | 'completed';

/** Ad campaign record */
export interface AdCampaign {
  id: string;
  advertiserId: string;
  name: string;
  budget: number;
  dailyBudget: number;
  spent: number;
  dailySpent: number;
  cpm: number;
  cpc: number;
  cpa: number;
  status: AdCampaignStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: number;
}

/** Ad billing record for individual events */
export interface AdBillingRecord {
  id: string;
  campaignId: string;
  type: 'impression' | 'click' | 'conversion';
  cost: number;
  timestamp: number;
}

// ============================================================================
// Agent Spending Limit Types
// ============================================================================

/** Budget configuration for an AI agent */
export interface AgentBudget {
  agentId: string;
  userId: string;
  perTransactionLimit: number;
  hourlyLimit: number;
  dailyLimit: number;
  monthlyLimit: number;
  hourlySpent: number;
  dailySpent: number;
  monthlySpent: number;
  requiresApprovalAbove: number;
  createdAt: number;
}

/** Approval request for agent spending above threshold */
export interface AgentSpendApproval {
  id: string;
  agentId: string;
  userId: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: number;
  resolvedAt?: number;
}

// ============================================================================
// Dispute Types
// ============================================================================

/** Dispute lifecycle status */
export type DisputeStatus =
  | 'opened'
  | 'evidence_requested'
  | 'under_review'
  | 'resolved_won'
  | 'resolved_lost';

/** Reason for opening a dispute */
export type DisputeReason = 'fraud' | 'not_received' | 'product_issue' | 'duplicate' | 'other';

/** Evidence submitted for a dispute */
export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedBy: 'customer' | 'merchant';
  type: string;
  content: string;
  submittedAt: number;
}

/** Dispute record */
export interface Dispute {
  id: string;
  transactionId: string;
  customerId: string;
  amount: number;
  reason: DisputeReason;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  resolution?: string;
  financialImpact?: number;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}
