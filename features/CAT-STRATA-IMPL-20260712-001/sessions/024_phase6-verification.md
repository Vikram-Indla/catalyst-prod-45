# Session 024 — Phase 6 (verification foundation)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001 · **Date:** 2026-07-16
**Branch:** `strata/impl-phase01` · **Authorization:** Vikram — "install node 22 and start phase 6".
**Prod migration:** DEFERRED by Vikram (no prod access). Phase 6 needs **no schema at all** — chosen deliberately so it
carries zero prod-migration debt.

---

## Slice 6A — Unblock Vitest + triage ✅ DONE

### 🔴 The headline: "Vitest cannot run" was FALSE. It was a Node version mismatch.
Recorded as fact in the handover across every phase; never re-tested. Same failure shape as the 5G-2 "UUIDs can't build
slug routes" blocker — **a true premise with a wrong conclusion, inherited and propagated**.

**Root cause (diagnosed, not guessed):**
- vitest 4.1.7 → rolldown 1.0.2 calls `util.styleText(['underline','gray'], …)`.
- `styleText` only accepts an **array** on Node **≥22**. The shell was on **Node v20.12.2** → `ERR_INVALID_ARG_VALUE`
  at startup, before a single test ran.
- Proof: on node@22 `styleText([...])` → OK; on node 20 → `ERR_INVALID_ARG_VALUE`.
- **`.nvmrc` already pinned `22`** — the repo knew. `engines.node` said `>=20.0.0 <24.0.0`, so Node 20 *looked* legal
  while silently breaking the suite. **That mismatch is what hid the suite.**

### What the suite actually contains (it was never broken)
| | Before fixes | After fixes |
|---|---|---|
| Test suites | 956/964 (8 failed) | **960/964** (4 failed) |
| Tests | 2390/2414 (8 failed) | **2392/2414** (6 failed, 16 skipped) |

**A 2,414-test suite at 99.7% green was sitting behind a Node version.**

### The 8 failures triaged — 2 were MINE, and both are now fixed
1. **`terminology.guard.test.ts` (REQ-003) — MY REGRESSION, slice 4G.** `StrataBoardPackPage.tsx` imported the `Play`
   **icon** for the Present-mode button. REQ-003 (CAT-STRATA-FOUNDATION-20260709-001) bans the capitalised legacy term
   across the STRATA module after the Theme rename; the guard is a text scan and correctly cannot tell an icon
   identifier from a UI label. **Fix: swapped to `Presentation` (`AkProjectionScreen`) — the guard was NOT weakened.**
   (Note: the guard's docstring *claims* icon imports are whitelisted, but `WHITELIST = /display|playback|playwright/i`
   does not actually whitelist them. Left as-is — tightening the guard beats loosening it. `MonitorPlay` would re-trip it.)
   Amusing confirmation the guard works: my first fix added a comment *explaining* the ban, which contained the banned
   word and re-failed. Comment reworded to avoid the term.
2. **`registry-drift.test.ts` — partly mine.** `usage-map.generated.ts` was stale (48053 committed vs 48272 fresh); none
   of the Phase-5 components were in it. **Fix: regenerated via `npx tsx scripts/scan-components.ts`** (the
   `scan:components` script calls bare `tsx`, which isn't on PATH — used `npx`). 48052 → 48271 lines.
3–8. **6× ChatDock** (`src/components/chat/dock/`) — **NOT mine, pre-existing.** This feature never touched
   `src/components/chat/` (`git log <feature-first-commit>..HEAD -- src/components/chat/` = empty); those files last
   changed **2026-07-11**, the day *before* this feature began. Left alone deliberately — fixing another module's tests
   without knowing intent is how you break things.

### Durable fixes so this cannot recur
- **`engines.node`: `>=20.0.0 <24.0.0` → `>=22.0.0 <24.0.0`** — matches `.nvmrc`; Node 20 no longer looks legal.
- **Added `test` + `test:watch` scripts** (`vitest run --config vitest.config.ts`) — there was NO test script at all,
  which is why nobody ran it.
- Node 22 installed **keg-only** (`/opt/homebrew/opt/node@22`) — global `node` stays v20.12.2, dev server untouched.
  Run with `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`.

### Verification
- STRATA + registry-drift: **7 files / 25 tests, all pass**.
- Gates: tsc clean · colors 0/0 · audit 19798/19798 (no increase) · CRE passed.
- Map hard gate: byte-diff vs Phase-5 start = **empty**.

---

## ⏭ NEXT
- **6B** — close **AC-6** (keyboard-only), the one §20 criterion my browser tooling could not verify. With vitest +
  testing-library, `userEvent.tab()` drives real focus traversal programmatically — exactly what the Chrome MCP could not.
- **6C** — STRATA Phase-5 regression tests (`resolveNotificationTarget`, `bandRows` range derivation, model-integrity
  sums, `countPending` — all pure functions).
- **6D** — retest E2E defects 010 & 013.

---

## Slice 6B — Close AC-6 (keyboard-only) ✅ weight-change PROVEN (1 of 4 verbs)
**Files:** `src/modules/strata/__tests__/ac6-keyboard-weight-change.test.tsx` (NEW) · `package.json`
(declare `@testing-library/user-event ^14.6.1` — it was present in node_modules only transitively).

- §20 AC-6 was NOT VERIFIED because the browser harness could not deliver keystrokes. **6A removed that constraint**, so
  the harness was swapped: `userEvent.tab()` performs real sequential focus navigation in jsdom.
- **2 tests, both green:**
  1. Whole verb, zero mouse events: Tab→`Edit weights`→**Enter**→Tab→input→type `30`→Tab→input→type `45`→Tab→`Save
     weights`→**Enter** ⇒ `setModelPerspectiveWeights('m1',[{p1:30},{p2:45},{p3:25}])` fired once with the
     keyboard-typed values.
  2. Integrity rule holds from the keyboard: at 70, Save is disabled, reason **visible**, Enter cannot commit.
- **The component was vindicated by a failure.** Inputs `30,35,25` + Save disabled looked like a bug; it was my test's
  arithmetic (30+35+25=90). The component correctly rendered "Total 90%" and blocked Save. Rebalanced to 30/45/25 = 100,
  which additionally proves Tab traversal BETWEEN inputs.
- Test-authoring notes for reuse: `vi.mock` factories are hoisted ⇒ all fixtures live in `vi.hoisted()`; match controls by
  `data-testid` (text matching is brittle — `StatusLozenge` renders its label more than once); `src/test/setup.ts`
  auto-wraps every render in QueryClientProvider + stub auth, so no manual providers are needed.
- STRATA suite: 7 files / 25 tests green. Gates: tsc · colors 0/0 · audit 19798/19798 · CRE — all green.

### ⚠️ AC-6 is 1 of 4 — NOT green
`validate`, `resolve` and `record` remain unproven. The reusable pattern (`tabUntilFocused` + hoisted hook mocks) is in
place for them.
