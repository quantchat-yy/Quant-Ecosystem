# Implementation Plan

This plan follows the exploratory bugfix methodology: write the bug-condition
counterexample tests **first** (they must FAIL on the unfixed code), capture the
preservation baseline (tests that PASS on the unfixed code), then apply the
additive validation guard, and finally re-run both property suites to confirm the
bug is fixed with no regressions.

Source under fix: `packages/payment/src/core/payment-engine.ts`
(`PaymentEngine.processPayment`). Route boundary: `apps/quantai/backend/routes/payments.ts`
POST `/process`. Tests live in `packages/payment/src/core/payment-engine.test.ts`
(vitest) and `packages/payment/src/core/payment-engine.pbt.test.ts` (fast-check).

---

- [ ] 1. Write bug condition exploration test (BEFORE implementing the fix)
  - **Property 1: Bug Condition** - Invalid amount/currency is rejected with no side effects
  - **CRITICAL**: This test MUST FAIL on the unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails in this task**
  - **NOTE**: This test encodes the expected behavior (Property 1) - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists on `processPayment`
  - Create `packages/payment/src/core/payment-engine.pbt.test.ts` (fast-check) and add bug-condition cases to `packages/payment/src/core/payment-engine.test.ts` (vitest)
  - Inject a **spy `PaymentProcessorBackend`** via the `PaymentEngine` constructor that records `charge` call count and returns `{ status: 'completed' }`
  - **Scoped PBT Approach**: Generate inputs satisfying `isBugCondition` and also pin concrete deterministic counterexamples for reproducibility:
    - Negative amount: `processPayment('u1', -100, 'USD', 'one_time')`
    - Zero amount: `processPayment('u1', 0, 'USD', 'one_time')`
    - Non-finite amount: `NaN`, `Infinity`, `-Infinity` (with a valid currency)
    - Invalid currency: `''`, `'us'`, `'usd'`, `'US$'`, `'USDT'` (with a valid amount)
    - Negative refund edge case: `processPayment('u1', -50, 'USD', 'refund')`
  - For every buggy input, assert (matching Property 1 / Expected Behavior in design):
    - (a) the call throws a `PaymentValidationError`
    - (b) the spy processor's `charge` was never called (`chargeCallCount === 0`)
    - (c) `getUserTransactions(userId)` returns no record for that call (nothing persisted to `this.transactions`)
  - Run the suite on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (no throw; `charge` called; invalid transaction persisted) - this is correct and proves the bug exists
  - Document the counterexamples found (e.g. "`processPayment('u1', -100, 'USD', 'one_time')` records/forwards a negative charge instead of throwing")
  - Mark task complete when the test is written, run, and the failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2. Write preservation property tests (BEFORE implementing the fix)
  - **Property 2: Preservation** - Valid inputs behave identically to the original
  - **IMPORTANT**: Follow the observation-first methodology - observe behavior on the UNFIXED code, then encode it
  - Observe behavior on UNFIXED `processPayment` for non-buggy inputs (`isBugCondition` returns false: finite, strictly-positive `amount` + valid `currency`, any `type` including `refund`) across each path:
    - Processor-completed: spy returns `{ status: 'completed', providerRef }` → transaction `completed` with `providerRef` merged into metadata
    - Processor-throw fail-closed: spy throws → transaction `failed`
    - Processor-declined fail-closed: spy returns `{ status: 'failed' }` → transaction `failed`
    - No-processor fail-closed: engine constructed with no processor → transaction `failed`
    - Refund: valid positive `amount` with `type = 'refund'` → processed exactly as today
    - Unrelated operations: `addPaymentMethod`, `getUserTransactions`, `getUserPaymentMethods` behave identically
  - Write **property-based tests** (fast-check) generating valid `(amount, currency, type)` combinations (finite positive amounts; valid `^[A-Z]{3}$` codes; all three `type`s) plus targeted unit tests, asserting the returned `Transaction` (status, persistence, `providerRef` metadata) matches the observed baseline
  - Run the suite on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline behavior that must be preserved)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for missing amount/currency validation in `processPayment`
  - [ ] 3.1 Add the typed validation error
    - Create `packages/payment/src/core/errors.ts`
    - Define `PaymentValidationError extends Error` with a stable `name = 'PaymentValidationError'` and a stable `code` field typed `'INVALID_PAYMENT_AMOUNT' | 'INVALID_PAYMENT_CURRENCY'`
    - Set `this.name` in the constructor and call `Object.setPrototypeOf(this, PaymentValidationError.prototype)` so `instanceof` survives TypeScript downleveling
    - Keep the domain error free of HTTP concerns (no `statusCode`) - the route boundary assigns the HTTP status
    - _Bug_Condition: isBugCondition(input) from design_
    - _Expected_Behavior: expectedBehavior(result) - throw typed PaymentValidationError, from design_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Add the currency predicate
    - Create `packages/payment/src/core/currency.ts` (or co-locate in `payment-engine.ts` per design)
    - Implement and export `isValidCurrency(currency: string): boolean` returning `typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)`
    - _Bug_Condition: currencyInvalid := NOT isValidCurrency(currency), from design_
    - _Requirements: 2.4_

  - [ ] 3.3 Add the validation guard at the top of `processPayment`
    - Insert the guard before the `const transaction: Transaction = { ... }` line and before any `processor.charge` call
    - `if (!Number.isFinite(amount) || amount <= 0)` → `throw new PaymentValidationError(<msg>, 'INVALID_PAYMENT_AMOUNT')`
    - `if (!isValidCurrency(currency))` → `throw new PaymentValidationError(<msg>, 'INVALID_PAYMENT_CURRENCY')`
    - Leave fail-closed semantics intact: the processor try/catch, non-`completed` → `failed` mapping, no-processor → `failed` branch, `providerRef` metadata attachment, and `this.transactions.push(transaction)` remain exactly as today
    - _Bug_Condition: !Number.isFinite(amount) || amount <= 0 || !isValidCurrency(currency), from design_
    - _Expected_Behavior: throw before constructing/persisting a Transaction and before processor.charge; no side effects, from design_
    - _Preservation: Preservation Requirements from design (valid inputs unchanged across all processor paths and refunds)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.4 Export the new symbols from the package barrel
    - Re-export `PaymentValidationError` (and its `code` type) and `isValidCurrency` from `packages/payment/src/index.ts` so the route boundary and tests can import them from `@quant/payment`
    - _Requirements: 2.1, 2.4_

  - [ ] 3.5 Map the domain error to HTTP 400 at the route boundary
    - In `apps/quantai/backend/routes/payments.ts` POST `/process`, wrap the `processPayment` call in a try/catch
    - On `error instanceof PaymentValidationError`, rethrow as `createAppError(error.message, 400, error.code)` (validation → 400, never 500), consistent with the existing `createAppError` usage in the route
    - Re-raise/forward all other errors unchanged so existing handling is preserved
    - _Bug_Condition: PaymentValidationError surfaces from processPayment, from design_
    - _Expected_Behavior: client error classified as HTTP 400 with stable code, from design_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Invalid amount/currency is rejected with no side effects
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior; when it passes, the fix is confirmed
    - **EXPECTED OUTCOME**: Test PASSES (throws `PaymentValidationError`, no `charge` call, nothing persisted) - confirms the bug is fixed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid inputs behave identically to the original
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions across processor-completed, processor-throw/decline, no-processor, refunds, and unrelated operations)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Full verification, no regressions
  - Ensure node/pnpm are available first: `export NVM_DIR="/root/.nvm"; . "$NVM_DIR/nvm.sh"`
  - Add `fast-check` (already in the pnpm store at `fast-check@3.23.2`) as a devDependency where the payment tests run, if not already present
  - Run the payment package suite: `pnpm --filter @quant/payment test` (fix-checking Property 1 + preservation Property 2 + unit + PBT)
  - Run the QuantAI route tests covering the POST `/process` boundary change (validation → HTTP 400 with stable `code`; valid requests still return the transaction)
  - Run typecheck across the affected packages/apps and confirm no type errors from the new error type, predicate, and barrel exports
  - Confirm all tests pass and there are no regressions; if any questions arise, ask the user
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Task Dependency Graph

```
Task 1 (Property 1: Bug Condition test - FAILS on unfixed code)
   │
   │  (exploration + preservation baselines established BEFORE any fix)
   ▼
Task 2 (Property 2: Preservation tests - PASS on unfixed code)
   │
   ▼
Task 3  Fix (apply only after both baselines are captured)
   ├─ 3.1 PaymentValidationError (errors.ts)
   │       │
   │       ▼
   ├─ 3.2 isValidCurrency predicate (currency.ts)
   │       │
   │       ▼
   ├─ 3.3 Validation guard in processPayment  ◄── depends on 3.1, 3.2
   │       │
   │       ▼
   ├─ 3.4 Barrel exports (index.ts)           ◄── depends on 3.1, 3.2
   │       │
   │       ▼
   ├─ 3.5 Route-boundary 400 mapping          ◄── depends on 3.1, 3.4
   │       │
   │       ▼
   ├─ 3.6 Re-run Task 1 test → now PASSES (Property 1)   ◄── depends on 3.3, 3.5
   │       │
   │       ▼
   └─ 3.7 Re-run Task 2 tests → still PASS (Property 2)  ◄── depends on 3.3
           │
           ▼
Task 4  Checkpoint - full verification (pnpm --filter @quant/payment test,
        quantai route tests, typecheck, no regressions)  ◄── depends on 3.6, 3.7
```

**Critical ordering rules:**

- Task 1 and Task 2 MUST run on the UNFIXED code before Task 3. Task 1 must FAIL (confirms the bug); Task 2 must PASS (captures the baseline to preserve).
- Within Task 3, the guard (3.3) requires the error type (3.1) and predicate (3.2); the route mapping (3.5) requires the error type (3.1) and the barrel export (3.4).
- Verification sub-tasks 3.6 / 3.7 re-run the EXACT tests from Tasks 1 / 2 - no new tests are written.
- Task 4 runs only after both properties are green.
