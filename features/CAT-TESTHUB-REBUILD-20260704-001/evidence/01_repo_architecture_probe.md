# Evidence — Repo Architecture Probe (VERIFIED 2026-07-04/05)

~29,260 LOC across 69 TestHub files. Implementation era 2026-06-21 → 2026-07-05 (feature IDs CAT-TESTHUB-PROD-20260703-001, CAT-REPORTS-HUB-20260703-001).

## Architecture headline
**Two-tier**: 7 of 17 routed pages = thin wrappers over canonical hubs (Dashboard→ProjectDashboardPage mode='test', MyWork/Defects→BacklogPage.atlaskit+adapters, Board→KanbanPage mode='test', Filters×2→project-hub filters). 10 bespoke pages: Repository(1003 LOC), Cycles(478), CycleDetail(1251), Execution(1125), TestSets(512), SetDetail(828), Traceability(262), Timeline(100), Dependencies(94), ReportsHub(201) + lab/ chassis (~2160).

**Real data layer = `src/hooks/test-management/` (28 files, ~240KB)**: useTestCases(42.5K), useDefects(34.8K), useTestCycles(24.3K), useFolders(13.3K), useAdminConfig, useTestCaseVersions, useAIGeneration, useFlakyTestDetection, useCoverageGaps, useDefectMetrics… `src/hooks/testhub/` holds only 2 files (1 dead). Types: src/types/test-management.ts (591 lines).

## Routes (src/routes/FullAppRoutes.tsx:652-691, all ModuleGate k="testhub")
/testhub→dashboard redirect; dashboard, my-work, board, repository, cycles, /:projectKey/cycles/:cycleKey (+/execute) + legacy short form, timeline, dependencies, sets(+:setKey), traceability, defects(+:defectKey), reports(+:reportSlug) + 6 legacy redirects, filters(+create,+:filterId). Admin: /admin/test/{priorities,case-types,case-statuses,permissions} + test-ops. Typed builders Routes.testHub.* (src/lib/routes.ts:114-139).
Sidebar (TestHubSidebar.tsx): 12 items, **zero orphans both directions**. Slug/display-key params everywhere except `:filterId` (UNRESOLVED if value is slug).

## Data access
- Zero th_* references anywhere (dormant th_-reading module deleted).
- Direct-supabase-inline bypasses hook layer in big pages: CycleDetailPage 14 query/mutation sites, ExecutionPage, both Sets pages → consolidation target.
- Reports cross-read delivery tables: ph_issues, ph_jira_sprints, ph_issue_status_history, ph_issue_links.
- RPCs used by frontend: tm_next_entity_key, tm_create_version_snapshot, tm_get_defect_mttr, tm_get_coverage_gaps, save_test_data, get_defect_stats (note: tiny fraction of 87 available tm_ RPCs).
- **Zombie data path**: test_data_rows/test_data_parameters/test_cycle_executions (legacy test_* family, memory says dead) still referenced in useCreateRunWithDataRows.ts/useDataRowResults.ts.
- Storage bucket: tm-attachments.
- State: 100% react-query + supabase client. No zustand/context in testhub. Query keys: tm-cases/tm-case/tm-case-steps/tm-case-versions/tm-cycle/cycle-details/repository-tree/tm-cycle-defects.

## Dead code
1. src/hooks/testhub/useCommandCenter.ts (274 LOC) — zero importers; references releases/milestones/cc_activity_log + 4 command-center RPCs.
2. src/hooks/testhub/useReleases.ts — mis-homed; only consumer is releases module QualityGatesPage. Duplicate-name hazard vs src/hooks/test-management/useReleases.ts.
3. src/lib/test-item-type-icons — never existed (handover plan only); WorkItemTypeIcon used instead.

## Hardcoded vocab (all token-safe colors, but not admin-driven)
- src/lib/testhub/enums.ts — cycle status DB↔UI bridge; **cycleStatusFromDb(null)→'PLANNED' domain-default fallback** (zero-assumption tension).
- SetDetailPage:75 CYCLE_STATUS_APPEARANCE; CycleDetailPage:752 SEVERITY_COLORS (severity vocab hardcoded, not admin-config); ReportCanvas:33,46 STATUS_CHART_COLOR/STATUS_APPEARANCE (14-status vocab); SprintTestingStatusBody:86.
- Priorities/types ARE admin-driven (tm_case_priorities/tm_case_types).

## Handover doc verdict
TESTHUB_BUILD_HANDOVER.md (2026-06-21) materially wrong on: router path, hook location, query keys, route params (:id vs keys), icon file, "hex fallback" color policy (contradicts CLAUDE.md), file names, version table name (tm_test_case_versions not tm_case_versions), admin page count (4 of 8 built), report count. **Treat git log + code as ground truth, not handover.**

## Admin surface
4 of 8 planned admin pages live. Missing: environments, custom-fields, notifications, audit, AI-usage.

## Concurrent session note
SetDetailPage.tsx edits committed in merge 57d30d355 (2026-07-05); working tree clean at probe time.
