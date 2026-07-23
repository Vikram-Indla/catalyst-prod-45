# S21 full-chain aggregation closure — developer runtime evidence

Date: 2026-07-22 · Environment: staging `cyijbdeuehohvhnsywig` via Supabase MCP.
**Developer evidence — NOT independent acceptance.** Aiden owns browser acceptance of the UI consumer
and independent replay. Responds to Aiden's post-S20 finding (aggregates=true without an approved alignment).

## Migration ledger (forward-only; S9/S19/S20 files NOT edited)
| Version | Name | Effect |
|---|---|---|
| **20260722120000** | strata_s21_full_chain_aggregation_eligibility | New helper `strata_contribution_aggregates` (single source of truth) + redefines `strata_project_kpi_trace` and `strata_executive_governed_rollup` to call it. |

Applied via MCP `execute_sql` + ledger insert at the file's exact version (1:1).

## Governed fixture — actors + IDs (two distinct non-admin identities; SoD enforced by auth.uid())
- Maker = `strata.qa.strategy-maker` `86d65bbf` · Checker = `strata.qa.framework-approver` `8ba95bb6` · Validator = `khan.jahanara` `9537a670` (vmo_validator)
- Card `bbc2963d` (Excel Import Test Project) · Project Objective `49aa8c58` (E8 Auto-Return Test Objective) · Parent Strategic Assignment `d0d522d2` (KR-linked `80ce8318` E2E onboarding rate)
- Child assignments `94fd86dd` (KA-94FD86DD25), `5bf83c25` — approved (86d65bbf→8ba95bb6)
- Mappings `a770ef28` (direct_component), `39ae4dd3` (driver) — approved (86d65bbf→8ba95bb6)
- **Project Objective Alignment `61fda4a3`** (E8 `49aa8c58` → Strategic Objective `…010011`) — **approved**, submitted_by `86d65bbf`, approved_by `8ba95bb6`
- **Project observation `8f83fcd4`** on KA-94FD86DD25 — value 80, **validated**, submitted_by `86d65bbf`, validated_by `9537a670`

## Runtime positive/negative matrix (`strata_contribution_aggregates`, deployed) — PASS
| Case | Result |
|---|---|
| direct_component, complete chain (approved+effective mapping/child/parent + approved matching alignment) | **true** |
| direct_component, **no approved alignment** (before `61fda4a3`) | **false** |
| driver (approved) | **false** |
| temporal — as_of before mapping effective_from | **false** |
| Same mapping `a770ef28`: false without alignment → true after approved alignment | proven bidirectionally |
- Trace now surfaces `approved_project_objective_alignments` count = 1.
- `strata_executive_governed_rollup`: `aggregating_contributions=1`, `non_aggregating_contributions=1` (uses the same helper).
- Mismatched objective / unapproved+expired child/parent / supporting_evidence / none: asserted by the S21 guard against the single-source helper clauses (`child.status='approved'`, `parent.status='approved'`, `al.strategic_objective_id=parent.element_id`, effective windows).

## Files changed (reconciled checkout `strata/kpi-operating-model`, uncommitted; no push/PR)
- `supabase/migrations/20260722120000_strata_s21_full_chain_aggregation_eligibility.sql` (new)
- `src/modules/strata/hooks/useStrata.tsx` (+`useExecutiveGovernedRollup`)
- `src/modules/strata/pages/StrataCommandCenterPage.tsx` (Governed KPI rollup panel — restricted/error/loading/empty states, provenance, drill-through)
- `src/modules/strata/__tests__/kpi-opmodel-s21-full-chain-aggregation.guard.test.ts` (new)
- `src/modules/strata/__tests__/kpi-opmodel-s21-command-center-consumer.guard.test.ts` (new)
- `src/modules/strata/__tests__/kpi-opmodel-s9s11-lifecycle-downstream.guard.test.ts` (updated: aggregates rule now asserted on the S21 helper + delegation)

## Tests / build
- Focused guards: **41/41** (s21 full-chain ×7, s21 consumer ×6, s20 ×5, s9s11/S19, execmodel s16/s17/s18).
- Production build: `npm run build` **exit 0** (Command Center page compiled).

## Honest PASS / FAIL / BLOCKED
| Item | Status |
|---|---|
| S21 full-chain eligibility (helper single source) applied + runtime-proven | **PASS (developer runtime)** |
| Approved Project Objective Alignment (two-identity) | **PASS (developer runtime)** |
| Validated Project observation (distinct submitter/validator) | **PASS (developer runtime)** |
| S20 rollup uses S21 rule (no duplication) | **PASS** |
| Command Center consumer wired to read model (+ states, drill-through, no N+1) | **PASS (code + guard); browser BLOCKED** |
| Browser navigation / role-visibility / independent replay | **BLOCKED — no login session; Aiden** |
| Five-engine completion | **WITHHELD** — returned to Aiden for browser acceptance |

Constraints honored: staging only; no production; no push/merge/PR; S9/S19/S20 files not edited; historical/audit
rows and governed fixtures preserved (fixtures enumerated, not deleted); developer evidence kept separate from acceptance.

---

# Addendum — provenance drill-through + Project Card tab persistence (UI only)

No migration, no staging mutation, no S21 aggregation-semantics change. Code + guards only.

## Root cause of the previous generic-index fallback
`useProjectCards` resolves to **`executionApi.projectCards`** (`domain/index.ts:1131`, `select('*')`) which
**does** carry `slug`. The earlier fallback was based on the wrong API object (`kpiApi.projectCards`,
`domain/index.ts:850`, returns only `{id,name}`). Corrected.

## Changes
- **Named-card drill-through** — each contributing card in the Governed KPI rollup row is now its own
  link opening `Routes.strata.projectCard(slug)` with `?cycle=&period=&tab=scope-measures&from=/strata`.
  Mirrors the established convention in `StrataExecutionPage:438-447` (same cycle/period/from suffix);
  the generic `Routes.strata.execution()` fallback is removed from the panel.
  Unresolved card → renders nothing; slugless card → plain text (never a broken link).
- **Project Card tab persisted in the URL** — `CARD_TAB_SLUGS = ['overview','scope-measures','delivery']`;
  `<Tabs>` is now CONTROLLED (`selected` + `onChange`), reading/writing `?tab=` with `{ replace: true }`.
  Refreshing or deep-linking Scope & Measures returns to Scope & Measures. Unrecognised token → overview.

## Known pre-existing gap (NOT introduced here, not overclaimed)
`?from=` is preserved per the repo convention, but **no consumer renders a "Back to [origin]" link yet** —
`StrataExecutionPage:442-443` marks that as the pending anchor-07 (3A-2) redesign. I did not invent a
competing back-link. Return-to-origin is therefore *carried in the URL*, not yet *rendered*.

## Files changed
- `src/modules/strata/pages/StrataCommandCenterPage.tsx` (rollupCardById + rollupCardHref + per-card links)
- `src/modules/strata/components/ProjectCardDetailView.tsx` (useSearchParams, CARD_TAB_SLUGS, controlled Tabs)
- `src/modules/strata/__tests__/kpi-opmodel-s21-provenance-navigation.guard.test.ts` (new, 9 tests)
- `src/modules/strata/__tests__/kpi-opmodel-s21-command-center-consumer.guard.test.ts` (drill-through assertion updated to the named-card route)

## Tests / build
- Focused guards: **36/36** across the S19–S21 set (incl. 9 new navigation guards).
- Production build: **exit 0**.

| Item | Status |
|---|---|
| Named-card provenance drill-through (no generic index) | **PASS (code + guard)** |
| Cycle / period / tab context preserved on drill | **PASS (code + guard)** |
| `?from=` carried; "Back to origin" rendering | **PARTIAL — param preserved; consumer is pending anchor-07 (3A-2)** |
| Project Card tab persists across refresh / deep link | **PASS (code + guard)** |
| Browser acceptance of all the above | **BLOCKED — Aiden** |
