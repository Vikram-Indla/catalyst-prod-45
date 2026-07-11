# Test Hub Remediation Issue Matrix

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** COMPLETE FOR OWNER DISPOSITION  
**Sources:** current-state revalidation, live runtime sweep, canonical discovery,
validation evidence, seven discovery agents, and Catalyst/ADS canonical evidence.

## Preservation contract

Regression-protected capabilities are: registered routes; canonical dashboard,
Kanban, Backlog, JiraTable, detail, timeline, dependencies, comments, and report
shells; folder/case happy-path CRUD; online verdict controls; normal defect
creation; traceability hooks and 31 report routes; zero Test Hub hard-coded
colors; and the execution-deletion guard tests.

## P0 — production blockers

| ID | Finding / lifecycle | Disposition | Dependency | Binary acceptance proof |
|---|---|---|---|---|
| P0-01 | Any authenticated user can effectively access any Test Hub project; plan/folder/comment/attachment policies are unsafe. All stages. | Remediate; preserve permission UI. | Authoritative membership source. | Role × Test Space × operation RLS matrix passes allowed and denied paths; cross-space access fails at DB level; advisor clean. |
| P0-02 | Evidence bucket is public/unrestricted; storage and metadata can partially persist; `run`/`test_run` vocabulary conflicts. Result → Evidence. | Remediate; preserve upload/display. | P0-01. | Private signed access, MIME/size/checksum tests, no orphan rows/objects, authorized CRUD browser journey. |
| P0-03 | Scope removal can cascade-delete runs, results, and lineage. Cycle → Result. | Replace destructive delete with archive/tombstone and history guards. | FK inventory and snapshot. | Completed evidence remains queryable after scope change; actor/reason audited; replay/rollback passes. |
| P0-04 | No explicit Test Space contract; routes choose different projects/scopes and runtime counts disagree. Test Space → all stages. | Add one visible route-scoped context; preserve remembered preference only as convenience. | P0-01. | Switch/reload/back/forward keep one authorized space; all queries/mutations/cache keys include it; fixture counts reconcile. |
| P0-05 | Plan, Execution, and Cycle are separate records without governed handoff or version-pinned scope. Case → Plan → Execution → Cycle. | Add immutable Plan Baseline and Execution Manifest; preserve list/detail shells. | P0-04 and governed case versions. | One approved plan action atomically creates exact execution/cycle scope; rollback leaves no partial records; counts reconcile. |
| P0-06 | Run/result/evidence/defect completion is multi-call, non-idempotent, race-prone, and offline-unsafe. Cycle → Defect. | Add atomic/idempotent server contracts and visible sync ledger; preserve verdict UX. | P0-02/03/05. | Retry, duplicate, concurrency, offline, and failure-injection tests produce one durable run and complete lineage. |
| P0-07 | Execution/cycle/evidence actions target stale or wrong schema fields and bypass generated types. | Repair contracts and regenerate types. | Schema source of truth. | No touched-path type bypass; contract/browser tests show no undefined-column failures. |
| P0-08 | Duplicate migration version and committed fallback credential make replay/certification unsafe. Delivery. | Owner-approved ledger repair; rotate/remove credential; deterministic fixtures. | Dedicated worktree. | Secret scan clean; migration ledger 1:1; clean replay and isolated seed/cleanup pass. |
| P0-09 | Runner/traceability have keyboard blockers and contradictory `0/1 PASSING` state. Run → Traceability. | Repair semantics; accessible grid/hierarchy before advanced canvas. | P0-06 and unified facts. | Keyboard/screen-reader/axe checklist passes; failed facts never render or announce passing. |

## P1 — operational trust

| ID | Finding | Disposition / acceptance proof |
|---|---|---|
| P1-01 | Case create/edit/version/restore/approval is multi-call and not immutably governed. | Atomic aggregate with initial version, role-enforced approval, immutable approved version, and restore-as-new-version; Plan consumes exact approved version ID. |
| P1-02 | Repository, Board, and My Work disagree on archive/delete; board create omits a required key. | One server archive/restore contract, generated key, archived-hidden default, no physical deletion of governed history. |
| P1-03 | Saved Filters queries `ph_issues`; starred calls error. | Scope filter facets/results to Test Hub facts; full save/reload/share round-trip; zero related network errors. |
| P1-04 | Two requirement-link models and client-built report facts contradict traceability/runtime totals. | One lifecycle fact model; SQL totals equal grid, reports, drill-down, saved views, and export. |
| P1-05 | Retrospective omits step actuals/evidence/defects and maps Hold incorrectly. | Display immutable version plus every result, actual, evidence, defect, status, actor, and time; test all verdicts. |
| P1-06 | 25-row/default caps and folder-descendant semantics silently truncate data. | Visible server pagination and deterministic 1k/10k proof for totals, sort, filter, selection, and descendants. |
| P1-07 | Timeline/dependencies are unscoped and UUID-oriented. | Preserve canonical views; feed governed scoped adapters and typed slug/key routes; counts reconcile. |
| P1-08 | Only one 3-test unit suite is repeatable; Playwright mutates shared staging and is absent from CI. | Isolated CI coverage for RPC/RLS/lifecycle/accessibility/visual/offline/concurrency/volume/reconciliation with deterministic cleanup. |

## P2 — coherence and polish

| ID | Finding | Disposition / acceptance proof |
|---|---|---|
| P2-01 | Canonical shells coexist with raw/shadcn controls and 360 focused lint findings. | Surgical canonical replacement only after functional contracts; zero new lint/ADS/a11y debt; strict color gate stays zero. |
| P2-02 | Navigation exposes retired Test Sets and hides Executions. | Owner-approved lifecycle order; remove dead concept, expose governed execution, retain legacy redirects and keyboard/current-route behavior. |
| P2-03 | Dashboard/Plans lack visible scope and truthful readiness. | Keep `ProjectDashboardPage`; use reconciled lifecycle facts and the Catalyst-native summary/attention hierarchy. |
| P2-04 | Current routes lack complete dark/responsive/denied/error/volume proof. | Current-route light/dark and supported-width evidence; no prototype used as certification. |

## Dependency order

1. Approval, isolated worktree, credential rotation, and ledger repair.
2. Authorization, private evidence, security-invoker views, and retention.
3. One active Test Space contract.
4. Atomic case/version/approval/archive.
5. Version-pinned Plan → Execution → Cycle.
6. Atomic/idempotent Run → Result → Evidence → Defect and offline recovery.
7. Unified traceability and reconciled reports.
8. Canonical UI, accessibility, volume, and complete certification.

Every row remains planning-only until owner disposition is recorded and an
exact implementation slice is approved in `03_PLAN_LOCK.md`.
