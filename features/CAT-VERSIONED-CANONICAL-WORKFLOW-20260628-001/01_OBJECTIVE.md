# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Objective

## Feature name
versioned-canonical-workflow

## What we are building
One Jira-like, versioned workflow engine for Catalyst by extending `ph_workflow_*` — controlling statuses, categories, versions, schemes, project assignment, transitions, roles, guards, field requirements, and audit across every work-item surface, preserving every existing field.

## Binding contract
The pasted **Catalyst Workflow Implementation Blueprint** (acknowledged 2026-06-28) is the binding implementation contract, together with the approved **Plan Lock v1** (this conversation). On conflict: CLAUDE.md > Plan Lock > Blueprint.

## Why
Catalyst has three disjoint status engines and per-entity hardcoded status logic. One versioned canonical engine gives admin-managed statuses/transitions/guards, project-specific workflow schemes, enforced gates, and a single "done" source — Jira parity without losing any existing field.

## Acceptance criteria
- [ ] P0: 13 `ph_wf_*` tables live on staging, RLS on, empty, audit fn present; types regenerated; tsc clean; no existing object removed; runtime unchanged.
- [ ] Phase 2: `/admin/workflows` versioning builder (templates/versions/schemes/assignments/statuses/transitions/roles/guards/field-reqs/reason-codes/migration-preview/audit).
- [ ] Phase 3: Story vertical slice wired end-to-end through the canonical engine (proof model).
- [ ] Later phases (4–8) per Blueprint §11, advisory → blocking last.

## Non-scope
- No field/table deletion, no enum widening in first pass.
- No hardcoded status movement, no Any→Any, no UI-only validation.
- No production touch (lmqw). Staging `cyijbdeuehohvhnsywig` only.
- P0 does NOT publish/seed/activate workflows or change any runtime behavior.

## Target surface
DB `ph_wf_*` + `src/lib/workflow/canonical/*`; later `/admin/workflows`, `/admin/release-ops`, `/admin/test-ops`, `/admin/fields`, then Story surfaces (CatalystStatusPill, StatusTransitionDropdown, JiraTable, backlog, boards, filters, reports).

## Stakeholders
- JK: Product Owner
- Aiden: Engineering Lead
- Claude Code: Implementation
