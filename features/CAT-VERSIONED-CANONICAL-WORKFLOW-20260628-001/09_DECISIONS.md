# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

- **D-001 (2026-06-28):** Architecture = EXTEND `ph_workflow_*` into a versioned engine. No second/separate workflow engine. (PO-approved, Plan Lock v1.)
- **D-002:** Layering = Template → Version → Scheme → Scheme Assignment (project) → per-type version → statuses/transitions/roles/guards/field-reqs/audit. New `ph_wf_*` namespace; existing `ph_workflow_*` preserved + bridged.
- **D-003:** Status category locked to `todo`/`in_progress`/`done`; drives boards/filters/dashboards/completion/reports. Category read from config row — keyword guessing banned.
- **D-004:** Storage strategy per domain (Plan Lock v1 §4): native `ph_issues.status`; A-lite reuse existing text (BR `process_step`, milestone `status`, sprint `status`); Option A additive `workflow_status_key` for enum domains (tm_test_cases/plans/cycles/runs, tm_defects, incidents, rh_releases) — added in each entity's rollout phase, NOT P0; Task = projection via `task_statuses.workflow_status_key` (status_id FK preserved). No enum widening pass 1.
- **D-005:** New roles approved: business_owner, brm, implementation_lead, qa_lead, release_manager, business_user, guest. `approver` = workflow approval role-group (reuse `transition_approval_configs`/`transition_approvers`), not a static product role.
- **D-006:** Enforcement advisory-first; blocking enabled per project/version only after explicit approval; never silent. Locked tooltip wording recorded in 03_PLAN_LOCK.
- **D-007:** Release canonical = `rh_releases` (primary adapter); `releases` + `release_versions` preserved/mirrored. No release table dropped.
- **D-008:** Field config = activate `catalyst_field_layouts` via `ph_wf_field_requirements`; legacy `ph_field_*` preserved.
- **D-009 (P0 apply blocker):** Cannot self-apply migration to staging — linked CLI hangs on staging DB password (PO: no secrets in chat), project-id MCP is org-scoped to PROD (permission denied for cyij), no-project-id MCP is prod-scoped (forbidden), Docker down (no local stack). Resolution = manual Supabase Studio apply on `cyijbdeuehohvhnsywig` by PO, then verify. Migration validated statically (safety scan + FK-target existence + tsc clean).
- **D-010:** Blueprint pasted 2026-06-28 acknowledged as binding implementation contract alongside Plan Lock v1.
