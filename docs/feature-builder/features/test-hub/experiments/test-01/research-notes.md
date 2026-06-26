# Research Notes: test-hub / test-01

**Title:** Discovery: Existing Catalyst Test Hub, AIO Benchmark, and Catalyst-Native UX Opportunity Scan
**Date:** 2026-06-26
**Type:** research

---

## LANE 1 FINDINGS — Existing Test Hub Archaeology

### Finding 1: Four canonical thin wrappers working correctly
Dashboard, MyWork, Board, DefectsPage all mount canonical components with mode/hubType props. These require zero rebuild.
- `DashboardPage` → `ProjectDashboardPage mode='test'`
- `MyWorkPage` → `BacklogPage` + testCasesDataSource adapter
- `BoardPage` → `KanbanPage mode='test'`
- `DefectsPage` → `BacklogPage` + defectsDataSource adapter
- `FiltersListPage` → canonical `FiltersListPage hubType='test'`

### Finding 2: CaseDrawer is custom — HIGH RISK
`src/pages/testhub/repository/CaseDrawer.tsx` (426 lines) uses `createPortal(panel, document.body)` — NOT CatalystViewBase. Missing: ActivityPanel, standard keyboard handling, canonical breadcrumb. Risk: same failure mode as BrSidebarDetails (18+ parity defects reported 2026-06-01). Must migrate to CatalystViewBase in build-02.

### Finding 3: useAIGeneration.ts is dead code in UI
`src/hooks/test-management/useAIGeneration.ts` calls Edge Function `ai-generate-test-cases`. Returns: testCases[], metadata (totalGenerated, priorityBreakdown, typeBreakdown, coverageAreas). NOT WIRED to any .tsx file. No AI button in any Test Hub page. `test-plans/AIGeneratorModal.tsx` exists but orphaned. Highest-value unwired capability.

### Finding 4: Reports page is entirely stubs
`ReportsPage.tsx` shows 13 report type tiles (execution-overview, case-distribution, defect-summary, etc.). `ReportDetailPage.tsx` is a stub. Zero implemented report renders. Largest visible gap vs AIO Tests.

### Finding 5: 14+ orphaned components — cleanup required
Orphaned (built but not routed/used):
- `src/components/test-plans/` (9 components: AIGeneratorModal, SaveAsTemplateModal, OverviewTab, ScopeTab, etc.) — for test-plans module, never routed
- `src/components/test-cycles/calendar/` (5 components: CycleCalendarView, DayView, CalendarDayCell, CalendarHeader, TestEventCard) — built, not used
- `src/components/test-cycles/assignment-table/` — not integrated
- `src/components/testhub/versioning/VersionDiffView.tsx` — imported nowhere
- Parallel hook folders: hooks/test-cases/, hooks/testhub/, hooks/test-cycles/ — alongside hooks/test-management/

### Finding 6: Planning tab is TBD placeholder
`CycleDetailPage.tsx` has planning tab but no content. Test Plans module (`/testhub/plans`) has never been routed. Vikram decision needed: wire or delete.

### Finding 7: Hooks are comprehensive but fragmented
28+ hooks across hooks/test-management/ (6,276 lines). Core CRUD hooks all working. Fragmented across 4 parallel hook directories. `useTestPlansG26.ts` uses `as any` for tm_test_plans + plan_test_cycles (types not generated).

---

## LANE 2 FINDINGS — Catalyst Design System Discovery

### Finding 8: 18 canonical patterns identified (10 more than prior exp-001 8 patterns)
Full map in updated `catalyst-pattern-discovery.md`. New patterns found: Status lozenges, Modal dialogs, Tabs, Forms/inline edit, Context menus, Dashboard widgets, Attachment sections, AI components, Admin configuration, Charts/reports, Search/global search.

### Finding 9: JiraTable API is fully documented
- compact: 40px rows; comfortable: 48px; pagination default 25
- Column definition: `Column<TRow>` schema with id, header, cell, width, sortable, hideable, accessor
- Used in: BacklogPage, admin tables (RbacRolesTable, etc.)
- Component file: `src/components/shared/JiraTable/JiraTable.tsx`

### Finding 10: CatalystViewBase is the mandatory drawer shell
- Right panel: 400px default; min 220px; max 480px
- Container query: @container (max-width: 440px) hides sidebar
- Animations: 150ms all transitions
- Must use for: CaseDrawer, CycleDetail, SetDetail, DefectDetail

### Finding 11: ActivityPanel has full threaded comments API
- Props: comments[], historyItems[], onAddComment, onAddReply, onEditComment, onDeleteComment, onToggleReaction
- Tabs: All / Comments / History / Worklog (hideable)
- Uses ADF rich text; @mentions with user lookup; emoji reactions
- Must wire into CaseDrawer (currently missing)

### Finding 12: Best reference screens identified
- Repository → mirror BacklogPage (JiraTable + detail panel)
- CaseDrawer → mirror CatalystViewBusinessRequest.v3.tsx (left/right split)
- Dashboard → use ProjectDashboardPage + test widgets
- Board → KanbanPage already mounted
- Reports → use existing chart components (ExecutionTrendChart, ResultsPieChart)

---

## LANE 3 FINDINGS — AIO Tests Benchmark

### Finding 13: AIO entity model is more complex than current Catalyst implementation
AIO has: Test Case, Test Step, Test Folder (recursive per entity type), Test Set, Test Cycle (with version locking), Test Plan, Test Execution (immutable), Defect (Jira-bidirectional), Requirement (M:M to cases).
Catalyst currently missing: Test Plan (routed), Requirement (entity), version locking enforcement in UI, immutable execution records.

### Finding 14: AIO has 16+ report types; Catalyst has 0 implemented
Highest gap: Execution Summary, Case Distribution, Defect Trend, Automation Activity, Release Readiness.

### Finding 15: AIO's version locking is a critical enterprise feature
When a case is added to a cycle, the case version is frozen in `tm_cycle_scope.locked_version`. Case edits after scoping don't affect in-progress execution. This ensures execution consistency. Catalyst has the DB column; UI enforcement unknown.

### Finding 16: AIO's AI is generic; Catalyst can win with embedded contextual AI
AIO uses Claude/OpenAI with generic prompts + confidence scoring. No conversational layer. No execution-time AI. No cross-project learning. CATY is Catalyst's structural advantage.

### Finding 17: AIO's 10 weaknesses = Catalyst's 10 opportunity areas
Full list in `external-benchmark-research.md`. Top 3: Ministry-native AI, native requirements engine, predictive analytics.

---

## LANE 4 FINDINGS — AI Use Case Matrix

### Finding 18: 20 AI use cases designed; 6 are MVP-ready with existing infrastructure
All 20 use cases in `target-catalyst-design.md`. MVP 6 (all wirable with existing Edge Function + hooks):
1. Generate test cases from Jira work item (useAIGeneration.ts exists)
2. Summarize failed test run results (template-based, no hallucination risk)
3. Draft defect from failed step (pre-fill modal; always requires human review)
4. Generate BDD/Gherkin from steps (deterministic transform; no AI inference needed)
5. Improve weak test case descriptions (diff modal; only for DRAFT cases)
6. Detect duplicate test cases (semantic similarity; 70%+ threshold)

### Finding 19: Architecture requires 4 new Edge Functions
`ai-test-generation`, `ai-test-analysis`, `ai-execution-intelligence`, `ai-test-reporting` — gate Gate 7 per function.

### Finding 20: Quality guardrails are critical for adoption
Auto-accept only for confidence >85% and deterministic transforms. Mandatory human review for all generation, defect drafting. Version tracking: is_ai_generated, ai_model, ai_confidence, ai_prompt_version on all AI-touched entities.

---

## LANE 5 FINDINGS — UI/UX Options

### Finding 21: Three distinct, viable options designed
- **Option A (Repository-First):** Test library as home. Strong for QA automation teams. Medium complexity.
- **Option B (Execution-First):** My Work as home; Board as workflow. Strong for QA testers + scrum teams. Medium-high complexity.
- **Option C (Intelligence-First):** Dashboard as home; Release Readiness as flagship. Strong for QA leadership + PMs. High complexity.

### Finding 22: Recommended Hybrid B+C
Phase 1: Option B (My Work home + Board + Repository + Cycles + Execution).
Phase 2: Option C elements (Dashboard KPIs + Traceability matrix + Release Readiness page).
Rationale: B solves daily execution pain fast; C adds strategic intelligence without blocking phase 1.

### Finding 23: All 3 options reuse canonical components for 75%+ of screens
7 of 8 list pages can use JiraTable. All detail pages can use CatalystViewBase. 2-3 custom layouts needed per option (Kanban, Traceability matrix, possibly Release Readiness).

---

## Evidence Table

| Claim | Source |
|---|---|
| CaseDrawer uses createPortal, not CatalystViewBase | `src/pages/testhub/repository/CaseDrawer.tsx` line 1–30 (portal render) |
| useAIGeneration.ts calls ai-generate-test-cases Edge Fn | `src/hooks/test-management/useAIGeneration.ts` (140 lines; confirmed Edge Fn call) |
| 4 canonical thin wrappers working | DashboardPage.tsx, MyWorkPage.tsx, BoardPage.tsx, DefectsPage.tsx (confirmed in Lane 1 audit) |
| Reports page = stubs | ReportsPage.tsx tile grid; ReportDetailPage.tsx stub body |
| JiraTable is at JiraTable.tsx | `src/components/shared/JiraTable/JiraTable.tsx` (lane 2 read) |
| CatalystViewBase right panel 400px default | `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` (lane 2 read) |
| ActivityPanel has full threaded API | `src/components/catalyst-ds/activity/ActivityPanel.tsx` (lane 2 read) |
| AIO has 16+ report types | `external-benchmark-research.md` Section 5 (lane 3 synthesis) |
| 20 AI use cases designed | `target-catalyst-design.md` Section 5 (lane 4) |
| 3 UI options viable | lane 5 agent output (design research only) |

---

## Acceptance Criteria Status

| Criterion | Pass? | Evidence |
|---|---|---|
| Lane 1: All Test Hub routes/pages/components/hooks/AI hooks documented | ✅ | 16 pages, 28+ hooks, 14 orphaned components, CaseDrawer verdict |
| Lane 2: Catalyst canonical pattern map complete (12+ patterns) | ✅ | 18 patterns mapped; component shortlist of 15; forbidden duplicates listed |
| Lane 3: AIO Tests complete capability model extracted | ✅ | Entity model, 14 capability categories, 16+ reports, user journeys, AI features, strengths/limitations |
| Lane 4: AI use case matrix complete (15+ use cases) | ✅ | 20 use cases, 6 MVP, 8 P1, 6 P2, architecture, guardrails, UX integration points |
| Lane 5: Three complete UI/UX options with nav model, component reuse, recommendation | ✅ | Options A/B/C designed; Hybrid B+C recommended with rationale |
| Gap matrix produced | ✅ | 65 features catalogued; gap-analysis.md complete |
| Recommended target option selected | ✅ | Hybrid B+C; target-catalyst-design.md |
| Evidence Quality Score ≥ 90/100 | ✅ | See scorecard.md — 92/100 |
| No src/ files modified | ✅ | Zero src/ changes; read-only throughout |
| No DB queries executed | ✅ | Research via file reads only |
| All required deliverable files written | ✅ | All 7 feature docs + 5 experiment docs updated |
