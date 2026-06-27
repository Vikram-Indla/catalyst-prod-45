# CAT-ADS-COMPLIANCE-20260627-001 — Objective

## Feature name
ads compliance (Atlassian Design System compliance)

## What we are building
Not a new build — the ADS tooling already exists and is mature. This feature drives the Catalyst web app toward Atlassian Design System compliance by (a) hardening enforcement so NO new violations land, and (b) chipping the unblocked long-tail of bare-color / hand-rolled-UI violations, while respecting the protected Jira-parity color set.

## Why
Codebase ADS compliance is currently ~2.5/10 (Agent 3). ~574 true bare-hex remain plus ~200 Tailwind color arbitraries and several parallel hand-rolled tables. Without enforcement the count drifts back up every PR; the design-system audit and scanner exist but are not gating.

## Acceptance criteria (feature-level — individual slices add their own)
- [ ] New ADS violations are blocked before merge (scanner + tsc + lint gating actually fail CI/commit).
- [ ] Net true-bare-hex count trends DOWN week over week (`weekly-compliance-report.js`).
- [ ] Zero regressions to protected Jira-parity colors (status pills, parity-bypass hexes, AI magenta).
- [ ] Each remediated surface scores color ≥2/3 and hand-rolled-UI = 3/3 on the Agent-3 rubric, verified light + dark.

## Non-scope
- Bulk hex→token wrapping of the 265 UNMAPPED hexes (BLOCKED on Claude Design mappings — self-inventing is forbidden).
- Tailwind color-arbitrary elimination (BLOCKED on architecture decision A/B/C).
- Hand-rolled table consolidation onto JiraTable (future phase).
- Advertising — explicitly NOT this feature.

## Target surface
Repo-wide tooling + per-surface remediation. First slice scoped in 03_PLAN_LOCK.md.

## Stakeholders
- JK: Product Owner
- Aiden: Engineering Lead — **Aiden Validation Block suppressed this session per JK instruction**
- Claude Code: Implementation
