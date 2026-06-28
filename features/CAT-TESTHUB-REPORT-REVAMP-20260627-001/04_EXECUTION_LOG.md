# 04 — Execution Log

## 2026-06-27 — Phase 1 discovery + demo seed
- Read-only DB discovery on cyij (supabase db query --linked). No prod touch.
- Decisions D-001..D-007 logged (test schema tm_*, work item ph_issues, release→sprint derive, coverage=stories, defects=hybrid, seed Senaei BAU).
- WROTE (cyij dev, G-001 APPROVED, tagged REVAMP-DEMO-20260627):
  - tm_projects: +1 (Senaei BAU mirror, id = ph_projects id)
  - tm_test_cases: +14 (linked to real BAU stories)
  - tm_requirement_links: +14 (Trace-To real ph_issues)
  - tm_test_cycles: +2 · tm_cycle_scope: +14 · tm_test_runs: +12 · tm_defects: +3
- PROVEN on real data: coverage 14/394=3.6%; exec 8P/3F/1B/2NR; 3 governance mismatches (BAU-6018/6075/6003 Done+failed).
- Scripts: blueprint/seed_revamp_demo.sql, blueprint/rollback_revamp_demo.sql.
- No src/ code changed. No schema/DDL changed (data-only writes to existing tables).

## 2026-06-28 — Build slice 1: Project Testing Status (first real-data report)
- NEW files: src/pages/testhub/reports/ProjectTestingStatusPage.tsx, src/pages/testhub/reports/useProjectTestingStatus.ts
- WIRED: route /testhub/reports/project-status (FullAppRoutes.tsx), sidebar item "Project Status ✦" (TestHubSidebar.tsx; Reports set exact:true)
- Components: ProjectPageHeader, JiraTable (×2), @atlaskit Select/Lozenge/Spinner. ADS tokens only.
- Gates: tsc 0 errors; lint:colors:gate 703=703. Screenshot captured (light).
- Live proof (Senaei BAU): coverage 3.6% (14/394), exec 8P/3F/1B/2NR, 707 QA bugs/116 incidents, 3 governance mismatches (BAU-6018/6075/6003).
- Not committed (awaiting Vikram). Dark-mode shot pending.

## 2026-06-28 — Polish slice 1
- Full-width container (removed maxWidth 1280 cap) → Test result column no longer clipped (B2 reading mode).
- Drill-to-story: onRowClick on both tables → navigate(/browse/:key). Verified → /browse/BAU-6018.
- Dark mode verified (reload-into-dark): clean, ADS tokens, lozenges correct, no light-metaphor leakage.
- Gates: tsc 0 errors; lint:colors:gate clean.

## 2026-06-28 — Build slice 2: Trace-From panel on story detail (commit b8dd0f971)
- NEW src/components/catalyst-detail-views/story/TestCoveragePanel.tsx
- MOUNT CatalystViewStory.tsx (story-type guard, between Linked items + Activity).
- Shows coverage chip, linked cases + run status, defect count, governance flag (Done+failing).
- Verified on BAU-6018: COVERED, 1 DEFECT, governance flag, RVTC-007 FAILED.
- Gates: tsc 0, color 703=703, audit gate clean. Committed + pushed.
