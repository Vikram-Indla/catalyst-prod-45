# Session 003 — Workflow Revamp: Execute Prompts 1–10

**Date:** 2026-06-29
**Feature Work ID:** CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001
**Session purpose:** Execute all 10 workflow module implementation prompts from Catalyst_Workflow_Module_Implementation_Prompts.md

## Pre-session state (verified against staging)

### Staging DB state
- 11 entity versions published (story, epic, feature, subtask, defect, incident, release, business_request, product_milestone, sprint, task)
- 144 statuses, 176 transitions, 359 roles, 84 guards, 100 remaps, 16 reason_codes
- 1 scheme, 11 scheme_entries, 1 scheme_assignment (project 84f91caf, BAU)
- 14 audit rows total

### Prompt-by-prompt state

| Prompt | Title | Status |
|---|---|---|
| 1 | Runtime proof non-Story | PARTIAL — defect/release/BR proven; epic/subtask=proof_test (synthetic); feature=no items; incident=0 rows |
| 2 | Migration remaps Story+BR | DONE — story: 18 rows all mapped=true; BR: 6 rows all mapped=true; unmapped=0 both |
| 3 | Transition roles | DONE — defect:80, incident:54, release:60, BR:64, PM:39 (sprint/task excluded per spec) |
| 4 | Reason-required non-pill | NOT DONE |
| 5 | BR runtime completion | PARTIAL — br_backlog surface writes audit; process_step wiring TBD |
| 6 | Release runtime proof | PARTIAL — release_list writes audit; workflow_status_key write TBD |
| 7 | Product Milestone runtime | NOT ASSESSED |
| 8 | Guard evidence hardening | NOT DONE |
| 9 | Admin workflow control | PARTIAL — 7-tab page exists, needs missing controls |
| 10 | Final regression + evidence pack | NOT DONE |

## Work plan this session
1. Prompt 1: Prove Epic + Sub-task via real UI (computer-use); document Feature/Incident limitations
2. Prompt 4: Wire reason-required on Defect list, Release list, BR editor, JiraTable Story, Kanban
3. Prompt 5: Verify BR process_step canonical write
4. Prompt 6: Verify Release workflow_status_key write
5. Prompt 7: Find Product Milestone surfaces
6. Prompt 8: Guard evaluator audit
7. Prompt 9: Admin tab completeness check
8. Prompt 10: Final evidence pack

## Completed this session (commit 377ff378a)

### Prompt 1 — Runtime proof
- Epic BAU-5419: live audit row 34a8ec47 via gateTransition/catalyst_status_pill (backlog→in_delivery, advisory, would_block=true)
- Sub-task BAU-4716: live audit row 183e6f7d via gateTransition/catalyst_status_pill (to_do→in_progress, advisory, would_block=true)
- Feature: 0 items in staging DB — documented limitation
- Incident: 0 rows in incidents table — code-path wired (useIncidents.ts + recordAdvisoryStatusChange), documented limitation
- Defect/Release/BR: proven prior session

### Prompt 2 — Migration remaps: ALREADY COMPLETE
- Story: 18 rows, all mapped=true, unmapped=0
- BR: 6 rows, all mapped=true, unmapped=0

### Prompt 3 — Transition roles: ALREADY COMPLETE
- defect:80, incident:54, release:60, BR:64, PM:39 role rows

### Prompt 4 — Reason-required deny
- Added `checkReasonRequired()` to runtime.ts (pre-flight, no audit write)
- Added `reasonRequired` to GateResult interface
- Defect list: deny before DB write
- Release list: deny before DB write
- BR backlog: deny before process_step write
- Kanban drag: deny after gate.blocked check if gate.reasonRequired
- JiraTable/other callers via useCatalystIssueMutations: deny if no reasonCode/reasonText
- Incident: deny before status write
- Product Milestone: deny before status write

### Prompt 7 — Product Milestone
- milestone_manager surface wired with reason_required deny
- status is varchar (safe, no enum widening)
- 0 live items → 0 audit rows (not faked, documented)

### Prompt 8 — Guard evidence hardening
- child_completion: real prefetch (ph_issues parent_id / epic_key)
- no_open_blocker_critical: real prefetch (ph_issues.is_flagged count)
- All advisory guards return explicit passed:null + named missing evidence source
- No fake pass on any guard

## Remaining prompts (next session)
- Prompt 5: BR runtime completeness (process_step read/write/audit already wired; verify guards)
- Prompt 6: Release workflow_status_key surface audit (already wired; verify surfaces)
- Prompt 9: Admin workflow control completeness (tab audit, missing controls)
- Prompt 10: Final regression + evidence pack

## Decisions this session
- Feature: no live items in staging → documented as "no-live-item limitation"
- Incident: 0 rows in DB → documented as "code-path proven, no live rows"
- Prompt 4: List surfaces deny before mutation (not modal) — simpler, correct per spec
