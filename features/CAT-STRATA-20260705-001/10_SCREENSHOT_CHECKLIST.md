# CAT-STRATA-20260705-001 — Screenshot Checklist

> Phase 2 mandatory pack: exactly 10 screenshots shown in-conversation, then HARD STOP for approval.
> Canonical list below follows the attachment md "Mandatory 10 Screenshots" table; pending Q3 confirmation
> (the activating prompt's variant merges #2 and splits Admin into Taxonomy Manager + Scorecard Model Builder — same coverage either way).

## Status
PENDING — Phase 2 not started (awaiting Plan Lock approval).

## The 10 mandatory screens

| # | Screenshot | Must show | Status |
|---|---|---|---|
| 1 | Executive Command Center | Enterprise health, scorecard status, exceptions, value at risk, decision queue; live-vs-locked lozenge; config context header | PENDING |
| 2 | Strategy Room / Strategy Map Canvas | Hierarchy + cause/effect network, owner/stage/status on nodes, DnD affordances, evidence drilldown, period/owner/perspective filters | PENDING |
| 3 | Admin Configuration Engine | Taxonomies, scorecard models, formulas, gates, uploads, RBAC, workflows, version history + approval states | PENDING |
| 4 | Taxonomy / Perspective Manager | Create/edit/retire perspectives, weights, effective dates, hierarchy, active state | PENDING |
| 5 | Scorecard Model Builder | Perspective weights, rollup method, threshold scheme, period granularity, model versioning | PENDING |
| 6 | KPI/OKR Library + KPI Detail | Dictionary table (JiraTable), formula version, 5 ownership roles, target/actual, lineage evidence drawer | PENDING |
| 7 | Initiative + Project Card Linkage | Objective/play/KPI/benefit/portfolio mapping, source system + mapping confidence, milestones | PENDING |
| 8 | Portfolio / VMO Benefit Realization | Planned/forecast/realized value, baselines, assumptions, attribution, value gates | PENDING |
| 9 | Upload Validation + Lineage Pipeline | Source → ingestion → staging → validation → canonical write → calculation → snapshot; run IDs, row-level errors | PENDING |
| 10 | Snapshot / Decision Cockpit / Board Pack | Locked evidence pack, decision record, action register, audit trail | PENDING |

## Per-screen evidence requirements (from CATALYST_UI_UX_ACCEPTANCE.md)
Each accepted surface ultimately needs the 7-PNG set: reference, implementation, dark mode (system reload), empty, loading, error, adjacent-regression. For the Phase 2 pack: light + dark minimum per screen, responsive notes at 768/1024/1440.

## Acceptance gates
- ADS tokens only; spacing on 4/8/16/24/32 grid; canonical typography.
- Live/draft/pending-validation/locked states visually distinct on every screen.
- No placeholder metrics; demo data labeled as Salam demo tenant.
- HARD STOP after pack: "Approve Phase 2 UI/UX so I can begin Phase 3 implementation?"
