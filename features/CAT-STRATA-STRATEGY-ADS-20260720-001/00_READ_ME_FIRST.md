# READ ME FIRST — CAT-STRATA-STRATEGY-ADS-20260720-001

**Feature:** ADS compliance remediation of the STRATA Strategy Room.
**Surface (ONLY):** `http://127.0.0.1:8081/strata/strategy`
**Single file in scope:** `src/modules/strata/pages/StrataStrategyRoomPage.tsx` (+ its page-local test).
**Baseline:** branch `strata/kpi-operating-model` @ `51bb51bc4`.

## The one rule that governs everything here

> **PAGE-LOCAL ONLY. ZERO REGRESSION.**
> Do NOT edit any shared component, the shell, the ADS wrapper layer, global CSS, the
> protected `/strata/strategy/map` implementation, or any other STRATA page.
> If a finding cannot be fixed without touching shared code, it is **DEFERRED**, not forced.

## Read in this order
1. `01_OBJECTIVE.md`
2. `03_PLAN_LOCK.md`  ← the contract; **PENDING APPROVAL**
3. `09_DECISIONS.md`  ← D1 (blocking) + deferral rulings needed
4. `02_CANONICAL_DISCOVERY.md`
5. `08_DRIFT_LOG.md`, `07_HANDOVER.md`, `11_KARPATHY_LOOP_LOG.md`

## Status right now
- **No product code has been changed.** This folder is planning only.
- 5 findings are in scope (page-local). 1 is conditional (blocked on D1). 2 are deferred (shared-component).
- Nothing may be implemented until the Plan Lock is approved AND D1 is ruled.

## Evidence source (authoritative)
`/Users/jahanarakhan/Documents/17 Jul strata testing/DESIGN_INTELLIGENCE_AUDIT_STRATA_STRATEGY_2026-07-20/`
— `DESIGN_INTELLIGENCE_AUDIT_REPORT.md` (Brief v3.0), `SELECTOR_MAP.md` (8 verified selectors),
`strata-strategy-annotated-external.svg`, `strata-strategy-live-raw-2026-07-20.jpg`.
