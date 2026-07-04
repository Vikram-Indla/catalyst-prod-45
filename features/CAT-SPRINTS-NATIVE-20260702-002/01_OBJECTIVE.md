# CAT-SPRINTS-NATIVE-20260702-002 — Objective

## Feature name
SPRINTS-NATIVE

## What we are building
A Catalyst-native sprint module (list + create + lifecycle + insights) on `ph_jira_sprints`, replacing dead Jira-synced sprint data, with rename-safe FK membership, deterministic auto-naming, per-type Definition of Done, approval-gated completion, and analytics gated on proven transition data.

## Why
The current Sprints surface is a release-module clone over dead Jira data: release vocabulary on sprints, three inconsistent work-item linkages (rename-unsafe), no sprint semantics (length, cadence, DoD, completion), no accountability (who approved, who took how long). Teams will create sprints in Catalyst going forward — the module must be the single source of truth.

## Acceptance criteria
- [ ] Creating a sprint in Auto mode produces `<KEY>-Sprint <M>.<W> - <DD Mon YY>` deterministically from start date + length; name recomputes read-only on date/length change; unique per project (DB-verified).
- [ ] Sprint length restricted to 1 or 2 weeks (default 1w, Sunday→Thursday); length visible on list and detail (lozenge).
- [ ] Work-item membership reads/writes ONLY `sprint_id` FK; renaming a sprint changes zero memberships (DB-probed before/after).
- [ ] Sprint statuses are planning / active / awaiting_approval / completed / canceled / archived; DoD satisfaction transitions active → awaiting_approval automatically, never straight to completed.
- [ ] Approvals: policy any/all/quorum honored for 1, 3, and 4 approvers; every decision timestamped (`decided_at`); rejection returns sprint to active.
- [ ] Sprint can be optionally linked to a release; release date from Release Hub shown on sprint surfaces.
- [ ] AI sprint summary cached by structural hash — second open makes no edge-function call (network-probed).
- [ ] All 26 dead Jira sprints soft-deleted; list shows only native sprints grouped by Month or Status.
- [ ] Zero regressions on blast-radius surfaces (detail-view Sprint/Iteration field, release pages, kanban, filters).
- [ ] Analytics (time-in-status, efficiency, scope history, health) render ONLY when their data proofs pass; otherwise disabled with tooltip (zero-assumption).

## Non-scope
- Injecting common statuses (In QA/In UAT/In Beta/In Production) across ALL work-item types — split to its own Feature Work ID (global regression surface across ~6 hardcoded TS status configs).
- Backlog-health analog; cross-sprint comparison dashboards (post-v1).
- Legacy `/sprints` page + SprintBoard (SAFe `iterations` table) — untouched.
- rh_* Release-Ops stack — untouched.

## Target surface
- L1: `/project-hub/:key/sprints` — src/pages/project-hub/SprintsPage.tsx
- L2: `/project-hub/:key/sprints/:sprintSlug` — SprintDetailPage → shared ReleaseDetailPage via SPRINT_CONFIG (src/lib/entity-hub/config.ts)
- Create: src/components/sprints/SprintCreateModal.tsx
- Side panel: src/components/releases/detail/ReleaseSidePanel.tsx (config-driven)

## Stakeholders
- JK: Product Owner (requirements source — voice brief 2026-07-02)
- Vikram: Engineering Lead (Plan Lock approval)
- Claude Code: Implementation
