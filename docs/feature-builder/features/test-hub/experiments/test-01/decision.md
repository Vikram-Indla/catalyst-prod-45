# Decision: test-hub / test-01

**Title:** Discovery: Existing Catalyst Test Hub, AIO Benchmark, and Catalyst-Native UX Opportunity Scan
**Date:** 2026-06-26
**Type:** research

---

## DECISION: keep

**REASON:** All 5 research lanes completed with EQS 94/100 (minimum 90). Zero hard fails. 
- Lane 1: 16 Test Hub pages audited; CaseDrawer verdict (custom portal, must migrate); useAIGeneration dead code confirmed; 14+ orphaned components identified
- Lane 2: 18 canonical Catalyst patterns mapped; 15-component shortlist; forbidden duplicate list
- Lane 3: AIO complete entity model (9 entities, 14 capability categories, 16+ reports, 10 weaknesses = 10 Catalyst opportunities)
- Lane 4: 20 AI use cases designed; 6 MVP immediately wirable; 4 Edge Function architecture; quality guardrails
- Lane 5: 3 UI/UX options designed; Hybrid B+C recommended (Execution-First + Intelligence Layer)

Zero src/, DB, route, or schema changes made. Ready for Gate 3 design approval.

---

## 5-Point Report

### 1. Existing Test Hub Capability Map
16 routed pages; 4 canonical thin wrappers (excellent); 2 canonical filter/filters mounts (excellent); CaseDrawer custom (risk); Reports all stubs (gap); AI hook dead code (opportunity); 14+ orphaned components (cleanup needed). Current quality: 70% — solid foundation, incomplete on AI, reports, and key integrations.

### 2. AIO Tests Complete Benchmark Model
Entity model: Test Case, Step, Folder (per-entity recursive), Set, Cycle (version-locked), Plan, Execution (immutable), Defect (Jira-bidirectional), Requirement (M:M traceability). 14 capability categories. 16+ report types. 6 AI features. 12 strengths (must match). 10 limitations (Catalyst opportunities).

### 3. Catalyst Component/Design System Reuse Map
18 canonical patterns. 15 specific components Test Hub must use. 11 forbidden-duplicate patterns. 8 reference screens to clone/adapt. Key constraints: JiraTable for all lists, CatalystViewBase for all drawers, ActivityPanel for all comments, var(--ds-*) tokens only.

### 4. Gap Matrix: Current vs AIO vs Premium Target
65 features catalogued. 14 verified working (21%). 28 partial/unwired (43%). 18 missing (28%). 2 orphaned (3%). Top gaps: reports (all stubs), AI UI (hook dead), Jira defect sync, shared steps library, Release Readiness view.

### 5. Recommended Target + Implementation Sequence
Direction: Hybrid B+C (Execution-First + Intelligence Layer). Navigation: My Work home → Board → Repository → Cycles → Reports (phase 1). 6 build experiments. Gate 3 required before build-01.

---

## Decision Rules

| Rule | Applied? |
|---|---|
| EQS total ≥ 90 | yes — 94/100 |
| Zero hard fails in scorecard.md | yes — 0 hard fails |
| allowed-edit-surface.md filled before work started | yes — pre-filled |
| Screenshot provided (if UI build) | N/A — research experiment |

---

## What Build-01 Must Do (once Gate 3 approved)

1. Wire JiraTable to tm_test_cases in RepositoryPage
2. Implement folder tree as proper left-panel sidebar (collapsible)
3. Update page header (ProjectPageHeader hubType='test')
4. My Work page KPI row (Assigned/Overdue/Blocked chip bar)
5. Clean up orphaned components (test-plans/ + test-cycles/calendar/) — pending Vikram decision

---

## Human Approval (Gate 3)

- [ ] Vikram reviewed and approved this research output
- [ ] Vikram approved Hybrid B+C direction
- [ ] Vikram decided: Test Plans wire vs delete
- [ ] Vikram approved MVP AI use cases (6 selected)
- [ ] Vikram approved 5 core report types for build-04
- **Approved:** _pending_
