# Test Hub Technical Wiring Blueprint

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** DRAFT FOR OWNER APPROVAL — proposed contracts, not implementation

## Core invariant

Every child belongs to the same Test Space; every execution traces to an
immutable approved baseline; every result/evidence/defect write either completes
atomically or remains explicitly recoverable.

## Aggregate ownership

| Aggregate | Required contract |
|---|---|
| Test Space | Explicit project key; server-authoritative membership/permission; persisted preference is never authority. |
| Case / Case Version | Atomic case/steps/labels/activity; append-only complete snapshot; approval references an exact immutable version. |
| Plan / Plan Baseline | Editable draft; publication creates immutable ordered case-version scope, criteria, approvals, and checksum. |
| Execution / Manifest | Plan-derived or explicitly justified ad hoc; immutable scope, case versions, environment, assignments, requirements, provenance. |
| Cycle / Scope | Exactly one Execution; scope references manifest item and pinned case version; evidence-bearing scope cannot be destructively removed. |
| Run / Result | Server-numbered idempotent attempt; immutable step snapshots; aggregate status and latest scope state computed transactionally. |
| Evidence | Private storage, pending/finalized record, checksum, MIME/size/scan/retention state, signed access, project ancestry. |
| Defect | Atomic defect plus complete Case/Plan/Execution/Cycle/Run/Result/Requirement lineage. |
| Trace/report fact | Security-invoker lifecycle projection shared by Traceability and Reports. |

## Proposed server boundaries

- `tm_create_case_aggregate` — allocate key and create case, steps, labels,
  initial version, activity, and revision in one transaction.
- `tm_update_case_aggregate` — optimistic revision check; patch aggregate and
  append one version atomically.
- `tm_restore_case_version` — copy a historical snapshot into a new version.
- `tm_transition_case` — server-enforced draft/review/approved/deprecated/archive
  transitions with reviewer, reason, time, and exact version.
- `tm_publish_plan_baseline` — reject unapproved cases; publish immutable plan
  version and ordered pinned case-version items.
- `tm_create_execution_from_plan` — validate space/permission, create Execution,
  copy Manifest, optionally create Cycle, seed scope, and return checksums/counts.
- `tm_create_cycle_from_execution` / `tm_transition_cycle` — enforce manifest,
  readiness, compatibility, terminal-scope, and authorized override rules.
- `tm_submit_run` — claim idempotency receipt, lock/allocate run number, insert
  run/results, compute aggregate, update scope, and emit audit event atomically.
- `tm_begin_evidence_upload` / `tm_finalize_evidence_upload` — durable two-phase
  private upload with reconciliation of stale pending/orphan objects.
- `tm_create_defect_from_run` — insert defect and all selected lineage in one
  transaction; replay returns the same defect.

Names are placeholders. Exact signatures, tables, policies, and files require an
approved two-hour Plan Lock slice.

## Data and safety rules

- One authorization source: project membership plus `tm_user_roles` and
  `tm_permissions`; the admin matrix is presentation, never authority.
- Every RLS policy derives Test Space directly or through immutable ancestry;
  cross-space foreign-key combinations are rejected server-side.
- All Test Hub views use `security_invoker=true` or permission-filtered RPCs.
- Evidence bucket is private; path is project/entity/evidence scoped; no public URL.
- No hard delete after downstream evidence exists; use archive/tombstone and
  append-only transition/audit history.
- Plan Baselines and Execution Manifests are immutable; mutable roots carry
  revision numbers for optimistic concurrency.
- Unique constraints protect `(cycle_scope_id, run_number)` and idempotency
  receipts; result uniqueness is per run and step snapshot.
- All-skipped resolves to skipped, never passed; unknown status stays unknown.

## Query/cache contract

One `testHubKeys` factory must include Test Space plus stable display key for
cases, plans, executions, cycles, runs, evidence, defects, traceability, reports,
and permissions. Mutation invalidation targets only the aggregate, its parent
list, lifecycle facts, and affected trace/report facts. Free-form unscoped keys
are removed from touched paths.

## Offline contract

Use a user + Test Space namespaced IndexedDB ledger. Each operation stores client
operation ID, payload hash, dependencies, evidence blobs, expected revision, and
state: `draft → pending → syncing → applied | conflict | failed`. Same ID/hash
returns the server receipt; same ID/different hash is rejected. Logout or space
switch cannot replay another namespace. No failed child write is silently dequeued.

## Reconciled fact model

Security-invoker lifecycle facts must carry Test Space, Plan Version, Execution
Manifest, Cycle, Case Version, scope, latest/all runs, terminal result,
requirements, evidence counts, and defect lineage. Mandatory invariants:

- Plan baseline count/checksum equals plan-derived Execution Manifest.
- Every Cycle scope row belongs to its Manifest and pinned Case Version.
- Every Run belongs to exactly one scope item; terminal result count matches the
  pinned step count except an explicit zero-step case.
- Scope latest status equals the latest accepted Run.
- Coverage, traceability labels, report totals, drill-down rows, and exports all
  derive from the same accepted facts.

## Dependency-ordered two-hour slices

0. Isolated worktree, credential rotation, duplicate-ledger decision, clean replay.
1. Root authorization and membership RLS.
2. Child ancestry policies and security-invoker views.
3. Private evidence contract.
4. Retention FKs and archive/tombstone guards.
5. Route-scoped Test Space and query-key factory.
6. Atomic Case create + initial version.
7. Atomic update/restore/approval.
8. Immutable Plan Baseline.
9. Plan → Execution Manifest transaction.
10. Execution → Cycle/scope and state guards.
11. Idempotent Run/Result and server numbering.
12. Evidence begin/finalize/reconciliation.
13. Atomic Defect lineage.
14. Offline ledger and conflict UI.
15. Lifecycle fact views and invariant SQL.
16. Traceability/Reports fact-layer wiring.
17. Permission/canonical UI and denied states.
18. Volume, accessibility, visual, responsive, dark, and CI certification.

Each slice requires exact files, a unique migration where applicable, staging
project-ref assertion, replay/rollback or forward-repair, focused tests, raw
evidence, no new static/ADS debt, and current screenshots for UI.
