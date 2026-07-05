# CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001 — Plan Lock

> Status: DRAFT — awaiting Vikram review. No code until this flips to APPROVED.
> Visual pitch: https://claude.ai/code/artifact/adaf02f4-98fb-4ba2-8e75-3c875ef27094

## Feature Work ID
CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001

## Feature name
testhub-repository-redesign

## Timebox
Per slice ≤2h. Six slices total, each independently shippable + screenshot-gated.

## Objective
Rebuild the Test Repository and surrounding surfaces around the correct mental model — a
test case is a reusable **specification** (Author), grouped (Organize), executed many times
(Execute) — not a Jira-issue clone; fix non-collapsing rails, kill hand-rolled UI, make
quick-create and cycle/set linking first-class.

## Business outcome
Faster test authoring (type→Enter→steps vs 12-field modal), execution state visible inline
(coverage + last-run columns), and the two missing structural surfaces (Test Plans UI,
configurable status workflow) filled — all canonical/ADS, zero regression.

## Exact slice
This Plan Lock covers all six slices at plan level. Implementation starts at the slice
Vikram names (default S1 Rails). Each slice re-confirms its exact file list before edits.

## Non-scope
- Execution/run data model (`tm_test_runs`, `tm_step_results`) — reskin only, no schema change.
- Astryx zone, global nav.
- Prod DB writes (staging cyij only; prod lmqw only on explicit instruction).
- Caty "generate cases from story" — deferred (wiring exists, not this feature).

## Canonical components
- `JiraTable` — `src/components/shared/JiraTable/` (grid, cycle scope, set members, plan tree, traceability)
- `ResizablePanel` — `src/components/ui/resizable.tsx` (both rails: collapse + resize)
- `StatusLozenge` / `@atlaskit/lozenge` — `shared/StatusLozenge` (status/coverage/last-run pills)
- `CatalystAvatar` / `UserAvatar` — `shared/CatalystAvatar` (owner/assignee — Grid G)
- `ProfilePicker` — `@/components/ads` (people pickers — Grid G3)
- `DrawerPanel` — `shared/DrawerPanel` (add-to-cycle/set sheet)
- `CreateStoryModal` — `workhub/create-story/` (deep-create fallback)
- `BulkFooterBar` — `JiraTable/BulkFooterBar.tsx`
- `@atlaskit/menu` · `DropdownMenu` · `@radix-ui/collapsible` (folder nodes/menus)

## Canonical screens
- Repository L1 list → `CatalystListPageLayout` + `ProjectPageHeader hubType="testhub"` (Grid E1/E4)
- Case detail L2 → `AtlaskitPageShell flush` + `ProjectPageHeader trail+title` (Grid E2)
- Cycles/Sets/Plans list → mirror `FiltersListPage` L1 pattern
- Reference detail shell → `CatalystViewBase` (parameterise, never fork — L1/L10)

## Files to modify
- S1 Rails — `src/pages/testhub/repository/RepositoryPage.tsx` (rail composition); `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` (right-rail collapse toggle)
- S2 Columns — `RepositoryPage.tsx` (column defs, bulk bar, group-by); new coverage/last-run selector in `src/hooks/test-management/`
- S3 Quick create — `RepositoryPage.tsx` (inline row + command sheet); reuse `useCreateTestCase`
- S4 Detail reframe — `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (tab order, drop no-op fields, context rail, Runs tab)
- S5 Linking — new `DrawerPanel`-based sheet; reuse `useAddCasesToScope` / `tm_set_cases` insert
- S6 Admin+Plans — new workflow editor `src/pages/admin/test/`; new Test Plans surface `src/pages/testhub/plans/` + staging migration

## Files forbidden
- No new `Br*`/`Pr*`/`Prod*` fork components — parameterise canonical (anti-shipping-fast L1/L10)
- No schema edits to `tm_test_runs`/`tm_step_results`
- No direct `@atlaskit/avatar` import (Grid G1); no bare colours; no `git add -A`

## UI/UX rules
- ADS tokens only, no bare hex/rgb/Tailwind colour utils; run colour gate before every styled commit.
- No hand-rolled table/menu/pill/avatar — canonical or ADS primitive.
- Drop no-op Sprint/Reporter/Due-date from case detail (zero-assumption; they had no backing column — H2 P0).
- Grid E breadcrumbs only (replace hand-rolled `.crumb`, E5 violation). Grid H row typography via `makeKeyCell`.
- Rails collapse via ResizablePanel + toggle; width persists per user.
- design-critique ≥22/30, zero P0, closed with live SVG-arrow annotated screenshots on localhost:8080.

## Data/backend rules
- Staging cyij only. Assert `supabase/.temp/project-ref` before any linked DDL.
- Test Plans table (Grid F): `slug TEXT NOT NULL UNIQUE` + `catalyst_slugify` trigger + `Routes.*` builder + `useTestPlanBySlug` dual-mode hook. No UUID route params.
- Migration ledger 1:1 with committed files.

## Integration/wiring rules
- CRE chokepoints (binding): quick-create + defect-from-failed-step → `filterCreatableTypes(types, 'TESTHUB')` (A11/A12/D4); requirement-link → `canLinkTo` (C9). `npm run lint:cre` must pass.
- Reuse existing hooks: `useCreateTestCase`, `useAddCasesToScope`, `useTestCases`, `useFolders`, run model in `ExecutionPage`.

## Parallel discovery agents
4 discovery agents run (surface map, canonical table, rail diagnosis, admin/cycles/sets) —
outputs in `12_AGENT_OUTPUTS.md`. They cover Canonical Component, Canonical Screen,
Integration, and Data/Safety roles. UI/UX Critic role satisfied by design-critique baseline
(11/30). Implementation Planner + QA/Screenshot roles run per-slice at execution time.

## Karpathy loop hypotheses
- [LOOP-001] Rails don't collapse because width is hardcoded (240px) with no toggle — CONFIRMED (`RepositoryPage.tsx:806-811`; right rail resizable, no collapse button). Fix: ResizablePanel + toggle.
- [LOOP-002] Detail is an issue-view clone with 3 no-op fields — CONFIRMED (Sprint/Reporter/Due-date are no-op callbacks, no backing column). Fix: reframe rail to spec context.
- [LOOP-003] Linking absent from repository — CONFIRMED (only from cycle/set side via modal). Fix: DrawerPanel sheet, 3 entry points.
- [LOOP-004] Test Plans has zero UI + status workflow hardcoded — CONFIRMED. Fix: new surfaces in S6.

## Screenshot checklist
- [ ] S1 rails collapsed + expanded (left & right), width-persist across reload
- [ ] S2 grid with Coverage + Last-run columns, bulk bar on 2-row select
- [ ] S3 inline-create row + quick-create command sheet
- [ ] S4 case detail: Steps-first, no-op fields gone, context rail + Runs tab
- [ ] S5 add-to-cycle sheet from bulk bar, row menu, and detail rail
- [ ] S6 workflow editor + Test Plans list/create/detail
- [ ] Each: design-critique live SVG-arrow annotated (red→green) screenshots

## Validation commands
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
npm run lint:cre
```

## Regression risks
- `CatalystViewBase` is shared by all detail views — S4 must run `hermes-regression-sweep` on 3 adjacent surfaces before landing. RED FLAG before editing.
- Column additions on JiraTable must not break persisted column-visibility state on the repository.

## Stop conditions
- Any banned color introduced → stop
- Any hand-rolled UI introduced → stop
- TypeScript / colour / ADS / CRE gate fails → stop
- Slice needs a prod write, or Test Plans migration touches shared tables → stop and ask (data-audit SQL first)

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert. No endless patching.

## Commit rules
Stage explicit files only. Commit message must reference CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001.

## Plan Lock status
DRAFT — awaiting Vikram approval. Reply APPROVED (optionally naming the starting slice; default S1 Rails) to begin. Nothing coded until then.
