# CAT-TESTHUB-REPORT-REVAMP-20260627-001 — Objective

## Feature name
testhub report revamp

## What we are building
A management-grade **testing command center** for Catalyst Test Hub — reporting re-centered on the
native delivery questions (Project / Release / Sprint / Product-Business-Request testing status,
coverage, traceability, defects, incidents, tester + team performance, governance mismatch, factual
AI insight) — delivered **discovery-first**, with current legacy report families preserved but
subordinated under the new query structure.

## Why
Today's reports are execution/case/defect widgets that don't answer executive + delivery questions
("Are we ready to release? Is this sprint healthy? Which stories have no test cases?"). Management
needs scope-driven, drill-down, traceable, governance-aware reporting backed by real Catalyst data.

## Acceptance criteria (for the DISCOVERY exercise — not the build)
- [ ] Current-state discovery complete: `discovery/D1–D16` all filled from real evidence.
- [ ] Technical ERD (`D4`) + Functional ERD (`D5`) produced and validated vs real data.
- [ ] Report inventory (`D1`) separates real vs mock/seeded.
- [ ] Sprint/release link audit (`D8`) answers: where stored, how linked, active-detection.
- [ ] Test artifact link audit (`D9`) maps case/exec/cycle ↔ work item / sprint / release / tester.
- [ ] Gap list (`D14`) + contradiction list (`D15`) + data-quality risks (`D16`) produced.
- [ ] 100 business rules (`contract/BUSINESS_RULES_100.md`) each marked validated / refuted / needs-user.
- [ ] Unknowns register + decision log + questions queue maintained throughout.
- [ ] Report taxonomy (`blueprint/B1`) + coverage/traceability/governance/AI models drafted.
- [ ] Upstream impact (`blueprint/B7`) listed; approval checklist (`B8`) drafted.
- [ ] `03_PLAN_LOCK.md` written; **stop for user approval before any code or schema change.**

## Non-scope (until explicitly approved)
- No schema changes (tables, columns, views, RPCs, triggers, RLS).
- No production or staging data writes.
- No upstream view-model edits (story/feature/epic/defect/incident).
- No real data wiring (Phase 8) — gated on full approval checklist.
- No new non-canonical UI components.

## Target surface
- Test Hub reporting routes (to be inventoried in `discovery/D2`).
- Existing lab: `/testhub/reports-lab` (`src/pages/testhub/reports/lab/`).
- Shell/rail components controlling report viewport (to be inventoried in `D2`).

## Stakeholders
- JK / Vikram: Product Owner — owns business-meaning decisions (relationships, status, dates, formulas).
- Aiden: Engineering Lead.
- Claude Code: discovery + blueprint, co-build under zero-assumption contract.
