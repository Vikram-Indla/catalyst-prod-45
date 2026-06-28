# B2 — Report Scope Model

> STATUS: 🟢 DRAFT. How any scope resolves to a query graph on the proven model.

## Scope types → resolver
| Scope | Anchor | Resolve to stories | Then test artifacts |
|---|---|---|---|
| Project | ph_projects / project_name | ph_issues where project_name=X, issue_type='Story' | tm_requirement_links.external_key = story.issue_key |
| Release | ph_releases.name | stories where sprint_release JSONB @> [{name: release}] | same |
| Sprint | ph_jira_sprints.name | stories where sprint_release JSONB @> [{name: sprint}] | same |
| Product/BR | epic/theme (ph_issues parent_key/theme_id) | descendant stories via parent_key chain | same |
| Tester | profiles.id | — | tm_test_cases.assigned_to / cycle_scope.assigned_to / runs.executed_by |
| Team | QA team (U-009) | — | union of member testers' artifacts |
| Work item | issue_key | the item itself | Trace-From: links where external_key=issue_key |

## Core join chain (proven)
```
ph_issues (scope filter)  ──issue_key──▶ tm_requirement_links.external_key
   tm_requirement_links ──test_case_id──▶ tm_test_cases
   tm_test_cases ──id──▶ tm_cycle_scope ──▶ tm_test_runs (status)
   tm_test_cases ──id──▶ tm_defects.source_test_case_id  (+ ph_issues QA Bug/Incident for hybrid)
```

## sprint_release JSONB resolution (D-003)
- Each ph_issues row: `sprint_release` = array of {id,name,releaseDate}.
- Match `name` against ph_jira_sprints.name (sprint scope) AND ph_releases.name (release scope).
- An issue may belong to multiple → many-to-many. Disambiguation: name in ph_jira_sprints ⇒ sprint; name in ph_releases ⇒ release; if both, treat as both (confirm rule).
- OPEN: a clean SQL helper (view/function) to explode sprint_release — propose in B7 (non-invasive: a read-only VIEW, consent-gated).

## Active scope detection
- Active sprint/release: status + dates on ph_jira_sprints/ph_releases (needs STATUS_MAPPING + DATE_SOURCES).
