# Bugfix Requirements Document

## Introduction

The `@quant/security` package contains several security-critical primitives that are implemented as hand-rolled, non-cryptographic "simulations" instead of using real cryptography — even though the package already imports `node:crypto` and correctly uses `crypto.randomBytes` / `crypto.randomInt` for salts, session IDs, CSRF tokens, and CSP nonces. The insecure code paths all rely on FNV-1a / `Math.imul` integer mixing (functions named `argon2idHash`, `multiRoundHash`, `sha256Simulate`, `computeHash`, `generateFingerprint`, and `simpleHash`) which produce short, fast, reversible, collision-prone digests with none of the properties (memory-hardness, preimage/second-preimage resistance, keyed integrity) that the surrounding security logic assumes.

This is a P1 security defect. Concretely:

- **Bug A (Critical)** — `PasswordHasher.hash()` / `verify()` store passwords under a fake "Argon2id simulation" while reporting `algorithm: 'argon2id'`. The digest is not memory-hard and not cryptographically sound, so stored credentials are effectively unprotected. The comparison in `verify()` is also a hand-rolled byte loop rather than a constant-time primitive.
- **Bug B** — `CSRFManager.computeHMAC()` uses `sha256Simulate()` (an FNV variant), so CSRF token integrity is not a real HMAC and is forgeable by anyone who can predict the mixing function.
- **Bug C** — `CSPGenerator.computeHash()` emits `'sha256-…'` / `'sha384-…'` / `'sha512-…'` source expressions whose base64 payload does not match the browser-computed SHA digest of the inline content, so hash-allowlisted inline scripts/styles silently fail (the allowlist is meaningless).
- **Bug D** — `SessionSecurity.generateFingerprint()` derives the session-hijack binding fingerprint from a 32-bit FNV-1a hash of `ip:userAgent`, producing a short, predictable, collision-prone value that undermines fingerprint binding.
- **Bug E (Lower severity, in scope to review)** — FNV `simpleHash` / hand-rolled hashing is also used for non-integrity purposes: the SQL query cache key in `sql-injection-guard.ts` (acceptable as a pure cache key) and the proof-of-work challenge in `ddos-protection.ts` (must be assessed for whether challenge integrity/unpredictability is security-relevant).

The fix must replace the insecure primitives with real cryptography (`@quant/auth` already depends on the `argon2` package; `node:crypto` provides `createHmac`, `createHash`, `scrypt`, `pbkdf2`, and `timingSafeEqual`) while leaving the already-correct CSPRNG generation and all surrounding protocol/state logic unchanged.

## Bug Analysis

### Current Behavior (Defect)

These clauses describe what the affected code does today. Each clause has a corresponding correct-behavior clause in section 2.

**Bug A — Password hashing (Critical), `core/password-hasher.ts`**

1.1 WHEN `PasswordHasher.hash(password)` is called THEN the system derives the stored digest via `argon2idHash()`, which is built on `multiRoundHash()` (FNV-1a / `Math.imul` integer mixing) and `xorStrings()`, producing a fast, non-memory-hard, non-cryptographic digest while still reporting `algorithm: 'argon2id'` and `version: 19`.

1.2 WHEN `PasswordHasher.verify(password, stored)` is called THEN the system recomputes the same fake `argon2idHash()` and compares it using a hand-rolled `timingSafeEqual()` character loop instead of a vetted constant-time comparison primitive.

1.3 WHEN `PasswordHasher.checkBreach(password)` is called THEN the breach-prefix lookup is derived from `simpleHash()` (32-bit FNV-1a), which is not a cryptographic digest (lower risk, because the result only gates a simulated breach count).

**Bug B — CSRF token integrity, `core/csrf-protection.ts`**

1.4 WHEN `CSRFManager.generateToken()` or `validateToken()` computes a token's integrity tag via `computeHMAC()` THEN the system calls `sha256Simulate()` (an FNV-1a variant keyed only by string concatenation with `secretKey`), producing a forgeable pseudo-HMAC rather than a real keyed MAC.

1.5 WHEN `validateToken()` compares the stored and recomputed integrity tags THEN the system uses a hand-rolled `timingSafeEqual()` character loop rather than a vetted constant-time comparison primitive.

**Bug C — CSP inline-content hashes, `core/csp-generator.ts`**

1.6 WHEN `CSPGenerator.computeHash(content, algorithm)` is called THEN the system computes an FNV-based integer digest and a "simplified base64" encoding, returning a `'<algo>-<base64>'` expression whose value does not equal the real SHA-256/384/512 hash of `content` that a browser computes, so hash-allowlisted inline scripts/styles fail to match.

**Bug D — Session fingerprint binding, `core/session-security.ts`**

1.7 WHEN `SessionSecurity.generateFingerprint(ip, userAgent)` is called THEN the system returns a 32-bit FNV-1a hash (8 hex characters) of `ip:userAgent`, producing a short, predictable, collision-prone fingerprint that is used for session-hijack binding in `createSession()` and `validateSession()`.

**Bug E — Non-integrity hashing (Lower severity), `core/sql-injection-guard.ts` and `core/ddos-protection.ts`**

1.8 WHEN `SQLInjectionGuard.hashQuery(query)` is called THEN the system uses a 32-bit FNV-1a `simpleHash` to produce an 8-hex query identifier used solely as a cache/comparison key (no integrity or unpredictability guarantee is relied upon — currently acceptable, flagged for review).

1.9 WHEN `DDoSProtector.issueChallenge()` computes a proof-of-work challenge via `computeProofOfWork()` → `simpleHash()` THEN the challenge answer is derived from FNV-1a mixing; the challenge's resistance to precomputation/forgery has not been assessed against a real-crypto baseline.

### Expected Behavior (Correct)

Each clause below defines the correct behavior for the same condition in the matching clause of section 1.

**Bug A — Password hashing**

2.1 WHEN `PasswordHasher.hash(password)` is called THEN the system SHALL derive the stored digest using a real, memory-hard key-derivation function — real Argon2id via the `argon2` package (already a monorepo dependency of `@quant/auth`) or a Node built-in such as `scrypt`/`pbkdf2` — and SHALL produce a verifiable encoded hash whose reported `algorithm` accurately reflects the KDF actually used.

2.2 WHEN `PasswordHasher.verify(password, stored)` is called THEN the system SHALL validate the password against the real encoded hash and SHALL perform the final comparison using a vetted constant-time primitive (`crypto.timingSafeEqual`, or the KDF library's own verify function), returning `true` for the correct password and `false` otherwise.

2.3 WHEN `PasswordHasher.checkBreach(password)` is called THEN the system SHALL compute the breach-lookup prefix using a real cryptographic hash (`crypto.createHash`); the existing breach decision logic (common-password set and short-length checks) SHALL continue to behave equivalently.

**Bug B — CSRF token integrity**

2.4 WHEN a CSRF token's integrity tag is computed THEN the system SHALL produce a real HMAC-SHA256 over the token/session material using `crypto.createHmac` keyed by the configured `secretKey`.

2.5 WHEN `validateToken()` compares integrity tags THEN the system SHALL use `crypto.timingSafeEqual` (over equal-length buffers) for a constant-time comparison.

**Bug C — CSP inline-content hashes**

2.6 WHEN `CSPGenerator.computeHash(content, algorithm)` is called THEN the system SHALL compute the real SHA-256/384/512 digest of `content` via `crypto.createHash` with standard base64 encoding, returning a spec-correct `'<algo>-<base64>'` source expression that matches the digest a browser computes for the same inline content.

**Bug D — Session fingerprint binding**

2.7 WHEN `SessionSecurity.generateFingerprint(ip, userAgent)` is called THEN the system SHALL return a real keyed cryptographic digest of the client attributes (HMAC-SHA256, or SHA-256) so the fingerprint is long, unpredictable, and collision-resistant, while remaining stable for identical inputs so that fingerprint-binding validation continues to match on unchanged clients.

**Bug E — Non-integrity hashing**

2.8 WHEN `SQLInjectionGuard.hashQuery(query)` is called THEN the system MAY continue to use a non-cryptographic hash because the value is used purely as a cache/comparison key; the design SHALL confirm this hash is never relied upon for integrity or unpredictability (no behavioral change required unless the review concludes otherwise).

2.9 WHEN `DDoSProtector` issues/verifies a proof-of-work challenge THEN the design SHALL assess whether challenge integrity/unpredictability is security-relevant, and SHALL use a real cryptographic hash (`crypto.createHash`) for the proof-of-work computation if integrity matters; otherwise the existing non-crypto behavior MAY be preserved with the rationale documented.

### Unchanged Behavior (Regression Prevention)

These behaviors must remain identical after the fix. They cover the already-correct CSPRNG generation, the surrounding protocol/state semantics, the public API surface, and the unrelated already-real-crypto modules.

**Preserved CSPRNG generation (already correct)**

3.1 WHEN a password salt is generated THEN the system SHALL CONTINUE TO use `crypto.randomBytes` (as in `PasswordHasher.generateSalt`) so two hashes of the same password still differ.

3.2 WHEN CSRF tokens, session IDs, CSP nonces, or DDoS challenge IDs/nonces are generated THEN the system SHALL CONTINUE TO use `crypto.randomInt` / `crypto.randomBytes` exactly as today, with unchanged token/ID/nonce lengths and character sets.

**Preserved protocol and state logic**

3.3 WHEN CSRF tokens are validated THEN the system SHALL CONTINUE TO enforce the double-submit (header-vs-cookie) check, expiry, single-use replay prevention, session binding, per-session token cap (max 10), rotation, and invalidation semantics, returning the same `reason` codes for the same situations.

3.4 WHEN the CSP policy is built THEN the system SHALL CONTINUE TO support directives, presets, nonces, report-only mode, merging, and header-name selection unchanged; only the value returned by `computeHash` changes.

3.5 WHEN sessions are created, validated, rotated, or expired THEN the system SHALL CONTINUE TO enforce concurrent-session limits, idle timeout, absolute timeout, rotation-on-privilege-escalation, fixation prevention, and secure-cookie attributes unchanged; identical client attributes SHALL still pass fingerprint binding and changed attributes SHALL still fail it.

3.6 WHEN `PasswordHasher.assessStrength(password)` is called THEN the system SHALL CONTINUE TO return the same strength score, level, entropy, crack-time, and feedback as today (the strength scorer is independent of the hashing change).

**Preserved public API surface**

3.7 WHEN consumers use the package's public API THEN the exported classes, method names, parameter lists, and return-type shapes (`PasswordHashResult`, `CSRFToken`, `CSPPolicy`, `SecureSession`, `ChallengeResult`, etc.) SHALL CONTINUE TO be importable and usable unchanged. Note: switching to a real KDF changes the stored hash STRING format inside `PasswordHashResult.hash` (e.g., a PHC-encoded Argon2 string instead of fixed `hashLength*2` hex) — this content change is expected and acceptable, but the `PasswordHashResult` object shape and the `verify(password, stored)` round-trip contract SHALL remain usable.

**Preserved unrelated modules**

3.8 WHEN the package's other modules that already use real cryptography are exercised — `encryption.ts`, `api-key-manager.ts`, `oauth2-security.ts`, `honeypot.ts`, `audit-logger.ts`, `compliance-framework.ts`, and `privacy-compliance.ts` — THEN they SHALL CONTINUE TO behave exactly as before and remain untouched and passing.

3.9 WHEN the existing security test suite is run after the fix THEN all tests SHALL pass, with the understanding that tests asserting the OLD fake-digest SHAPE must be updated as part of the fix rather than treated as regressions. Specifically: `password-hasher.test.ts` assertions that `result.hash.length === result.params.hashLength * 2` (the default-params case and the custom `hashLength: 16` case) must be updated to match the real encoded-hash format while preserving the salt-randomness, verify-true/verify-false, strength, breach, and stats assertions; `sql-injection-guard.test.ts:120` (`expect(q.hash).toMatch(/^[0-9a-f]{8}$/)`) remains valid only if the query cache key stays non-cryptographic (per clause 2.8).
