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
| AC-6 | Keyboard-only completion of validate/resolve/record/weight-change | ⚠️ **NOT VERIFIED** | **See "AC-6 disclosure" below. NOT a pass; NOT a fail — no evidence either way on end-to-end completion.** |
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

### Standing gap this pass does NOT close
`vitest` still cannot run — there is **no unit-test verification for any phase**. §20 is a behavioural acceptance
contract, not a substitute for a test suite. Both remain open.
