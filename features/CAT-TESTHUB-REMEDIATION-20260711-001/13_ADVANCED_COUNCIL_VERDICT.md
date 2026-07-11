# ADVANCED COUNCIL VERDICT v3: Test Hub Remediation

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Debate mode:** WR  
**Read-only council completed:** YES  
**Repo evidence level:** HIGH for code/schema; MEDIUM-HIGH for current signed-in visuals (15-route read-only sweep)  
**Implementation allowed now:** NO

## 1. Neutral brief

Revalidate the entire Test Hub, preserve proven behavior, correct every broken or
unsafe lifecycle scenario, select Catalyst-native experience patterns, define
the complete implementation contract, and stop for explicit approval before
production changes.

## 2. Enforcement reality check

| Rule | Enforcement | Evidence/current result |
|---|---|---|
| Feature Work ID and Plan Lock | Review + repo workflow | Active ID exists; Plan Lock remains NOT_WRITTEN |
| No pre-approval implementation | Review/feature contract | Production Test Hub code unchanged |
| No hard-coded colors | Pre-commit/CI ratchet | `lint:colors:gate` passes 0/0; Test Hub strict gate passes 0 across 116 files |
| ADS typography/spacing debt | Pre-commit/CI ratchet | `audit:ads:gate` passes; repo counts below baseline |
| Accessibility source audit | Baseline ratchet | Passes 343 findings within baseline 345; this does not certify Test Hub journeys |
| Contrast | Automated gate | Fails with 116 repo-wide findings, mostly outside Test Hub; baseline/ownership must be resolved before UI signoff |
| Canonical component choice | Lint + review | Focused lint reports restricted imports/bespoke UI; 72 raw buttons and 3 raw tables remain |
| JiraTable first | Review + stories | JiraTable proven suitable; raw admin tables violate rule |
| DB/RLS correctness | Policy tests + advisor + review | No Test Hub policy suite; live advisor reports six ERROR views |
| Screenshot acceptance | Manual/browser | Current 15-route runtime captures exist; implementation/state-matrix signoff remains pending |
| External market evidence | Archived research | Non-governing by owner direction; Catalyst/ADS is the sole design authority |
| Two-hour slices | Plan Lock/review | Planner decomposed work into bounded slices |

## 3. Mandatory report pack

### R1 — Context manifest

- Feature: Test Hub remediation.
- Branch: shared dirty `main`; HEAD `34ca56ea6`.
- Production implementation forbidden.
- Routes: all `/testhub/*` routes plus `/admin/test/*`.
- Current evidence: repository, live staging, tests, prior artifacts.
- Missing evidence: implementation-state screenshots, full state matrix, and owner signoff.

### R2 — Canonical component map

Keep and extend `ProjectDashboardPage`, `KanbanPage`, `BacklogPage`, `JiraTable`,
`CatalystDetailRouter`, `CatalystViewBase`, `TimelineView`, `DependenciesView`,
`TmCommentsSection`, and `ReportChart`. Parameterize `PageTree`; extract a shared
Test Hub attachment section. No new hand-built table/modal/menu/tree is justified.

### R3 — Functionality preservation matrix

Verdict: **ADDITIVE/NEUTRAL only**. Preserve route coverage, canonical shells,
case/folder happy-path CRUD, online verdict controls, defect prompt, traceability
data hooks, report registry, color purity, and the execution-delete guard. Any
loss of these is a stop condition.

### R4 — ADS token and styling audit

Color purity is green. Canonical consistency is not: focused Test Hub lint fails
with 147 errors and 213 warnings; shadcn AI dialog, raw admin tables, raw runner,
repository, report, traceability, and step controls require approved remediation.

### R5 — Dark mode and RTL integrity

Test Hub is currently English-only, so full RTL is not in scope. Dark-mode and
responsive proof are missing for current `/testhub/*` screens. Historical lab
screenshots are not accepted.

### R6 — DB/RLS/data contract

Hard stop. Live access is permissive, plan/folder/comment/attachment policies are
not project-safe, evidence storage is public, six views lack `security_invoker`,
history can cascade-delete, types are stale, and migration ledger has a duplicate
version.

### R7 — Route/hook/service/integration blast radius

Blast radius covers route builders/resolvers, Test Space resolver, all Test Hub
pages, test-management hooks, shared Board/Backlog adapters, Supabase migrations,
storage, generated types, reports, CI, and certification tests. Canonical shared
factories are forbidden unless separately re-approved.

### R8 — UX parity/ADS pattern

Current in-repo pattern is strong but inconsistent. Release Hub governed detail
is the best local reference for scope/readiness/sign-offs/audit. Final external
pattern selection is pending owner review of the Catalyst-native screen plan.

### R9 — Accessibility and keyboard

P0 failures include runner case rows, traceability hierarchy/view switch/SVG
nodes, report filters, custom folder/step controls, and missing task-specific
permission states. Generic source audit passing does not certify these flows.

### R10 — Security, permissions, tenant safety

Hard stop. Any authenticated user can effectively access any Test Hub project;
plans and folders are cross-project; evidence is public; scope changes may erase
history; a real-looking fallback credential is committed.

### R11 — Test strategy

Add unit, hook/service, transaction/RPC, migration replay, RLS matrix,
integration, browser lifecycle, accessibility, keyboard, visual, dark,
responsive, offline, concurrency, volume, performance, report reconciliation,
and regression coverage. CI must run the Test Hub browser suite against isolated
data with deterministic cleanup.

### R12 — Rollback and migration safety

Every DB slice needs a unique migration, staging replay, rollback/forward repair,
policy matrix, advisor scan, data snapshot, and isolated commit. Existing applied
migrations remain immutable unless an approved ledger-repair protocol says otherwise.

### R13 — Surprise/opportunity

- **ACCEPT:** immutable version-pinned plan baseline; this converts audit history into proof.
- **ACCEPT:** server idempotency for online/offline run submission; reduces both reliability and support risk.
- **DEFER:** advanced traceability canvas; accessible grid must be correct first.
- **DEFER:** report favorites/recent reports until calculation truth is proven.
- **REJECT:** broad visual rewrite; current canonical shells are valuable and safer to retain.

### R14 — Plan Lock/verification contract

Implementation Planner produced dependency-ordered, two-hour slices. The Plan
Lock cannot be finalized until the Catalyst-native visual choices, membership
authority, browser evidence, and explicit user approval exist.

### R15 — Post-completion delta

Not applicable before implementation. Required for final certification.

## 4. Advisor findings

| Advisor | Finding | Confidence |
|---|---|---|
| ADS Token Archaeologist | Preserve zero hard-coded Test Hub colors; contrast gate still fails repo-wide | High |
| Canonical Component Enforcer | Keep shared shells; replace raw/shadcn/admin/runner controls through canonical wrappers | High |
| Functionality Integrity Guard | Repair adapters and contracts, not a wholesale rewrite | High |
| Challenger | Historical certification data/screenshots are not current proof | High |
| Root-Cause Thinker | Root cause is lifecycle/data/governance fragmentation, not missing pages | High |
| ADS Migration Specialist | Canonical mixture creates inconsistent behavior despite token purity | High |
| Dark/RTL Guard | Current dark/responsive states unproven; RTL not scoped | Medium |
| DB/Schema Realist | RLS, storage, cascades, transaction boundaries, types, and ledger block production | High |
| Opportunity Amplifier | Version-pinned plans and idempotent runs add the highest enterprise value | High |
| Execution Realist | Sequence security → context → authoring → lifecycle → runner → truth → certification | High |

## 5. Conditional specialists invoked

- Performance/viewport: repository, runner, traceability, and 31-report rail require high-volume/density proof.
- Editor behavior: step authoring needs bulk paste, reorder, parameters, keyboard, and failure recovery.
- Workflow canonicalization: case, plan, execution, cycle, run, and defect transitions need server enforcement.
- Report critic: report calculations and exports must reconcile to governed source facts.
- Integration/sync skeptic: offline queue, storage, defect lineage, and external requirement links are high risk.

## 6. Where the council agrees

1. Test Hub is not production-ready.
2. Current canonical shells should remain.
3. Security and evidence retention precede UI remediation.
4. One explicit Test Space contract is required everywhere.
5. Plan must create governed execution scope, not merely coexist with it.
6. Multi-write client workflows require transactional, idempotent server contracts.
7. Current automated evidence is insufficient for certification.

## 7. Where the council disagrees

No substantive technical disagreement. The unresolved product questions are the
future navigation, dashboard composition, progressive disclosure, runner layout,
and traceability/report information architecture. These require owner review of
the Catalyst-native screen plan, not agent preference.

## 8. What was missing

- Full implementation-state screenshot matrix and owner signoff.
- Canonical project-membership authority decision.
- Migration-ledger repair decision.
- Disposable deterministic Test Hub certification data.
- Complete RLS/browser/accessibility/visual/offline/volume tests.

## 9. Catalyst-specific flags

- ADS: color gates green; canonical/component debt remains.
- Canonical components: strong base; raw controls must be removed in approved slices.
- Dark mode: unproven on current routes.
- RTL: not scoped.
- DB/RLS: P0 blocker.
- Permissions: UI matrix is not enforcement.
- Feature flags: module gate is UI-only.
- Tests: insufficient; no Test Hub Playwright in CI.
- Screenshots: current evidence blocked.
- Rollback: required per migration/RPC slice.

## 10. User choice board

### Option A — Complete required discovery first

- Effort: owner disposition + slice-specific Plan Lock + Phases 2–5 evidence completion.
- Risk: Lowest.
- Upside: Approved, evidence-backed product contract.
- Recommendation: **YES**.

### Option B — Start security-only implementation now

- Effort: Moderate.
- Risk: Violates the explicit approval gate despite valid urgency.
- Upside: Faster risk reduction.
- Recommendation: **NO until explicit approval packet approval**.

### Option C — Visual rewrite first

- Effort: High.
- Risk: Very high; masks lifecycle/security breaks and risks canonical regression.
- Upside: Superficial short-term improvement.
- Recommendation: **REJECT**.

Recommended option: **A**.

## 11. Surprise/opportunity additions

- ACCEPT immutable execution manifest: exact plan, case versions, environment, assignments, and approvals.
- ACCEPT tester-visible sync ledger: pending/syncing/failed/retry with idempotent server receipt.
- DEFER advanced analytics until fact tables reconcile.
- REJECT resurrecting historical `/testhub-lab` prototypes.

## 12. Verdict

**DO NOT PROCEED TO IMPLEMENTATION.** Phase 1 proves severe security, data
retention, lifecycle, accessibility, and certification gaps. This historical
verdict is superseded for design selection by DEC-006: Catalyst/ADS is the sole
design authority and the owner must review the screen plan before a Plan Lock.

## 13. VeriMAP Plan Lock

The dependency order is locked for planning only:

1. Approval and dedicated worktree.
2. Credential/ledger hygiene.
3. Authorization, storage, security-invoker views, and history retention.
4. One active Test Space contract.
5. Atomic case/version/approval/archive contract.
6. Version-pinned Plan → Execution → Cycle contract.
7. Atomic/idempotent Run → Result → Evidence → Defect contract.
8. One traceability link model and reconciled report facts.
9. Permissions, canonical UI, accessibility, volume, offline, and browser certification.

Each implementation slice must have exact files, a unique rollback boundary,
focused tests, zero new static debt, DB policy proof where relevant, and current
screenshots for UI work.

## 14. Commit gate

- Lint: focused touched files, zero new debt.
- ADS: color and ADS ratchets exit 0.
- Tests: focused + complete Test Hub suites exit 0.
- DB: replay, RLS matrix, advisor, rollback proof.
- Dark: current signed-in screenshots after reload.
- RTL: N/A unless later scoped.
- Screenshot: all required states, full relevant screen.
- Preservation: working-capability matrix remains green.
- Council delta: completed before final signoff.

## 15. Updated gate

The read-only runtime sweep is available; external research is non-governing.
The remaining non-negotiable gate is explicit owner disposition of the approval
packet and a slice-specific approved Plan Lock before any production code,
schema, policy, storage, or workflow change.
