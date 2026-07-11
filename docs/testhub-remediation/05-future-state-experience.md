# Test Hub Future-State Experience

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** DRAFT FOR OWNER APPROVAL — no implementation authority

## Experience thesis

Repair the existing Test Hub in place. Keep its proven Catalyst shells and make
the lifecycle coherent, visible, safe, and evidence-backed. The target model is:

`Test Space → Case Version → Plan Baseline → Execution Manifest → Cycle → Run → Result → Evidence/Defect → Traceability → Reports`

Screen selection is Catalyst-native: existing Test Hub shells first, then
Catalyst canonical components, then Atlaskit primitives. External research is
archived and non-governing. The proposed screen-by-screen choices are in
`09-premium-testhub-design-direction.md` for owner review.

## Global frame

- Active Test Space is visible and authorized on every route.
- Lifecycle navigation follows Repository → Plans → Executions → Cycles →
  Traceability → Reports; retired Test Sets is removed with redirects retained.
- Each page has one primary stage action; row/bulk actions remain secondary.
- Status distinguishes draft, review, approved, locked, active, completed,
  archived, denied, pending sync, conflict, and failed without invented defaults.
- Summary facts always link to and reconcile with their drill-down rows.

## Primary journeys

### 1. Enter or switch Test Space

Resolve authorized spaces server-side, visibly select one, persist it as a
preference, and reload every route against the same scope. Missing/unauthorized
spaces show not-found or denied without leaking counts or names.

### 2. Author and govern a case

Create case, steps, labels, and initial version atomically. Edit as a governed
aggregate. Submit an immutable version for role-enforced review. Approval pins
that exact version for planning. Archive preserves history; restore is explicit,
audited, and creates a new version rather than rewriting the past.

### 3. Plan and hand off execution

Define objective, scope, dates, release/sprint/team, environment, entry/exit
criteria, and approved case versions. Publish an immutable baseline. One action
creates an Execution Manifest and optional first Cycle without recreating scope.

### 4. Execute a cycle

Assign testers, pass readiness checks, start a server-numbered run, record step
verdicts/actuals/notes/time, upload private evidence, and create a fully linked
defect. Completion is atomic/idempotent. Retrospective shows the exact case
version, every result, evidence, defect, actor, timestamp, and override reason.

### 5. Work offline and recover

The queue is namespaced by user and Test Space. Users see pending, syncing,
applied, conflict, failed, retry, and cancel states. Evidence blobs are retained.
Server receipts make retry safe and prevent duplicate run numbers/results.

### 6. Trace and report

One fact layer connects requirement → case version → plan → execution → cycle →
run → result → evidence/defect. Traceability starts with an accessible grid and
hierarchy. Reports use the same facts, display scope/filters/time range, reconcile
totals to drill-down rows, and export exactly the visible governed dataset.

## Screen blueprint

| Surface | Information hierarchy | Primary action | Attention/recovery |
|---|---|---|---|
| Dashboard | Test Space identity → readiness/attention → lifecycle counts → recent audited activity | Continue highest-priority governed work | Unlinked scope, failing/blocked runs, denied access, stale facts |
| Repository | Folder/context → search/filter → JiraTable → selection/bulk actions | Create case | Archive/restore, approval state, version conflict, volume |
| Case detail | Identity/status → steps/data → requirements → versions/approval → evidence/activity | Submit version / approve (role-dependent) | Save conflict, rejected review, historical version |
| Plans | Baseline identity/readiness → scope → criteria → dates/team/environment → activity | Publish baseline / create Execution | Unapproved cases, stale baseline, unmet entry criteria |
| Executions/Cycles | Manifest/readiness → scope/assignment → cycle progress → runs | Start Cycle / Run selected case | Partial scope, conflicts, reopen reason, pending sync |
| Runner | Case/version context → focused current step → actual/verdict/evidence → case navigation | Save result / complete run | Offline state, failed upload, duplicate/conflict, forced result reason |
| Retrospective | Reconciled result → step details → evidence → defects → immutable history | Retry governed scope / open defect | Missing evidence, incomplete lineage, override audit |
| Traceability/Reports | Scope/filters → OK vs needs attention → accessible JiraTable → drill-down/export | Resolve selected gap / export | Contradiction, stale facts, denied drill-down |
| Permissions | Roles → descriptions/scope/member counts → permission matrix → denied-state preview | Add/edit role | Server-policy mismatch blocks completion |

## Required state package

Every material surface must define loading, empty, populated, error, denied,
archived/restorable, high-volume/paginated, concurrent conflict, partial
completion, offline/pending sync, retry success/failure, light, dark, keyboard,
focus, and supported responsive widths. Runner additionally covers Pass, Fail,
Block, Skip, Hold, forced verdict with reason, mixed results, resume, duplicate
submission, and conflict.

## Canonical constraints

Use JiraTable and existing Catalyst shells/components first. Use ADS primitives
through existing wrappers for actions, menus, inputs, dialogs, flags, lozenges,
spinners, and empty states. No custom table, tree, status, menu, modal, or color.
Unknown data renders as unknown. Advanced traceability canvas is deferred until
the accessible fact-backed grid is correct.
