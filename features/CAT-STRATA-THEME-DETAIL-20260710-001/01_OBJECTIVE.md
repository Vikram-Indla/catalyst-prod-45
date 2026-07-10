# Objective — CAT-STRATA-THEME-DETAIL-20260710-001

## Problem
The STRATA Strategic Theme detail page (`/strata/strategy/elements/:slug`,
`src/modules/strata/pages/StrataStrategyElementDetailPage.tsx`) is a read-only
composition of existing hooks. It cannot answer the 12 questions a Strategy
Office user needs answered (see root-cause report, session 001). Root causes,
by area:

| Area | Root cause |
|---|---|
| Edit on detail page | Missing implementation — mutations exist (`strategyApi.updateElement`, `strategyApi.upsertCharter`), only called from Strategy Room row-menu modals |
| Objectives list | Incomplete wiring — `children` already computed via `parent_id` filter, never rendered as a list |
| Project Cards | Incorrect reuse assumption — stale doc comment claims linkage doesn't exist; `strata_project_cards.theme_id` + query fully exist in `StrataExecutionPage.tsx` |
| OKR performance | Incomplete wiring — `kpiApi.okrs()` exists, unused on this page |
| Governance (Decisions/Actions) | Wrong/missing data model — no element FK on `strata_decisions`/`strata_actions` |
| Baseline/version | Missing data model entirely — `strata_snapshots` is cycle/period-scoped only, no per-element concept |
| Raw audit strings | Missing implementation — no formatting layer; `action` rendered verbatim |
| "for the team" Charter text | Test-data issue, not code — confirmed via grep, no hardcoded/seeded literal exists |

## Decisions (Vikram, 2026-07-10)
1. **Governance schema**: include a migration to add Theme-level linkage to
   `strata_decisions`/`strata_actions` (own slice — see Decisions log).
2. **Baseline/version**: report as an explicit gap on the rebuilt page. Do not
   fabricate version history. No schema work in this feature unless a future
   decision reopens it.
3. **Slicing**: by priority tier, one Plan Lock per slice.
   - **Slice 1** (this Plan Lock): Edit Theme + Edit Charter from the detail
     page, business-readable audit trail.
   - Slice 2: Objectives list + OKR performance section.
   - Slice 3: Project Cards section + execution summary rollup.
   - Slice 4: Governance linkage migration + Decisions/Actions section +
     "Map edges" → "Strategy relationships" rename.

## Non-goals (all slices)
- No ERP budget-submission workflow, no AOP.
- No Schedule Gate at Theme level.
- No new execution object; Project Card remains sole execution object.
- No fabricated baseline/version data.
- No duplicate routes or duplicate mutations — row menu and detail page share the same `strategyApi` calls.
