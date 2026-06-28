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

## CORRECTION (2026-06-27, post sprint_release probe)
- D-003 detail corrected: sprint/release link is **NOT** ph_issues.sprint_name (near-dead, 2/2381) and **NOT** fix_versions (empty). It is **`ph_issues.sprint_release` JSONB** ([{id,name,releaseDate}], often multiple). Match name → ph_jira_sprints.name / ph_releases.name. Issue↔sprint/release is many-to-many. See D5.
- ph_work_items sprint_id/release_id are **0 populated** → not usable; validates D-002 (ph_issues).
- NEW: Q-007 — defect/incident reporting source (ph_issues QA Bug/Production Incident, 788/152) vs tm_defects (1). See QUESTIONS_QUEUE.

## Round 3 decisions (2026-06-27)
| ID | Title | Answer | Final | Schema? |
|----|-------|--------|-------|---------|
| D-005 | Defect/Incident source | Hybrid | ph_issues (QA Bug 788 / Production Incident 152) for volume+trend + tm_defects for test-linked detail | No |
| D-006 | Coverage denominator | Stories | Coverage% = stories with ≥1 linked test case ÷ in-scope stories (ph_issues issue_type='Story'). Execution-coverage may be added later. | No |
| D-007 | Seed execution | Approve — Senaei BAU | Seed tm_* in cyij anchored to Senaei BAU (84f91caf-7511-470a-9a26-3e52e66258bf), linked to its real ph_issues stories. G-001 → APPROVED. | YES (dev write) |

## Round 4 (2026-06-28)
| ID | Title | Answer | Final | Schema? |
|----|-------|--------|-------|---------|
| D-008 | Blueprint B1-B8 | approved | Taxonomy (11 groups) + scope/coverage/traceability/governance/AI models APPROVED. Proceed to wire. | No |
| D-009 | First wired surface | Coverage + Governance, Senaei BAU | New real route under /testhub/reports; project-scoped (default Senaei BAU); reuse canonical components + JiraTable; ADS tokens. | No (read-only views OK, G-002) |

## Round 5 (2026-06-28)
| ID | Title | Answer | Final | Schema? |
|----|-------|--------|-------|---------|
| D-010 | QA team derivation (U-009) | by test assignment | Team = distinct testers assigned to a project's test cases (tm_test_cases.assigned_to). No role-model dependency. | No |
| D-011 | Team report scope | Project | Team Performance scoped to a selected project (tm_projects). | No |
