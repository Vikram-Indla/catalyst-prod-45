# Discovery — 2026-07-07 (parallel agents + live probes)

## Live app (localhost:8080, dark mode, before-screenshots captured)
- Dashboard: renders, case counts 6/3/3/0. OK.
- Repository: loads (slow first paint ~8s dev-compile), 13-col JiraTable, folder tree
  (All / Not Assigned / Senaei BAU / test / test-fol). TWO React console errors:
  `isSelected`/`testId` leaked to DOM button via DropdownMenu custom trigger
  (RepositoryPage.tsx:424; same pattern CyclesPage.tsx:132/234). FIXED this session.
- Plans: 2 seeded plans render (RVPL-001/002), canonical table. OK.
- Cycles: 1 cycle CYC-001, canonical table. OK.
- Defects: 13 defects, canonical UWV table, avatars/status pills. OK.
- Traceability: honest empty state w/ CTA (no requirement links for scoped project).
- Reports: 31-report registry hub renders.
- Board: honest empty state.
- Auth session expired mid-probe → sign-in page; password entry is user-only.
  Browser re-verification queued on Vikram sign-in.

## Code map (repo-context agent — full output in 12_AGENT_OUTPUTS.md)
- All /testhub routes registered; sets → redirect stubs to plans (E7/D-004).
- CRUD real (Supabase) for cases/steps/folders/cycles/runs/results/defects/attachments/
  comments/requirement-links. No mocks, no custom tables, no drawer CRUD, no dead onClicks.
- GAPS: run player (ExecutionPage.tsx) has NO defect-from-failure; plan rename/delete
  missing; execution delete missing; legacy `test_cycle_executions` refs in
  useTestCases.ts:140,224; tm_test_sets writes orphaned (CreateStoryModal:722,
  AddToCycleSetSheet:78 — nothing reads); dead hooks (useTestPlansG26, useCreateRunWithDataRows,
  useDataRowResults, useTestData, useRepositoryData, useTestCaseRelease); dead builder
  Routes.testHub.run(); ZERO TestHub unit tests.

## DB probe (cyij staging — read-only agent)
- 60 tm_* tables, ALL RLS-on; 107 tm_* functions; testhub-attachments bucket exists;
  ai-tm-assist v1 + ai-generate-test-artefacts v2 + ai-generate-story-test-cases v7 ACTIVE.
- Seed gaps (SENAEI-BAU project 84f91caf…): 92/93 cases folder_id NULL (folder tree
  looks empty); tm_test_plan_cases = 0 (plans are shells); 0 step results for its 52 runs;
  13 defects with 0 tm_defect_links. Duplicate project rows named "Senaei BAU"
  (SENAEI-BAU seed + BAU user-created). tm_audit_logs (0 rows) dead duplicate of
  tm_audit_log. tm_activity_log works (14 rows, 5 action types).

## Readiness risk rating
- Wiring: AMBER (4 CRUD gaps above; core paths green)
- Data/seed: AMBER (journey breaks at plan→cases and step-results evidence)
- UI/UX: GREEN-AMBER (canonical everywhere; console errors fixed; slow dev first-paint)
- Tests: RED (zero coverage)
