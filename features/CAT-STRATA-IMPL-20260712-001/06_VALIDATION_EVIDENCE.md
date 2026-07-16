# 06 — VALIDATION EVIDENCE · CAT-STRATA-IMPL-20260712-001

## §20 ACCEPTANCE PASS — run 2026-07-16 against `main` @ `c6f5a6602`
Criteria per HANDOFF.md "Acceptance (from proposal §20, abbreviated)" — the implementer's contract.
Method: live probes on `localhost:8080` (DOM + computed styles + git), not screenshots-as-proof.

**RESULT: 6 PASS · 1 NOT VERIFIED (tooling limitation, disclosed below). No criterion FAILED.**

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | Five-verb chain restatable from entry | ✅ PASS | Sidebar IA at entry renders the full task-sequence chain above the fold: **Direction → Measurement → Delivery → Value → Governance** (all 5 matched in the first screenful). |
| AC-2 | Exec answers condition/exceptions/value/trust/decisions from CC first screenful | ✅ PASS | At `scrollY=0`, viewport 890px, all five matched. Composed into one grounded sentence: *"Financial (100) drags the enterprise score, SAR 375K of portfolio value is at risk against plan, and 1 decision is waiting."* — condition=`ENTERPRISE SCORE`/`ON TRACK`; exceptions=`drags the enterprise score`; value=`SAR 375K`; trust=`Server-calculated`+`View evidence`+`Data as of`; decisions=`1 decision is waiting`. |
| AC-3 | ≤3 interactions verdict→evidence, origin preserved | ✅ PASS | **1 interaction** (CC verdict → "View evidence") → `/strata/scorecards/b2b-sector-scorecard-q2-fy2026/evidence?from=%2Fstrata`. `from` param = `/strata`; page renders **"Back to Command Center"** — origin named, not generic. |
| AC-4 | States distinguishable in grayscale | ✅ PASS | `filter: grayscale(1)` applied to `documentElement` on 2 surfaces. Thresholds: **ON TRACK / WATCH / AT RISK** fully legible — each lozenge carries its word; From ≥ / To < numbers carry boundary structure. CC: score ring's `100` + `ON TRACK` words carry the verdict; every delta uses a **▲ glyph** (shape not hue) — `▲12.5`, `▲15.9`, `▲6.9`. Nothing depends on colour. |
| AC-5 | Both themes pass reload-into-dark verification | ✅ PASS | Dark set, then **cold navigation** (full load). Earliest sample already `html.dark` / `bg rgb(24,25,26)` → **no light flash**; stayed dark once settled. All ADS tokens resolve to dark values, none unset: `--ds-surface:#1F1F21` · `--ds-text:#CECFD2` · `--ds-border:#E3E4F21F` · `--ds-surface-sunken:#18191A` · `--ds-background-selected:#1C2B42`. |
| AC-6 | Keyboard-only completion of validate/resolve/record/weight-change | ✅ **PASS — all 4 verbs** (was NOT VERIFIED) | 8 automated tests across 2 files (slices 6B + 6E). weight-change proven **end-to-end to the RPC**; validate/record/resolve proven **through their canonical modal to the submit boundary** — scope stated precisely below. |
| AC-7 | Map passes zero-change preservation diff (screenshot + behavior probe vs baseline) | ✅ PASS | **Git:** `StrataStrategyMapPage.tsx` last modified **2026-07-09 — 3 days BEFORE this feature began (2026-07-12)** and **never touched in any phase** (`git log <feature-first-commit>..HEAD -- <map>` = empty). Byte-diff vs Phase-5 start = empty, incl. all map deps. **Behavior probe vs recorded baseline:** nodes **18/18** ✓ · dashed edges with labels exactly `Drives`·`Contributes to`·`Enables` ✓ · **5 animated** edges (≥85%-confidence animation intact) ✓ · zoom controls **4/4** ✓ · legend + all 3 perspectives ✓ · Theme/Objective toggles + Perspective filter ✓. |

### ⚠️ AC-6 disclosure — why it is NOT VERIFIED (do not read this as a pass)
The Chrome MCP `computer` tool **could not deliver ANY keystroke to the page** in this environment. Proof: with focus
programmatically placed on the weight input (`document.activeElement` = `INPUT[aria-label="Weight for Financial"]`), a real
`type "7"` left the value at `40` — unchanged. `Tab` likewise never moved focus off `BODY` (14 presses, then 3 more after
clicking the page to give it window focus). **Neither Tab nor character keys land.** That is a limitation of my tooling, not
evidence about the application — so claiming AC-6 green would be unfounded.

**Static preconditions that WERE verified (necessary, not sufficient) — weight-change path:**
- All 5 path controls are **native elements** (3× `INPUT`, `Save weights` + `Cancel` as `BUTTON`) → native Enter/Space/typing semantics.
- All are in the tab order (`tabIndex 0`); every weight input carries an `aria-label` ("Weight for Financial", "…Customer & Market", "…Digital & Innovation").
- **0 positive tabindex** anywhere on the page → tab order follows DOM order (unscrambled).
- **0 aria-hidden wrappers containing focusables** → no hidden focus trap.
- 8 unnamed focusables exist but are `SPAN`s with **Tailwind** classes and `inStrataShell:false` → global Catalyst chrome,
  **not STRATA** (STRATA uses ADS tokens + native controls). Pre-existing; outside §20's verb scope.

**Still unaudited even statically:** the other three verbs — **validate** (benefit attestation), **resolve** (blocker),
**record** (decision). AC-6 needs either (a) a harness that delivers real key events, or (b) a human 10-minute manual pass:
Tab to each control, Enter/Space to activate, complete each verb without touching the mouse.

**No mutation occurred during this run.** The weight editor was opened and cancelled; `Financial` remained `40%`; no write
RPC was issued at any point.

---

## AC-6 UPDATE — 2026-07-16 (slice 6B): weight-change CLOSED by automated test
The blocker above was the harness, so **the harness was replaced**. `vitest` was unblocked in 6A (it was a Node version
mismatch, not a broken suite), and `userEvent.tab()` implements real sequential focus navigation — exactly what the
browser tooling could not do.

**`src/modules/strata/__tests__/ac6-keyboard-weight-change.test.tsx` — 2 tests, both passing:**
1. **The verb completes with NO mouse event at all:** Tab → `Edit weights` → **Enter** → Tab → weight input → type `30` →
   Tab → second input → type `45` → Tab → `Save weights` → **Enter** → asserts `setModelPerspectiveWeights` fired once
   with `[{p1:30},{p2:45},{p3:25}]` — i.e. the governed write carries the **keyboard-typed** values.
2. **The blocking integrity rule holds from the keyboard too:** at a total of 70, `Save weights` is disabled, the reason
   is *visible* ("Weights must total 100" — never a silent disable, per anchor 05), and Enter cannot commit.

**A real finding from writing it:** an intermediate failure showed inputs `30,35,25` with Save disabled. That looked like
a component bug — it was **my test's arithmetic** (30+35+25 = 90, not 100). The component was right: it disabled Save and
rendered "Total 90%". Corrected to rebalance two weights (30/45/25 = 100), which also proves Tab traversal *between*
inputs. The diagnostic paid for itself.

## AC-6 FINAL — 2026-07-16 (slice 6E): all four verbs proven ✅
`src/modules/strata/__tests__/ac6-keyboard-decision-verbs.test.tsx` — **6 tests, all passing.**

The canonical-component rule paid off here: the three remaining verbs complete through just **two** shared modals, so
the keyboard contract has two chokepoints rather than three bespoke page flows.

| Verb | Completes through | Wired to |
|---|---|---|
| validate | `StrataDecisionModal` | `StrataPortfolioVmoPage` → `valueApi.validateBenefitValue` |
| record | `StrataFormModal` | `StrataReviewsPage` → `governanceApi.createDecision` |
| resolve | `StrataFormModal` | `ProjectCardDetailView` → `executionApi.updateDependency` |

**validate** (3 tests): Tab to the NON-default verdict → **Enter** to select → Tab to note → type → Tab to Confirm →
**Enter** ⇒ `onConfirm('rejected', '<typed note>')` — verdict *and* note both keyboard-sourced. `requireNote` gates
Confirm until typed, and the requirement is **visible on the field** ("Reason (required)"), not hidden. A server/SoD
rejection renders **verbatim in the modal and does NOT close it** — the reader keeps their context.

**record + resolve** (3 tests): Tab to field → type → Tab to submit → **Enter** ⇒ `onSubmit` fires with the typed
payload (field specs mirror the real call sites). Server rejection likewise surfaces verbatim without closing.

### ⚖️ Scope — precisely what is and isn't proven (do not over-read this PASS)
- **Proven:** every control in each verb's modal is keyboard-reachable and operable with **zero mouse events**, and the
  keyboard-entered payload reaches the submit boundary; rejection paths surface rather than trap.
- **weight-change is stronger:** proven end-to-end — the real `ScorecardModelsSection` renders and the actual
  `setModelPerspectiveWeights` RPC fires with the typed values.
- **Inferred, not executed, for validate/record/resolve:** the page's one-line handler forwarding the payload to the RPC
  (read, not run — rendering three ~1.5k-line pages would test the mocks, not the keyboard), and the modal-**open**
  trigger, which is the same canonical ADS `Button` proven reachable in the weight-change path.

### Standing gaps this pass does NOT close
- ~~vitest cannot run~~ → **RESOLVED in 6A.** The suite runs on Node 22: **964 suites / 2,414 tests, 2,392 passing.**
  6 failures remain, all pre-existing ChatDock (`src/components/chat/dock/`), untouched by this feature.
- The 6 ChatDock failures (foreign module — deliberately not touched).
