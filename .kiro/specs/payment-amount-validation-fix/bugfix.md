# Bugfix Requirements Document

## Introduction

`PaymentEngine.processPayment(userId, amount, currency, type, metadata)` in
`packages/payment/src/core/payment-engine.ts` performs **no validation** on the
`amount` or `currency` arguments before constructing a `Transaction` record and
forwarding the charge to the configured `PaymentProcessorBackend`. As a result,
non-positive amounts (`0`, negatives), non-finite amounts (`NaN`, `Infinity`,
`-Infinity`), and invalid currency codes (empty/malformed strings) are accepted
unchecked. The `/process` route handler in
`apps/quantai/backend/routes/payments.ts` forwards request-body values directly
into this method, so these inputs are reachable from untrusted input.

This is a payment-integrity defect. The most severe case is a negative amount,
which records/forwards a **negative charge** — a value-transfer / self-credit
exploit. Refunds are the only legitimate value movement the other way, and they
are themselves represented by a positive `amount` with `type = 'refund'`; a
negative `amount` is never valid for any transaction type.

The fix must reject invalid input **fast** with a typed validation error
**before** any `Transaction` is constructed and **before** `processor.charge` is
ever called, so that no transaction is persisted for invalid input. The existing
fail-closed behavior (processor throws/declines → `status = 'failed'`; no
processor configured → `status = 'failed'`) is correct and MUST be preserved.

## Bug Analysis

### Current Behavior (Defect)

When `processPayment` is called with an invalid `amount` or `currency`, the
method builds a `Transaction`, persists it to the in-memory `transactions`
array, and (when a processor is configured) forwards the charge to
`processor.charge` — all without any validation.

1.1 WHEN `processPayment` is called with `amount = 0` THEN the system creates and persists a transaction and forwards a zero-value charge to the configured processor.
1.2 WHEN `processPayment` is called with a negative `amount` (e.g. `-100`) for any type (`one_time`, `subscription`, `refund`) THEN the system records and forwards a negative-value charge, enabling a value-transfer / self-credit exploit.
1.3 WHEN `processPayment` is called with a non-finite `amount` (`NaN`, `Infinity`, or `-Infinity`) THEN the system records and forwards the charge unchecked.
1.4 WHEN `processPayment` is called with an invalid `currency` (empty string or malformed code) THEN the system records and forwards the charge unchecked.
1.5 WHEN any of the above invalid inputs is supplied THEN the system persists a transaction record before (and regardless of) the processor outcome, leaving an invalid transaction in `getUserTransactions` history.

### Expected Behavior (Correct)

Invalid input must be rejected before any side effect. The check happens before
the `Transaction` object is constructed and before `processor.charge` is called,
and no transaction is persisted for invalid input.

2.1 WHEN `processPayment` is called with `amount = 0` THEN the system SHALL reject the call by throwing a typed validation error before constructing or persisting a transaction and before calling `processor.charge`.
2.2 WHEN `processPayment` is called with a negative `amount` for any type (`one_time`, `subscription`, `refund`) THEN the system SHALL reject the call by throwing a typed validation error before constructing or persisting a transaction and before calling `processor.charge`.
2.3 WHEN `processPayment` is called with a non-finite `amount` (`NaN`, `Infinity`, or `-Infinity`) THEN the system SHALL reject the call by throwing a typed validation error before constructing or persisting a transaction and before calling `processor.charge`.
2.4 WHEN `processPayment` is called with an invalid `currency` (empty string or malformed code) THEN the system SHALL reject the call by throwing a typed validation error before constructing or persisting a transaction and before calling `processor.charge`.
2.5 WHEN any invalid input is rejected THEN the system SHALL NOT persist any transaction for that call, so the rejected input never appears in `getUserTransactions`.

### Unchanged Behavior (Regression Prevention)

Valid inputs and unrelated operations must behave exactly as they do today,
including the existing fail-closed processor semantics.

3.1 WHEN `processPayment` is called with a valid positive, finite `amount` and a valid `currency` AND a processor is configured AND the processor returns `{ status: 'completed' }` THEN the system SHALL CONTINUE TO record the transaction as `completed` (including attaching `providerRef` to metadata when present).
3.2 WHEN `processPayment` is called with valid inputs AND a processor is configured AND the processor throws or returns a non-completed status THEN the system SHALL CONTINUE TO fail closed and record the transaction as `failed`.
3.3 WHEN `processPayment` is called with valid inputs AND no processor is configured THEN the system SHALL CONTINUE TO fail closed and record the transaction as `failed`.
3.4 WHEN `processPayment` is called with a valid positive, finite `amount` and a valid `currency` AND `type = 'refund'` THEN the system SHALL CONTINUE TO process the refund exactly as it does today.
3.5 WHEN `addPaymentMethod`, `getUserTransactions`, or `getUserPaymentMethods` are called THEN the system SHALL CONTINUE TO behave exactly as today, unaffected by the validation change.

## Bug Condition Methodology

### Bug Condition Function

Identifies the inputs that trigger the bug — non-positive amounts, non-finite
amounts, and invalid currencies, across all transaction types.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X = { userId, amount, currency, type, metadata }
  OUTPUT: boolean

  // Invalid amount: not a finite number, or not strictly positive.
  amountInvalid  ← (NOT isFinite(X.amount)) OR (X.amount <= 0)

  // Invalid currency: not a non-empty, well-formed currency code.
  currencyInvalid ← (NOT isValidCurrency(X.currency))

  RETURN amountInvalid OR currencyInvalid
END FUNCTION
```

### Property Specification (Fix Checking)

For every buggy input, the fixed function rejects before any side effect.

```pascal
// Property: Fix Checking - reject invalid amount/currency with no side effects
FOR ALL X WHERE isBugCondition(X) DO
  result ← processPayment'(X)   // F' = fixed function
  ASSERT throwsTypedValidationError(result)
  ASSERT NOT charge_was_called           // no processor.charge call
  ASSERT NOT transaction_was_persisted   // nothing added to transactions[]
END FOR
```

### Preservation Specification (Preservation Checking)

For every non-buggy input, the fixed function behaves identically to the
original — including the fail-closed processor paths and refunds.

```pascal
// Property: Preservation Checking - valid inputs behave exactly as today
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)   // identical transaction status, persistence, metadata
END FOR
```

### Key Definitions

- **C(X)** — Bug Condition: `(NOT isFinite(amount)) OR (amount <= 0) OR (NOT isValidCurrency(currency))`
- **P(result)** — Property: throws a typed validation error, with no `processor.charge` call and no persisted transaction.
- **¬C(X)** — Non-buggy inputs: positive finite amount with a valid currency (any `type`, including `refund`); these must be preserved.
- **F** — Original (unfixed) `processPayment`.
- **F'** — Fixed `processPayment`.
- **Counterexample** — `processPayment('u1', -100, 'USD', 'one_time')` currently records/forwards a negative charge instead of rejecting it.
