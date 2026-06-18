# Security Crypto Hardening Bugfix Design

## Overview

The `@quant/security` package implements five security-critical primitives with hand-rolled,
non-cryptographic "simulation" functions (FNV-1a / `Math.imul` integer mixing) instead of real
cryptography, even though the package already imports `node:crypto` and correctly uses
`crypto.randomBytes` / `crypto.randomInt` for all random-material generation. The fake digests
(`argon2idHash` + `multiRoundHash` + `xorStrings`, `sha256Simulate`, `computeHash`,
`generateFingerprint`, and the `simpleHash` used by DDoS proof-of-work) are fast, short,
reversible, and collision-prone, so they provide none of the properties (memory-hardness,
preimage/second-preimage resistance, keyed integrity) that the surrounding security logic assumes.

The fix replaces each insecure primitive with a real cryptographic primitive while leaving every
surrounding protocol/state machine, the public API shape, the already-correct CSPRNG generation,
and the seven already-real-crypto modules untouched. Two concrete crypto sources are used:

- **`argon2` package** for password hashing. It is already a first-class monorepo dependency
  (`packages/auth` declares `"argon2": "^0.43.0"`, resolved to `argon2@0.43.1` in the pnpm store)
  and `@quant/auth`'s `PasswordService` (`packages/auth/src/crypto/password.ts`) is the established
  precedent: it calls `argon2.hash(password, { type: argon2.argon2id, ... })` and
  `argon2.verify(digest, password)`. We add `argon2` to `packages/security/package.json` so
  `PasswordHasher` can mirror that precedent and report `algorithm: 'argon2id'` truthfully.
- **`node:crypto`** (`createHmac`, `createHash`, `timingSafeEqual`) for CSRF integrity, CSP inline
  hashes, session fingerprint binding, and the DDoS proof-of-work derivation. No new dependency is
  required for these — the modules already `import crypto from 'crypto'` / `'node:crypto'`.

The strategy is deliberately surgical: only the digest/comparison internals change. Random-material
generators (`generateSalt`, `generateRandomToken`, `generateSessionId`, `generateNonce`,
`generateRandomHex`/`generateId`) and all double-submit / expiry / replay / session-binding /
rotation / lifecycle / preset / merge logic are preserved verbatim.

## Glossary

- **Bug_Condition (C)**: The predicate identifying inputs that trigger a defect — for these bugs,
  effectively "the code path executes the fake digest/comparison instead of real crypto." Because
  the defect is deterministic and present on _every_ invocation of the affected method, the bug
  condition for each defect is "this method is called at all" (see per-defect `isBugCondition`).
- **Property (P)**: The desired behavior after the fix — the digest equals a real cryptographic
  reference and/or the verify round-trip and comparison are sound and constant-time.
- **Preservation**: Existing behavior that must remain identical — CSPRNG generation, protocol/state
  semantics and reason codes, strength scoring, public API shape, and untouched modules.
- **F / F'**: `F` is the original (unfixed) function (fake digest); `F'` is the fixed function (real
  crypto).
- **PHC string**: The Argon2 encoded hash format (`$argon2id$v=19$m=...,t=...,p=...$<saltB64>$<hashB64>`)
  produced by `argon2.hash`; it self-describes algorithm, version, params, salt, and digest, and is
  the input to `argon2.verify`.
- **`PasswordHasher`**: Class in `core/password-hasher.ts`. `hash()`/`verify()` currently call
  `argon2idHash()` (built on `multiRoundHash`/`xorStrings`) and a hand-rolled `timingSafeEqual`;
  `checkBreach()` calls `simpleHash`.
- **`CSRFManager`**: Class in `core/csrf-protection.ts`. `computeHMAC()` calls `sha256Simulate()`;
  `validateToken()` compares tags with a hand-rolled `timingSafeEqual`.
- **`CSPGenerator`**: Class in `core/csp-generator.ts`. `computeHash()` returns an FNV-based
  `'<algo>-<base64>'` expression.
- **`SessionSecurity`**: Class in `core/session-security.ts`. `generateFingerprint()` returns a
  32-bit FNV-1a hash (8 hex chars) of `ip:userAgent`.
- **`SQLInjectionGuard.hashQuery`**: 32-bit FNV cache key in `core/sql-injection-guard.ts` (pure
  cache key, not an integrity value).
- **`DDoSProtector.computeProofOfWork`**: PoW answer derivation in `core/ddos-protection.ts`,
  currently built on `simpleHash` (FNV).

## Bug Details

### Bug A — Password hashing (Critical), `core/password-hasher.ts`

`hash()` derives the stored digest via `argon2idHash()` — a `multiRoundHash` (FNV-1a / `Math.imul`)
loop with `xorStrings`, truncated to `hashLength * 2` hex chars — while still reporting
`algorithm: 'argon2id'`, `version: 19`. `verify()` re-runs the same fake derivation and compares
with a hand-rolled `timingSafeEqual` char loop. `checkBreach()` calls `simpleHash` (32-bit FNV) for
its (simulated) breach-prefix lookup.

**Formal Specification:**

```
FUNCTION isBugCondition_A(input)
  INPUT: input is a call to PasswordHasher.hash / verify / checkBreach
  OUTPUT: boolean

  // The defect fires on every invocation: a non-cryptographic digest is produced/compared.
  RETURN input invokes hash() OR verify() OR checkBreach()
END FUNCTION
```

#### Examples

- `hash('s3cret')` returns `result.hash` = 64 hex chars of FNV mixing (not memory-hard); a real fix
  returns a PHC string beginning `$argon2id$v=19$m=65536,t=3,p=4$...`.
- Two different passwords that collide under `multiRoundHash` truncation would verify against each
  other; under real Argon2id this cannot happen.
- `verify()` uses `a.charCodeAt(i) ^ b.charCodeAt(i)` over JS strings — not a vetted constant-time
  buffer comparison; `argon2.verify` performs sound constant-time validation internally.

### Bug B — CSRF token integrity, `core/csrf-protection.ts`

`computeHMAC(token, sessionId)` builds `message = ${token}:${sessionId}:${secretKey}` and feeds it to
`sha256Simulate()` (FNV-1a variant). The `secretKey` is only string-concatenated, not used as a MAC
key, so the result is a forgeable pseudo-HMAC. `validateToken()` compares stored vs recomputed tags
with a hand-rolled `timingSafeEqual`.

**Formal Specification:**

```
FUNCTION isBugCondition_B(input)
  INPUT: input is a call that computes/compares a CSRF integrity tag
  OUTPUT: boolean

  RETURN input invokes computeHMAC()  // via generateToken() or validateToken()
END FUNCTION
```

#### Examples

- `computeHMAC('abc', 'sess1')` ≠ `crypto.createHmac('sha256', secretKey).update('abc:sess1').digest('hex')`.
- An attacker who knows the FNV mixing constants can forge a valid tag without the secret key.

### Bug C — CSP inline-content hashes, `core/csp-generator.ts`

`computeHash(content, algorithm)` computes an FNV integer digest, then a "simplified base64" of the
hex (3 hex chars → 2 base64 chars), returning `'<algo>-<b64>'`. The base64 payload does not equal the
real SHA-256/384/512 digest of `content`, so a browser's hash-allowlist never matches and inline
scripts/styles silently fail.

**Formal Specification:**

```
FUNCTION isBugCondition_C(input)
  INPUT: input = (content: string, algorithm in {sha256, sha384, sha512})
  OUTPUT: boolean

  RETURN computeHash(content, algorithm) !=
         "'" + algorithm + "-" + base64(realDigest(algorithm, utf8Bytes(content))) + "'"
END FUNCTION
```

#### Examples

- `computeHash('alert(1)', 'sha256')` must equal
  `'sha256-' + crypto.createHash('sha256').update('alert(1)').digest('base64')` wrapped in single
  quotes; today it returns a short FNV-derived base64 that no browser accepts.
- The browser CSP semantics are: hash the **UTF-8 bytes of the exact inline content** with the named
  SHA algorithm and **standard base64**-encode the raw digest — exactly what `createHash(algo)
.update(content).digest('base64')` produces. (Note: the content must be the inline body verbatim,
  with no added quoting — the surrounding `'...'` quotes are CSP source-expression syntax, not part
  of the hashed bytes.)

### Bug D — Session fingerprint binding, `core/session-security.ts`

`generateFingerprint(ip, userAgent)` returns `(FNV1a(ip:userAgent) >>> 0).toString(16).padStart(8,'0')`
— 8 hex chars (32 bits), short, predictable, and collision-prone. It is used for session-hijack
binding in `createSession()` (stored) and `validateSession()` (recomputed and compared).

**Formal Specification:**

```
FUNCTION isBugCondition_D(input)
  INPUT: input = (ip: string, userAgent: string)
  OUTPUT: boolean

  RETURN generateFingerprint(ip, userAgent) is a 32-bit FNV digest
         (i.e. NOT a real keyed cryptographic digest)
END FUNCTION
```

#### Examples

- `generateFingerprint('1.2.3.4', 'Mozilla/5.0')` returns `'9a1c3f02'`-style 8 hex chars; the 32-bit
  space makes collisions feasible (two distinct clients sharing a fingerprint pass binding).
- Required: a long (≥256-bit) keyed digest that is stable for identical `(ip, userAgent)` (so
  unchanged clients still validate) and unpredictable to an attacker.

### Bug E — Non-integrity hashing (Lower severity), `core/sql-injection-guard.ts` and `core/ddos-protection.ts`

- **E1 (`hashQuery`)**: `SQLInjectionGuard.hashQuery(query)` is a 32-bit FNV producing an 8-hex
  identifier used only as a cache/whitelist comparison key.
- **E2 (`computeProofOfWork`)**: `DDoSProtector.computeProofOfWork(nonce, difficulty)` iterates
  `simpleHash` (FNV) `difficulty` times and truncates to `difficulty * 2` chars. The answer is stored
  server-side in `this.challenges` and string-compared in `verifyChallenge()`.

**Formal Specification:**

```
FUNCTION isBugCondition_E1(input)   // SQL cache key
  RETURN false   // Documented as ACCEPTABLE: pure cache/comparison key, no integrity reliance.
END FUNCTION

FUNCTION isBugCondition_E2(input)   // DDoS PoW derivation
  INPUT: input = (nonce: string, difficulty: number)
  OUTPUT: boolean
  // The server later verifies the answer (verifyChallenge), so the derivation should be a real,
  // standard, preimage-resistant digest rather than FNV.
  RETURN computeProofOfWork uses simpleHash (FNV) instead of a real crypto hash
END FUNCTION
```

#### Examples

- E1: `hashQuery('SELECT * FROM t')` → `'1a2b3c4d'`; collisions only alias cache/whitelist entries —
  they cannot bypass detection (every query is still independently analyzed by `analyze()`), so this
  stays non-cryptographic by design.
- E2: `computeProofOfWork(nonce, 4)` is currently instant FNV (no real "work" and a non-standard
  algorithm a client cannot reproduce with `crypto`). After the fix it is a real `sha256` iteration,
  reproducible by a client using a standard library and preimage-resistant for the truncated target.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- CSPRNG generation: `PasswordHasher.generateSalt` (`crypto.randomBytes`), `CSRFManager`/
  `SessionSecurity`/`CSPGenerator` token/ID/nonce generation (`crypto.randomInt`), and
  `DDoSProtector.generateRandomHex` (`crypto.randomBytes`) — unchanged lengths, charsets, and APIs.
- CSRF protocol/state: double-submit (header-vs-cookie) check, expiry, single-use replay prevention,
  session binding, per-session max-10 token cap, rotation, invalidation — **same `reason` codes**
  (`token_mismatch`, `token_not_found`, `token_expired`, `session_mismatch`, `token_already_used`,
  `hmac_invalid`, `valid`).
- CSP builder: directives, presets (`strict`/`moderate`/`relaxed`/`api-only`), nonces, report-only
  mode, merge, header-name selection — only the **value** returned by `computeHash` changes.
- Session lifecycle: concurrent-session limit, idle timeout, absolute timeout, rotation on privilege
  escalation, fixation prevention, secure-cookie attributes, and the binding _outcome_ (identical
  attributes still pass, changed attributes still fail).
- `PasswordHasher.assessStrength` scoring (score/level/entropy/crack-time/feedback) — fully
  independent of the hashing change.
- Public API shape: exported classes, method names, parameter lists, and return-type shapes
  (`PasswordHashResult`, `CSRFToken`, `CSPPolicy`, `SecureSession`, `ChallengeResult`, etc.).
- The seven already-real-crypto modules: `encryption.ts`, `api-key-manager.ts`, `oauth2-security.ts`,
  `honeypot.ts`, `audit-logger.ts`, `compliance-framework.ts`, `privacy-compliance.ts` — untouched.
- E1 SQL `hashQuery`: remains a non-cryptographic 8-hex cache key.

**Scope:**
All inputs that do not flow through the five fake-digest code paths are completely unaffected. The
one _acceptable_ content change is the **string format** inside `PasswordHashResult.hash` (a PHC
Argon2 string instead of fixed `hashLength*2` hex) — the object _shape_ and the `verify(password,
stored)` round-trip contract remain intact.

## Hypothesized Root Cause

1. **Placeholder "simulation" code shipped as production.** Each defect's function carries a comment
   describing it as a simulation (`Argon2id simulation`, `SHA-256 simulation`, `FNV-based simulation`,
   `Simulate proof-of-work`). The likely root cause is that these were written as algorithm-shaped
   placeholders (to produce deterministic, dependency-free output during early development) and never
   swapped for real crypto, even though `node:crypto` was already imported in the same files.

2. **Misuse of the secret as data, not as a key (Bug B).** `secretKey` is concatenated into the
   hashed message rather than used as the HMAC key, so even a real hash of that string would not be a
   keyed MAC. The fix must key the HMAC with `secretKey`.

3. **Custom base64 and truncation (Bug C).** A bespoke 3-hex→2-char base64 routine produces output
   that is neither the real digest nor standard base64, guaranteeing browser mismatch.

4. **Undersized digest width (Bug D).** A 32-bit FNV value (8 hex chars) is structurally too small
   for a hijack-binding fingerprint regardless of algorithm quality.

5. **Hand-rolled constant-time comparison (Bugs A, B).** `timingSafeEqual` over JS strings via
   `charCodeAt` is not a vetted constant-time primitive; `crypto.timingSafeEqual` (over equal-length
   Buffers) or the KDF library's own verify must be used.

## Correctness Properties

These are the single source of truth for the fix and preservation properties. Properties 1–6 are the
fix (bug-condition) properties for defects A–E; Properties 7–15 are preservation properties.

Property 1: Bug Condition — Password Hash/Verify Round-Trip with Real Argon2id

_For any_ password `p` (and any `p' != p`), after the fix `hash(p)` SHALL return a
`PasswordHashResult` whose `.hash` is a real Argon2id PHC string (begins with `$argon2id$`) and whose
`.algorithm === 'argon2id'`, and `verify(p, hash(p)) === true` while `verify(p', hash(p)) === false`.
The final comparison SHALL be performed by `argon2.verify` (vetted constant-time validation), not a
hand-rolled loop.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Breach Prefix Uses Real SHA-256

_For any_ password, `checkBreach` SHALL derive its lookup prefix via
`crypto.createHash('sha256').update(password.toLowerCase()).digest('hex')`, and the existing breach
decision logic (common-password set, length < 6) SHALL return the same `{ breached, count>0 }` /
`{ breached:false, count:0 }` outcomes as before.

**Validates: Requirements 2.3**

Property 3: Bug Condition — CSRF Integrity Tag Equals HMAC-SHA256 Reference

_For any_ `token` and `sessionId`, the fixed `computeHMAC(token, sessionId)` SHALL equal
`crypto.createHmac('sha256', config.secretKey).update(`${token}:${sessionId}`).digest('hex')`, and
`validateToken` SHALL compare tags with `crypto.timingSafeEqual` over equal-length Buffers (length
checked first), returning `reason: 'hmac_invalid'` only when the keyed MAC genuinely differs.

**Validates: Requirements 2.4, 2.5**

Property 4: Bug Condition — CSP Hash Equals Browser Reference

_For any_ `content` and `algorithm ∈ {sha256, sha384, sha512}`, the fixed `computeHash(content,
algorithm)` SHALL equal `"'" + algorithm + "-" + crypto.createHash(algorithm).update(content)
.digest('base64') + "'"` — the same value a browser computes over the UTF-8 bytes of the inline
content with standard base64.

**Validates: Requirements 2.6**

Property 5: Bug Condition — Session Fingerprint Equals Keyed Digest and Is Stable

_For any_ `(ip, userAgent)`, the fixed `generateFingerprint(ip, userAgent)` SHALL equal
`crypto.createHmac('sha256', config.fingerprintSecret).update(`${ip}:${userAgent}`).digest('hex')`
(a long, ≥256-bit, unpredictable digest), SHALL be **stable** (equal for repeated identical inputs)
so unchanged clients still pass binding, and SHALL **differ** for any distinct `(ip, userAgent)`.

**Validates: Requirements 2.7**

Property 6: Bug Condition — DDoS Proof-of-Work Uses Real SHA-256 Derivation

_For any_ `(nonce, difficulty)`, the fixed `computeProofOfWork` SHALL derive the answer by iterating
`crypto.createHash('sha256')` `difficulty` times (deterministic and reproducible with a standard
library), and the `issueChallenge`→`verifyChallenge` round-trip SHALL accept the correctly recomputed
answer and reject any incorrect answer.

**Validates: Requirements 2.9**

Property 7: Preservation — CSPRNG Generation Unchanged

_For any_ invocation, salts, CSRF tokens, session IDs, CSP nonces, and DDoS challenge IDs/nonces SHALL
continue to be produced by `crypto.randomBytes`/`crypto.randomInt` with unchanged lengths and
charsets; in particular two `hash()` calls for the same password still yield different `.salt` and
different `.hash`.

**Validates: Requirements 3.1, 3.2**

Property 8: Preservation — CSRF Protocol/State Semantics and Reason Codes Unchanged

_For any_ token lifecycle, double-submit, expiry, replay (single-use), session binding, max-10 cap,
rotation, and invalidation SHALL behave identically and return the same `reason` codes for the same
situations.

**Validates: Requirements 3.3**

Property 9: Preservation — CSP Builder Logic Unchanged

_For any_ policy construction, directives/presets/nonces/report-only/merge/header-name behavior SHALL
be identical; only the `computeHash` return value changes.

**Validates: Requirements 3.4**

Property 10: Preservation — Session Lifecycle Outcomes Unchanged

_For any_ session, concurrent-limit, idle/absolute timeout, rotation-on-privilege-escalation,
fixation prevention, and secure-cookie attributes SHALL be unchanged; identical `(ip, userAgent)`
SHALL still pass fingerprint binding and changed attributes SHALL still fail it.

**Validates: Requirements 3.5**

Property 11: Preservation — Password Strength Scoring Unchanged

_For any_ password, `assessStrength` SHALL return the same score, level, entropy, crack-time, and
feedback as before the fix.

**Validates: Requirements 3.6**

Property 12: Preservation — Public API Shape Unchanged

_For any_ consumer, exported classes, method names, parameter lists, and return-type shapes SHALL
remain importable and usable; `PasswordHashResult` keeps its fields (`hash`, `salt`, `algorithm`,
`version`, `params`, `createdAt`) — only the `.hash` string _format_ changes to a PHC string.

**Validates: Requirements 3.7**

Property 13: Preservation — Untouched Real-Crypto Modules Unchanged

_For any_ exercise of `encryption.ts`, `api-key-manager.ts`, `oauth2-security.ts`, `honeypot.ts`,
`audit-logger.ts`, `compliance-framework.ts`, `privacy-compliance.ts`, behavior SHALL be identical
(these files are not modified).

**Validates: Requirements 3.8**

Property 14: Preservation — SQL Query Hash Remains a Non-Crypto Cache Key

_For any_ query, `hashQuery` SHALL continue to return an 8-hex (`/^[0-9a-f]{8}$/`) FNV cache key; this
value is never relied on for integrity or unpredictability (every query is independently analyzed),
so it is intentionally left non-cryptographic.

**Validates: Requirements 2.8**

Property 15: Preservation — Existing Suite Passes (with Updated Shape Assertions)

_For any_ run of the security test suite, all tests SHALL pass after the fix; the only tests requiring
update are those asserting the OLD fake-digest _shape_ (`password-hasher.test.ts` `hash.length ===
params.hashLength * 2`), which are revised to assert the real encoded-hash format while keeping all
behavioral assertions.

**Validates: Requirements 3.9**

## Fix Implementation

### Bug A — `core/password-hasher.ts`

**Add dependency:** add `"argon2": "^0.43.0"` to `packages/security/package.json` `dependencies`
(mirrors `@quant/auth`; resolved version already present in the pnpm store as `argon2@0.43.1`).

**Changes:**

1. `import argon2 from 'argon2';` and keep `import crypto from 'crypto';`.
2. **`hash(password)`**: keep `this.hashCount++` and keep `salt = this.generateSalt(16)`
   (`crypto.randomBytes` — preserved). Call
   `argon2.hash(password, { type: argon2.argon2id, memoryCost, timeCost, parallelism, hashLength,
salt: Buffer.from(salt, 'hex') })` using the mapped `DEFAULT_PARAMS`. Return the existing
   `PasswordHashResult` shape with `.hash` = the returned PHC string, `.salt` = the hex salt,
   `.algorithm = 'argon2id'` (now truthful), `.version = 19`, `.params`, `.createdAt`.
3. **`verify(password, stored)`**: return `argon2.verify(stored.hash, password)`. The PHC string is
   self-describing, so the `this.params = stored.params` swap and the fake re-hash are removed.
4. **`checkBreach(password)`**: replace `this.simpleHash(...)` with
   `crypto.createHash('sha256').update(password.toLowerCase()).digest('hex')` for the prefix; keep the
   common-password and length<6 decision logic and `crypto.randomInt` counts unchanged.
5. **Delete** the now-unused `argon2idHash`, `multiRoundHash`, `xorStrings`, `simpleHash`, and the
   hand-rolled `timingSafeEqual` private methods (constant-time comparison is handled by
   `argon2.verify`). Keep `assessStrength`, `calculateEntropy`, `generateSalt`, `getStats`.

**DEFAULT_PARAMS → argon2 options mapping** (1:1):

| `Argon2Params` field | argon2 option | Default value    |
| -------------------- | ------------- | ---------------- |
| `memoryCost` (KiB)   | `memoryCost`  | `65536` (64 MiB) |
| `timeCost`           | `timeCost`    | `3`              |
| `parallelism`        | `parallelism` | `4`              |
| `hashLength` (bytes) | `hashLength`  | `32`             |

`type` is fixed to `argon2.argon2id`. `salt` is passed explicitly so the preserved
`crypto.randomBytes` salt is the one Argon2 uses (16 bytes ≥ argon2's 8-byte minimum).

### Bug B — `core/csrf-protection.ts`

1. **`computeHMAC(token, sessionId)`**:
   `return crypto.createHmac('sha256', this.config.secretKey).update(`${token}:${sessionId}`)
.digest('hex');` (secret used as the _key_; drop the `:${secretKey}` suffix from the message).
2. **`validateToken`** HMAC comparison: replace `this.timingSafeEqual(storedToken.hmac, expectedHmac)`
   with a length-guarded `crypto.timingSafeEqual(Buffer.from(storedToken.hmac, 'hex'),
Buffer.from(expectedHmac, 'hex'))` (return `false`/`hmac_invalid` if lengths differ). Delete the
   hand-rolled `timingSafeEqual`. Existing prod secret-key guard and all reason codes preserved.

### Bug C — `core/csp-generator.ts`

1. **`computeHash(content, algorithm)`**:
   `return `'${algorithm}-${crypto.createHash(algorithm).update(content).digest('base64')}'`;`
   Remove the FNV mixing and the bespoke base64 routine. Everything else in the class is untouched.

### Bug D — `core/session-security.ts`

1. **`SessionConfig`** (`types.ts`): add `fingerprintSecret: string`. `DEFAULT_CONFIG` gets a sentinel
   default (`'default-fingerprint-secret-change-in-production'`). The `SessionSecurity` constructor
   adds a production guard mirroring `CSRFManager`: if `process.env.NODE_ENV === 'production'` and
   `fingerprintSecret` equals the default, throw `'SessionSecurity requires an explicit
fingerprintSecret in production'`.
   - _Justification for HMAC over bare SHA-256:_ keying the fingerprint with a server secret means an
     attacker who can guess or observe a victim's `ip`/`userAgent` still cannot precompute the stored
     fingerprint value, adding defense-in-depth. It is consistent with the existing `CSRFManager.
secretKey` precedent in the same package, so the configuration/production-guard pattern is
     already familiar to consumers.
2. **`generateFingerprint(ip, userAgent)`**:
   `return crypto.createHmac('sha256', this.config.fingerprintSecret).update(`${ip}:${userAgent}`)
.digest('hex');` Remove the FNV loop. Stable (deterministic for identical inputs) and 64 hex
   chars. All `createSession`/`validateSession`/`rotateSession` logic is unchanged.

### Bug E

- **E1 `core/sql-injection-guard.ts` (`hashQuery`)**: **no change.** Documented as an intentional
  non-cryptographic cache/comparison key; collisions cannot bypass detection because every query is
  independently analyzed. The test `expect(q.hash).toMatch(/^[0-9a-f]{8}$/)` stays valid.
- **E2 `core/ddos-protection.ts` (`computeProofOfWork`)**: replace the `simpleHash` iteration with a
  real SHA-256 iteration:
  ```
  let hash = nonce;
  for (let i = 0; i < difficulty; i++) {
    hash = crypto.createHash('sha256').update(hash + i.toString()).digest('hex');
  }
  return hash.substring(0, difficulty * 2);
  ```
  _Decision:_ because the server stores and verifies the answer (`verifyChallenge`), using a real,
  standard, preimage-resistant digest makes the challenge reproducible by clients with a standard
  library and removes reliance on the non-standard FNV mixing. `simpleHash` may then be removed if no
  longer referenced. There are no existing `ddos-protection` tests asserting the answer shape, so this
  format change is safe. (If the team prefers strictly minimal scope, E2 could be deferred — but the
  recommendation here is to fix it.)

## Testing Strategy

### Validation Approach

Two phases: first run **exploratory** tests that demonstrate the fake digests differ from real crypto
(reproducing each bug on UNFIXED code), then run **fix** checks (property-based where valuable) and
**preservation** checks. All tests are pure unit tests per the package's vitest conventions.

**Repo vitest conventions for `packages/*`:** tests are colocated `*.test.ts` files next to sources,
run with `vitest run` via the package `test` script (`pnpm --filter @quant/security test`).
`packages/security/vitest.config.ts` sets `globals: true` and `environment: 'node'`. These are **pure
unit tests with no app boot** — no server, DB, or network; instantiate the class and assert. Use
`node:crypto` directly inside tests to compute reference values.

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples proving each primitive is not real crypto (confirm root cause)
BEFORE implementing the fix. Run on UNFIXED code; these are expected to FAIL (or, equivalently, assert
the _inequality_ with the real reference, which PASSES on unfixed code and flips after the fix — write
them as "differs from reference" observations to document the bug).

**Test Cases:**

1. **A:** `hash('x').hash` does not begin with `$argon2id$` (it is 64 hex chars) — demonstrates the
   fake KDF. `verify` uses a char-loop, not `argon2.verify`.
2. **B:** `computeHMAC('t','s')` ≠ `crypto.createHmac('sha256', secretKey).update('t:s').digest('hex')`.
3. **C:** `computeHash('alert(1)','sha256')` ≠ `'sha256-' + crypto.createHash('sha256')
.update('alert(1)').digest('base64')`.
4. **D:** `generateFingerprint('1.2.3.4','UA')` matches `/^[0-9a-f]{8}$/` (only 32 bits) and ≠ the
   HMAC reference.
5. **E2:** `computeProofOfWork(nonce, 4)` ≠ the SHA-256 iterated reference.

**Expected Counterexamples:** each fake digest is short and/or unequal to the `node:crypto`/`argon2`
reference — confirming the placeholder-simulation root cause.

### Fix Checking

**Goal:** For all inputs where the bug condition holds, the fixed function produces the expected
behavior (matches Properties 1–6).

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition_X(input) DO
  ASSERT fixedFunction(input) == realCryptoReference(input)   // and round-trips succeed
END FOR
```

**Property-based tests (recommended where valuable):**

- **P4 (CSP):** for random `content` strings and random `algorithm ∈ {sha256,sha384,sha512}`,
  `computeHash(content, algorithm) === "'"+algorithm+"-"+crypto.createHash(algorithm).update(content)
.digest('base64')+"'"`.
- **P3 (CSRF HMAC):** for random `token`/`sessionId`, `computeHMAC` equals the `crypto.createHmac`
  reference.
- **P5 (fingerprint):** for random `(ip, userAgent)`, `generateFingerprint` equals the HMAC reference,
  is stable across repeated calls, and differs for distinct inputs.
- **P1 (password):** for random passwords, `verify(p, hash(p)) === true` and
  `verify(p+'x', hash(p)) === false`, and `hash(p).hash` starts with `$argon2id$`. (Use a small
  case count / reduced argon2 params in tests to keep runtime reasonable, since Argon2id is
  intentionally slow.)
- **P6 (PoW):** for random nonce/difficulty, the `issueChallenge`→recompute→`verifyChallenge`
  round-trip accepts the correct answer and rejects a tampered one.

**Example-based fix tests:** P2 breach-prefix uses `createHash('sha256')` and decision outcomes
(`123456`→breached, `ab`→breached, long-unique→not breached) are unchanged.

### Preservation Checking

**Goal:** For all inputs where the bug condition does NOT hold (and for behavior orthogonal to the
digest), the fixed code behaves identically to the original.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) == fixedBehavior(input)
END FOR
```

**Observation-first methodology:** `csrf-protection.ts`, `csp-generator.ts`, `session-security.ts`,
and `ddos-protection.ts` currently have **no colocated test files**, so preservation behavior for
those modules must first be _observed_ on UNFIXED code and then captured as new preservation tests
that pass on UNFIXED code (and must still pass after the fix). `password-hasher.test.ts` and
`sql-injection-guard.test.ts` already exist and largely serve as preservation baselines.

**Test Cases:**

1. **CSRF semantics (P8):** assert each `reason` code path — `token_mismatch`, `token_not_found`,
   `token_expired`, `session_mismatch`, `token_already_used`, `hmac_invalid`, `valid` — plus max-10
   cap, rotation, and invalidation, are unchanged.
2. **Session lifecycle (P10):** concurrent-limit eviction, idle/absolute timeout, rotation on
   privilege escalation, and binding outcomes (same `(ip,userAgent)` validates; changed fails with
   `fingerprint_mismatch`).
3. **CSP builder (P9):** presets, directive add/remove, nonce injection, merge, report-only, and
   header-name selection unchanged.
4. **Strength scoring (P11):** existing `assessStrength` assertions unchanged.
5. **CSPRNG randomness (P7):** two `hash()` calls for the same password yield different salt and hash.
6. **SQL cache key (P14):** `hashQuery` still matches `/^[0-9a-f]{8}$/`.
7. **Untouched modules (P13):** the seven real-crypto modules' suites continue to pass.

### Unit Tests

- Per-method tests for the fixed `hash`/`verify`/`checkBreach`, `computeHMAC`/`validateToken`,
  `computeHash`, `generateFingerprint`, and `computeProofOfWork` against `node:crypto`/`argon2`
  references and round-trips.
- Edge cases: empty content for CSP hash; length-mismatched buffers for CSRF `timingSafeEqual` guard;
  `difficulty = 0`/large for PoW.

### Property-Based Tests

- Reference-equality properties P3, P4, P5 over randomized inputs (highest value — they pin each
  digest to its `node:crypto` reference across the input domain).
- Password verify round-trip (P1) over random passwords (reduced argon2 cost in tests).

### Integration Tests

- Not applicable as cross-service flows (these are pure unit modules). The nearest "integration" is
  the full token lifecycle (generate → validate → rotate → invalidate) and full session lifecycle
  (create → validate → privilege-escalate/rotate → expire), exercised as in-process unit tests.

### Tests That Must Be Updated (assert the fake-digest shape)

- **`password-hasher.test.ts`**:
  - `'produces an argon2id result …'`: `expect(result.hash.length).toBe(result.params.hashLength * 2)`
    → assert the real format instead, e.g. `expect(result.hash).toMatch(/^\$argon2id\$/)` (and keep
    `algorithm`/`version`/`salt`/`createdAt` assertions).
  - `'honors custom Argon2 params'`: `expect(result.hash.length).toBe(32)` → replace the
    length-of-hash assertion with `expect(result.params.hashLength).toBe(16)` and (optionally) a PHC
    format / `m=,t=,p=` param check; the `hashLength*2` hex expectation is removed.
  - All behavioral assertions (salt randomness, verify true/false, strength, breach, stats) are
    preserved as-is.
- **`sql-injection-guard.test.ts:120`** (`expect(q.hash).toMatch(/^[0-9a-f]{8}$/)`): **stays valid** —
  E1 keeps the non-crypto cache key.
