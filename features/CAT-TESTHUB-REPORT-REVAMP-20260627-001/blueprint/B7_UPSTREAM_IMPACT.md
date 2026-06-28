# B7 — Upstream Impact Proposal (CONSENT-GATED)

> STATUS: 🟢 DRAFT. Nothing here is built without a CONSENT_GATES row.

## Non-invasive (read-only, low risk) — recommend first
| Item | Change | Risk |
|------|--------|------|
| sprint_release exploder | read-only VIEW to flatten ph_issues.sprint_release → (issue_key, sr_name, sr_date) | LOW |
| coverage view | read-only VIEW: story → covered flag → for fast reports | LOW |
- These add views only, no column/table change. Still consent-gated (G-00x).

## Invasive (schema / view-model) — defer, explicit consent each
| Item | Change | Risk |
|------|--------|------|
| Trace-From panels | edit story/epic/defect/incident detail view models (src) | MED (UI + queries) |
| Coverage chip on issue rows | add to ph_issues list/detail components | MED |
| Optional release_id on sprint | DDL on ph_jira_sprints | HIGH (migration) — only if derive-via-JSONB proves insufficient |
| AI insight snapshot table | new table | MED |

## Rule
Read-only views first (cheap, reversible). Upstream view-model edits only after B1-B6 approved + per-item consent.
