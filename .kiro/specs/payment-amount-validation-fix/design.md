# Payment Amount Validation Fix Bugfix Design

## Overview

`PaymentEngine.processPayment(userId, amount, currency, type, metadata)` in
`packages/payment/src/core/payment-engine.ts` constructs a `Transaction`, pushes it to the
in-memory `transactions` array, and (when a processor is configured) calls `processor.charge(...)`
with **no validation** of `amount` or `currency`. Because the only caller —
`apps/quantai/backend/routes/payments.ts` POST `/process` — forwards raw request-body values
straight into the method, untrusted input reaches the engine unchecked. The most severe case is a
**negative `amount`**, which records and forwards a negative-value charge (a self-credit /
value-transfer exploit); non-positive (`0`), non-finite (`NaN`, `Infinity`, `-Infinity`), and
malformed-currency inputs are likewise accepted.

The fix is a **fail-fast validation guard** placed at the very top of `processPayment` — **before**
the `Transaction` object is constructed and **before** `processor.charge` is ever invoked — so that
no transaction is persisted and no charge is attempted for invalid input. The guard rejects invalid
input by throwing a dedicated, typed `PaymentValidationError` exported from the `@quant/payment`
package, which the QuantAI route boundary maps to an HTTP `400`. The existing fail-closed processor
semantics (processor throws/declines → `failed`; no processor configured → `failed`) and all valid
flows, including refunds, are preserved unchanged.

The change is intentionally minimal and additive: a new error type, a small validation helper, a
guard at the start of `processPayment`, and a `catch` clause at the route boundary. No existing
behavior for valid inputs is altered.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `processPayment` is called with an
  `amount` that is not a finite, strictly-positive number, or with a `currency` that is not a
  well-formed currency code. Formally: `!Number.isFinite(amount) || amount <= 0 || !isValidCurrency(currency)`.
- **Property (P)**: The desired behavior for buggy input — `processPayment` throws a
  `PaymentValidationError` **before** constructing/persisting a `Transaction` and **before** calling
  `processor.charge`, producing no side effects.
- **Preservation**: All behavior for non-buggy input (positive finite amount + valid currency, for
  any `type` including `refund`) must remain byte-for-byte identical to today — including the
  processor-completed path, the fail-closed processor-throw/decline path, the no-processor
  fail-closed path, and the `providerRef` metadata attachment.
- **processPayment**: The method in `packages/payment/src/core/payment-engine.ts` that builds a
  `Transaction`, optionally calls `processor.charge`, persists the transaction to `this.transactions`,
  and returns it. This is the function under fix (F = original, F' = fixed).
- **PaymentProcessorBackend**: The injected/configured backend whose `charge(request)` performs the
  real charge. Throwing or returning a non-`completed` status is treated as `failed` (fail-closed).
- **isValidCurrency**: New runtime predicate (introduced by this fix) that returns `true` only for a
  non-empty, uppercase, 3-letter ISO-4217-style alpha code (`/^[A-Z]{3}$/`).
- **PaymentValidationError**: New typed error (introduced by this fix), exported from `@quant/payment`,
  thrown by the validation guard so callers can classify it as a client (400) error.
- **Route boundary**: The QuantAI Fastify handler `apps/quantai/backend/routes/payments.ts` POST
  `/process`, which is the only external caller of `processPayment`.

## Bug Details

### Bug Condition

The bug manifests when `processPayment` is invoked with an `amount` that is not a finite,
strictly-positive number, or with a `currency` that is not a well-formed currency code. The current
`processPayment` performs no validation: it is either accepting non-positive amounts, accepting
non-finite amounts, or accepting malformed/empty currency codes, and in every such case it persists a
`Transaction` and forwards the charge to `processor.charge`.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input = { userId, amount, currency, type, metadata }
  OUTPUT: boolean

  amountInvalid   := (NOT Number.isFinite(input.amount)) OR (input.amount <= 0)
  currencyInvalid := (NOT isValidCurrency(input.currency))

  RETURN amountInvalid OR currencyInvalid
END FUNCTION
```

Where the new currency predicate is:

```
FUNCTION isValidCurrency(currency)
  INPUT: currency of type string (untrusted)
  OUTPUT: boolean

  RETURN (typeof currency == 'string') AND MATCHES(currency, /^[A-Z]{3}$/)
END FUNCTION
```

### Examples

- `processPayment('u1', -100, 'USD', 'one_time')` — **expected:** throw `PaymentValidationError`,
  persist nothing, never call `processor.charge`. **actual (bug):** records/forwards a negative-value
  charge and persists a transaction.
- `processPayment('u1', 0, 'USD', 'one_time')` — **expected:** throw `PaymentValidationError`,
  no side effects. **actual (bug):** persists a zero-value transaction and forwards a zero charge.
- `processPayment('u1', NaN, 'USD', 'subscription')` — **expected:** throw `PaymentValidationError`,
  no side effects. **actual (bug):** persists and forwards a `NaN` charge.
- `processPayment('u1', 100, '', 'one_time')` (also `'us'`, `'usd'`, `'US$'`) — **expected:** throw
  `PaymentValidationError`, no side effects. **actual (bug):** persists and forwards with an invalid
  currency.
- `processPayment('u1', -50, 'USD', 'refund')` — **expected:** throw `PaymentValidationError`; a
  negative amount is never valid even for refunds (refunds are positive amounts with `type='refund'`).
  **actual (bug):** persists/forwards a negative-value refund.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- A valid call with a positive, finite `amount` and a valid `currency` and a configured processor
  that returns `{ status: 'completed' }` SHALL continue to record the transaction as `completed`,
  including attaching `providerRef` to `metadata` when present.
- A valid call where the processor throws or returns a non-`completed` status SHALL continue to fail
  closed and record the transaction as `failed`.
- A valid call where no processor is configured SHALL continue to fail closed and record the
  transaction as `failed`.
- A valid call with `type = 'refund'` (positive, finite `amount`, valid `currency`) SHALL continue to
  be processed exactly as today.
- `addPaymentMethod`, `getUserTransactions`, and `getUserPaymentMethods` SHALL continue to behave
  exactly as today, unaffected by the validation change.
- The transaction `id`/`createdAt` construction, the `pending` initial status, the persistence to
  `this.transactions`, and the returned `Transaction` shape SHALL remain identical for valid input.

**Scope:**
All inputs that do NOT satisfy the bug condition — i.e. a positive, finite `amount` together with a
valid currency code, for any `type` — must be completely unaffected by this fix. This includes:

- Valid one-time, subscription, and refund payments across the processor-completed,
  processor-failed/throw, and no-processor paths.
- All non-`processPayment` engine operations (`addPaymentMethod`, `getUserTransactions`,
  `getUserPaymentMethods`).
- The fail-closed console warnings and `failed` status assignments on the existing failure paths.

> The expected _correct_ behavior for buggy input is defined in the Correctness Properties section
> (Property 1). This section focuses on what must NOT change.

## Hypothesized Root Cause

The defect is not a subtle logic error but a **missing precondition check**. Based on the source of
`processPayment`, the contributing factors are:

1. **Absent input validation**: `processPayment` immediately constructs the `Transaction` from the
   raw arguments with no guard. There is no check that `amount` is finite and positive, nor that
   `currency` is well-formed.

2. **No domain-level currency validator exists**: The `@quant/payment` (singular) package types
   `Transaction.currency` as a bare `string`. A compile-time `CurrencyCode` ISO-4217 union exists only
   in the separate `@quant/payments` (plural) package and provides no runtime protection here.

3. **Untrusted input reaches the engine directly**: The only caller,
   `apps/quantai/backend/routes/payments.ts` POST `/process`, destructures `amount`/`currency`/`type`/
   `metadata` from `request.body` (typed `any`) and forwards them verbatim, so no upstream layer
   validates the numeric/currency invariants either.

4. **Side effects precede any validation**: Even conceptually, the method's ordering (build → charge →
   persist) leaves no point at which invalid input could be rejected before a transaction is recorded.

The fix addresses (1) and (2) by adding a runtime guard plus an `isValidCurrency` predicate at the
top of `processPayment`, and addresses (3) by classifying the thrown error at the route boundary.

## Correctness Properties

Property 1: Bug Condition - Invalid amount/currency is rejected with no side effects

_For any_ input where the bug condition holds (`isBugCondition` returns true — `amount` is non-finite
or `<= 0`, or `currency` fails `isValidCurrency`), the fixed `processPayment` SHALL throw a
`PaymentValidationError` before constructing or persisting a `Transaction` and before calling
`processor.charge`, such that `this.transactions` is unchanged (the input never appears in
`getUserTransactions`) and `processor.charge` is never invoked. This holds for every `type`,
including `refund`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Valid inputs behave identically to the original

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns false — a finite,
strictly-positive `amount` together with a valid `currency`), the fixed `processPayment` SHALL produce
the same result as the original function, preserving the returned `Transaction` (status, persistence,
and `providerRef` metadata) across all paths: processor-`completed`, processor-throw/decline (→
`failed`), and no-processor (→ `failed`), and including `type = 'refund'`. The behavior of
`addPaymentMethod`, `getUserTransactions`, and `getUserPaymentMethods` is likewise unchanged.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix is additive and confined to the payment package
plus a single `catch` at the route boundary.

**File**: `packages/payment/src/core/errors.ts` (new)

1. **Define the typed error**: Introduce `PaymentValidationError extends Error` with a stable
   `name = 'PaymentValidationError'` and a stable, machine-readable `code` field
   (`'INVALID_PAYMENT_AMOUNT' | 'INVALID_PAYMENT_CURRENCY'`). Set `this.name` in the constructor and
   restore the prototype chain (`Object.setPrototypeOf(this, PaymentValidationError.prototype)`) so
   `instanceof` works after TypeScript downleveling.
   - **Decision — dedicated class, not `createAppError`**: The codebase has no `extends Error`
     subclasses today; the only error convention is `@quant/server-core`'s duck-typed
     `createAppError(message, statusCode, code)` used **at HTTP boundaries**. `@quant/payment` is a
     framework-agnostic domain package and must not depend on the server framework. We therefore keep
     the domain error free of HTTP concerns (no `statusCode`) and let the route boundary assign the
     HTTP status. The stable `code`/`name` give callers a reliable classification hook.

**File**: `packages/payment/src/core/currency.ts` (new) — or co-located in `payment-engine.ts`

2. **Add the currency predicate**: Implement and export
   `isValidCurrency(currency: string): boolean` returning
   `typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)`.
   - **Decision — pragmatic ISO-4217 shape check**: No runtime currency validator exists in the repo
     (the `@quant/payments` plural package's `CurrencyCode` union is a compile-time type in a different
     package). We adopt a lightweight ISO-4217 alpha-shape check (non-empty, uppercase, exactly three
     letters). Rationale: it rejects the actual bug inputs (empty/`'us'`/`'usd'`/`'US$'`), adds no new
     dependency, and avoids coupling `@quant/payment` to the unrelated plural package's literal union
     (which would be over-restrictive and create an unwanted cross-package dependency). The exact set
     of accepted codes can be tightened later without changing the guard's contract.

**File**: `packages/payment/src/core/payment-engine.ts`

3. **Add the validation guard at the very top of `processPayment`**: Before the `const transaction:
Transaction = { ... }` line, insert:
   - `if (!Number.isFinite(amount) || amount <= 0)` → `throw new PaymentValidationError('...', 'INVALID_PAYMENT_AMOUNT')`.
   - `if (!isValidCurrency(currency))` → `throw new PaymentValidationError('...', 'INVALID_PAYMENT_CURRENCY')`.
     This guarantees no `Transaction` is constructed, nothing is pushed to `this.transactions`, and
     `processor.charge` is never reached for invalid input. The rest of the method body is untouched.

4. **Leave fail-closed semantics intact**: The processor try/catch, the non-`completed` →
   `failed` mapping, the no-processor → `failed` branch, the `providerRef` metadata attachment, and
   `this.transactions.push(transaction)` remain exactly as today.

**File**: `packages/payment/src/index.ts`

5. **Export the new symbols**: Re-export `PaymentValidationError` (and its `code` type) and
   `isValidCurrency` from the package barrel so the route boundary and tests can import them from
   `@quant/payment`.

**File**: `apps/quantai/backend/routes/payments.ts` (route-boundary classification)

6. **Map the domain error to HTTP 400**: In the POST `/process` handler, wrap the `processPayment`
   call in a try/catch; on `error instanceof PaymentValidationError`, rethrow as
   `createAppError(error.message, 400, error.code)`.
   - **Decision — yes, update the route**: This is required and follows the route-boundary
     classification precedent from PR #272 (validation → 400, never 500). Without this catch, the
     thrown `PaymentValidationError` is unknown to the global error handler in
     `@quant/server-core` and would surface as a **500**, mis-classifying a client error as a server
     error. Catching and translating it yields the correct `400` with a stable `code`, consistent
     with how the route already uses `createAppError` for other validation failures (e.g. invalid
     payment-method type/`isDefault`).

> Note: `@quant/payment` currently lacks a `package.json`/exports map and is not declared as a
> workspace dependency of `@quant/quantai` (it is a source-only engine, the subject of the separate
> already-merged engine-wiring-bugs spec / PR #272). This fix does not depend on that packaging work:
> the new symbols are exported from the existing `src/index.ts` barrel that the route already imports
> as `@quant/payment`. If property-based tests require `fast-check`, it must be added as a
> devDependency where the payment tests run (it is already present in the pnpm store at
> `fast-check@3.23.2`, used by `@quant/server-core`).

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on the UNFIXED code, then verify the fix rejects all buggy inputs with no side effects and
preserves existing behavior for all valid inputs. Tests live in a new
`packages/payment/src/core/payment-engine.test.ts` (vitest) plus a property-based companion
(`payment-engine.pbt.test.ts`, following the repo's `.pbt.test.ts` convention with
`import fc from 'fast-check'`). A spy/fake `PaymentProcessorBackend` is injected via the
`PaymentEngine` constructor so tests can assert whether `charge` was called and control its outcome.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or
refute the root cause (missing precondition check). If refuted, re-hypothesize.

**Test Plan**: Inject a fake processor that records calls and returns `{ status: 'completed' }`.
Call `processPayment` with each buggy input and assert that (a) it throws a `PaymentValidationError`,
(b) the fake's `charge` was never called, and (c) `getUserTransactions(userId)` returns no record for
the call. Running these against the UNFIXED code should fail (no throw; charge called; transaction
persisted), confirming the defect.

**Test Cases**:

1. **Negative amount**: `processPayment('u1', -100, 'USD', 'one_time')` (will fail on unfixed code).
2. **Zero amount**: `processPayment('u1', 0, 'USD', 'one_time')` (will fail on unfixed code).
3. **Non-finite amount**: `NaN`, `Infinity`, `-Infinity` with valid currency (will fail on unfixed code).
4. **Invalid currency**: `''`, `'us'`, `'usd'`, `'US$'` with a valid amount (will fail on unfixed code).
5. **Negative refund (edge case)**: `processPayment('u1', -50, 'USD', 'refund')` — a negative amount
   is never valid even for refunds (will fail on unfixed code).

**Expected Counterexamples**:

- No `PaymentValidationError` thrown; `processor.charge` invoked; an invalid transaction persisted to
  `this.transactions` and visible via `getUserTransactions`.
- Confirms root cause: absent precondition validation before the side effects.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function throws a typed
validation error and produces no side effects.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  spyProcessor := makeSpyProcessor()
  engine := new PaymentEngine(spyProcessor)
  ASSERT throws PaymentValidationError WHEN processPayment_fixed(input)
  ASSERT spyProcessor.chargeCallCount == 0
  ASSERT engine.getUserTransactions(input.userId) is empty
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same result as the original function across every processor path and transaction type.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT processPayment_original(input) == processPayment_fixed(input)
  // identical returned Transaction: status, persistence, providerRef metadata
END FOR
```

**Testing Approach**: Property-based testing (fast-check) is recommended for preservation checking
because:

- It generates many valid `(amount, currency, type)` combinations automatically across the input domain.
- It catches edge cases that hand-written unit tests miss (e.g. very large positive amounts, all valid
  3-letter codes, all three transaction types).
- It gives a strong guarantee that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on the UNFIXED code first for valid inputs across the
processor-completed, processor-throw/decline, and no-processor paths (plus refunds), then write
property-based and unit tests capturing that behavior and re-run them against the fixed code.

**Test Cases**:

1. **Processor-completed preservation**: Valid input + fake returning `{ status: 'completed', providerRef }`
   → transaction `completed` with `providerRef` merged into metadata (observe on unfixed, assert on fixed).
2. **Processor-throw fail-closed preservation**: Valid input + fake that throws → transaction `failed`
   (observe on unfixed, assert on fixed).
3. **Processor-declined fail-closed preservation**: Valid input + fake returning `{ status: 'failed' }`
   → transaction `failed` (observe on unfixed, assert on fixed).
4. **No-processor fail-closed preservation**: Valid input with no processor configured → transaction
   `failed` (observe on unfixed, assert on fixed).
5. **Refund preservation**: Valid positive `amount` with `type = 'refund'` → processed exactly as today.
6. **Unrelated-operation preservation**: `addPaymentMethod`, `getUserTransactions`,
   `getUserPaymentMethods` behave identically.

### Unit Tests

- Validation guard: throws `PaymentValidationError` (with the expected `code`) for negative, zero, and
  non-finite amounts and for empty/malformed currencies, and asserts no `charge` call / no persisted
  transaction.
- `isValidCurrency`: accepts well-formed 3-letter uppercase codes (`'USD'`, `'EUR'`, `'INR'`); rejects
  `''`, `'us'`, `'usd'`, `'US$'`, `'USDT'`, and non-string inputs.
- Valid flows: processor-completed (with/without `providerRef`), processor-throw, processor-declined,
  and no-processor each produce the expected `Transaction` status and persistence.
- Route boundary: `PaymentValidationError` from `processPayment` is translated to an HTTP `400` with a
  stable `code` (never `500`); valid requests still return the transaction.

### Property-Based Tests

- **Fix checking (property)**: Generate buggy inputs (non-finite/`<= 0` amounts; non-`^[A-Z]{3}$`
  currencies) across all `type`s and assert every call throws `PaymentValidationError`, never calls
  `charge`, and persists nothing.
- **Preservation (property)**: Generate valid inputs (finite positive amounts; valid 3-letter codes;
  all three `type`s) and assert the fixed engine's returned `Transaction` matches the original engine's
  for each processor path.
- **Currency predicate (property)**: Generate strings and assert `isValidCurrency` agrees with the
  `^[A-Z]{3}$` specification.

### Integration Tests

- Full POST `/process` flow through the QuantAI route: invalid `amount`/`currency` request bodies
  return HTTP `400` with the validation `code` and persist no transaction (verified via
  `/transactions`).
- Valid request bodies across processor-completed, fail-closed (throw/decline), and no-processor
  configurations return the expected transaction status with HTTP `200`.
- A valid refund request flows end-to-end exactly as before the fix.
