# CAT-TESTHUB-REMEDIATION-20260711-001 — Agent Outputs

All seven mandatory discovery roles ran read-only. No production code or data was changed.

## Agent 1 — Canonical Component Discovery

- Test Hub already uses 22 JiraTables, 13 ProjectPageHeaders, 22 ADS modals,
  85 ADS buttons, 85 lozenges, 55 spinners, and 28 empty states.
- It also contains 72 raw buttons, 20 raw inputs, 4 raw textareas, 2 raw selects,
  and 3 raw tables.
- Keep the canonical shells; replace shadcn AI dialog, raw admin tables,
  repository/step/runner controls, cycle side panels, report controls, and
  traceability interactions through Catalyst/ADS components.
- Full canonical map: `02_CANONICAL_DISCOVERY.md`.

## Agent 2 — Canonical Screen Discovery

- Inventoried every `/testhub/*` and `/admin/test/*` route.
- P0 breaks: no Test Space selection, filters query `ph_issues`, no Plan handoff,
  wrong Execution cycle fields, wrong cycle bulk field, runner non-atomic/offline
  hazards, and cross-project route ambiguity.
- P1 gaps: 25-row truncation, no restore, dead Sets nav, hidden Executions,
  incomplete retrospective, invalid traceability CTA, weak plan/execution forms.
- Existing canonical screen families should be retained.

## Agent 3 — UI/UX Critic

- Verdict: HALT.
- Current experience does not make active Test Space, lifecycle order, permission
  state, destructive safety, or offline trust clear.
- P0 accessibility failures exist in runner case navigation and traceability
  hierarchy/view/canvas interactions.
- Historical `/testhub-lab` screenshots are prototype evidence, not current-route certification.
- Current screens need verified empty/loading/error/denied/volume/dark/responsive states.

## Agent 4 — Integration Architect

- The intended tables and screens exist, but they are loosely related records,
  not one governed lifecycle.
- Plan has no Execution lineage; cycles are created separately; scope is not
  version-pinned; run/evidence/defect writes are multi-call and partial-write prone.
- Case creation/edit/restore/versioning is also non-atomic and approval is not enforced.
- Required future contracts: explicit route-scoped Test Space, atomic aggregate
  RPCs, immutable versions, version-pinned plan baseline, idempotent runs,
  private evidence contract, atomic defect lineage, one requirement-link model,
  one query-key factory, and reconciled report facts.

## Agent 5 — Data/Safety Guard

- Verdict: not production-safe.
- Live `tm_user_has_access` permits any authenticated user/project.
- Plans use `USING(true)`; folders/comments/attachments are not project-scoped.
- Evidence bucket is public with no size/MIME restrictions.
- Six views lack `security_invoker` and are ERROR-level advisor findings.
- Scope cascades can delete runs/results/links.
- Live staging: 14 cases, 2 plans, 0 plan memberships, 4 executions, 5 cycles,
  5 runs, 10 results, 1 run without results, 22 defects, 4 unlinked defects.
- Types are stale; migration version `20260706120000` is duplicated; a real-looking
  fallback credential is committed.

## Agent 6 — Implementation Planner

Implementation remains blocked. Required dependency order:

1. Approval, Mobbin/browser evidence, dedicated worktree, credential and ledger hygiene.
2. Authorization, private storage, security-invoker views, history retention.
3. One active Test Space across routes and every query/mutation.
4. Atomic case/steps/labels/version/approval/archive contract.
5. Version-pinned Plan → Execution → Cycle contract.
6. Atomic/idempotent Run → Results → Evidence → Defect contract, including offline recovery.
7. One traceability model and reconciled report read models.
8. Permissions, canonical UI, accessibility, volume, and complete certification.

Every slice is capped at two hours with its own DB/RPC, test, screenshot, and
rollback boundary. Visual choices remain Mobbin-blocked.

## Agent 7 — QA/Screenshot Validator

- Repeatable proof today is only one 3-test unit suite.
- Current Playwright lists 17 setup/smoke/authoring tests, but auth is not asserted,
  console/network errors do not fail navigation, and authoring mutates shared
  staging without cleanup.
- Legacy tests target obsolete routes and port 5173.
- CI does not run Test Hub Playwright.
- No Test Hub RLS, offline, concurrency, accessibility, visual, volume,
  performance, report reconciliation, or evidence-retention suites exist.
- Current runtime screenshots are blocked; historical prototype captures do not certify `/testhub/*`.

## Synthesis

- Current-state report: `docs/testhub-remediation/01-current-state-revalidation.md`
- Canonical map: `02_CANONICAL_DISCOVERY.md`
- Advanced Council verdict: `13_ADVANCED_COUNCIL_VERDICT.md`
- Plan Lock: `03_PLAN_LOCK.md` remains NOT_WRITTEN pending Mobbin, browser evidence,
  Phases 2–5, and explicit approval.
