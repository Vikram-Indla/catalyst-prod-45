# DECISION LOG

> One row per resolved decision. Nothing here is re-litigated.

| ID | Title | Area | User answer | Final decision | Date | Affected | Schema? | Approval |
|----|-------|------|-------------|----------------|------|----------|---------|----------|
| D-000 | Activate revamp as new feature | Process | new feature | `CAT-TESTHUB-REPORT-REVAMP-20260627-001`; lab preserved | 2026-06-27 | feature folder | No | confirmed |
| D-001 | Canonical TEST schema | Data | tm_* | **tm_*** is source of truth. th_/test_/r360_ = dead, do not use. | 2026-06-27 | all reports, D4/D5 | No | confirmed |
| D-002 | Canonical WORK-ITEM source | Data | ph_issues | **ph_issues** (2381) authoritative for scope + display. Sprint/release carried as TEXT (sprint_name, fix_versions). | 2026-06-27 | scope/coverage/traceability | No | confirmed |
| D-003 | Release→Sprint model | Data | derive via work items | Derived: a release's sprints = distinct sprints of its work items. Per D-002, derivation joins on **text** (ph_issues.sprint_name ↔ ph_jira_sprints.name; fix_versions ↔ ph_releases.name). No schema change. | 2026-06-27 | release reporting | No | confirmed |
| D-004 | Real test-data plan | Data | seed realistic now | **Seed realistic tm_* data in cyij** (dev only) so reports are demonstrable. Requires a reviewed SEED_PLAN + a consent gate before any write (see CONSENT_GATES G-001). | 2026-06-27 | tm_* tables (cyij) | YES (data write) | approved-in-principle; write gated on SEED_PLAN review |

## Consequence notes
- D-002+D-003: Release/Sprint resolution is **text-join based** on ph_issues → data-quality dependency (DQ-06). Sprints themselves still come from `ph_jira_sprints` (26), releases from `ph_releases` (59). Match ph_issues.sprint_name → ph_jira_sprints.name.
- Sprint == iteration: `ph_jira_sprints` is the sprint source; `iterations` table is dead (Q-006 recommendation stands, confirm if needed).
