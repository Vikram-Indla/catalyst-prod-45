# 04 — EXECUTION LOG

Append-only. One entry per slice/action once execution begins. Newest on top.

Format: date · phase/slice · what changed (files) · validation run · result · commit.

| Date | Phase/Slice | Change (files) | Validation | Result | Commit |
|---|---|---|---|---|---|
| — | pre-Phase-0 | none — Plan Lock gate | — | awaiting GO | — |
| 2026-06-26 | P0 · DB-target verify | (probe) | MCP execute_sql fingerprint cases/cycles/defects=25/3/7; `projects list` cyij=linked | cyij confirmed; migrations via MCP not `db push` | — |
| 2026-06-26 | P0 · D5 reconcile | (probe) | ph_issues 791 bugs/11 proj vs ph_work_items 0 bugs | defect source = ph_issues | — |
| 2026-06-26 | P0 · trigger guard | supabase/migrations/20260626100000_drop_broken_sync_jira_bug_to_defect.sql | apply_migration success; trigger/fn absent on cyij | idempotent guard applied | (uncommitted) |
| 2026-06-26 | P0 · wipe+reseed | features/.../seed/phase0_seed.sql (data via execute_sql) | BEFORE 25c/24s/13f/3cy/7d → AFTER_WIPE 0 (kept proj1/prio4/type4) → AFTER_SEED 6f/10c/28s | clean reseed | (data) |
| 2026-06-26 | P0 · defects route | NO CODE CHANGE — `/testhub/defects` already routed at FullAppRoutes.tsx:674 (→ TestHubDefectsPage, canonical JiraTable). Discovery agent's "route missing" was STALE/WRONG. Verified live: resolves, not a dead link (empty until P5 ph_issues repoint) | — | n/a |
| 2026-06-26 | P0 · BUG fix useTestCases | src/hooks/test-management/useTestCases.ts (drop non-existent `level` + `.eq('archived',false)`) | live: case list errored on every surface, now loads | cases render; fixed all useTestCases consumers | (uncommitted) |
| 2026-06-26 | P0 · UI live proof | (browser) | /testhub/repository renders 6 folders + 10 cases (TC-001..010) live from cyij, 0 console errors; /testhub/defects resolves | Phase 0 slice PROVEN; screenshot captured | — |
| 2026-06-26 | P1a · archived col | migration 20260626110000 (add tm_test_cases.archived) applied cyij + file | column added | enables archive + filter | (uncommitted) |
| 2026-06-26 | P1a · useTestCases | restore `.eq('archived',false)` (default) + `.not('is_latest_version','is',false)` de-dup | live: list 10, 0 archived, no dupes | correctness | (uncommitted) |
| 2026-06-26 | P1a · CaseDrawer folder-trap | edit now preserves existingCase.folder_id (was overwriting with sidebar folder) | code (surgical) | data-integrity fix | (uncommitted) |
| 2026-06-26 | P1a · delete confirm | RepositoryPage: trash → ADS danger ModalDialog (was instant hard-delete) | live: Cancel → count stays 10 | guards accidental delete | (uncommitted) |
| 2026-06-26 | P1a · create proof | (browser) created TC-0001 via drawer → row in cyij (draft, latest) | live | write path PROVEN | — |
| 2026-06-26 | P1b · folder counts | RepositoryPage: buildCountedTree rollup + badge; FolderTreeView→useFoldersWithCounts | live: Authentication 6 / Checkout 3 / Reporting 1 | rollup incl subfolders | (uncommitted) |
| 2026-06-26 | P1b · folder delete confirm | RepositoryPage FolderNode: ADS warning ModalDialog w/ impact text | live: Cancel → 6 folders intact | guards folder delete | (uncommitted) |
| 2026-06-26 | P1b · Move folder | DEFERRED (useMoveFolder unwired); drag-reorder deferred | — | later increment | — |
| 2026-06-26 | P1c · native case icon | RepositoryPage key cell: `<WorkItemTypeIcon type="test-case">` (registry svg already present) | live DOM: 11 icons, 14px, loaded; zoom shows green flask glyph | native SVG icon shipped | (uncommitted) |
| 2026-06-26 | P1c · remaining | BDD toggle, CaseDrawer→CatalystViewBase (D4), version-list, case_key format | — | DEFERRED to focused pass | — |
| 2026-06-27 | P1c · D4 CatalystViewBase migration | NEW src/components/catalyst-detail-views/test-case/{CatalystViewTestCase.tsx,index.ts}; EDIT shared/types.ts (entityKind +test_case), CatalystDetailRouter.tsx (branch), RepositoryPage.tsx (row-click→panel, create stays CaseDrawer) | tsc clean; `npm run build` clean; live: TC-0001 opens in CatalystViewBase shell (breadcrumb+sidebar+Details/Steps/Versions tabs), type/priority resolve | D4 DONE (coexist) — CATY-footer collision gone | (this commit) |
| 2026-06-27 | P1c · fix tm_case_types query | CatalystViewTestCase: order by `name` (tm_case_types has no sort_order) | live: Type "—"→"Functional" | type resolves | (this commit) |
| 2026-06-27 | P1c · BLOCKER trigger drop (D9) | migration 20260627120000 drop auto_create_test_case_version trigger+fn (refs nonexistent OLD.objective etc → every UPDATE 400'd) applied cyij via MCP | live: status DRAFT→APPROVED (UI→PATCH→DB); priority Critical→Low (authed PATCH 200→DB); UI re-renders persisted | edit surface UNBLOCKED + proven | 39025d7e1/ae64de28e |
| 2026-06-27 | P2 · Sets crash fix | TestSetsPage: add `import {useNavigate,useParams} from 'react-router-dom'` (page threw ReferenceError on render — whole /testhub/sets dead) | live: page renders "0 sets" empty state, no crash | surface restored | (this commit) |
| 2026-06-27 | P2 · BLOCKER FK (D10) | migration 20260627130000 repoint tm_test_sets.project_id FK projects→tm_projects | authed POST create: was 409 (23503 FK), now 201 set_key=SET-001 | Set create unblocked | (this commit) |
| 2026-06-27 | P2 · BLOCKER RLS (D11) | migration 20260627140000 add 4 tm_set_cases policies via tm_test_sets | authed POST membership: was 403 (42501), now 201 ×3; authed GET 3 rows | membership unblocked | (this commit) |
| 2026-06-27 | P2 · SetDetailPage columns | fix tm_set_cases col names (set_id→test_set_id, order_index→sort_order) in members query + add insert + SetCase type | live: detail was "Cases (0)" → now "Cases (3)" TC-0001/001/002 | membership read fixed | (this commit) |
| 2026-06-27 | P2 · live count | TestSetsPage list derives member count from tm_set_cases (batch) instead of stale denormalized test_count | live: list shows SET-001 … Static … 3 | no stale-count lie | (this commit) |
| 2026-06-27 | P2 · slice PROVEN | create SET-001 + 3 members persist in tm_test_sets/tm_set_cases; detail + list render live; tsc clean | DB: case_count=3 (TC-0001,TC-001,TC-002) | Phase 2 membership slice DONE | 50afb3c27 |
| 2026-06-27 | P3 · cycle create | authed POST tm_test_cycles → 201 CYC-001 "Regression Cycle Q3" (cycle_key app-gen via tm_next_entity_key RPC; status enum lowercase 'planned'; project_id→tm_projects ✓) | live | cycle CRUD write proven | (this commit) |
| 2026-06-27 | P3 · BLOCKER counters (D12) | migration 20260627150000 drop 3 increment triggers (tm_cycle_scope_insert/update/delete) keep recompute, backfill | add 3 scope→total was 4 (real 3); after fix: insert→4=4, delete→3=3; CYC-001 backfilled 4→3 | counter drift FIXED + proven | (this commit) |
| 2026-06-27 | P3 · scope persists | authed POST 3 cases→tm_cycle_scope (201); list shows CYC-001 Cases=3, 0% | DB: actual_scope=3, total_cases=3 | Phase 3 (3a) cycle+scope+counts DONE | (this commit) |
| 2026-06-27 | P3 · FLAG enum case | app filters status on UPPERCASE 'PLANNED'/'IN_PROGRESS' but enum is lowercase → SetDetailPage "Add to cycle" matches 0 (check CyclesPage) | FIXED SetDetailPage:427 → lowercase (uppercase 0 → lowercase 1 match) | 997a67c44 |
| 2026-06-27 | P4a · ExecutionPage columns | handleSave: tm_test_runs cycle_id/scope_id/case_id → cycle_scope_id; tm_step_results run_id/step_id → test_run_id/test_step_id (followed stale doc) | authed POST run+3 steps → 201; tsc + build clean | execution write path fixed | (this commit) |
| 2026-06-27 | P4a · BLOCKER audit triggers (D13) | migration 160000 fix tm_log_cycle_scope_status_change + tm_log_cycle_assignment_change (test_cases.test_key→tm_test_cases.case_key; status→current_status); migration 170000 repoint audit test_case_id FK test_cases→tm_test_cases | scope UPDATE was 400(test_key)→409(FK)→200 | scope rollup UNBLOCKED | (this commit) |
| 2026-06-27 | P4a · slice PROVEN | full chain: run(failed)←steps[pass,pass,fail]; scope.current_status=failed; cycle failed_count=1,not_run=2; audit row status_changed→failed TC-001 | DB-verified end-to-end | Phase 4a execution+percolation+counters DONE | (this commit) |
| 2026-06-27 | P4a · NOTE | percolate trigger is AFTER UPDATE OF status only (not INSERT); app compensates via manual run+scope status sets in handleSave | not a blocker | 08 flag | — |
| 2026-06-27 | P4b · partial | timer DONE (duration_seconds wired+proven); defect-from-exec works (auto-trigger); evidence-attach NOT built | — | timer done; evidence deferred | — |
| 2026-06-27 | P5 · D1 conflict → D14 | DefectsPage reads tm_defects (not ph_issues per D1); DEMO has 0 ph_issues; engine works on tm_defects | live: /testhub/defects shows DEF-00001 Open, 1 of 1, no crash | D14 revises D1: keep tm_defects | — |
| 2026-06-27 | P5 · defect status enum fix | defectsDataSource DEFECT_STATUSES → real tm_defect_status enum (open/in_progress/resolved/closed/reopened) + lowercase lookups (was UPPERCASE + invalid FIXED/VERIFIED/WONT_FIX/DUPLICATE) | tsc clean; authed PATCH DEF-00001 open→in_progress 200 | status update unblocked | (this commit) |
| 2026-06-27 | P5 · slice PROVEN | raise-from-exec → DEF-00001 (tm_defects, auto_created, source_test_run_id=run) → appears in canonical Defects JiraTable → status update persists | DB + live verified | Phase 5 Defects (tm_defects model) DONE | (this commit) |
