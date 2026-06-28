# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Plan Lock

> Status: APPROVED (architecture) — mirrors Plan Lock v1 approved this conversation.
> Active slice: P0 Foundation — AUTHORED; staging apply PENDING (manual Supabase Studio).
> P0 not ACCEPTED until migration applied + verified on staging.

## Feature Work ID
CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001

## Timebox
P0 = one additive/inert slice (code already authored).

## Objective
Extend `ph_workflow_*` into a versioned canonical workflow engine: template → version → scheme → project assignment → statuses → transitions → roles → guards → field requirements → audit.

## Business outcome
Admin-managed, versioned, project-scoped workflows with enforced gates and a single canonical status-category source, replacing three disjoint engines + hardcoded per-entity logic.

## Exact slice (P0)
Additive migration `supabase/migrations/20260628200000_ph_wf_foundation.sql` (13 `ph_wf_*` tables; fns `ph_wf_write_audit`, `ph_wf_is_admin`, `ph_wf_touch_updated_at`; RLS) + inert TS `src/lib/workflow/canonical/{contracts,advisory}.ts` + `adapters/index.ts`. Type regen after apply.

## Non-scope (P0)
No workflow publish/seed/activate. No status/category change. No new roles wired. No RBAC enforcement. No blocking mode. No UI/admin/board/detail change. No field/table removal. No enum widening.

## Canonical components
None mounted in P0 (inert). Future: extend `/admin/workflows` (WorkflowAdminPage, CatalystWorkflowBuilder), CatalystStatusPill, StatusTransitionDropdown, JiraTable.

## Canonical screens
P0: none. Future: /admin/workflows, /admin/release-ops, /admin/test-ops, /admin/fields, Story backlog/board/detail.

## Files to modify (P0)
- NEW `supabase/migrations/20260628200000_ph_wf_foundation.sql`
- NEW `src/lib/workflow/canonical/contracts.ts`, `advisory.ts`, `adapters/index.ts`
- AFTER apply: regenerate `src/integrations/supabase/types.ts` (additive only)

## Files forbidden (P0)
Any existing runtime/admin/board/detail/RBAC file; any enum/type ALTER; any prod config.

## UI/UX rules
ADS tokens only (DB CHECK enforces token-only color on `ph_wf_version_statuses.color_token`). No hand-rolled UI. No bare colors anywhere.

## Data/backend rules
Storage (Plan Lock v1 §4): native `ph_issues.status`; A-lite reuse (BR `process_step`, milestone `status`, sprint `status`); Option A additive `workflow_status_key` for enum domains (test*/defect/incident/release) — added in their rollout phase, NOT P0; Task projection via `task_statuses.workflow_status_key`. Category from config row; no keyword guessing. Audit only via `ph_wf_write_audit`.

## Integration/wiring rules
P0 inert — adapters imported nowhere. Advisory-first later; blocking per project/version on approval. Tooltip wording locked: "You are currently signed in as {currentRole}. Moving {entityType} from {fromStatus} to {toStatus} requires {requiredRoles}. Missing requirement: {missingGuard}."

## Parallel discovery agents
Completed in Phase 1 (7-agent fan-out) — see `12_AGENT_OUTPUTS.md`.

## Karpathy loop hypotheses
- [LOOP-001] Extending ph_workflow_* (vs new engine) is safe + lowest-risk — CONFIRMED (discovery).
- [LOOP-002] Migration FK/helper targets all exist on staging — CONFIRMED (2B-FIX target scan).
- [LOOP-003] Migration is additive/non-destructive — CONFIRMED (safety scan: 0 DROP/ALTER existing).

## Screenshot checklist
P0 has no UI. Post-apply smoke: admin pages, work-item detail, board/list load unchanged.

## Validation commands
```bash
npx tsc --noEmit          # 0 errors (passed)
node scripts/no-hardcoded-colors.cjs   # canonical TS clean (passed)
# post-apply on staging: V1–V5 verification SQL (see 2B-FIX pack)
```

## Regression risks
P0: none expected (additive + inert). Risk = live apply only (mitigated: IF NOT EXISTS + verified FK targets).

## Stop conditions
- Banned color / hand-rolled UI / TS error → stop.
- P0 cannot self-apply to staging (DB password barrier; MCP prod-scoped; Docker down) → STOP; PO manual apply in Supabase Studio on `cyijbdeuehohvhnsywig`, then verify.

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message references CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001. Commit only on PO approval after staging apply + verification.

## Plan Lock status
APPROVED (architecture, Plan Lock v1). P0 code AUTHORED. Gate: staging apply + verification before acceptance and before Phase 2.
