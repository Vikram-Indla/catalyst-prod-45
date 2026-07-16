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

---

## Slice 6C — STRATA Phase-5 regression tests ✅ DONE (+26 tests)
**Files:** `__tests__/resolve-notification-target.test.ts` (NEW, 14) · `__tests__/phase5-governed-logic.test.tsx`
(NEW, 12) · `StrataAdminConfigPage.tsx` (export `bandRows` for direct testing).

**STRATA suite: 6 files / 23 tests → 9 files / 51 tests, all green.**

### `resolveNotificationTarget` (5G-2) — 14 tests, the riskiest logic Phase 5 shipped
Covers all four entity types' id→slug hops and their done-detection:
- `strata_kpis` → slug direct; done ⇔ status `approved`
- `strata_benefit_values` → benefit.slug (2 hops, asserts the hop ORDER); done ⇔ `validated_at`
- `strata_decisions` → snapshot.snapshot_key; done ⇔ `decided_at`
- `strata_dependencies` → requesting_id → project_card.slug; done ⇔ status ∈ {resolved, cancelled}
  (parameterised over all 5 real status values found in staging)
- **ORPHAN (a real staging row): decision with `snapshot_id = null` ⇒ `key: null`** so the bell falls back to the area
  landing rather than build a broken link — and asserts it does NOT go looking for a snapshot it knows isn't there.
- Degenerate inputs never fabricate a link: null entity_id (no query attempted), unknown entity_table, deleted row.
- NB `src/test/setup.ts` mocks the supabase client but does **not** export `typedQuery`/`typedRpc` — which is exactly why
  no STRATA domain tests existed. This file overrides that mock with a controllable fake.

### `bandRows` (5D / anchor 25) + `ModelIntegrityBand` (5C / anchor 05) — 12 tests
- Bands sort high→low regardless of JSON order; From ≥ / To < tile with **no gap and no overlap** (asserted as an
  invariant: each band's `from` equals the next one's `to`), open at the top; single band; empty list; **does not mutate
  the caller's array**. An off-by-one here would misstate the policy that decides every rating.
- Integrity tri-state: ✓ at 100 · ✕ under-100 says **assign** the remainder · ✕ over-100 says **remove** the excess (not a
  negative "assign") · △ when none configured.
- A DRAFT model at 90 blocks Submit **with the reason visible** ("Weights total 90 — must total 100"); at 100 it submits.

Gates: tsc · colors 0/0 · audit 19798/19798 · CRE — all green. Map byte-diff empty.

---

## Slice 6D — Retest E2E defects 010 & 013 ✅ RETESTED — both remain OPEN (evidence below)
No code. Both defects were parked "pending backend/schema decisions + QA retest"; this is the retest, run read-only
against staging (`cyijbdeuehohvhnsywig`). **Every blocking condition still holds — neither is closable, and neither is
blocked on UI code.**

### DEF-010 — KPI strategy-hierarchy link at creation → **STILL OPEN, unchanged**
| Probe | Result |
|---|---|
| `strata_link_element_kpi` still gated on `approved` | **true** (function body references it) |
| `strata_kpis.status` column default | **`'draft'`** |
| draft KPIs on staging today | **6** — all unlinkable at creation |

The original diagnosis holds exactly: new KPIs are always `draft`, and the link RPC rejects non-approved KPIs, so the
link-at-creation path cannot work. **Blocked on a PRODUCT DECISION, not on code:** allow draft linking / add an
auto-approve path, **or** keep linking post-approval on the Strategy Room `KpiLinksModal` (today's behaviour, which
works). Either way it needs a backend change + its own Plan Lock. See [[strata-kpi-link-requires-approved]].

### DEF-013 — Portfolio add-member selector scoping → **STILL OPEN, but already RULED (not awaiting a decision)**
| Probe | Result |
|---|---|
| `strata_project_cards.cycle_id` | **absent** → cycle scoping impossible |
| `organization_id` on project cards | **NULL on 46/46**; **no `organizations` table** → tenant scoping impossible |
| card lifecycle / soft-delete column | **absent** → "exclude retired/ineligible cards" not actionable |

All three facts match `docs/ways-of-working/STRATA_E2E_PARKED_DECISIONS_013_011.md` (Vikram, 2026-07-12), which already
**ruled**: the **cycle-filter portion is REJECTED as a non-requirement** (Portfolios are not cycle-anchored by design;
cards may legitimately span cycles), and the **tenant portion is DEFERRED to the product-wide multi-tenancy initiative**
(tenant isolation is absent across ALL of Catalyst by explicit single-tenant design — 0 of 1,274 migrations reference
`organization_id`). So 013 is **not** "awaiting a decision" — it is parked behind that initiative and closes only with
its schema/RLS + live cross-tenant evidence.

**⚠️ Memory correction:** `[[strata-e2e-v2-open-items]]` (written 2026-07-11) still says 013 needs a decision — that was
superseded by the 2026-07-12 ruling. Memory updated.

### 6D disposition
Both stay OPEN and **cannot be closed by this phase**. 010 needs a product decision + backend change; 013 needs the
multi-tenancy initiative. Phase 6 carries no schema, so neither is in scope here — recorded, not quietly dropped.

---

# PHASE 6 COMPLETE — 6A · 6B · 6C · 6D
| Slice | Outcome |
|---|---|
| 6A | **Vitest unblocked** (Node 22). Suite was never broken: 964 suites / 2,414 tests, 99.7% green. 2 real failures found — **both mine** — and fixed. `engines` tightened + `test` scripts added so it cannot recur. |
| 6B | **AC-6 weight-change PROVEN keyboard-only** by automated test. AC-6 now **1 of 4** verbs — still not green. |
| 6C | **+26 STRATA regression tests** (resolver incl. the real orphan row; band tiling invariant; integrity tri-state). Suite 23 → **51 tests**. |
| 6D | Both E2E defects **retested with evidence**; both remain OPEN and out of scope (decision / initiative). |

**Zero schema. Zero prod-migration debt added.** Gates green throughout; map byte-untouched.

## ⏭ REMAINING (unchanged by Phase 6)
- **AC-6 remainder**: `validate` / `resolve` / `record` keyboard proofs (pattern is in place).
- **6 pre-existing ChatDock test failures** — foreign module, deliberately untouched.
- Phase 7 (bugs) / Phase 8 (15 backend features — **gated on prod access**) / Phase 9 (UI polish).
