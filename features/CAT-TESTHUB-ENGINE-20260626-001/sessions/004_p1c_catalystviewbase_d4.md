# Session 004 — Phase 1c: CatalystViewBase migration (D4) + trigger blocker (D9)

**Date:** 2026-06-27
**Branch:** main (clean start; 1a–1c part already on origin/main)
**Goal:** Execute 03b — migrate test-case view/edit from CaseDrawer to canonical CatalystViewBase (coexist).

## What shipped
- NEW `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (+ index.ts).
  Cloned TaskCatalystView; data hook `useTestCase`; adapter `testCaseToPseudoIssue` (zero-assumption status/priority); dataSource writes direct to tm_test_cases (no version churn); leftContent = @atlaskit/tabs Details/Steps/Versions; status pill uses injected lifecycle `statusOptions`; all 6 mismatch flags handled.
- EDIT `shared/types.ts` — entityKind union `+ 'test_case'`.
- EDIT `CatalystDetailRouter.tsx` — lazy import + `entityKind==='test_case'` short-circuit (mirrors task branch).
- EDIT `RepositoryPage.tsx` — row-click sets `selectedCaseId` → `<CatalystDetailRouter entityKind="test_case" panelMode>`; CREATE button still CaseDrawer.
- FIX: caseTypes query ordered by `name` (tm_case_types has no `sort_order`) → Type now resolves.

## Blocker found + resolved (D9)
- Live status-write proof returned HTTP 400 `42703 record "old" has no field "objective"`.
- Root cause: BEFORE-UPDATE trigger `auto_create_test_case_version()` referenced nonexistent cols (OLD.objective/OLD.priority/NEW.updated_by). EVERY tm_test_cases UPDATE was failing → entire edit surface (CaseDrawer edit too) silently dead on cyij.
- RED FLAG raised → Vikram chose DROP (app-layer useUpdateTestCase already versions; trigger broken+redundant).
- migration `20260627120000_drop_broken_auto_version_test_case_trigger.sql` applied via MCP apply_migration (cyij). `{success:true}`.

## Validation (all live on cyij)
- `tsc --noEmit` clean; `npm run build` clean.
- TC-0001 row-click → opens in CatalystViewBase shell; Details/Steps/Versions tabs; Priority=Critical, Type=Functional resolve.
- Status edit (UI gesture, data-testid option) → PATCH → `tm_test_cases.status='approved'` (DB confirmed).
- Priority edit → authenticated PATCH 200 → `priority_id`=Low (DB confirmed). (UI-gesture portal click for atlaskit-select-portal can't be driven synthetically; write path identical to proven status path + canonical EditablePriority already proven in TaskCatalystView.)
- After cache clear + reload: UI renders status=Approved, priority=Low (matches DB).

## Notes / follow-ups
- PersistQueryClient caches tm-case; raw out-of-band writes show stale until invalidate — in-app edits call invalidate() so fine.
- Remaining 1c (deferred): BDD/Gherkin toggle, create-new-version from the panel (today via CaseDrawer), case_key 4- vs 3-digit reconcile.
