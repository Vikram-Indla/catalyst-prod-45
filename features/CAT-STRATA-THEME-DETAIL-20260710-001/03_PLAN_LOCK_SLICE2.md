# Plan Lock — Slice 2: Objectives list + OKR performance
CAT-STRATA-THEME-DETAIL-20260710-001

## Objective
Add a real Objectives list (currently just a bare "Children: 2" count) and a
read-only OKR performance rollup to the Theme detail page, reusing the
existing OKR/key-result data and rendering pattern already built for
`StrataKpiLibraryPage.tsx` rather than reinventing it.

## Non-scope (this slice)
- No new OKR creation from the Theme detail page (OKR authoring already
  exists in KPI Library; Theme detail stays read-only for OKRs this slice).
- No Project Cards, no execution summary, no governance, no baseline/version,
  no "Map edges" rename — Slices 3–4.
- No new RPCs, no new tables. `createElement` (for Add Objective) is the only
  mutation touched, and it already exists.

## Data model (confirmed, no migration needed)
- Objectives = `strata_strategy_elements` rows with `element_type='objective'`
  and `parent_id` = the Theme's id — already fetched by
  `useStrategyElements(element.cycle_id)` on the detail page; just needs to
  be rendered as a list instead of a count.
- OKRs = `strata_okrs`, FK `objective_element_id` → objective element id.
  Fetched via `useOkrs()` (`hooks/useStrata.tsx:297`), currently unused on
  this page.
- Key results = `strata_key_results`, FK `okr_id` → OKR id, columns
  `baseline`/`target`/`current_value`/`unit`/`status`. Fetched via
  `kpiApi.keyResults(okrId)`, lazy per-OKR (existing pattern).
- Performance is computed client-side via `krProgressFraction` (existing pure
  function in `StrataKpiLibraryPage.tsx:188-194`) — no fabrication, matches
  the "OKR/measure name, owner, baseline, target, actual, trend, status"
  functional-contract intent using real stored values only.

## Corrections (Vikram, 2026-07-10, applied before implementation)

**C1 — No separate "KPI Links" card.** The existing Theme-level KPI Links
panel (direct `strata_element_kpis` links on the Theme element itself) must
not remain a standalone card alongside the new OKR Performance panel. Absorb
it: one panel titled **"OKR Performance"** containing two sub-sections —
"Objective Key Results" (the new OKR/key-result accordion) and "Linked KPIs"
(the existing direct-Theme-link list, unchanged data/behavior, just
re-homed and re-labeled under the unified panel). No card titled "KPI links"
remains on the page.

**C2 — Theme-equivalent check, not a bare `=== 'theme'`.** Investigated: no
canonical "is this a Theme" helper currently exists anywhere in the frontend
— every check in the codebase (including Slice 1's own additions) is a bare
`element.element_type === 'theme'`. The DB `CHECK` constraint
(`strata_strategy_elements_type_check`, migration
`20260706230000_strata_theme_play_2tier_hierarchy.sql:46`) now only permits
`'theme'`/`'objective'` going forward, and staging has zero `'play'` rows
today — but pre-migration data or other environments may still hold legacy
`'play'` rows (the column comment still documents it as a legal legacy
taxonomy value). Creating `isThemeElement()` now as the canonical helper:

```ts
// src/modules/strata/types.ts
/** Legacy 'play' rows were consolidated into 'theme' (CAT-STRATA-HIERARCHY-20260706-001)
 *  and the DB CHECK constraint blocks new 'play' rows, but pre-migration data or other
 *  environments may still hold them. Treat both as Theme-equivalent everywhere Theme-only
 *  UI is gated — never gate on a bare `element_type === 'theme'` check. */
export const THEME_EQUIVALENT_TYPES = ['theme', 'play'] as const;
export function isThemeElement(elementType: string): boolean {
  return (THEME_EQUIVALENT_TYPES as readonly string[]).includes(elementType);
}
```

Applied to every `element_type === 'theme'` gate touched within
`StrataStrategyElementDetailPage.tsx` this slice: the Charter panel (Slice 1),
the Charter header button (Slice 1), the new Objectives panel, and the new
OKR Performance panel. Does **not** retroactively touch the ~15 other
`=== 'theme'` call sites elsewhere in the module (Strategy Room, Strategy
Map, Execution, etc.) — out of surgical scope for this slice; each of those
is a separate call site that would need its own review before switching.
Does not allow creating new `'play'` rows anywhere (`NewElementModal`'s type
options stay `['theme','objective']`, unchanged).

## Files to modify
0. `src/modules/strata/types.ts` — add `THEME_EQUIVALENT_TYPES` /
   `isThemeElement()` (see C2 above).
1. `src/modules/strata/components/shared.tsx` — extract `OkrRow`,
   `KeyResultsList`, `krProgressFraction`, `OKR_STATUS_LOZENGE` from
   `StrataKpiLibraryPage.tsx` as exported, reusable pieces (same "one
   definition, two call sites" precedent as Slice 1's modal extraction).
2. `src/modules/strata/pages/StrataKpiLibraryPage.tsx` — replace its local
   definitions with imports from `shared.tsx`; no behavior change.
3. `src/modules/strata/components/authoring.tsx` — extract `NewElementModal`
   from `StrataStrategyRoomPage.tsx` as an exported component; add optional
   `lockElementType`/`lockParentId` props so it can be opened from the Theme
   detail page pre-scoped to "Objective, parented to this Theme" with those
   two fields hidden (Strategy Room's own "New element" call site passes
   neither prop — unchanged behavior there).
4. `src/modules/strata/pages/StrataStrategyRoomPage.tsx` — replace inline
   `NewElementModal` definition with the shared import.
5. `src/modules/strata/pages/StrataStrategyElementDetailPage.tsx`:
   - Replace the "Children: N" summary line with a real **Objectives** panel:
     rows show name, owner, status Lozenge, OKR count (derived by filtering
     `useOkrs()` on `objective_element_id`), click-through to
     `Routes.strata.strategyElement(objective.slug)`. Empty state with "Add
     Objective" button when `canAuthor` (reuses `EditElementModal`'s
     `canAuthor` gate already added in Slice 1).
     - Only rendered when `isThemeElement(element.element_type)` (C2) —
       Objectives don't have child Objectives in the 2-tier hierarchy.
   - Replace the standalone "KPI links" panel with a single **OKR
     Performance** panel (C1), containing:
     - "Objective Key Results" sub-section: all OKRs whose
       `objective_element_id` is one of this Theme's objectives, rendered
       with the shared `OkrRow`/`KeyResultsList` accordion (read-only — no
       `onAddKeyResult`, no "New OKR" action this slice).
     - "Linked KPIs" sub-section: the existing direct-Theme `linkedKpis`
       list, unchanged data/behavior, re-homed under this panel.
     - Empty state only when both sub-sections are empty.
   - Charter panel and header Charter button gate on
     `isThemeElement(element.element_type)` instead of the bare
     `=== 'theme'` (C2).
   - Wire "Add Objective" header/panel action to the shared
     `NewElementModal` with `lockElementType="objective"`
     `lockParentId={element.id}`.

## Files forbidden
- No changes to `supabase/migrations/`.
- No changes to `StrataExecutionPage.tsx`, `ProjectCardDetailView.tsx`,
  governance tables/components.

## UI/UX rules
- ADS tokens only, no hex/Tailwind (CLAUDE.md hard stop).
- Reuse `StrataPanel` chrome; Objectives list follows the same button-row
  pattern already used for "KPI links" on this same page (per research:
  no shared list-row component exists in the module — hand-rolled per page
  is the established convention, confirmed via prior investigation).
- OKR performance panel is read-only display only this slice.

## Data/backend rules
- Zero new RPCs, zero new tables, zero schema changes.
- Add Objective goes through the same `strategyApi.createElement` mutation
  Strategy Room's "New element" button already uses — not reimplemented.

## Integration/wiring rules
- `NewElementModal` becomes the single canonical create-element surface,
  shared by Strategy Room header action and Theme detail's Add Objective
  action — same precedent as Slice 1.
- On successful create, detail page must refetch (`useInvalidateStrata`)
  so the new Objective appears immediately without manual refresh.

## Screenshot checklist
1. Theme detail page — Objectives panel replaces the bare "Children: 2" line,
   showing real rows with owner/status/OKR count.
2. Click an Objective row → navigates to that Objective's own detail page.
3. Click "Add Objective" (empty state or panel action) → modal opens with
   Type locked to Objective, Parent locked to this Theme (fields hidden).
4. Create a ZZTEST objective → appears in the Objectives panel immediately.
5. OKR Performance panel — no separate "KPI links" card remains; the
   Objective Key Results sub-section shows OKRs belonging to this Theme's
   objectives with confidence/status (expand one → key results table with
   progress bars); the Linked KPIs sub-section shows the same data the old
   KPI links card showed.
6. KPI Library page (`StrataKpiLibraryPage.tsx`) — OKR panel unchanged
   visually and functionally after the extraction (regression check).
7. An Objective's own detail page (not a Theme, no legacy `play`) — Charter
   panel, Add Objective action, and OKR Performance panel correctly absent
   (2-tier hierarchy has no grandchildren).

## Validation commands
```
npx tsc --noEmit -p tsconfig.json
npx eslint <changed files>
npm run lint:colors:gate
npm run audit:ads:gate
npm run build
```

## Stop conditions
- If `NewElementModal`'s local state (elementType/name/parentId/perspectiveId)
  doesn't cleanly generalize to locked-field mode without prop-drilling
  hacks → stop, report, do not force it.
- One correction loop max on any blocker; then accept/split/rebuild/stop+revert.

## Drift/rebaseline rules
Any deviation from this file list or non-scope requires a Plan Lock update
logged in `08_DRIFT_LOG.md`, not silent expansion.
