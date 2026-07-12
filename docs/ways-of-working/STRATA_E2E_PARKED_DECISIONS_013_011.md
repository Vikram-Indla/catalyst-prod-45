# STRATA E2E — Parked decisions (V3-OPEN-013, V3-OPEN-011)

**Status:** BLOCKED ON DECISION — no additive code fix exists. Parked per Vikram's
decision on 2026-07-12 during the CAT-STRATA-E2E-FIXES regression batch.

These two defects were investigated read-only and confirmed to be **data-model /
product decisions**, not code bugs. They are intentionally NOT patched. Each needs an
authoritative decision before any implementation.

---

## V3-OPEN-013 — Portfolio member selector globally scoped

**Symptom:** The "Add portfolio member" Project Card selector exposes all cards
(~43 rows) spanning unrelated populations; it is not constrained to the selected
Portfolio's tenant/cycle.

**Why there is no additive UI fix:**
- `strata_project_cards` has **no `cycle_id` / `organization_id` / tenant column**
  to filter against (`src/modules/strata/types.ts:377-421`). The `vmoAuthoring.tsx`
  option builder even documents this: "Cards carry no cycle/tenant scoping column".
- The selected `StrataPortfolio` also carries no cycle/tenant anchor
  (`types.ts:554-563`). So neither side of the relationship holds a value to scope by.
- Contrast: `StrataInitiative` *does* carry `cycle_id` (`types.ts:365`) — cards do not.
- Twin/duplicate candidates (Manual/Jira) are **kept intentionally** and disambiguated
  by `source_system`/`source_key` (`vmoAuthoring.tsx:203-217`). That is by design, not a bug.
- "No cross-tenant" can only be enforced by **RLS** on `strata_project_cards` — not
  observable or fixable from the frontend.

**Decision required (pick one):**
1. Add a cycle/tenant anchor to `strata_project_cards` (a `cycle_id` column, or a
   resolvable `theme_id → strata_strategy_elements.cycle_id` join), THEN filter
   `buildProjectCardOptions` by it. → schema migration + backfill + selector change.
2. Confirm/repair **RLS** on `strata_project_cards` for the cross-tenant claim only
   (no cycle filter). → RLS review, no UI change.
3. Accept current behavior (same-tenant seed/test data is expected) → close as not-a-defect.

**Blast radius if scoped:** `useProjectCards` also feeds `StrataExecutionPage`,
`StrataStrategyElementDetailPage`, `StrataExecutionImportPage`, and the member-name
resolver — any global scoping change ripples to all of them.

> Note: the new governed Attribution selector (V4-OPEN-019, shipped in this batch)
> reuses the same `buildProjectCardOptions` and therefore inherits the same unscoped
> option list until this decision lands.

---

## V3-OPEN-011 — Scorecard perspective model unresolved

**Symptom:** Implemented perspectives are Financial / Customer / Digital / People / ESG
(weights 30/25/20/15/10 = 100). QA expected a different "supplied target model".

**Why there is no code fix:**
- Perspectives are **seeded config, not hardcoded**: table `strata_perspectives`
  (`supabase/migrations/20260705100000_strata_foundation_config_engine.sql:150`,
  DDL comment: "never hard-coded"); rows seeded in
  `20260705100600_strata_seed_salam_demo.sql:20-25`.
- The "supplied target model" (and the classic 4-perspective Balanced Scorecard —
  Financial / Customer / Internal Process / Learning & Growth) **exists nowhere in the
  repo or docs**. QA's expectation is external and must be supplied as a versioned artifact.
- The admin UI (`StrataAdminConfigPage.tsx`) is **read-only** for perspectives (only
  Submit/Approve/Retire lifecycle; no create/edit of name/weight/order). So even a pure
  data change cannot be actioned from the UI today — it needs a DB seed/migration.

**Decision required:**
1. Which perspective model is canonical — keep the shipped 5, adopt the classic 4, or a
   formally versioned third model? (Supply as a dated authoritative artifact.)
2. Per perspective: labels, slugs, order, default weights, and each scorecard model's
   weights (must total 100 or the approval trigger DB-blocks it).
3. KPI / strategy-element re-linking map (which move to which new perspective).
4. History policy: recompute/retire prior calc results, or leave historical snapshots.

**Blast radius (migration, if model changes):** everything FK'd to
`strata_perspectives.id` — `strata_strategy_elements.perspective_id`,
`strata_scorecard_model_perspectives` (**ON DELETE RESTRICT**),
`strata_scorecard_lines` (**ON DELETE RESTRICT**), and the calc engine's per-perspective
results/history. A swap must re-point every referencing row (cannot delete), retire old
records via the governed lifecycle, and re-run calcs. Multi-table migration + data repair.

**Optional follow-up (separate slice, if self-service is wanted):** add
`createPerspective`/`updatePerspective` + model-weight upsert to `configApi` plus admin
forms — distinct from the model decision above.
