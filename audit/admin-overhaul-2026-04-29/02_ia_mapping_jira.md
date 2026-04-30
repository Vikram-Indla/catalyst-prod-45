# Admin overhaul — Catalyst → Jira IA crosswalk

Generated 2026-04-29 (re-created 2026-04-30 after branch wipe).

The goal of admin v2 is to mirror Jira's admin settings IA so engineers and admins moving between the two products spend zero time hunting for the equivalent screen. This crosswalk drove the `/admin/v2` tree.

## Top-level sections

| Jira admin section | Catalyst admin v2 section | Notes |
| --- | --- | --- |
| System | System | General, Security, Appearance, Announcements (all dark-launched in Phase 0) |
| Issues | Work items | Renamed because Catalyst's domain extends past "issues" — includes Themes, Initiatives, Business Requests |
| Projects / Spaces | Spaces | Portfolios, Programs, Products, Themes (dark-launched) |
| User management | Users | List, Groups, Roles, Permissions (dark-launched) |
| Apps / Integrations | Apps | Jira sync, Slack (dark-launched) |
| Audit log | Audit | Action log — only Phase 0 live page |

## Phase 0 — what's live on day one

Just the audit log:

- `/admin/v2` → overview card explaining the surface is dark-launched
- `/admin/v2/audit` → live feed reading `admin_action_audit`

Everything else is in the side nav with `aria-disabled="true"` and a "Soon" badge so admins see the planned shape but can't enter empty pages.

## Phase 1a — Custom fields (`/admin/v2/work-items/custom-fields`)

Replaces `DetailsPanels.tsx`. Filters by entity type (story, epic, feature, task, subtask, qa_bug, production_incident, business_request). Per-entity grouped table with create / edit / activate / delete. Locked entity_type and field_type on edit (orphan risk on stored values).

## Phase 1b — Statuses (`/admin/v2/work-items/statuses`)

Collapses `EpicStatuses.tsx` + `FeatureStatuses.tsx` + `ThemeStatuses.tsx` into one tabbed surface. The schemas are identical so a single page driven by a kind toggle is the right factoring. Slug locked on edit (orphan risk on stamped values).

## Phase 1c — Work types (`/admin/v2/work-items/types`)

Per-project CRUD on `ph_work_types`. Project picker, auto-selects the first project. Level (initiative → request), icon slug, and color picker.

## Mapping back to Jira screens

| Catalyst v2 page | Jira equivalent |
| --- | --- |
| `/admin/v2/work-items/types` | Issue types (per project) |
| `/admin/v2/work-items/statuses` | Statuses |
| `/admin/v2/work-items/custom-fields` | Custom fields |
| `/admin/v2/audit` | Audit log |

Future phases will add: workflows (Jira: Workflows), screens (Jira: Screens), notifications (Jira: Notification schemes), portfolios/programs/products (Jira: Projects), users/groups/roles/permissions (Jira: User management).

## Side-nav order (final)

1. **System** → General · Security · Appearance · Announcements (all Soon)
2. **Work items** → Work types · Workflows (Soon) · Screens (Soon) · Custom fields · Statuses · Notifications (Soon)
3. **Spaces** → Portfolios · Programs · Products · Themes (all Soon)
4. **Users** → List · Groups · Roles · Permissions (all Soon)
5. **Apps** → Jira sync · Slack (all Soon)
6. **Audit** → Action log

This ordering matches Jira's settings tree top-to-bottom. Inside Work items, the order is Jira's: Work types → Workflows → Screens → Custom fields → Statuses → Notifications.
