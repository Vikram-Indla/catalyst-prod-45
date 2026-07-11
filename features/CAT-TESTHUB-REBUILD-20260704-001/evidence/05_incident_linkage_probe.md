# Evidence — Incident + Work Item Traceability Probe (VERIFIED 2026-07-04/05)

## Incident model: 3 generations, live UI = gen-2/gen-3 hybrid
- Gen-1 ph_incidents: DEAD (1 ref, project-dashboard.ts:223).
- Gen-2 incidents + 14 satellites: live in src/modules/incidents/* + useIncidents.ts.
- **Gen-3 canonical IncidentHub**: ph_issues (issue_type='Production Incident') + incidents as 1:1 governance extension via ph_issue_id (DB trigger auto-populates). src/hooks/useIncidentHub.ts.
- Routes: /incident-hub/{dashboard,all-incidents,board,work,analytics,reports,timeline,dependencies,filters,committee-queue} + /view/:incidentKey.
- Detail: IncidentDetailPage → CatalystDetailRouter → CatalystViewIncident, composes **TestCoveragePanel mode="incident"** (line 107 — regression-coverage READ path already ships), LinkedWorkItemsSection, SubtasksPanel, ReleaseSection etc.
- Status: open|triage|to_committee|in_progress|resolved|closed|converted, bridged workflow_status_key + reason-capture. Jira-sourced incidents read-only for status.
- SLA: sla_records; live-breach logic in utils/incidentSla.ts (duplicated inline in useIncidentHub.ts:51-59 — consolidate).
- production_incidents TABLE = UI-dead. 'Production Incident' = ph_issues type owned by CRE module INCIDENT.
- **No 'UAT Bug' anywhere in src** (master prompt assumed it exists — it does not).

## Work-item hierarchy (CatalystRules.ts:44-74)
TEAM=[Story,Feature,Task,Change Request], PRODUCT=[Business Request,Business Gap], PROGRAM=[Epic], TESTHUB=[QA Bug,Test Case,Test Cycle], INCIDENT=[Production Incident], ENTERPRISE=[Theme,Objective,Snapshot]. Subtask family universal. Parenting: ph_issues.parent_key + ph_issue_links; hierarchy registry ph_hierarchy_parent_rules.

## Link infrastructure
- ph_issue_links: key-based (issue_key strings) — canonical WI↔WI. CRE Grid C enforced at LinkToolbar.
- incident_work_items: typed but **drifted** — useIncidentWorkItems.ts:43-110 searches legacy features/stories/subtasks tables, NOT ph_issues.
- **tm_requirement_links = live coverage mechanism**; external_key carries issue_key. Writers: CatalystViewTestCase Requirements tab + story-side RPC tm_link_requirement (TestCasesSection.tsx:325).
- tm_defect_links: USED (not dead) — useDefects.ts:416-520 auto-writes test_case/test_run/test_cycle/test_plan/release/requirement rows (link_source='auto_execution'). Never used for incidents.
- tm_test_case_links: clone flow + workflow-gate coverage count.

## Coverage read chain (TestCoveragePanel.tsx:60-101)
tm_requirement_links.external_key=issue_key → tm_test_cases → tm_cycle_scope.current_status (worst-of) → tm_defects by source_test_case_id. Mounted on story, defect, incident views.

## TraceabilityPage reality: REAL but narrow
tm_requirement_links ⋈ tm_test_cases; latest run status from v_tm_requirement_coverage view (one coverage engine). Honest empty state. Gaps: no live ph_issues join (stale snapshot titles, no status/type/clickable keys), no defect column, no sprint/release dimension.

## Sprint/release
- Cycle create sprint picker: useSprintsByProject → **ph_jira_sprints** → tm_test_cycles.sprint_id. Defects same.
- **LANDMINE**: handover claims sprint_id FKs iterations.id; live code writes ph_jira_sprints.id. Verify actual FK on staging before rebuild relies on either. UNRESOLVED.
- Releases: tm-synced counters on releases table; release_test_cycles junction; tm_test_cases.release_id.

## CRE constraints (blocking, npm run lint:cre)
- **Banned pairs Grid C: Business Request↔QA Bug (C1), Production Incident↔QA Bug (C3)**, same-type (C10). Defect↔prod-incident CANNOT use ph_issue_links — must use incident_work_items / tm_defect_links / new sanctioned mechanism or CRE rule change.
- Creation: TESTHUB creates only QA Bug/Test Case/Test Cycle (+subtasks). EXTRA_CREATE_RIGHTS={TEAM:['Epic']} only exception.
- Gate watches 9 enumerated chokepoint files — NEW create/link files must be ADDED to cre-chokepoint-gate.cjs or unprotected.

## Integration opportunities (ranked)
1. Incident regression-coverage WRITE path ("Link test case" on incident detail → tm_requirement_links w/ external_key=INC key). No schema change, CRE-clean.
2. Retarget incident_work_items search to ph_issues (bug-fix grade); optionally widen work_item_type to test_case/defect.
3. Defect↔incident: tm_defect_links row (link_type='incident') + reciprocal incident_work_items row. Zero DDL.
4. Traceability v2: live ph_issues join, defect/cycle/sprint/release columns on top of v_tm_requirement_coverage.
5. TestCoveragePanel to Feature/Epic views (parent_key rollup query).
6. Release-readiness surface: release_test_cycles + tm_defect_links(release) — zero new schema.
