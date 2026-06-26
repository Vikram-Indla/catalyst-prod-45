# 03 — PLAN LOCK (DRAFT — awaiting Vikram approval)

**Feature Work ID:** CAT-TESTHUB-ENGINE-20260626-001
**Status:** DRAFT. No code until approved.

## Objective
Complete + prove the native Catalyst Test Management engine to AioTests product-doc parity, with real `tm_*` DB wiring validated through the UI. Reports & Dashboard excluded.

## Non-scope
Reports (`/testhub/reports/*`), Dashboard (`/testhub/dashboard`), impl-spec embellishments (D6), `th_*`/bare `test_*` table families, `ph_issues`/`profiles`/`releases` data.

## Decisions baked in
D1 QA-bug Jira view · D2 drop broken trigger · D3 curated realistic seed · D4 CatalystViewBase · D6 product-doc precedence.

## Canonical components (locked)
JiraTable (`@/components/shared/JiraTable`) for all lists; CatalystViewBase/CatalystDetailRouter for details; `@atlaskit/modal-dialog` for create/edit modals; `@atlaskit/tabs`; CatalystStatusPill / JiraTable StatusPill; UserAvatar; WorkItemTypeIcon + icon registry; AddParentPicker for work-item link picker; useModuleAccess + ModuleAccessMatrix + admin-nav for admin wiring. BANNED: hand-rolled tables, `shared/StatusPill.tsx`, bare hex, Skipped status.

## UI/UX rules
ADS tokens only; native SVG test-entity icons via `icons.registry.ts`; 5 execution statuses only; zero-assumption rendering (no false defaults). Screenshot acceptance + DOM/network/SQL wiring proof per slice.

## Data/backend rules
`tm_*` is the only live family. Statuses are enums (not config rows) — admin "customization" edits config tables where they exist (priorities/types) and is read-only/enum-bound where they don't (case/run statuses) unless a migration is approved. No schema change without explicit approval; migrations staged as new files in `supabase/migrations/`, applied to cyij.

---

## PHASES (each = vertical slice → frontend shown + wiring proven → Vikram sign-off gate)

### Phase 0 — Foundation reset & wiring proof (timebox 2h)
- Reconcile D5 (ph_issues vs ph_work_items) by reading the canonical Work Items list.
- Add migration: drop `sync_jira_bug_to_defect` trigger (D2).
- Add `/testhub/defects` + `/testhub/defects/:id` routes; pick canonical DefectsPage; kill the orphan.
- Consolidate execution table naming to `tm_test_runs` (replace `test_cycle_executions`/`th_test_executions` reads).
- Wipe `tm_*` test seed (delete order per 02 §B); seed Phase-0 minimum: 1 project + folders + a few cases.
- **Slice proof:** Repository page renders seeded folders/cases live from cyij; Defects route resolves.

### Phase 1 — Repository: Folders + Cases + Steps + Versions (split into 1a folders/tree, 1b case CRUD + steps, 1c versions + datasets) (≤2h each)
- Folder tree (system folders All/Not Assigned, nesting, counts incl. subfolders, CRUD, reorder).
- Case CRUD via CatalystViewBase detail; Classic + BDD steps (StepEditor); types/priorities/statuses bound to config/enums; native case icon.
- Versions (manual + auto trigger; latest-default grids).
- **Slice proof:** create case w/ steps + new version in UI → rows persist in tm_test_cases/tm_test_steps/tm_test_case_versions.

### Phase 2 — Sets (timebox 2h)
- Set CRUD; add cases (Published-only, version-pinned, cross-project picker); Create-Set-from-folder.
- **Slice proof:** set membership persists in tm_test_sets/tm_set_cases; version pin honored.

### Phase 3 — Cycles + Planning (split 3a cycle CRUD+scope, 3b assignees+plan) (≤2h each)
- Cycle CRUD (Details/Cases/Assignees); add cases & sets to scope; assign testers (incl. Assign-to-Owner); day-bucket plan.
- **Slice proof:** cycle scope persists in tm_cycle_scope; assignees + counts wired.

### Phase 4 — Execution engine (split 4a run+step results+percolation, 4b evidence+timer+defect-from-exec, 4c cycle rollups) (≤2h each) — KEY PROVE-IT
- Run a case in a cycle: Run1 auto, Add Run; per-step status + actual result; UP/DOWN percolation (5 statuses); evidence attach; effort timer.
- **Slice proof:** execute in UI → tm_test_runs/tm_step_results rows created, tm_cycle_scope.current_status updates, cycle header counters update live.

### Phase 5 — Defects (QA-bug Jira view) (timebox 2h)
- Defects list = project QA-bug work items in JiraTable with project filter (D1).
- Raise/link defect from execution → creates/links a project QA-bug; tm_defect_links association.
- **Slice proof:** defect raised in execution appears in filtered Defects table and links back to the run.

### Phase 6 — Traceability (timebox 2h)
- Link a case to ANY project work-item type via AddParentPicker; coverage matrix (Coverage + %Done) via tm_get_traceability_matrix.
- **Slice proof:** link persists in tm_requirement_links; matrix reflects coverage/exec status live.

### Phase 7 — Admin module + Access Management (split 7a customization pages, 7b module-access wiring) (≤2h each)
- Wire orphaned `src/pages/admin/test/*` into admin-nav + routes + REGISTERED_ADMIN_ROUTES (lockstep, pass admin-sidebar-parity.test.ts): priorities, case types, case statuses, run statuses, custom fields, permissions/field-config.
- Wire testhub into useModuleAccess gating (route-level + content).
- **Slice proof:** an admin change (e.g. add priority) reflects live in Repository case form; module access toggles gate the surface.

---

## Parallel execution plan (per phase)
Discovery/probe agent + implementation agent + QA/screenshot validator run per slice; UI/UX critic on UI-heavy slices.

## Screenshot checklist (per slice)
Before/after of the surface; the created/edited row; a DevTools network mutation OR a SELECT confirming the row in cyij.

## Validation commands
`npm run build` / typecheck; targeted vitest (incl. admin-sidebar-parity.test.ts for Phase 7); SQL SELECTs against cyij for write-path proof.

## Stop conditions
Any regression → RED FLAG + stop. Any schema change beyond D2 → stop and ask. Slice exceeds 2h → split. After 1 correction loop → accept/split/rebuild/stop+revert.

## Drift / rebaseline
Log drift to 08_DRIFT_LOG.md. If acceptance model contradicts existing code, product docs (D6) win; raise before diverging.
