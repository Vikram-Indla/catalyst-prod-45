# 00 — Context Ledger (Catalyst Filters Refactor)

> Live state tracker. Update at end of every phase / implementation batch.

## Current gate
**Gates 1–6 COMPLETE (planning).** Awaiting `proceed` for IMPLEMENTATION (Phase A onward). No production code / schema touched yet.
- Gate 1 discovery → `01-REPO-DISCOVERY.md`
- Gate 2 widget → `filters-end-to-end-design-widget.html` + `02-DESIGN-WIDGET-SPEC.md` (focused scope — NEW/CHANGED only)
- Gate 3 audit → `03-GAP-AUDIT.md` (12 gaps: 1 P0, 7 P1, 4 P2)
- Gate 4 plan → `04-IMPLEMENTATION-PLAN.md` (Phases A–K)
- Gate 5 backend → `05-BACKEND-WIRING-PLAN.md` (1 RLS migration: editor-write fn + 4 indexes)
- Gate 6 tests → `06-TEST-PLAN.md`

### Refinements found during Gate 2 (vs Gate 1)
- `FilterDetailPage` is feature-complete (436 LOC), NOT a shell. G1 = route fix + add governance sub-sections (G10), not a build.
- WhatsApp edge fn has NO deterministic fallback → new gap **G9**.
- Helper fns confirmed clean (`p_*` params, SECURITY DEFINER, no shadowing). `user_can_see_filter` looser than SELECT policy → **G12** (ASK, likely intentional).

## Branch / safety
- Branch: `main` (default per 2026-06-03 branch policy; no name given).
- Pre-existing STALE working-tree changes (NOT ours, do not touch): `src/components/layout/ProjectPageHeader.tsx`, `src/components/layout/__tests__/ProjectPageHeader.homeCrumb.test.ts`, `src/pages/releasehub/ChangeDetailPage.tsx`, `src/pages/releasehub/CommandCenterPage.tsx`, `src/pages/releasehub/ReleaseDetailPage.tsx`.
- This run wrote ONLY new files under `docs/implementation/filters/`. Zero production code, zero schema changes.

## Confirmed ground truth (authoritative, pg catalog + repo probe)
- Canonical table: **`ph_saved_filters`** (27 cols, 10 live rows). Legacy `saved_filters` = 0 rows, dead (only `SearchPage.tsx`).
- Canonical hook: **`src/hooks/workhub/useSavedFilters.ts`** (18 importers; primary export `useFiltersForProject`).
- Canonical pages: **`src/pages/project-hub/filters/{FiltersListPage,FilterDetailPage,FilterPreviewPage}.tsx`** — parameterized by `hubType`/`mode`, reused by product/incident/tasks via thin wrappers. **Already adopts canonical-component pattern across hubs.**
- Versions: `ph_filter_versions` (11 rows, immutable, indexed). Derived: `filter_derived_views` (2 rows, used via `useFilterDerivedViews`).
- Board link: `boards.filter_id` (FK → ph_saved_filters.id), partial index present.

## Open defects / gaps (carried to Gate 3 audit)
- G1 Directory row click opens BUILDER (`/filters/create?filterId=`), not read-only DETAIL. `FilterDetailPage` route orphaned.
- G2 Three divergent `filterState→JQL` serializers (`basicToJql`, `lib/filterStateToJql`, `AllWorkToolbar.filterStateToJql`) + reverse parser `jqlToFilterState` FORKED into 3 copies (1 lib + 2 local dupes in FilterPreviewPage:280, ProductFilterPreviewPage:305).
- G3 `useLinkedEntities` is a STUB returning `[]` (FilterPreviewPage:600, ProductFilterPreviewPage:286).
- G4 RLS UPDATE policy = `user_id OR owner_id` only — does NOT honor `editors_config`. "Specific editors" unenforced at DB.
- G5 Missing indexes: `owner_id`, `product_key`, GIN on `starred_by_user_ids`, GIN on `viewers_config`.
- G6 Legacy `saved_filters` kept alive only by `SearchPage.tsx` (separate concern from Filters module).
- G7 Derived views (kanban/roadmap/dashboard) + WhatsApp summary gated FALSE, project-hub only — not yet canonical across hubs.
- G8 `task_saved_filters` hook (`src/modules/tasks/hooks/useSavedFilters.ts`) is stub bodies, unused. Tasks filters actually run on `ph_saved_filters` via `useFiltersForProject`.

## Migrations created this session (Phase B — APPLIED to prod `lmqwtldpfacrrlvdnmld`)
- `20260619000000_ph_saved_filters_editor_write_rls.sql` — `ph_saved_filter_can_edit()` helper + UPDATE policy honors editors (G4) + 4 indexes (G5). APPLIED ✅
- `20260619000100_ph_saved_filters_editor_select_rls.sql` — SELECT policy adds editor branch so editors can load what they can edit (G4 completion). APPLIED ✅
- **RLS verified** via 2-user isolation (RED→GREEN): editor edits+reads, can't delete; stranger fully blocked; owner unchanged. Indexes 4/4 confirmed. Advisors: no new class (can_edit shares the existing helper WARN category).
- **Phase B status: COMPLETE + verified.** G4 (P0) closed. G5 closed.

## Feature flags touched
- (none)

## Test status
- (not yet assessed — Gate 6)

## Unverified assumptions / to-confirm before implementation
- Exact behavior of helper fns `user_can_see_filter`, `ph_saved_filter_is_project_member`, `ph_saved_filter_is_product_member` (bodies not yet read).
- Whether `FilterDetailPage` is feature-complete or itself a thin shell (frontend agent: 436 LOC — needs read at Gate 2).
- `generate-whatsapp-summary` edge fn — deterministic fallback present? (not yet read).
- `jira-filter-sync` edge fn scope.
