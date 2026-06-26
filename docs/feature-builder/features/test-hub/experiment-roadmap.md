# Experiment Roadmap: test-hub

**Date:** 2026-06-26
**Status:** Phase 0 research — test-01 complete → Gate 3 approval needed before build

---

## Phase 0 — Research (COMPLETE)

No code changes. Documentation + discovery only.

| Exp | Title | Status | Decision | EQS |
|---|---|---|---|---|
| exp-001 | Feature intake + Catalyst pattern discovery | ✅ complete | keep | 96/100 |
| exp-002 | Test Hub data contract & schema truth audit | ✅ complete | keep | 96/100 |
| test-01 | Deep discovery: Test Hub archaeology, AIO benchmark, Design system, AI use cases, UI/UX options | ✅ complete | keep | 92/100 |

**Pending pre-build research:**

| Exp | Title | Status | Notes |
|---|---|---|---|
| exp-003 | Data repair: tm_get_requirement_test_cases staging probe + types regen | pending | Required before Traceability builds |

---

## Gate 3: Design Approval (REQUIRED BEFORE BUILD)

**Blocked on Vikram approval of:**
1. Target direction: Hybrid B+C (Execution-First + Intelligence Layer)
2. Navigation model: sidebar order
3. CaseDrawer → CatalystViewBase migration (confirmed necessity)
4. Test Plans decision: wire `/testhub/plans` route OR delete 9 orphaned components
5. MVP AI use cases: 6 selected (generate from Jira, summarize run, defect draft, BDD export, improve description, duplicate detection)
6. Reports: 5 core types to implement first
7. Release Readiness: Phase 2 (not Phase 1)

---

## Phase 1 — Core Build (6 Build Experiments, Estimated ~12 weeks)

Each experiment = 2-hour slice rule; requires Plan Lock before coding.

| Exp | Title | Scope | Gate Required | Priority |
|---|---|---|---|---|
| build-01 | My Work + Repository (JiraTable) | Wire JiraTable to tm_test_cases; folder tree; ProjectPageHeader; column picker; search | Gate 3 | P0 |
| build-02 | CaseDrawer → CatalystViewBase | Migrate CaseDrawer from custom portal to CatalystViewBase; wire ActivityPanel; add AI trigger button; step editor | Gate 3 | P0 |
| build-03 | Cycles + Execution Enhancement | CyclesPage JiraTable; CycleDetailPage as CatalystViewBase; ExecutionPage AI defect draft + evidence upload | Gate 3 | P0 |
| build-04 | Reports (5 core types) | ExecutionSummary, CaseDistribution, DefectTrend, AutomationActivity, TraceabilitySummary; chart components; export to CSV | Gate 3 | P1 |
| build-05 | Dashboard KPI Widgets + AI Wiring | Test-specific widgets for ProjectDashboardPage; wire useAIGeneration to 3 MVP AI use cases (generate from Jira, summarize run, defect draft) | Gate 3 + Gate 7 (AI) | P1 |
| build-06 | Traceability + Sets + Release Readiness | TraceabilityPage quality fix; TestSetsPage + SetDetailPage; Release Readiness page (new); remaining 3 MVP AI use cases | Gate 3 + Gate 7 (AI) | P2 |

---

## Phase 2 — AI Intelligence Layer (Post Gate 7 Approval)

| Exp | Title | Scope | Gate |
|---|---|---|---|
| ai-01 | Edge/negative/boundary case generation | Extend useAITestGeneration; 3 new UI triggers in CaseDrawer | Gate 7 |
| ai-02 | Failure cluster detection + risk-based prioritization | New hook useAITestReporting; add to CycleDetail AI sidebar | Gate 7 |
| ai-03 | Duplicate detection + automation candidates | Bulk action "Find Duplicates"; Repository analytics AI widget | Gate 7 |
| ai-04 | Release readiness narrative + executive summary | AI generates Go/No-Go narrative from metrics; export as PDF | Gate 7 |

---

## Human Approval Gates

| Gate | When Required | Condition |
|---|---|---|
| Gate 3 | Phase 0→1 transition | Design approved: direction, navigation, component plan, AI scope |
| Gate 4 | Any DB schema change | New tables, columns, migrations — never proceed without written approval |
| Gate 5 | Any edge function change | Including new ai-* functions |
| Gate 6 | Any new route | Including /testhub/readiness new route |
| Gate 7 | Any AI feature wired to UI | Per AI use case |
| Gate 9 | Ship to production | Final sign-off |

---

## Key Decisions Needed

| Decision | Options | Impact |
|---|---|---|
| Test Plans: wire or delete? | (A) Wire /testhub/plans route using 9 orphaned components; (B) Delete useTestPlansG26 + test-plans/; (C) Defer | If A: Gate 6 needed. If B: cleanup exp before build-01. |
| CaseDrawer: migrate or rebuild? | (A) Migrate existing CaseDrawer to CatalystViewBase (preserve step logic); (B) Rebuild from scratch using CatalystViewBase | A preferred — preserve step editor; add CatalystViewBase shell around it |
| Reports: custom charts or widget reuse? | (A) Build with chart components already in codebase; (B) Use ProjectDashboardPage widget system | A preferred — discrete report pages not dashboard widgets |

---

## Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `tm_get_requirement_test_cases` invalid SQL | P1 | Run staging probe before Traceability build |
| Test Plans orphaned code bloat | P1 | Vikram decision: wire vs delete before build-01 |
| CaseDrawer parity defects (ActivityPanel missing) | P1 | Migrate to CatalystViewBase in build-02 |
| Reports page is fully stub | P0 | build-04 is dedicated to reports — must ship |
| useAIGeneration.ts dead code in UI | P0 | build-05 wires it with Gate 7 approval |
| DashboardPage test widgets absent | P1 | build-05 adds test KPI widgets to ProjectDashboardPage |
| tm_test_plans types not generated | P2 | exp-003 (types regen) before build-06 |

---

## Success Criteria for Phase 1 (build-01 through build-06)

- [ ] My Work: JiraTable of assigned cases loads, sort/filter/select work
- [ ] Repository: Folder tree + JiraTable + CaseDrawer (CatalystViewBase) with ActivityPanel
- [ ] CaseDrawer: AI generate button wired, returns draft test cases
- [ ] Cycles: JiraTable list + CycleDetailPage + ExecutionPage working end-to-end
- [ ] Reports: 5 core reports render with real tm_* data; CSV export works
- [ ] Dashboard: 4 KPI widgets show real pass rate, coverage, defect trend, active cycles
- [ ] AI: 6 MVP use cases wired and tested
- [ ] Zero bare colors, zero hand-rolled tables, zero CatalystViewBase bypasses
- [ ] Screenshot acceptance on all P0 screens before commit
