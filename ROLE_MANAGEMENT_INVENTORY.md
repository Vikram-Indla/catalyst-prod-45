# Catalyst Role Management — Complete Inventory

**Date:** 2026-06-24  
**Purpose:** Comprehensive module, field, and action inventory for designing field-level role management system  
**Scope:** All 10 Catalyst hubs (7 active, 3 dormant)

---

## EXECUTIVE SUMMARY

| Hub | Status | Entity | Key Fields | Actions | Complexity |
|-----|--------|--------|-----------|---------|------------|
| Project | ✅ Active | `ph_issues` | 9 | 25+ | High |
| Product | ✅ Active | `business_requests` | 5 | 18+ | High |
| Incident | ✅ Active | `ph_issues` (type=incident) | 4 | 8+ (read-only) | Medium |
| Release | ✅ Active | `rh_releases` | 5 | 16+ | High |
| Test | ✅ Active | `plan_test_cases` | 5 | 14+ | Medium |
| Task | ✅ Active | `tasks` | 5 | 18+ | High |
| Home | ✅ Active | Aggregated feeds | 8 | 10+ | Low |
| Strategy | 🔴 Dormant | Linked data | 2 | 6+ | Low |
| Plan | 🔴 Dormant | Scenario tables | 3 | 8+ | Low |
| Wiki | 🔴 Dormant | Wiki pages | 3 | 8+ | Low |

---

## ROLE BASELINE ACCESS

From `AdminAccessPage.tsx:98-115` — default module access per role:

```
ROLES (16 total):
├─ Admin
├─ Product Owner, Product Manager, Business Owner
├─ Project Manager, Project Coordinator, Release Manager, Architect, Developer, QA Tester
├─ Operations Engineer, Technical Support, Support
├─ Governance, PMO
└─ Guest (read-only, 48h max)

DEFAULT MODULE MATRIX:
┌─────────────────────┬──────┬───────┬────────┬────────┬──────┬─────────┬──────────┬──────┬──────┐
│ Role                │ Home │ Proj  │ Strat  │ Prod   │ Rel  │ Test    │ Incident │ Task │ Plan │
├─────────────────────┼──────┼───────┼────────┼────────┼──────┼─────────┼──────────┼──────┼──────┤
│ Admin               │  ✅  │  ✅   │  ✅    │  ✅    │  ✅  │   ✅    │    ✅    │  ✅  │  ✅  │
│ Product Owner       │  ✅  │  ✅   │  ✅    │  ✅    │  —   │   —     │    —     │  —   │  —   │
│ Product Manager     │  ✅  │  ✅   │  ✅    │  ✅    │  —   │   —     │    —     │  —   │  —   │
│ Business Owner      │  ✅  │  ✅   │  ✅    │  ✅    │  —   │   —     │    —     │  —   │  —   │
│ Project Manager     │  ✅  │  ✅   │  —     │  —     │  ✅  │   —     │    —     │  ✅  │  —   │
│ Project Coordinator │  ✅  │  ✅   │  —     │  —     │  —   │   —     │    —     │  ✅  │  —   │
│ Release Manager     │  ✅  │  ✅   │  —     │  —     │  ✅  │   —     │    —     │  —   │  —   │
│ Architect           │  ✅  │  ✅   │  ✅    │  ✅    │  —   │   —     │    —     │  —   │  —   │
│ Developer           │  ✅  │  ✅   │  —     │  —     │  —   │   —     │    —     │  ✅  │  —   │
│ QA Tester           │  ✅  │  ✅   │  —     │  —     │  —   │   ✅    │    —     │  —   │  —   │
│ Operations Engineer │  ✅  │  —    │  —     │  —     │  —   │   —     │    ✅    │  ✅  │  —   │
│ Technical Support   │  ✅  │  —    │  —     │  —     │  —   │   —     │    ✅    │  ✅  │  —   │
│ Support             │  ✅  │  ✅   │  —     │  —     │  —   │   —     │    —     │  —   │  —   │
│ Governance          │  ✅  │  ✅   │  ✅    │  ✅    │  —   │   —     │    —     │  —   │  —   │
│ PMO                 │  ✅  │  ✅   │  ✅    │  ✅    │  ✅  │   —     │    —     │  —   │  ✅  │
│ Guest               │  ✅  │  ✅   │  —     │  —     │  —   │   —     │    —     │  —   │  —   │
└─────────────────────┴──────┴───────┴────────┴────────┴──────┴─────────┴──────────┴──────┴──────┘
```

---

## DETAILED MODULE INVENTORY

### 1. PROJECT HUB ✅ Active

**Routes:**
- `/project-hub/projects` — all projects listing
- `/project-hub/:key/dashboard` — project dashboard
- `/project-hub/:key/backlog` — backlog list view + detail at `/backlog/:issueKey`
- `/project-hub/:key/allwork` — all work items list + detail at `/allwork/:issueKey`
- `/project-hub/:key/boards/:boardId` — scrum/kanban boards
- `/project-hub/:key/kanban` — kanban view
- `/project-hub/:key/timeline` — timeline view + detail at `/timeline/:issueKey`
- `/project-hub/:key/releases` — releases list
- `/project-hub/:key/dependencies` — dependency management
- `/project-hub/:key/filters` — saved filters + create + detail
- `/project-hub/:key/roadmaps/:id` — roadmap views
- `/project-hub/:key/dashboards/:id` — custom dashboards
- `/project-hub/:key/settings` — project settings
- `/project-hub/:key/standups` — standup management
- `/project-hub/resource-360/:resourceId` — resource capacity view

**Primary Entity:** `ph_issues` (Jira work items table)

**Field Inventory:**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **issue_key** | string PK | ✅ | 🔒 | ✅ (list, detail) | Jira issue key (BAU-5757) — read-only |
| **summary** | text | ✅ | ✅ | ✅ (merged key cell) | Issue title — editable inline |
| **issue_type** | enum | ✅ | 🔒 | ✅ (icon in key) | Story / Epic / Feature / Task / QA Bug / PI / CR / BG / API Req — read-only from Jira |
| **status** | enum | ✅ | ✅ | ✅ (status pill) | todo / in_progress / done / + custom — editable via dropdown |
| **priority** | enum | ✅ | ✅ | ✅ (badge) | Highest / High / Medium / Low / Lowest — editable |
| **assignee_account_id** | uuid | ✅ | ✅ | ✅ (avatar) | Jira account UUID — editable via picker |
| **assignee_display_name** | text | ✅ | 🔒 | ✅ (next to avatar) | Denormalized from Jira — read-only |
| **reporter_account_id** | uuid | ✅ | 🔒 | ✅ (detail only) | Issue creator — read-only |
| **reporter_display_name** | text | ✅ | 🔒 | ✅ (detail only) | — |
| **parent_key** | string FK | ✅ | ✅ | ✅ (parent cell) | Points to Epic / Feature — editable via parent picker |
| **parent_summary** | text | ✅ | 🔒 | ✅ (parent cell) | Denormalized — read-only |
| **labels** | array | ✅ | ✅ | ✅ (label chips) | Free-form tags — editable as chips |
| **fix_versions** | array | ✅ | ✅ | ✅ (version chip) | Release / sprint versions — editable as multi-select |
| **due_date** | timestamp | ✅ | ✅ | ✅ (date cell) | Target completion date — editable via date picker |
| **sprint_release_id** | uuid FK | ✅ | ✅ | ✅ (sprint cell) | Sprint / release ID — editable |
| **sprint_release_name** | text | ✅ | 🔒 | ✅ (sprint cell) | Denormalized — read-only |
| **components** | array | ✅ | 🔒 | 🔱 (hidden, field-gated) | Jira components — read-only, hidden by design (2026-05-07) |
| **description_adf** | JSON | ✅ | ✅ | ✅ (detail) | ADS rich text (via @atlaskit/editor) — editable |
| **description_text** | text | ✅ | 🔒 | 🔱 (hidden) | Plain text version — hidden |
| **comments** | array | ✅ | ✅ | ✅ (count badge, section) | Jira comments — read + add new |
| **is_flagged** | boolean | ✅ | ✅ | ✅ (flag icon) | Issue flagged for impediment — editable toggle |
| **created_at** | timestamp | ✅ | 🔒 | ✅ (created col) | Sync timestamp — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ (updated col) | Last sync timestamp — read-only |
| **jira_created_at** | timestamp | ✅ | 🔒 | ✅ (detail) | Original Jira creation date — read-only |
| **jira_updated_at** | timestamp | ✅ | 🔒 | ✅ (detail) | Last Jira update date — read-only |
| **first_synced_at** | timestamp | ✅ | 🔒 | 🔱 (hidden) | When synced to Catalyst — hidden |
| **last_synced_at** | timestamp | ✅ | 🔒 | 🔱 (hidden) | Last sync — hidden |
| **acceptance_criteria** | text | ✅ | ✅ | ✅ (detail section) | AC list (Story only) — editable |
| **assessment_feature** | text | ✅ | 🔒 | 🔱 (hidden, banned) | Jira custom field — **BANNED** (2026-05-05) — never display |
| **id** (UUID) | uuid | ✅ | 🔒 | 🔱 (hidden) | Internal row ID — never shown |
| **project_key** | string | ✅ | 🔒 | 🔱 (hidden in list, shown in breadcrumb) | Project code (BAU, MWR, etc.) — read-only |
| **project_name** | text | ✅ | 🔒 | ✅ (breadcrumb) | Project display name — read-only |
| **source** | enum | ✅ | 🔒 | 🔱 (hidden, admin only) | 'jira' / 'jira_parent_ref' — read-only |
| **synced_status_category** | enum | ✅ | 🔒 | 🔱 (hidden) | Status category from Jira — read-only |
| **hierarchy_level** | number | ✅ | 🔒 | 🔱 (hidden) | Tree depth (0=root) — read-only |
| **position** | integer | ✅ | ✅ | 🔱 (hidden, used for rank) | Backlog rank position — updated on drag |
| **raw_json** | JSON | ✅ | 🔒 | 🔱 (hidden, admin) | Full Jira API response — read-only admin view |
| **pending_write_back_at** | timestamp | ✅ | 🔒 | 🔱 (hidden) | Queued Jira write timestamp — read-only |
| **jira_removed_at** | timestamp | ✅ | 🔒 | 🔱 (soft-delete) | Soft-delete marker — read-only |
| **archived_at** | timestamp | ✅ | ✅ | 🔱 (hidden) | Archive timestamp — editable |
| **baseline_date** | timestamp | ✅ | ✅ | 🔱 (hidden) | Release/sprint baseline — editable |
| **effective_due_date** | timestamp | ✅ | 🔒 | ✅ (timeline) | Calculated from parent/epic — read-only |
| **effective_due_source** | text | ✅ | 🔒 | 🔱 (hidden) | Where effective_due came from — read-only |
| **flag_reason** | text | ✅ | ✅ | ✅ (flag detail) | Why flagged — editable text |
| **changelog** | array | ✅ | 🔒 | ✅ (activity section) | History of all changes — read-only |

**Key Groupings for Role Management:**

```
KEY FIELDS (always shown when module is accessible):
  - issue_key, summary, issue_type, status, priority, assignee

EDITABLE FIELDS (base CRUD):
  - summary, status, priority, assignee, reporter, parent_key, labels, 
    fix_versions, due_date, description_adf, is_flagged

DETAIL-ONLY FIELDS (not in list):
  - description_adf, acceptance_criteria, components, changelog, 
    created_at, updated_at, jira_created_at, comments

HIDDEN BY DESIGN (never render):
  - assessment_feature, service_now_ref, components, id, description_text,
    raw_json, source, synced_status_category, hierarchy_level, first_synced_at,
    last_synced_at, pending_write_back_at, jira_removed_at, changelog (admin view)

ADMIN-ONLY FIELDS:
  - raw_json, source, synced_status_category, first_synced_at, last_synced_at,
    pending_write_back_at, jira_removed_at
```

**Column Display (JiraTable):**

```
DEFAULT_VISIBLE_COLUMNS (BacklogPage):
  id: 'key'              → makeKeyCell()      [issue_key + type_icon + summary merged]
  id: 'status'           → makeStatusEditCell()  [status lozenge]
  id: 'priority'         → makePriorityEditCell() [priority badge]
  id: 'parent'           → makeParentEditCell()   [parent link]
  id: 'assignee'         → makeAssigneeEditCell() [avatar + name]
  id: 'labels'           → makeLabelsEditCell()   [label chips]
  id: 'fix_versions'     → makeFixVersionsCell()  [version chip]
  id: 'due_date'         → makeDateEditCell()     [date]
  id: 'created'          → makeDateCell()         [created_at]
  id: 'updated'          → makeDateCell()         [updated_at]
  id: 'sprint_release'   → makeSprintReleaseCell() [sprint/release]
  id: 'reporter'         → makeReporterCell()     [reporter avatar]
  id: 'comments'         → makeCommentsCell()     [comment count]
  id: '__drag'           → makeDragHandleCell()   [rank drag handle]
  id: '__actions'        → makeRowMenuCell()      [row menu]
```

**Actions by Type:**

| Category | Action | Scope | Triggers | Requires |
|----------|--------|-------|----------|----------|
| **Create** | Create issue (inline row) | Single | Click "+" in backlog footer | create permission |
| | Create issue (inline group) | Group | Click "+" in group header | create permission |
| | Create from form | Single | Modal dialog | create permission |
| **Read** | View list (backlog, allwork, kanban) | Multiple | Navigate to route | read permission |
| | View detail panel | Single | Click row / URL param | read permission |
| | View timeline | Multiple | Navigate to timeline view | read permission |
| | View dashboard | Multiple | Navigate to dashboard | read permission |
| | View roadmap | Multiple | Navigate to roadmap | read permission |
| **Update** | Edit summary | Single | Click summary cell → inline edit | update permission |
| | Edit status | Single | Click status cell → dropdown | update permission |
| | Edit priority | Single | Click priority cell → dropdown | update permission |
| | Edit assignee | Single | Click assignee cell → picker | update permission |
| | Edit reporter | Single | Click reporter cell → picker | update permission |
| | Edit parent | Single | Click parent cell → picker | update permission |
| | Edit labels | Single | Click labels cell → tag input | update permission |
| | Edit fix_versions | Single | Click version cell → multi-select | update permission |
| | Edit due_date | Single | Click date cell → date picker | update permission |
| | Edit description | Single | Click description → @atlaskit/editor | update permission |
| | Edit acceptance criteria | Single | Click AC section (Story only) | update permission |
| | Rank/reorder | Single | Drag row (no active sort/group) | update permission |
| | Transition status | Single | Status cell state machine | update permission (Jira write-back) |
| | Add comment | Single | Click comment section | update permission |
| | Add watcher | Single | Click watchers chip | update permission |
| | Flag / unflag | Single | Click flag icon | update permission |
| **Delete** | Delete single | Single | Row menu → delete → confirm | delete permission |
| | Bulk delete | Multiple | Bulk select + footer bar → delete | delete permission |
| | Archive | Single | Row menu → archive | delete permission |
| **Special** | Group by (type, status, parent, assignee, priority) | Multiple | Top toolbar dropdown | read permission |
| | Sort (any column, asc/desc) | Multiple | Click column header | read permission |
| | Filter (JQL, saved filters) | Multiple | Filter panel, saved filter library | read permission |
| | Column picker | Multiple | Right-side column config | read permission |
| | Saved filters | Multiple | Dropdown or library page | read permission |
| | Keyboard shortcuts | Single | `c` = create, filter shortcuts | read permission |
| | Bulk select | Multiple | Checkbox header | read permission + bulk operations |
| | Export | Multiple | Footer bar | read permission |
| | Sprint/release assignment | Single | Context menu → assign to sprint | update permission |

---

### 2. PRODUCT HUB ✅ Active

**Routes:**
- `/product-hub/products` — all products listing
- `/product-hub/:key/backlog` — backlog list + detail at `/backlog/:issueKey`
- `/product-hub/:key/allwork` — all requests list + detail
- `/product-hub/:key/kanban` — kanban view
- `/product-hub/:key/timeline` — timeline view + detail
- `/product-hub/:key/roadmap` — roadmap view
- `/product-hub/:key/roadmaps/:id` — specific roadmap
- `/product-hub/:key/filters` — saved filters
- `/product-hub/:key/settings` — demand summary / product settings
- `/product-hub/:key/standups` — standup management
- `/product-hub/product-dashboard` — all products dashboard
- `/product-hub/requirement-assist` — AI requirement assistant + compose + categories

**Primary Entity:** `business_requests` (Product feature requests — NOT Jira-synced, Catalyst-native)

**Field Inventory:**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **request_key** | string PK | ✅ | 🔒 | ✅ (list, detail) | Generated key (BR-100) — read-only, auto-generated on create |
| **title** | text | ✅ | ✅ | ✅ (merged key cell) | Request title — editable inline |
| **request_type** | enum | ✅ | ✅ | ✅ (icon) | feature / gap / integration / data_request — editable |
| **status** | enum | ✅ | ✅ | ✅ (status pill) | backlog / active / done / rejected — editable |
| **urgency** | enum | ✅ | ✅ | ✅ (badge) | critical / high / medium / low — editable |
| **category** | text | ✅ | ✅ | ✅ (category col) | Free-form category tag — editable |
| **theme** | text | ✅ | ✅ | ✅ (theme col) | Strategic theme link — editable |
| **process_step** | enum | ✅ | ✅ | ✅ (status) | Custom workflow step — editable |
| **planned_quarter** | array | ✅ | ✅ | ✅ (quarter col) | Targeted quarters [Q1, Q2, ...] — editable multi-select |
| **start_date** | timestamp | ✅ | ✅ | ✅ (timeline) | Work start target — editable date |
| **end_date** | timestamp | ✅ | ✅ | ✅ (timeline) | Work completion target — editable date |
| **targeted_feature** | text | ✅ | ✅ | ✅ (detail) | Link to feature (free text or link) — editable |
| **description** | text | ✅ | ✅ | ✅ (detail section) | Request description / acceptance criteria — editable |
| **stakeholders** | JSON | ✅ | ✅ | ✅ (detail, chip) | List of stakeholder UUIDs — editable picker |
| **product_owner** | uuid FK | ✅ | ✅ | ✅ (PO avatar col) | Product owner ID — editable via picker |
| **po_user_id** | uuid FK | ✅ | 🔒 | 🔱 (hidden, duplicate) | Alias of product_owner — read-only |
| **delivery_manager** | uuid FK | ✅ | ✅ | ✅ (DM avatar col) | Delivery/project manager ID — editable |
| **project_manager_user_id** | uuid FK | ✅ | 🔒 | 🔱 (hidden, duplicate) | Alias of delivery_manager — read-only |
| **tags** | array | ✅ | ✅ | ✅ (tag chips) | Free-form tags — editable |
| **id** (UUID) | uuid | ✅ | 🔒 | 🔱 (hidden) | Internal row ID — never shown |
| **product_id** | uuid FK | ✅ | 🔒 | 🔱 (hidden) | Product ID (inferred from route) — read-only |
| **parent_request_id** | uuid FK | ✅ | ✅ | ✅ (parent cell) | Parent BR link — editable |
| **release_id** | uuid FK | ✅ | ✅ | ✅ (release col) | Release link — editable |
| **rank** | integer | ✅ | ✅ | 🔱 (hidden, used for drag) | Backlog rank — updated on drag |
| **created_at** | timestamp | ✅ | 🔒 | ✅ (created col) | Creation timestamp — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ (updated col) | Last update timestamp — read-only |
| **created_by** | uuid | ✅ | 🔒 | 🔱 (hidden, admin) | Creator user ID — read-only admin view |
| **color_hex** | text | ✅ | ✅ | 🔱 (hidden, possible future) | Card color — currently unused |
| **display_order** | integer | ✅ | 🔒 | 🔱 (hidden) | Display order (may be deprecated) — read-only |

**Key Groupings for Role Management:**

```
KEY FIELDS (always shown when module is accessible):
  - request_key, title, request_type, status, urgency

EDITABLE FIELDS (base CRUD):
  - title, request_type, status, urgency, category, theme, process_step,
    planned_quarter, start_date, end_date, targeted_feature, description,
    stakeholders, product_owner, delivery_manager, tags, parent_request_id, release_id

DETAIL-ONLY FIELDS:
  - description, stakeholders, created_at, updated_at

HIDDEN BY DESIGN:
  - id, product_id, created_by, po_user_id, project_manager_user_id,
    rank, color_hex, display_order
```

**Column Display (JiraTable adapter):**

```
VISIBLE_COLUMNS (ProductBacklogPage):
  id: 'key'              → makeKeyCell()      [request_key + icon + title]
  id: 'status'           → makeStatusEditCell() [status lozenge]
  id: 'request_type'     → makeTypeCell()     [Feature/Gap/Integration icon]
  id: 'category'         → makeCell()         [category text]
  id: 'theme'            → makeCell()         [theme text]
  id: 'urgency'          → makeUrgencyCell()  [urgency badge]
  id: 'planned_quarter'  → makeQuarterCell()  [quarter chips]
  id: 'target_date'      → makeDateEditCell() [end_date]
  id: 'delivery_manager' → makeAssigneeCell() [DM avatar]
  id: 'product_owner'    → makeAssigneeCell() [PO avatar]
  id: 'stakeholders'     → makeStakeholdersCell() [stakeholder chips]
  id: 'targeted_feature' → makeCell()         [feature link]
  id: '__drag'           → makeDragHandleCell() [rank]
  id: '__actions'        → makeRowMenuCell()  [row menu]

NOTE: Product hub DOES NOT show:
  - parent (inherited from JiraTable, hidden by CatalystViewBase adapter)
  - assignee (not part of business_requests schema)
  - priority (not part of business_requests schema)
  - labels (not used in product hub)
  - comments (not part of business_requests schema)
  - reporter (not used in product hub)
  - sprint_release (not shown in product context)
```

**Actions by Type:**

| Category | Action | Scope | Triggers |
|----------|--------|-------|----------|
| **Create** | Create business request (inline) | Single | Click "+" in backlog footer |
| | Create from requirement assist | Single | AI-generated from requirements |
| **Read** | View backlog | Multiple | Navigate to backlog |
| | View kanban | Multiple | Navigate to kanban view |
| | View timeline | Multiple | Navigate to timeline |
| | View roadmap | Multiple | Navigate to roadmap |
| | View detail | Single | Click row / URL param |
| | View demand summary | Single | Navigate to settings |
| **Update** | Edit title | Single | Click title cell → inline edit |
| | Edit status | Single | Click status cell → dropdown |
| | Edit request_type | Single | Click type cell → dropdown |
| | Edit urgency | Single | Click urgency cell → dropdown |
| | Edit category | Single | Click category cell → edit |
| | Edit theme | Single | Click theme cell → edit |
| | Edit planned_quarter | Single | Click quarter cell → multi-select |
| | Edit target_date | Single | Click date cell → date picker |
| | Edit product_owner | Single | Click PO cell → picker |
| | Edit delivery_manager | Single | Click DM cell → picker |
| | Edit stakeholders | Single | Click stakeholders cell → picker |
| | Edit targeted_feature | Single | Click feature cell → edit |
| | Edit description | Single | Click description → editor |
| | Rank/reorder | Single | Drag row |
| **Delete** | Delete single | Single | Row menu → delete → confirm |
| | Bulk delete | Multiple | Bulk select + footer bar |
| **Special** | Group by (status, request_type, theme, urgency) | Multiple | Top toolbar |
| | Sort (any column) | Multiple | Click column header |
| | Filter | Multiple | Filter panel |
| | Saved filters | Multiple | Filter dropdown |
| | Column picker | Multiple | Right-side config |
| | Bulk select | Multiple | Checkbox header |
| | AI requirement assist | Multiple | Dedicated page + inline |

---

### 3. INCIDENT HUB ✅ Active

**Routes:**
- `/incident-hub/all-incidents` — all incidents list
- `/incident-hub/dashboard` — incident dashboard
- `/incident-hub/board` — kanban board
- `/incident-hub/timeline` — timeline view
- `/incident-hub/analytics` — analytics dashboard
- `/incident-hub/view/:id` — detail view (also `/incident-hub/backlog/:key` alias)
- `/incident-hub/filters` — saved filters

**Primary Entity:** `ph_issues` (Jira-synced, read-only in Catalyst)
**Filter:** WHERE `issue_type = 'Production Incident'`

**Field Inventory:**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **issue_key** | string PK | ✅ | 🔒 | ✅ | Jira incident key — read-only |
| **summary** | text | ✅ | 🔒 | ✅ | Incident title — read-only from Jira |
| **status** | enum | ✅ | ✅ | ✅ | open / triage / in_progress / to_committee / resolved — Jira write-back only |
| **severity** | enum | ✅ | 🔒 | ✅ | Critical / High / Medium / Low — read-only from Jira |
| **priority** | enum | ✅ | 🔒 | ✅ | Jira priority — read-only |
| **assignee_account_id** | uuid | ✅ | 🔒 | ✅ | Incident owner — read-only (Jira manages) |
| **assignee_display_name** | text | ✅ | 🔒 | ✅ | — |
| **reporter_account_id** | uuid | ✅ | 🔒 | ✅ | Reporter — read-only |
| **reporter_display_name** | text | ✅ | 🔒 | ✅ | — |
| **parent_key** | string FK | ✅ | 🔒 | ✅ (parent cell) | Parent epic (if linked) — read-only |
| **labels** | array | ✅ | 🔒 | ✅ | Labels — read-only |
| **due_date** | timestamp | ✅ | 🔒 | ✅ | Target resolution date — read-only |
| **created_at** | timestamp | ✅ | 🔒 | ✅ | Incident creation — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ | Last sync time — read-only |
| **description_adf** | JSON | ✅ | 🔒 | ✅ | Incident description — read-only |
| **comments** | array | ✅ | ✅ | ✅ (section) | Comments — read-only in Catalyst, write in Jira |
| **fix_versions** | array | ✅ | 🔒 | 🔱 (hidden) | Resolved in version — read-only, hidden |
| **service_now_ref** | text | ✅ | 🔒 | 🔱 (hidden, banned) | ServiceNow ticket — read-only, **BANNED** from display |
| **raw_json** | JSON | ✅ | 🔒 | 🔱 (hidden, admin) | Full Jira payload — admin view only |

**Key Groupings:**

```
READABLE FIELDS (all from Jira sync):
  - issue_key, summary, status, severity, priority, assignee, reporter,
    parent_key, labels, due_date, created_at, updated_at, description_adf,
    comments, fix_versions

WRITABLE FIELDS (Jira write-back only):
  - status (via Jira transition)
  - comments (add only, no edit)
  - watchers (add/remove)

HIDDEN:
  - service_now_ref (banned 2026-05-07)
  - fix_versions (implementation detail)
  - raw_json (admin only)
```

**Column Display:**

```
VISIBLE_COLUMNS (IncidentListPage):
  id: 'key'      → makeKeyCell()           [issue_key + type icon + summary]
  id: 'status'   → makeStatusCell()        [status lozenge]
  id: 'parent'   → makeParentCell()        [parent epic link]
  id: 'assignee' → makeAssigneeCell()      [assignee avatar]
  id: 'priority' → makeCell()              [priority badge]
  id: 'labels'   → makeLabelsCell()        [label chips]
  id: 'due_date' → makeDateCell()          [due date]
  id: 'created'  → makeDateCell()          [created timestamp]
  id: 'updated'  → makeDateCell()          [last update]
  id: '__drag'   → makeDragHandleCell()    [rank (visual only, no reorder)]
  id: '__actions'→ makeRowMenuCell()       [read-only indicator menu]
```

**Actions by Type:**

| Category | Action | Scope | Notes |
|----------|--------|-------|-------|
| **Read** | View list | Multiple | All incidents from Jira sync |
| | View board | Multiple | Kanban grouping by status |
| | View timeline | Multiple | Timeline of incidents |
| | View analytics | Multiple | Incident metrics dashboard |
| | View detail | Single | Full incident details |
| **Update** | Transition status | Single | Via Jira write-back (status field) |
| | Add comment | Single | Via Jira write-back |
| | Add watcher | Single | Via Jira write-back |
| **Special** | Group by (status, priority, assignee) | Multiple | View organization only |
| | Sort (any column) | Multiple | List reordering |
| | Filter (by status, assignee, severity) | Multiple | Saved filters |
| | Analytics (count, timeline, trends) | Single | Dashboard metrics |

**Important Note:** Incident Hub is **READ-ONLY in Catalyst UI**. All mutations (status change, reassign, etc.) route through Jira's API. Catalyst surfaces the status as a visual indicator, not an edit control, with a "Managed in Jira" overlay.

---

### 4. RELEASE HUB ✅ Active

**Routes:**
- `/release-hub/overview` — release overview/command center
- `/release-hub/releases-management` — releases list + create
- `/release-hub/release-kanban` — kanban view
- `/release-hub/work` — work items linked to release
- `/release-hub/timeline` — timeline view
- `/release-hub/calendar` — release calendar
- `/release-hub/changes` — change records (linked to release)
- `/release-hub/sign-off-queue` — committee sign-off workflow
- `/release-hub/freeze-windows` — release freeze management
- `/release-hub/sop-templates` — SOP template library
- `/release-hub/filters` — saved filters
- `/release-hub/production-events` — production incident log
- `/release-hub/:releaseId` — specific release detail

**Primary Entity:** `rh_releases` (Catalyst-native release records)

**Field Inventory:**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **id** (UUID) | uuid | ✅ | 🔒 | 🔱 (hidden) | Internal row ID — never shown |
| **name** | text | ✅ | ✅ | ✅ | Release name (e.g., "Q2 2026") — editable |
| **version** | string | ✅ | ✅ | ✅ (key) | Version string (e.g., "2.5.0") — editable |
| **status** | enum | ✅ | ✅ | ✅ (status pill) | draft / planned / in_readiness / ready_for_signoff / approved / scheduled / deploying / monitoring / completed — editable |
| **health** | enum | ✅ | ✅ | ✅ (health icon) | on_track / at_risk / off_track — editable |
| **release_type** | enum | ✅ | ✅ | ✅ (type badge) | major / minor / patch / hotfix — editable |
| **target_env** | enum | ✅ | ✅ | ✅ | dev / staging / prod / prod_canary — editable |
| **target_date** | timestamp | ✅ | ✅ | ✅ | Release target date — editable date picker |
| **planned_start_date** | timestamp | ✅ | ✅ | ✅ (timeline) | Planned work start — editable |
| **planned_release_date** | timestamp | ✅ | ✅ | ✅ (timeline) | Planned release date — editable |
| **readiness_pct** | number | ✅ | ✅ | ✅ (progress bar) | Readiness percentage (0-100) — editable slider |
| **description** | text | ✅ | ✅ | ✅ (detail) | Release notes / description — editable editor |
| **source** | text | ✅ | 🔒 | 🔱 (hidden) | How created ('manual', 'jira', etc.) — read-only |
| **jira_key** | string FK | ✅ | 🔒 | ✅ (link) | Linked Jira fix version key — read-only |
| **product_id** | uuid FK | ✅ | 🔒 | 🔱 (hidden) | Product ID (inferred from route) — read-only |
| **release_manager_id** | uuid FK | ✅ | ✅ | ✅ (avatar col) | Release manager — editable picker |
| **created_at** | timestamp | ✅ | 🔒 | ✅ | Creation timestamp — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ | Last update — read-only |

**Additional Release-Linked Entities:**

- `rh_changes` (Change records) — linked to release via `release_id`
- `rh_sign_offs` (Sign-off records) — approval workflow
- `rh_freeze_windows` (Release freeze) — blackout periods
- `rh_sop_templates` (SOP templates) — runbooks

**Column Display (Release List):**

```
VISIBLE_COLUMNS:
  id: 'key'         → version + status chip
  id: 'status'      → makeStatusCell() [status lozenge]
  id: 'health'      → makeHealthCell() [health icon]
  id: 'release_type'→ makeTypeCell()   [major/minor/patch]
  id: 'target_date' → makeDateCell()   [target_date]
  id: 'readiness'   → makeProgressCell() [progress bar]
  id: '__drag'      → makeDragHandleCell() [rank]
  id: '__actions'   → makeRowMenuCell()    [row menu]
```

**Actions by Type:**

| Category | Action | Scope |
|----------|--------|-------|
| **Create** | Create release | Single |
| | Create change record | Single |
| | Create SOP template | Single |
| | Create freeze window | Single |
| **Read** | View release overview | Multiple |
| | View kanban | Multiple |
| | View timeline | Multiple |
| | View calendar | Multiple |
| | View changes | Multiple |
| | View sign-off queue | Single |
| | View detail | Single |
| **Update** | Edit name | Single |
| | Edit status | Single |
| | Edit health | Single |
| | Edit release_type | Single |
| | Edit target_env | Single |
| | Edit target_date | Single |
| | Edit release_manager | Single |
| | Edit readiness_pct | Single |
| | Edit description | Single |
| **Delete** | Delete release | Single |
| | Delete change | Single |
| **Special** | Sign-off workflow (committee approval) | Single |
| | Freeze window management | Multiple |
| | Change linking | Single |
| | Production event logging | Multiple |

---

### 5. TEST HUB ✅ Active

**Routes:**
- `/testhub/dashboard` — test dashboard
- `/testhub/my-work` — assigned to me
- `/testhub/board` — test kanban
- `/testhub/repository` — all test cases
- `/testhub/cycles` — test cycle list
- `/testhub/cycles/:id` — cycle detail
- `/testhub/cycles/:id/execute` — test execution
- `/testhub/sets` — test set library
- `/testhub/traceability` — traceability matrix
- `/testhub/reports` — test reports
- `/testhub/filters` — saved filters

**Primary Entities:**
- `plan_test_cases` (Test Case records)
- `plan_test_cycles` (Test Cycle / Test Run)
- `shared_test_steps` (Test Steps)

**Field Inventory (plan_test_cases):**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **id** | uuid | ✅ | 🔒 | 🔱 (hidden) | Internal ID — read-only |
| **case_number** | string | ✅ | 🔒 | ✅ | Auto-generated case ID (TC-001) — read-only |
| **title** | text | ✅ | ✅ | ✅ | Test case title — editable |
| **description** | text | ✅ | ✅ | ✅ | Test description / preconditions — editable |
| **expected_outcome** | text | ✅ | ✅ | ✅ | Expected result — editable |
| **status** | enum | ✅ | ✅ | ✅ | draft / active / deprecated / archived — editable |
| **priority** | enum | ✅ | ✅ | ✅ | critical / high / medium / low — editable |
| **test_type** | enum | ✅ | ✅ | ✅ | functional / regression / smoke / sanity / e2e — editable |
| **assigned_to** | uuid FK | ✅ | ✅ | ✅ (avatar) | Tester assignment — editable picker |
| **cycle_id** | uuid FK | ✅ | ✅ | ✅ (link) | Current cycle — editable |
| **created_at** | timestamp | ✅ | 🔒 | ✅ | Created — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ | Last updated — read-only |
| **created_by** | uuid | ✅ | 🔒 | 🔱 (hidden) | Creator — read-only |

**Field Inventory (plan_test_cycles):**

| Field | Type | Read | Write | Display |
|-------|------|------|-------|---------|
| **id** | uuid | ✅ | 🔒 | 🔱 |
| **name** | text | ✅ | ✅ | ✅ |
| **status** | enum | ✅ | ✅ | ✅ (status pill) |
| **cycle_type** | enum | ✅ | ✅ | ✅ |
| **start_date** | timestamp | ✅ | ✅ | ✅ |
| **end_date** | timestamp | ✅ | ✅ | ✅ |
| **created_at** | timestamp | ✅ | 🔒 | ✅ |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ |

**Column Display:**

```
TEST_CASES_COLUMNS:
  id: 'case_number' → makeKeyCell()    [TC-001]
  id: 'title'       → makeCell()       [title]
  id: 'status'      → makeStatusCell() [status]
  id: 'priority'    → makePriorityCell() [priority]
  id: 'test_type'   → makeTypeCell()   [type badge]
  id: 'assigned_to' → makeAssigneeCell() [avatar]
  id: 'cycle'       → makeCell()       [cycle link]
  id: '__actions'   → makeRowMenuCell() [menu]
```

**Actions:**

| Category | Action | Scope |
|----------|--------|-------|
| **Create** | Create test case | Single |
| | Create test cycle | Single |
| | Create test set | Multiple |
| | Add test step | Single |
| **Read** | View repository | Multiple |
| | View cycle detail | Single |
| | View execution | Single |
| | View traceability | Multiple |
| | View reports | Multiple |
| **Update** | Edit title | Single |
| | Edit status | Single |
| | Edit priority | Single |
| | Edit assigned_to | Single |
| | Edit test_steps | Single |
| **Delete** | Delete case | Single |
| | Delete cycle | Single |
| **Special** | Execute cycle | Single |
| | Generate report | Multiple |
| | Traceability mapping | Multiple |

---

### 6. TASK HUB ✅ Active

**Routes:**
- `/tasks/overview` → PlannerPage (planner board)
- `/tasks/board` → KanbanPage (kanban)
- `/tasks/list` → list view
- `/tasks/work` → all work items
- `/tasks/view/:taskKey` → task detail
- `/tasks/filters` → saved filters

**Primary Entity:** `tasks` (Catalyst-native task management)

**Field Inventory:**

| Field | Type | Read | Write | Display | Notes |
|-------|------|------|-------|---------|-------|
| **id** | uuid | ✅ | 🔒 | 🔱 | Internal ID — read-only |
| **title** | text | ✅ | ✅ | ✅ | Task title — editable inline |
| **description** | text | ✅ | ✅ | ✅ | Task description — editable |
| **status** | enum | ✅ | ✅ | ✅ | todo / in_progress / done — editable |
| **priority** | enum | ✅ | ✅ | ✅ | high / medium / low — editable |
| **assignee_id** | uuid FK | ✅ | ✅ | ✅ (avatar) | Task owner — editable picker |
| **due_date** | timestamp | ✅ | ✅ | ✅ | Due date — editable |
| **labels** | array | ✅ | ✅ | ✅ | Task tags — editable |
| **checklist_items** | array | ✅ | ✅ | ✅ (section) | Subtasks/checklist — editable add/check |
| **comments** | array | ✅ | ✅ | ✅ (section) | Comments — editable add |
| **attachments** | array | ✅ | ✅ | ✅ (section) | File attachments — editable upload |
| **project_id** | uuid FK | ✅ | 🔒 | 🔱 | Project (context) — read-only |
| **created_at** | timestamp | ✅ | 🔒 | ✅ | Created — read-only |
| **updated_at** | timestamp | ✅ | 🔒 | ✅ | Updated — read-only |
| **created_by** | uuid | ✅ | 🔒 | 🔱 | Creator — read-only |
| **completed_at** | timestamp | ✅ | 🔒 | 🔱 (hidden) | Completion time (set when status=done) — read-only |

**Actions:**

| Category | Action | Scope |
|----------|--------|-------|
| **Create** | Create task (inline) | Single |
| | Create from form | Single |
| **Read** | View overview | Multiple |
| | View board/kanban | Multiple |
| | View list | Multiple |
| | View detail | Single |
| **Update** | Edit title | Single |
| | Edit status | Single |
| | Edit priority | Single |
| | Edit assignee | Single |
| | Edit due_date | Single |
| | Edit description | Single |
| | Edit labels | Single |
| | Add checklist item | Single |
| | Check/uncheck item | Single |
| | Add comment | Single |
| | Add attachment | Single |
| | Rank/reorder | Single |
| **Delete** | Delete task | Single |
| **Special** | Group by (status, priority, assignee) | Multiple |
| | Sort | Multiple |
| | Filter | Multiple |

---

### 7. HOME HUB ✅ Active

**Routes:**
- `/for-you` — For You dashboard (aggregated feed)

**Primary Entity:** Aggregated from `ph_issues`, `business_requests`, `tasks`, + notifications

**Feed Sections:**

| Section | Source | Fields | Writable |
|---------|--------|--------|----------|
| **Starred items** | Recent starred from all hubs | key, title, type, hub | star/unstar toggle |
| **Assigned to me** | Issues + tasks assigned to current user | key, summary, status, due_date | edit (navigate to hub) |
| **Ageing items** | Issues not updated in 30+ days | key, summary, age, assignee | edit |
| **Recommended items** | AI-curated suggestions | key, title, reason | dismiss, navigate |
| **Mention notifications** | Comments/mentions in feed | from_user, comment_text, entity_key | react, reply, mark read |
| **For You feed** | Mixed high-signal items | mixed | react, reply, mark read |
| **Notifications** | Toast/badge notifications | type, from_user, action, entity | mark read, dismiss |

**Actions:**

| Action | Scope |
|--------|-------|
| **Star/unstar** | Single item |
| **Mark notification read** | Single |
| **React to item** (emoji) | Single |
| **Add comment from feed** | Single |
| **Ask CATY (AI)** | Single or digest |
| **View AI digest** | Aggregated |
| **Navigate to hub** | Deep link |

---

### 8. STRATEGY HUB 🔴 Dormant

**Routes:** `/strategyhub`, `/strategyhub/themes`, `/strategyhub/goals`, `/strategyhub/executive-brief`, etc.

**Status:** Scaffolded, mostly placeholders. Linked from project + product hubs.

**Planned Fields:**
- Strategic themes (name, description, OKRs)
- Goals / OKRs (goal name, key results, owner, timeline)
- Executive brief (summary, metrics, insights)

**Note:** Field-level access rules can be templated now, enforced when module goes live.

---

### 9. PLAN HUB 🔴 Dormant

**Routes:** `/planhub`, `/planhub/plan/:planId`, `/planhub/capacity`, `/planhub/budget-planner`, etc.

**Status:** Scaffolded. Not yet implemented.

**Planned Entities:**
- Plans (scenarios, milestones, resources)
- Capacity data
- Budget lines

---

### 10. WIKI HUB 🔴 Dormant

**Routes:** `/wiki`, `/wiki/:pageSlug`, `/wiki/category/:slug`, etc.

**Status:** Scaffolded, gated by feature flag.

**Planned Entities:**
- Wiki pages (title, content, category, slug, tags, author)
- Learning paths
- Templates

---

## ROLE MANAGEMENT DESIGN OPTIONS

### Option A: Module-Level Only (Current State)

**Granularity:** On/off per hub

**Model:**
```typescript
interface UserModuleAccess {
  [moduleKey: string]: boolean; // 'project_hub', 'product_hub', etc.
}
```

**Pros:**
- Simple to implement, already in code
- Fast to check: `moduleAccess[moduleName]`
- Minimal DB footprint

**Cons:**
- Cannot hide fields from a role (e.g., "Guest can see Project backlog but not priority/assignee")
- Cannot restrict actions (e.g., "Support can view incidents but not transition status")
- Cannot enforce field-level compliance (e.g., "PMO cannot see salary data")

**Estimate:** Minimal additional work (refactor existing module_access column)

---

### Option B: Module + Action Level (CRUD per Module)

**Granularity:** Create, Read, Update, Delete per hub

**Model:**
```typescript
interface UserModuleAccess {
  [moduleKey: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    actions?: string[]; // special actions like 'sign_off', 'bulk_edit'
  };
}
```

**Pros:**
- Can restrict mutations per role (e.g., Guest = read-only)
- Can allow read-only access to sensitive modules
- Aligns with RBAC patterns (standard)

**Cons:**
- Still cannot hide individual fields
- Cannot gate field visibility per role (e.g., "hide salary field from non-PMO")

**Estimate:** 2-3 days (schema migration, permission checks on CRUD handlers, admin UI)

---

### Option C: Module + Action + Field Level (Full Granular Control)

**Granularity:** Create, Read, Update, Delete, + visible fields + editable fields per role

**Model:**
```typescript
interface UserModuleAccess {
  [moduleKey: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    visibleFields: string[]; // fields shown in UI
    editableFields: string[]; // fields that can be edited
    hiddenFields: string[]; // explicitly hidden
    actions: string[]; // special actions
  };
}
```

**Pros:**
- Maximum flexibility
- Can hide sensitive fields per role (e.g., "Service Now Ref" banned from non-admin)
- Can make fields read-only for certain roles (e.g., "Issue Type is read-only for Guest")
- Future-proof for compliance (data masking, PII hiding)

**Cons:**
- Complex to implement (filter fields in UI layer, enforce in API)
- Larger DB footprint
- More admin UI complexity (column picker per role)
- Risk of overhiding → poor UX

**Estimate:** 5-7 days (schema, API filtering, admin UI, field resolution in frontend)

---

## RECOMMENDED APPROACH

**Phase 1 (Current):** **Option B — Module + Action Level**
- Implement CRUD gates per module and role
- Supports all 16 roles with reasonable control
- Jira incident hub can be "read-only" for non-admins
- Foundation for Option C later

**Phase 2 (Future):** **Option C — Add Field-Level Gates**
- Once Option B is stable, add field visibility per role
- Highest ROI: hide banned fields (Assessment Feature, Service Now Ref) per role
- Make sensitive fields read-only per role

---

## IMPLEMENTATION CHECKLIST

### DB Schema (Option B)

```sql
-- Extend profiles table or create separate roles_permissions table
ALTER TABLE profiles ADD COLUMN module_access JSONB DEFAULT '{
  "home": {"create": false, "read": true, "update": false, "delete": false},
  "project_hub": {"create": true, "read": true, "update": true, "delete": false},
  ...
}';

-- RLS policy: enforce at query time
CREATE POLICY "module_access_gate" ON ph_issues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (p.module_access ->> 'project_hub')::jsonb ->> 'read' = 'true'
    )
  );
```

### API Layer

```typescript
// middleware/checkModuleAccess.ts
export async function checkModuleAccess(
  userId: string,
  module: string,
  action: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
  const profile = await getProfile(userId);
  const moduleAccess = profile.module_access?.[module];
  return moduleAccess?.[action] === true;
}

// usage in handlers
if (!await checkModuleAccess(userId, 'project_hub', 'delete')) {
  return res.status(403).json({ error: 'Not authorized to delete issues' });
}
```

### Admin UI

- Edit role form: checkboxes for each module's CRUD gates
- Preview: show which actions each role can take
- Bulk templates: "QA Tester" = Project Hub (R+U), Test Hub (C+R+U+D)

---

## SUMMARY TABLE

| Aspect | Value |
|--------|-------|
| **Total Modules** | 10 (7 active, 3 dormant) |
| **Total Fields (across all)** | 120+ |
| **Key Entities** | ph_issues, business_requests, rh_releases, tasks, plans, tests, wiki |
| **Total Roles** | 16 |
| **Actions per Module** | 6-25 depending on module |
| **Recommended Approach** | Module + Action level (Phase 1); add Field level (Phase 2) |
| **Implementation Time** | 2-3 weeks (Phase 1), 1 week (Phase 2) |

---

## FILES TO UPDATE

### Core Permissions
- `src/pages/admin/AdminAccessPage.tsx` — role edit form
- `src/lib/auth.ts` — permission check helpers
- `supabase/migrations/` — RLS policies by module

### Module-Specific Guards
- `src/routes/FullAppRoutes.tsx` — route permission gates
- `src/components/admin/AdminGuard.tsx` — admin-only surfaces
- Each module's main page: add `<ModuleAccessGuard module="project_hub" action="read">`

### DB / RLS
- `supabase/migrations/` — new RLS policies per module
- Add `module_access` enforcement to every table accessed by the UI

---

**End of Inventory**

Approve this structure, and I'll design the admin UI + RLS enforcement for Phase 1 (Option B).
