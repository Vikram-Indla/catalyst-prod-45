# Test Hub Remediation — Owner Approval Packet

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Decision requested from:** Vikram / JK  
**Current authority:** PLANNING ONLY; `03_PLAN_LOCK.md` remains `NOT_WRITTEN`

**Current design proposal:** `09-premium-testhub-design-direction.md`

## Recommended decision

Approve repair-in-place of the existing Test Hub, with security, retention, and
governed lifecycle foundations before visual remediation. Preserve proven
canonical shells and behaviors. Execute only dependency-ordered slices of no
more than two hours, each under its own approved Plan Lock boundary.

## Approval basis

- Current-state and 15-route runtime evidence show inconsistent scope, lifecycle,
  coverage, reports, permissions, and ownership.
- The issue matrix records 9 P0, 8 P1, and 4 P2 remediation groups plus explicit
  preserved behavior.
- The proposed screen choices are Catalyst-native: existing Test Hub shells,
  Catalyst canonical components, and Atlaskit primitives with ADS tokens only.
- The future-state design and wiring blueprint define the complete governed
  lifecycle and recovery/safety states.
- Seven discovery roles and the Advanced Council agree that security and data
  foundations precede canonical UX remediation.

## Proposed scope and order

1. Credential/migration hygiene and deterministic certification data.
2. Authorization, private evidence, security-invoker views, and retention.
3. One active Test Space across all routes and contracts.
4. Atomic Case/version/approval/archive.
5. Version-pinned Plan → Execution Manifest → Cycle.
6. Atomic/idempotent Run → Result → Evidence → Defect plus offline recovery.
7. One traceability model and reconciled report facts.
8. Canonical UI, accessibility, volume, and full certification.

Advanced traceability canvas, speculative analytics, broad visual rewrite, and
destructive migration of proven behavior are excluded unless separately approved.

## Owner decisions required

Record `YES`, `NO`, or a named alternative for every item:

1. Approve repair-in-place rather than a visual rewrite?
2. Approve security/storage/retention as the first implementation phase?
3. Which project-membership source is authoritative for Test Space access?
4. Approve one visible active Test Space persisted across all Test Hub routes?
5. Approve immutable approved Case Versions and version-pinned Plan Baselines?
6. Approve Plan as the required source for governed Execution creation?
7. Approve an immutable Execution Manifest for scope, versions, environment,
   assignments, requirements, and approvals?
8. Approve archive/restore and non-destructive retention for governed records?
9. Approve private evidence storage with authorization, MIME/size checks, signed
   access, checksums, reconciliation, and audited deletion?
10. Approve atomic/idempotent server contracts for aggregate workflows?
11. Approve a tester-visible offline sync ledger and explicit conflict handling?
12. Which requirement-link model becomes authoritative?
13. Approve accessible traceability grid/hierarchy first and defer canvas?
14. Approve deferring favorites/recent/advanced analytics until fact truth is certified?
15. Approve canonical replacement of raw/shadcn controls without changing the
    established screen families?
16. Approve English/LTR scope while retaining dark/responsive certification?
17. Approve the dependency order and two-hour slice discipline?
18. Does this decision authorize planning only or the first named implementation
    slice? Record the exact boundary.

## Binary acceptance gate before Plan Lock approval

- [ ] Every finding has Preserve, Remediate, Defer, or Reject disposition.
- [ ] Every material UX choice has a named Catalyst canonical or Atlaskit component and ADS token rule.
- [ ] Active Test Space and membership authority are explicitly decided.
- [ ] Complete lifecycle ownership and transitions are documented.
- [ ] Plan Baseline and Execution Manifest immutability are approved.
- [ ] Multi-write workflows define atomicity, idempotency, retry, and rollback.
- [ ] History rules prevent deletion of completed evidence.
- [ ] Evidence is private, restricted, project-scoped, and audited.
- [ ] One requirement-link and lifecycle-fact model is selected.
- [ ] Reports, drill-downs, and exports reconcile to the same facts.
- [ ] Canonical component mapping and all error/denied/offline/volume/dark/
  responsive/keyboard states are specified.
- [ ] Migration replay, RLS, deterministic data, CI, accessibility, lifecycle,
  offline, concurrency, volume, and regression validation are defined.
- [ ] Every implementation slice has exact files, rollback boundary, and ≤2h scope.
- [ ] Owner answers all 18 questions and records the implementation boundary.

## Stop conditions

Stop if approval is absent/ambiguous; membership or requirement authority is
unresolved; migration replay is unsafe; completed evidence can be deleted;
authorization/private storage cannot be proven; any multi-write path lacks
atomicity/idempotency; routes infer different Test Spaces; facts do not reconcile;
canonical components are bypassed; preserved behavior regresses; required
failure/accessibility/visual evidence is absent; the dirty shared checkout or
unrelated files would be touched; or a slice exceeds two hours.

## Requested owner response

Approve or amend the 18 decisions above. After the exact authorization boundary
is recorded, the next session may write a slice-specific `03_PLAN_LOCK.md` draft.
No production code, schema, policy, storage, or workflow change is authorized by
this packet alone.
