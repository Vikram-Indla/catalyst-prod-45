# Plan Lock — Slice 3: Project Cards + execution summary
CAT-STRATA-THEME-DETAIL-20260710-001

## Objective
Add a **Linked Project Cards** panel and an **Execution Summary** rollup to
the Theme detail page, reusing the existing server-calculated health field
and the existing rollup logic already built for `StrataExecutionPage.tsx`
rather than recomputing anything.

## Non-scope (this slice)
- No Strategic Investment summary section (budget/forecast-spend/variance) —
  not requested this slice ("Project Cards + execution summary" only); can
  be a follow-up slice if wanted.
- No new mutations — read-only panels, same as Objectives/OKR Performance.
- No governance, no baseline/version, no relationships rename — Slice 4.
- No blocked-dependencies count in the summary (see Data model gap below) —
  would require fetching `strata_dependencies` unscoped to this slice.

## Data model (confirmed via investigation, no migration needed for the core feature)
- `strata_project_cards.theme_id` FK → `strata_strategy_elements.id`
  (migration `20260706190000_strata_execution_reconciliation_schema.sql:23`).
- Delivery health is **server-calculated only** —
  `strata_calc_execution_progress` RPC writes `calculated_health`
  (`on_track|minor_delay|major_delay|on_hold|not_started|not_available`),
  thresholds already match CLAUDE.md exactly (<10%=on_track,
  10–20%=minor_delay, ≥20%=major_delay, on_hold excluded from rollups,
  no milestone data=not_available). **We read `card.calculated_health`
  directly — never recompute it**, per `StrataExecutionPage.tsx:110-116`'s
  own documented rule.
- Fields available for the card list: `name`, `reference_id` (business key,
  e.g. `PRJ-00001`), `lead_business_unit`, `pm_id` (Project Manager),
  `objective_element_id` (optional Strategic Objective link),
  `baseline_end`/`calc_baseline_end`, `forecast_end`/`system_forecast_end`/
  `final_forecast_end`, `actual_progress`, `stage`, `slug` (for click-through
  to the existing Project Card detail route).

### Confirmed schema gaps — reported, not fabricated
- **Cycle-entry classification (New/Continuing/Carry Forward)**: no column,
  enum, or picklist exists anywhere in the schema. **Not buildable this
  slice** — the Linked Project Cards panel omits this dimension entirely
  rather than inventing a value. Flagged as a gap in the panel's own
  description text if the panel would otherwise look incomplete without
  explanation.
- **Re-baseline count / approved baseline version**: no baseline-history
  table or version column exists on `strata_project_cards` (the only
  "rebaseline" hit in the schema is a gate-decision verdict option, an
  unrelated governance concept). Not shown, not fabricated — consistent with
  Slice 1/2's baseline/version gap already logged in `01_OBJECTIVE.md`.

## Correction (Vikram, 2026-07-10, applied before implementation)

**C1 — One resolved Forecast End with a source indicator, not three raw fields.**
Investigated the three forecast columns:
- `forecast_end` — the submitted/manual forecast (project-level, from
  manual entry or Jira/import).
- `system_forecast_end` — milestone-derived, calculated by
  `strata_calc_execution_progress` (earned-schedule projection).
- `final_forecast_end` — **the canonical resolved value**, already computed
  server-side as `GREATEST(system_forecast_end, forecast_end)` when both
  exist, else whichever exists
  (`supabase/migrations/20260706231000_strata_execution_health_forecast_rpcs.sql:93-98`,
  "Rule 8"). This is the resolver — we reuse it, we do not build a second one.

The Theme's Linked Project Cards list shows exactly two date fields:
- **Baseline End** = `card.baseline_end` — the "approved" baseline: the
  project-level column the schema's own migration comment describes as
  "left untouched... stays as whatever a manual entry or Jira/import wrote"
  (`supabase/migrations/20260706230500_strata_execution_health_forecast_schema.sql:6-11`).
  Read-only display — never written by this slice (no mutation touches it at
  all, satisfying "do not overwrite the baseline"). This is **not**
  `calc_baseline_end`, which is an internal input the health engine
  recalculates from milestones for its own variance math and was never
  intended as a business-facing "approved baseline."
- **Forecast End** = `card.final_forecast_end` (the resolver's output),
  with a source indicator derived by comparison — no new calculation:
  ```ts
  // System-calculated if the resolved value equals the system projection;
  // otherwise the submitted/manual value won out in the GREATEST() — manual override.
  function forecastSource(card: StrataProjectCard): 'system' | 'manual' | null {
    if (card.final_forecast_end == null) return null;
    return card.final_forecast_end === card.system_forecast_end ? 'system' : 'manual';
  }
  ```
  Rendered as small caption text next to the date (e.g. "12 Aug 2026 ·
  System" / "12 Aug 2026 · Manual override"), not a separate column.

`system_forecast_end`/`forecast_end` are not rendered as their own columns
anywhere in this slice. `ProjectCardDetailView.tsx` (which already shows
"System Forecast End" and "Final Forecast End" as two separate fields on the
Project Card's own detail page) is untouched — already in the Files
Forbidden list, unaffected by this correction.

## Files to modify
1. `src/modules/strata/components/shared.tsx` — extract `CardRollup` type and
   `computeCardRollup(cards, dependencies)` from `StrataExecutionPage.tsx`
   as canonical exports (same "one definition, two call sites" precedent as
   Slices 1–2). `healthBucketOf`/`isOpenBlocker` come along as internal
   (non-exported) helpers used only by `computeCardRollup`.
2. `src/modules/strata/pages/StrataExecutionPage.tsx` — replace the local
   `computeCardRollup`/`CardRollup`/`healthBucketOf` definitions with the
   shared import; no behavior change (verified by regression screenshot).
3. `src/modules/strata/pages/StrataStrategyElementDetailPage.tsx`:
   - Add a **Linked Project Cards** panel (Theme-equivalent only, gated on
     `isThemeElement`): fetch `useProjectCards()` (existing hook, no new
     hook needed — matches the established client-side-filter pattern
     already used for Objectives/OKRs on this same page), filter by
     `c.theme_id === element.id`. Each row: name/reference_id,
     `lead_business_unit`, PM name (via `useProfileNames()`, already
     fetched), `StrataExecutionHealthLozenge` (existing shared component,
     reused as-is), Baseline End (`baseline_end`, read-only), Forecast End
     (`final_forecast_end` + system/manual source indicator per C1),
     progress %, and — if
     `objective_element_id` is set — the linked Objective name.
     Click-through to `Routes.strata.projectCard(card.slug)` (existing
     route). Empty state: "No Project Cards linked to this Theme yet."
   - Add an **Execution Summary** panel (Theme-equivalent only): call
     `computeCardRollup(themeCards, [])` (empty dependencies array — see
     non-scope) and render Total / On Track / Minor Delay / Major Delay /
     On Hold / Not Started / Not Available counts plus average progress,
     using the existing `StrataStatStrip`/`StrataMetricStat` components
     (already used for Strategy Room's executive band — same visual
     language, no new component invented). Do **not** render
     `blockedDependencies` (we deliberately didn't fetch dependencies this
     slice — showing a fabricated/incomplete "0" would violate the
     zero-assumption rule).

## Files forbidden
- No changes to `supabase/migrations/`.
- No changes to `ProjectCardDetailView.tsx` (its own detail workspace is
  untouched — Slice 3 only adds a summary/list on the Theme side).
- No changes to governance tables/components.

## UI/UX rules
- ADS tokens only, no hex/Tailwind (CLAUDE.md hard stop).
- Reuse `StrataPanel` chrome; Project Cards list follows the same
  button-row pattern already used for Objectives (Slice 2) and Linked KPIs
  (Slice 1/2) on this same page — no new list-row component invented.
- Reuse `StrataExecutionHealthLozenge` verbatim — do not reimplement health
  color/label mapping.

## Data/backend rules
- Zero new RPCs, zero new tables, zero schema changes, zero new mutations.
- `computeCardRollup` reused verbatim from its existing, already-correct
  implementation — not reimplemented.

## Integration/wiring rules
- `StrataExecutionPage.tsx` and the Theme detail page call the identical
  `computeCardRollup` function — verified by code (single definition, two
  call sites), not just visual similarity.

## Screenshot checklist
1. Theme detail page — Linked Project Cards panel showing real rows (name,
   LOB, PM, health lozenge, dates, progress) for a Theme with linked cards.
2. Theme detail page — empty state for a Theme with no linked Project Cards.
3. Click a Project Card row → navigates to that card's own detail page
   (`/strata/execution/:slug`), existing `ProjectCardDetailView` unaffected.
4. Execution Summary panel — counts match a manual tally against the linked
   cards' `calculated_health` values (On Hold excluded from the health
   breakdown, per CLAUDE.md rule).
5. `StrataExecutionPage.tsx` — full execution view unchanged visually and
   functionally after the `computeCardRollup` extraction (regression check:
   rollup numbers identical before/after).

## Validation commands
```
npx tsc --noEmit -p tsconfig.json
npx eslint <changed files>
npm run lint:colors:gate
npm run audit:ads:gate
npm run build
```

## Stop conditions
- If `computeCardRollup`'s extraction reveals hidden coupling to
  `StrataExecutionPage.tsx`-local state → stop, report, do not force it.
- One correction loop max on any blocker; then accept/split/rebuild/stop+revert.

## Drift/rebaseline rules
Any deviation from this file list or non-scope requires a Plan Lock update
logged in `08_DRIFT_LOG.md`, not silent expansion.
