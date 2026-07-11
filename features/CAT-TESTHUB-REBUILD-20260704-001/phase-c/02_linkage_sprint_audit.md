# Test↔Work-Item Linkage + Sprint Audit (VERIFIED code+staging, 2026-07-05)

## Why Vikram "doesn't see the linkages" (3 root causes)
1. **Reverse view missing.** TestCoveragePanel ("from a work item see its test coverage") mounts ONLY on Defect + Incident detail. NOT on Story/Feature/Epic. Opening a Story = zero test linkage shown. (only CatalystViewDefect + CatalystViewIncident import it; CatalystViewStory does not.)
2. **Traceability shows dead snapshot text.** TraceabilityPage renders external_title/external_key strings from the link row, never joins ph_issues → no type icon, no live status, no clickable key.
3. **Sprint read from 5 conflicting sources; the Story-sidebar one is dead** (rh_release_sprints missing, sprints=0 rows).

## Linkage map (live paths)
- M1 **canonical**: tm_requirement_links (external_key=issue_key) via RPC tm_link_requirement. Write from test-case Requirements tab (CatalystViewTestCase:521, picker limited to Story/Epic/Feature) + story-side TestCasesSection:325. Read: TestCoveragePanel:65, TraceabilityPage:62.
- M2 legacy tm_test_cases.linked_story_key (text) — superseded, still dual-written.
- M3 tm_defect_links auto-link on execution (test_case/run/cycle/plan/release/requirement; NOT ph_issues) useDefects:416.
- M4 tm_defects.parent_key → CatalystViewDefect:193 **hard-codes parentType="Epic"** (zero-assumption violation).
- M5 tm_defects.source_test_case/run/plan_id.
- M6 incident coverage: tm_requirement_links.external_key=INC key — **read-only, no create surface**.
- M8 tm_test_case_links (clone only, no UI).

## Gap register (P0/P1 focus)
- **L001 (P0)**: mount TestCoveragePanel on Story/Feature/Epic detail (story mode + feature/epic parent_key rollup). Files: story/feature/epic CatalystView*.
- **L002 (P0)**: TraceabilityPage join ph_issues on external_key=issue_key → JiraIssueTypeIcon + status_category lozenge + clickable key; keep v_tm_requirement_coverage for run status. TraceabilityPage:62-108.
- L003 (P1): incident "Link test case" create surface (tm_requirement_links external_key=INC key; CRE-clean, no DDL).
- L004 (P1): CatalystViewDefect:193 read real parent issue_type, render icon only when known.
- L005 (P1): widen test-case→WI picker beyond Story/Epic/Feature (Task/BR/Incident) CatalystViewTestCase:521.
- L006 (P1): ReleaseSprintSection repoint off dead rh_release_sprints/sprints → live source (see sprint spec).
- L007 (P1): tm_test_cycles.sprint_id populate + FK.
- L008/L009/L010 (P2): deprecate linked_story_key; defect→incident tm_defect_links; sets/scenarios rollup.

## SPRINT WIRING SPEC (Vikram's rule: sprints from project sprint/iteration field)
Live staging: ph_issues.sprint_id populated on 737 issues, 737/737 match ph_jira_sprints.id (but NO declared FK except tm_defects.sprint_id). sprints=0, iterations=0, release_sprints=0, rh_release_sprints=MISSING, ph_jira_sprints=30 rows. tm_test_cycles.sprint_id 0/4 populated. Project story sprint FIELD = **ph_issues.sprint_release (JSONB array of sprint NAMES)**, edited via EditableSprintReleases (EditableFields:1503), options from ph_versions.

**CANONICAL SPRINT ENTITY = ph_jira_sprints (30 rows, backs sprint_release). iterations = empty SAFe PI/team model — DO NOT wire TestHub to it.**
- Canonical hook = useSprintsByProject (ph_jira_sprints) — already used by cycle create.
- Cycle→sprint: tm_test_cycles.sprint_id → ph_jira_sprints.id (add FK, make picker mandatory; useTestCycles:210 already writes field).
- Kill dead paths: ReleaseSprintSection off rh_release_sprints/sprints; retire SprintSelector iterations query.
- Bridge: sprint_release stores NAMES not ids → join ph_jira_sprints.name = sprint_release[].name (pattern already in SprintTestingStatusBody:48-54). Surface once as shared resolver.

## Work-item-type coverage target (all zero-DDL via tm_requirement_links + tm_defect_links/incident_work_items)
cases → Story/Feature/Epic/Task/BR/Incident; validation cycles → Incident; defects → any originating WI + incident. CRE bans (C1 BR↔QA-Bug, C3 Incident↔QA-Bug) apply only to ph_issue_links, NOT the tm_ coverage mechanism.

## Key files
TestCoveragePanel.tsx · story/feature/epic CatalystView*.tsx · TraceabilityPage:62-108 · CatalystViewTestCase:521 · CatalystViewDefect:193 · ReleaseSprintSection:87-107 · useSprintsByProject.ts + useTestCycles:210 · SprintTestingStatusBody:34-54 (name-join pattern to reuse).
