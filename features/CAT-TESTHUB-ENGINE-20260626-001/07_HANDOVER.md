# 07 — HANDOVER (living context-health doc — update every slice & before any handoff)

> A cold session must be able to resume from THIS FILE ALONE (+ the read-order in 00). Keep it current.

## CURRENT STATE
- **Phase:** Phase 1 (Repository proper) — **1a/1b/1c COMPLETE & PROVEN LIVE**, incl. D4. Awaiting sign-off.
- **1a done:** archived column+filter, is_latest de-dup, edit folder-trap fix, delete-confirm dialog, create write-path proven (TC-0001). D8 archive decision applied.
- **1b done:** folder rollup count badges (incl subfolders) + folder delete-confirm dialog (proven live, Cancel keeps 6 folders). Move/drag-reorder DEFERRED.
- **1c done (D4 — 2026-06-27):** native case icon (earlier) + **CaseDrawer→CatalystViewBase migration COMPLETE & PROVEN.** New `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (+index). Row-click opens case in canonical CatalystViewBase shell (breadcrumb, sidebar status pill, Details/Steps/Versions tabs); CREATE still via CaseDrawer (coexist). entityKind='test_case' wired in shared/types.ts + CatalystDetailRouter.tsx; RepositoryPage row-click → CatalystDetailRouter. Status + priority inline edits PERSIST to tm_test_cases (proven: DRAFT→APPROVED + Critical→Low live on cyij). CATY footer-collision gone (footer no longer rendered).
- **D9 (2026-06-27):** dropped broken `auto_create_test_case_version` trigger (migration 20260627120000) — it referenced nonexistent OLD.objective/OLD.priority/NEW.updated_by → EVERY tm_test_cases UPDATE 400'd. Edit surface was silently dead before this; now unblocked. App-layer useUpdateTestCase already owns versioning.
- **1c REMAINING (deferred, small):** Classic/BDD toggle, version-list is read-only display (works; create-version still via CaseDrawer), case_key format (TC-0001 vs TC-001). + deferred folder Move/drag.
- **Phase 2 (Sets) — DONE & PROVEN (2026-06-27):** Sets surface pre-existed but was dead. Fixed: TestSetsPage missing react-router-dom import (page crashed); D10 repoint tm_test_sets FK projects→tm_projects (Set create FK-failed); D11 add tm_set_cases RLS policies (membership 403); SetDetailPage wrong tm_set_cases columns (set_id/order_index → test_set_id/sort_order); list shows live member count (not stale test_count). Proven live: SET-001 "Smoke Suite v1" + 3 members (TC-0001/001/002) persist; detail "Cases (3)"; list count 3. tsc clean.
  - **Phase 2 OPEN FLAG (raise before sign-off):** "version-pinned" membership NOT schema-supported (tm_set_cases has no version col). tm_cycle_sets table missing (Phase 3). 5 other tm_* FK outliers → projects (later).
- **Phase 3a (Cycles: CRUD + scope) — DONE & PROVEN (2026-06-27):** CyclesPage/CycleDetailPage/ExecutionPage pre-existed + render fine. Proven live: CYC-001 "Regression Cycle Q3" created (cycle_key app-gen, status enum lowercase, project_id→tm_projects ✓); 3 cases persist in tm_cycle_scope; counters correct after D12. **D12:** dropped 3 redundant increment counter triggers on tm_cycle_scope (were double-counting with the recompute triggers → total 4 vs real 3); kept recompute (sync_cycle_scope_counters + cycle_scope_stats); backfilled. Proven: insert→4, delete→3.
  - **Phase 3 OPEN FLAGS:** (1) app status filters use UPPERCASE 'PLANNED'/'IN_PROGRESS' but enum is lowercase → "Add to cycle" matches 0 cycles (SetDetailPage:427; check CyclesPage) — NOT fixed. (2) sets-to-cycle: tm_cycle_sets table missing on cyij. (3) Phase 3b (assignees day-bucket plan) not started — tm_cycle_scope.assigned_to exists, untested.
- **Phase 4a (Execution: run + step results + percolation + counters) — DONE & PROVEN (2026-06-27):** ExecutionPage handleSave had wrong columns (tm_test_runs: cycle_id/scope_id/case_id → real cycle_scope_id; tm_step_results: run_id/step_id → real test_run_id/test_step_id) — fixed. **D13:** 2 tm_cycle_scope audit triggers read dead test_cases.test_key (+ status_change used OLD/NEW.status vs current_status) → every scope UPDATE 400'd; the audit table's own test_case_id FK also pointed at dead test_cases. Fixed both fns (mig 160000) + repointed FK (mig 170000). Full chain PROVEN: steps[pass,pass,fail]→run 'failed'→scope 'failed'→cycle failed_count=1→audit row. tsc+build clean.
  - **Phase 4a NOTE:** percolate trigger is AFTER UPDATE OF status only (not INSERT); app compensates with manual status sets — fine. **Remaining Phase 4:** 4b (evidence attach, effort timer, defect-from-exec), 4c (cycle rollups/multi-run "Add Run" — run_number hardcoded 1).
- **Active slice:** none (sign-off gate; Phases 1, 2, 3a, 4a done).
- **Execution authorization:** Phases 1/2/3a/4a + enum-fix done this session. Next: Phase 4b/4c, Phase 3b (assignees), or Phase 5 (Defects), on sign-off.
- **Branch:** main. **DB:** staging cyij. Migrations via MCP: 120000 (D9), 130000 (D10), 140000 (D11), 150000 (D12), 160000+170000 (D13).
- **Context health:** GREEN (long session — consider fresh session for next phase).

## WHAT'S DONE IN P0
- Verified MCP/CLI both target cyij; migrations go via **MCP apply_migration** (config.toml=prod, so NEVER `supabase db push`).
- D5 resolved → defect source = `ph_issues` (791 bug rows/11 projects). ph_work_items has 0 bugs.
- Applied idempotent guard migration `20260626100000_drop_broken_sync_jira_bug_to_defect.sql` (trigger was absent on cyij anyway).
- Wiped tm_* content (25c/24s/13f/3cy/7d → 0), kept project DEMO + 4 priorities + 4 types.
- Reseeded: 6 folders (nested), 10 cases, 28 steps. Seed file: features/.../seed/phase0_seed.sql.
- Verified `tm_user_has_access` permissive → seed visible to any authed user.
- Wired `/testhub/defects` route → canonical `src/pages/testhub/DefectsPage.tsx` (kills dead sidebar link).

## EXACT NEXT ACTION
1. User signs in at localhost:8080 (Claude cannot enter credentials).
2. Screenshot `/testhub/repository` (folders+10 cases live) and `/testhub/defects` (route resolves) → store in 10_SCREENSHOT_CHECKLIST.
3. Get Vikram P0 sign-off → start **Phase 1** (Repository: folder tree CRUD, case CRUD via CatalystViewBase, steps, versions, native case icon).

## OPEN RISKS / DEFERRED
- Run-table name fragmentation → consolidate in Phase 4.
- `/testhub/defects/:id` detail + repoint defects adapter ph_issues → Phase 5.
- Stub hooks in `src/hooks/test-management/index.ts` may shadow real ones — verify imports in Phase 1.
- COMMITTED `519e39a18` (pushed origin/main): useTestCases fix + drop-trigger migration + artifacts + seed. FullAppRoutes NOT touched (defects route pre-existed at :674).

## KEY PINS
- Acceptance PDFs: `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests`
- Seed project: tm_projects DEMO id `00000000-0000-0000-0000-000000000001`; prio ids `…0001-000X`; type ids `…0002-000X`.
- Resumable discovery agents: codebase `aa4233cf5c4633134` · DB `af2f3416e3d3a2686` · acceptance `a4bef8bef2ea10b36` · components `ae0cd7a0b3fe593df`
- Seed-wipe DO-block + delete order: 02 §B / seed file.

## CONTEXT-HEALTH LOG (newest on top)
- 2026-06-26 — P0 COMMITTED 519e39a18 + pushed. GREEN. Next: await Phase 1 GO.
- 2026-06-26 — P0 executed (migration+wipe+reseed+route). GREEN. Next: user sign-in → screenshot → P0 sign-off → Phase 1.
- 2026-06-26 — Discovery + Plan Lock. GREEN.
