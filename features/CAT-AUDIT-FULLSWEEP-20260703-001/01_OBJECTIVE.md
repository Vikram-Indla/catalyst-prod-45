# Objective

Run a Catalyst-wide invasive audit across: light mode, dark mode, ADS token compliance, typography, component canonicalization, dialogs/drawers/modals, performance/bundle/heap, dead code, repo/Git hygiene, test coverage, accessibility, cross-surface consistency, zero-assumption data rendering, and CRE (Grids A–I) compliance.

## Deliverables
- 14 lane findings files (`lanes/LANE-NN_*.md`), every issue in the CAT-AUDIT-#### schema, evidence-backed (file:line / command output).
- `MASTER_AUDIT_REPORT.md` — 28-section consolidated report incl. counts by category/severity, top 50 issues, safe vs risky fix clusters, multi-PR execution plan, regression + CI validation plans.
- PR-by-PR fix plans with validation gates and rollback plans (planning only).

## Targets (evidence-backed, never invented)
- ≥300 UI/design/ADS/typography issues if they exist (baseline already shows 1,658 typography violations + 6,876 Tailwind color-utility hits — they exist).
- ≥1000 total issues/opportunities across all lanes, counting enumerated occurrences in appendices.

## Non-scope
- Any code fix, refactor, deletion, migration, or PR creation.
- Production/staging database access.
- Modifying ratchet baselines or generated registries.

## Done looks like
MASTER_AUDIT_REPORT.md complete, all 14 lanes reported, issue register consistent, PR plan ready for per-PR consent.
