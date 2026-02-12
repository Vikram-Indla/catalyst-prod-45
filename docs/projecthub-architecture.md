# ProjectHub — Architecture & Technical Documentation

> **Module**: ProjectHub (formerly WorkHub)
> **Version**: v4.5
> **Last Updated**: 2026-02-12
> **Status**: Production

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [Data Flow & Integration](#4-data-flow--integration)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Admin Configuration](#6-admin-configuration)
7. [Performance Engineering](#7-performance-engineering)
8. [Security Model](#8-security-model)
9. [Design System](#9-design-system)
10. [Architecture Decision Records (ARDs)](#10-architecture-decision-records-ards)
11. [Edge Functions](#11-edge-functions)
12. [API Reference](#12-api-reference)

---

## 1. Executive Summary

**ProjectHub** is a Jira-integrated project management module within the Catalyst platform. It provides real-time synchronisation of Jira issues, releases, themes, and resources, enabling cross-project visibility, release tracking, and capacity planning.

### Core Capabilities

| Capability | Description |
|---|---|
| **Work Items** | Hierarchical tree view (Epic → Story → Sub-task) synced from Jira |
| **Releases** | Derived from Jira Fix Versions with status aggregation |
| **Themes** | Cross-cutting business themes linked to work items |
| **Resource 360** | People-centric view with utilisation metrics |
| **Calendar** | Unified timeline of releases, themes, and due dates |
| **Capacity** | Team capacity planning and allocation |
| **Analytics** | Dashboards with KPIs and trend analysis |
| **Caty AI** | AI-powered assistant for project insights |

### Brand & Naming Convention

| Layer | Convention | Example |
|---|---|---|
| Database | `ph_` prefix | `ph_issues`, `ph_releases` |
| Views | `vw_ph_` prefix | `vw_ph_release_progress` |
| Functions | `fn_ph_` / `ph_` prefix | `fn_ph_release_summary` |
| CSS Tokens | `--ph-*` prefix | `--ph-primary`, `--ph-surface` |
| Routes | `/workhub/*` (migrating to `/projecthub/*`) | `/workhub/workitems` |
| Query Keys | `['projecthub', ...]` | `['projecthub', 'work-items']` |

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Catalyst Platform                     │
│                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  ProjectHub  │   │   TestHub    │   │  ReleaseHub  │ │
│  │  Frontend    │   │              │   │              │ │
│  └──────┬───────┘   └──────────────┘   └──────────────┘ │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │              TanStack Query Layer                 │   │
│  │  (Caching · Deduplication · Background Refresh)   │   │
│  └──────┬───────────────────────────────────────────┘   │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │           Supabase Client (PostgREST)             │   │
│  │           + RPC Functions                         │   │
│  └──────┬───────────────────────────────────────────┘   │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │              PostgreSQL Database                   │   │
│  │  Tables (ph_*) · Views (vw_ph_*) · Functions      │   │
│  └──────┬───────────────────────────────────────────┘   │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │           Supabase Edge Functions                  │   │
│  │  wh-jira-sync · wh-test-connection                │   │
│  │  wh-fetch-issue-stats                             │   │
│  └──────┬───────────────────────────────────────────┘   │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │              Jira Cloud REST API                   │   │
│  │  (POST /rest/api/3/search · Cursor Pagination)    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Module Separation

ProjectHub, TestHub, and ReleaseHub are separated via a 3-phase migration:

- **Phase 1**: `ReleaseHubSidebar` and `/releasehub/*` routing shell created
- **Phase 2**: Shared logic (Defects, Quality Gates) extracted to `src/lib/shared-quality/`
- **Phase 3**: Legacy `/releases/*` routes retired with redirects

**Ownership split**:
- TestHub retains CRUD for Defects (`th_defects`)
- ReleaseHub owns Quality Gates and Readiness tracking
- Shared data accessed via centralised hooks (e.g., `useDefectStats`)

---

## 3. Database Schema

### 3.1 Core Tables

#### `ph_issues` — Synced Jira Issues (Primary Data Store)

| Column | Type | Nullable | Description |
|---|---|---|---|
| `issue_key` | text | NO | Jira issue key (e.g., `ESS-1234`). **Primary key**. |
| `project_key` | text | NO | Jira project key (e.g., `ESS`) |
| `issue_type` | text | NO | Epic, Story, Bug, Sub-task, etc. |
| `summary` | text | NO | Issue title |
| `description_adf` | jsonb | YES | Raw Atlassian Document Format |
| `description_text` | text | YES | Plain text extracted from ADF |
| `status` | text | NO | Current Jira status |
| `status_category` | text | NO | `To Do`, `In Progress`, or `Done` |
| `priority` | text | YES | Critical, High, Medium, Low |
| `assignee_account_id` | text | YES | Jira account ID |
| `assignee_display_name` | text | YES | Jira display name |
| `parent_key` | text | YES | Parent issue key (hierarchy) |
| `parent_summary` | text | YES | Parent issue title |
| `hierarchy_level` | integer | YES | Nesting depth |
| `fix_versions` | jsonb | YES | Array of `{name, releaseDate, id}` |
| `labels` | text[] | YES | Jira labels |
| `components` | text[] | YES | Jira components |
| `sprint_name` | text | YES | Active sprint name |
| `story_points` | numeric | YES | Story point estimate |
| `due_date` | date | YES | Jira due date |
| `effective_due_date` | date | YES | Computed due date (precedence rules) |
| `effective_due_source` | text | YES | Source of effective date |
| `resolution` | text | YES | Resolution status |
| `type_icon_url` | text | YES | Jira type icon URL |
| `comments` | jsonb | YES | Last 20 Jira comments |
| `changelog` | jsonb | YES | Jira changelog history |
| `theme_id` | uuid | YES | FK → `ph_themes.id` (Catalyst-only) |
| `jira_created_at` | timestamptz | YES | Jira creation date |
| `jira_updated_at` | timestamptz | YES | Jira last update date |
| `synced_at` | timestamptz | YES | Last sync timestamp |

**Indexes**:
- `idx_ph_issues_fix_versions` — GIN index on `fix_versions` for JSONB containment queries
- Primary key on `issue_key`

#### `ph_releases` — Managed Releases

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Release name |
| `title` | text | Display title |
| `description` | text | Release description |
| `status` | text | Planned, Active, At Risk, Completed, Cancelled |
| `start_date` | date | Start date |
| `target_date` | date | Target release date |
| `actual_date` | date | Actual release date |
| `owner_user_id` | uuid | Release owner |
| `color` | text | Display colour |
| `sort_order` | integer | Display ordering |

#### `ph_themes` — Business Themes

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Theme name |
| `description` | text | Theme description |
| `color` | text | Display colour |
| `owner_user_id` | uuid | Theme owner |
| `start_date` | date | Start date |
| `end_date` | date | End date |
| `progress` | integer | Auto-calculated completion % |
| `status` | text | Active, Completed, On Hold |

#### `ph_jira_connection` — Singleton Connection Config

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Single row |
| `site_url` | text | Jira Cloud URL |
| `user_email` | text | Service account email |
| `api_token` | text | Encrypted API token |
| `project_count` | integer | Number of accessible projects |
| `is_connected` | boolean | Connection status |
| `last_tested_at` | timestamptz | Last test timestamp |

#### `ph_jira_projects` — Synced Jira Projects

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `jira_project_id` | text | Jira internal project ID |
| `project_key` | text | Project key (e.g., `ESS`) |
| `name` | text | Project name |
| `is_active` | boolean | Whether actively synced |
| `last_synced_at` | timestamptz | Last sync timestamp |

#### `ph_user_mapping` — Identity Resolution

| Column | Type | Description |
|---|---|---|
| `jira_account_id` | text (PK) | Jira account ID |
| `jira_display_name` | text | Jira display name |
| `jira_avatar_url` | text | Jira avatar URL |
| `catalyst_profile_id` | uuid | FK → `profiles.id` |
| `match_method` | text | `auto`, `manual`, `fuzzy` |
| `confidence_score` | numeric | Match confidence (0-1) |

### 3.2 Supporting Tables

| Table | Purpose |
|---|---|
| `ph_work_items` | Catalyst-native work items (non-Jira) |
| `ph_resources` | Resource definitions for capacity planning |
| `ph_resource_assignments` | Resource-to-item assignments |
| `ph_theme_items` | Theme-to-work-item link table |
| `ph_comments` | Comments on work items |
| `ph_saved_filters` | User-saved filter configurations |
| `ph_bulk_ops_log` | Audit trail for bulk operations |
| `ph_sync_log` / `ph_jira_sync_log` | Sync execution history |
| `ph_config` | Key-value configuration store |
| `ph_versions` | Parsed version metadata |

### 3.3 Aggregated Views

| View | Purpose | Key Joins |
|---|---|---|
| `vw_ph_work_items_full` | Work items with project, release, theme, and assignee info | `ph_issues` + `ph_jira_projects` + `ph_releases` + `ph_themes` + `ph_resources` |
| `vw_ph_release_progress` | Release stats (total, done, in-progress, blocked counts) | `ph_releases` + `ph_issues` aggregation |
| `vw_ph_theme_progress` | Theme completion metrics | `ph_themes` + `ph_theme_items` + `ph_issues` |
| `vw_ph_resource_utilization` | Per-resource utilisation percentages | `ph_resources` + `ph_issues` aggregation |
| `vw_ph_calendar_events` | Unified calendar events | Union of releases, themes, work items |
| `vw_ph_dashboard_kpis` | Dashboard summary KPIs | Aggregate across all entities |

### 3.4 Server-Side Functions

| Function | Type | Purpose |
|---|---|---|
| `fn_ph_release_summary()` | STABLE | Aggregates all release stats from `ph_issues.fix_versions` in a single query. Returns version name, status counts, projects, and assignees with resolved avatars/roles. |
| `fn_ph_work_item_filters()` | STABLE | Returns all distinct filter options (issue types, statuses, project keys, fix versions) in a single JSONB response. |
| `fn_ph_bulk_update(...)` | VOLATILE | Performs audited mass-changes on work items with before/after logging to `ph_bulk_ops_log`. |
| `fn_ph_update_theme_progress()` | TRIGGER | Automatically recalculates `ph_themes.progress` when linked items change. |
| `fn_ph_update_timestamp()` | TRIGGER | Generic `updated_at` timestamp updater. |
| `fn_ph_get_item_tree(...)` | STABLE | Returns hierarchical tree structure for a given root item. |
| `ph_parse_and_update_versions()` | VOLATILE | Parses `fix_versions` JSONB and populates `ph_versions`. |
| `ph_prune_stale()` | VOLATILE | Removes issues that no longer match sync criteria (Hard Delete pruning). |
| `ph_recompute_all()` | VOLATILE | Recomputes all derived views and aggregations. |

### 3.5 Triggers

| Trigger | Table | Action |
|---|---|---|
| `ph_config_updated` | `ph_config` | Updates timestamp on config change |
| `ph_jira_connection_updated` | `ph_jira_connection` | Updates timestamp on connection change |
| `ph_themes_updated` | `ph_themes` | Recalculates theme progress |
| `ph_user_mapping_updated` | `ph_user_mapping` | Propagates avatar to `profiles.avatar_url` |

---

## 4. Data Flow & Integration

### 4.1 Jira Sync Flow

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Admin Panel  │────▶│  wh-jira-sync     │────▶│  Jira Cloud API  │
│  (Trigger)    │     │  Edge Function    │     │  POST /search    │
└──────────────┘     └────────┬──────────┘     └──────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Processing Steps:   │
                    │  1. Fetch projects   │
                    │  2. Generate JQL     │
                    │  3. Cursor paginate  │
                    │  4. Upsert ph_issues │
                    │  5. Prune stale      │
                    │  6. Log to sync_log  │
                    └─────────────────────┘
```

**Sync Engine Details**:
- Uses **cursor-based pagination** via `nextPageToken` (POST endpoint)
- **Project-specific JQL** generated per project with configurable lookback (1–6 months)
- **Hard Delete pruning**: Removes items no longer matching sync criteria
- **Fallback chain**: Auto-discovers accessible project keys if config is invalid
- **Per-project configuration** stored in `ph_config` under key `sync_project_config`
- Syncs: full descriptions (ADF → plain text), last 20 comments, changelog history

### 4.2 Connection Testing Flow

```
wh-test-connection Edge Function
  │
  ├─ Step 1: Authentication      ─── GET /rest/api/3/myself
  ├─ Step 2: Project Access      ─── GET /rest/api/3/project/search
  ├─ Step 3: Issue Read          ─── POST /rest/api/3/search (bounded JQL)
  ├─ Step 4: Version Read        ─── GET /rest/api/3/project/{key}/version
  └─ Step 5: Write Detection     ─── HEAD /rest/api/3/issue (permission check)
```

- Uses **bounded JQL** and a **4-tier fallback chain** to avoid `410 Gone` / `400 Bad Request`
- UI: `TestConnectionModal` displays real-time progress with staggered 300ms animations

### 4.3 Identity Resolution Flow

```
Jira assignee_account_id
  │
  ├─▶ ph_user_mapping (jira_account_id → catalyst_profile_id)
  │     │
  │     ├─▶ profiles (avatar_url)
  │     │
  │     └─▶ resource_inventory (role_name)
  │
  └─▶ Display: "Name · Role" with Catalyst avatar
       Fallback: "Team Member" if no role found
```

- **Matching logic**: Weighted fuzzy engine + email auto-match
- **Avatar sync**: Mapped Jira avatars propagate to `profiles.avatar_url`
- **UI**: 3-column dashboard at `/admin/projecthub/user-mapping`

### 4.4 Release Aggregation Flow

```
Client: useJiraReleases()
  │
  └─▶ supabase.rpc('fn_ph_release_summary')
        │
        └─▶ SQL: Explode fix_versions JSONB
              → Aggregate status counts per version
              → JOIN ph_user_mapping + profiles + resource_inventory
              → Return: version_name, counts, projects[], assignees[]
```

**Performance**: Single RPC call replaces previous client-side batched approach (4+ network requests → 1).

### 4.5 Work Item Filter Flow

```
Client: useIssueTypes() / useIssueStatuses() / useIssueProjectKeys() / useIssueFixVersions()
  │
  └─▶ All delegate to useWorkItemFilters()
        │
        └─▶ supabase.rpc('fn_ph_work_item_filters')
              │
              └─▶ Returns JSONB: {issue_types[], statuses[], project_keys[], fix_versions[]}
```

**Performance**: Single RPC call replaces 4 separate full-table-scan queries.

---

## 5. Frontend Architecture

### 5.1 File Structure

```
src/
├── components/workhub/          # UI Components
│   ├── analytics/               # Analytics dashboards
│   ├── calendar/                # Calendar view
│   ├── capacity/                # Capacity planning
│   ├── caty/                    # AI assistant
│   ├── dashboard/               # Main dashboard
│   │   └── WorkHubDashboard.tsx
│   ├── jira/                    # Jira project views
│   │   └── JiraProjectsPage.tsx
│   ├── layout/                  # Shell & navigation
│   │   ├── WorkHubLayout.tsx    # Main layout wrapper
│   │   ├── WorkHubSidebar.tsx   # 240px fixed sidebar
│   │   └── index.ts
│   ├── releases/                # Release management
│   │   ├── ReleaseCard.tsx      # Card component with stacked progress
│   │   ├── ReleaseDetail.tsx    # Detail view with work items
│   │   ├── ReleaseModal.tsx     # Create/edit modal
│   │   └── ReleasesPage.tsx     # List page with tabs
│   ├── resource360/             # Resource views
│   ├── shared/                  # Shared components
│   │   └── StackedProgressBar.tsx
│   ├── themes/                  # Theme management
│   │   ├── ThemeCard.tsx
│   │   ├── ThemeDetail.tsx
│   │   ├── ThemeItemLinker.tsx  # Link items to themes
│   │   ├── ThemeModal.tsx
│   │   └── ThemesPage.tsx
│   └── workitems/               # Work item views
│       ├── BulkEditBar.tsx      # Bulk actions toolbar
│       ├── InlineThemeEditor.tsx # Inline theme assignment
│       ├── WorkItemDrawer.tsx   # 480px detail drawer
│       ├── WorkItemFilters.tsx  # Filter panel
│       ├── WorkItemRow.tsx      # Tree row component
│       ├── WorkItemsPage.tsx    # Main page
│       └── WorkItemsTable.tsx   # Virtualised table
│
├── hooks/workhub/               # Data Hooks (TanStack Query)
│   ├── useCalendarEvents.ts
│   ├── useDashboardKPIs.ts
│   ├── useJiraProjects.ts
│   ├── useJiraReleases.ts       # Server-side release aggregation
│   ├── useReleases.ts           # CRUD for ph_releases
│   ├── useResources.ts
│   ├── useSyncLog.ts
│   ├── useThemes.ts
│   └── useWorkItems.ts          # Paginated work items + filters
│
├── modules/workhub/             # Admin Module
│   ├── admin/
│   │   ├── components/
│   │   │   ├── ConnectionStatusBadge.tsx
│   │   │   ├── DataScope.tsx
│   │   │   ├── HierarchyMapping.tsx
│   │   │   ├── JiraConnection.tsx
│   │   │   ├── SchedulingRules.tsx
│   │   │   ├── StatusMapping.tsx
│   │   │   ├── SyncConfigPanel.tsx
│   │   │   ├── SyncLogs.tsx
│   │   │   ├── TestConnectionModal.tsx
│   │   │   ├── UserMapping.tsx
│   │   │   └── WorkItemsDashboard.tsx
│   │   ├── hooks/
│   │   │   ├── useAdminConfig.ts
│   │   │   ├── useJiraConnection.ts
│   │   │   ├── useJiraIssueStats.ts
│   │   │   └── useSyncEngine.ts
│   │   └── pages/
│   │       ├── WorkHubAdmin.tsx          # Jira connection page
│   │       ├── WorkHubDataScopePage.tsx  # Data scope config
│   │       ├── WorkHubHierarchyPage.tsx  # Hierarchy mapping
│   │       ├── WorkHubSchedulingPage.tsx # Scheduling rules
│   │       ├── WorkHubStatusMappingPage.tsx
│   │       ├── WorkHubSyncLogsPage.tsx
│   │       └── WorkHubUserMappingPage.tsx
│   └── shared/
│
└── types/
    └── workhub.types.ts         # All ProjectHub type definitions
```

### 5.2 Routing

| Route | Component | Description |
|---|---|---|
| `/workhub` | `WorkHubDashboard` | Main dashboard with KPIs |
| `/workhub/workitems` | `WorkItemsPage` | Hierarchical work items table |
| `/workhub/jira-projects` | `JiraProjectsPage` | Jira project browser |
| `/workhub/releases` | `ReleasesPage` | Release list with cards |
| `/workhub/releases/:id` | `ReleaseDetail` | Release detail with items |
| `/workhub/themes` | `ThemesPage` | Theme list |
| `/workhub/themes/:id` | `ThemeDetail` | Theme detail with linked items |
| `/workhub/resource360` | `Resource360Page` | Resource utilisation |
| `/workhub/resource360/:id` | `ResourceDetail` | Individual resource view |
| `/workhub/calendar` | `CalendarPage` | Unified calendar |
| `/workhub/capacity` | `CapacityPage` | Capacity planning |
| `/workhub/analytics` | `AnalyticsPage` | Dashboards & charts |
| `/workhub/caty` | `CatyPage` | AI assistant |

**Admin Routes** (under `/admin/workhub/`):

| Route | Page | Description |
|---|---|---|
| `jira-connection` | `WorkHubAdmin` | Connection config + 4-stat grid |
| `hierarchy-mapping` | `WorkHubHierarchyPage` | Issue type → level mapping |
| `scheduling-rules` | `WorkHubSchedulingPage` | Date precedence config |
| `status-mapping` | `WorkHubStatusMappingPage` | Status category mapping |
| `user-mapping` | `WorkHubUserMappingPage` | Identity resolution dashboard |
| `data-scope` | `WorkHubDataScopePage` | Per-project sync scope |
| `sync-logs` | `WorkHubSyncLogsPage` | Sync execution history |

### 5.3 Work Items Hierarchy

The work items table implements a **project-first hierarchy**:

```
Project (ESS)
  └── Epic (ESS-100)
        ├── Story (ESS-101)
        │     ├── Sub-task (ESS-102)
        │     └── Sub-task (ESS-103)
        └── Story (ESS-104)
  └── [Orphan Stories]   ← Virtual node for stories without Epic parent
```

**Tree Construction** (`buildTree` / `flattenTree` in `useWorkItems.ts`):
1. Map all items by `issue_key`
2. Link children via `parent_key`
3. Orphans (no parent in dataset) become root nodes
4. Sort by `jira_updated_at` DESC at each level
5. Flatten with expand/collapse state

**Virtualisation**: Uses `@tanstack/react-virtual` for rendering only visible rows.

### 5.4 Component Patterns

**Detail Drawer** (480px slide-in):
- Scrollable description (ADF processed to plain text)
- Parent summary chip (key + title)
- Recent comments section (last 20)
- Changelog/history timeline

**Release Cards**:
- Stacked progress bar (Done / In Progress / In Review / Blocked / To Do)
- Stacked avatars with `Name · Role` tooltips
- Project chips

**Responsive Behaviour**:
- Desktop: Min table width 1100px with `overflow-x-auto`
- Mobile: Headers/footers stack vertically (`flex-col`)
- 1024px breakpoint: Sidebar collapses to hamburger menu

---

## 6. Admin Configuration

### 6.1 Jira Connection

**Location**: `/admin/workhub/jira-connection`

- Singleton `ph_jira_connection` table
- 4-stat grid: Projects, Issues, Last Sync, Status
- 5-step test connection with animated progress
- Credentials: Site URL + Email + API Token

### 6.2 Hierarchy Mapping

**Location**: `/admin/workhub/hierarchy-mapping`

- Drag-and-drop reordering of issue levels
- Multi-select mapping of Jira issue types to Catalyst levels
- Ensures correct Epic → Story → Sub-task interpretation

### 6.3 Scheduling Rules

**Location**: `/admin/workhub/scheduling-rules`

- Date precedence toggles: Due Date vs Fix Version vs Parent
- Strategy for issues with multiple fix versions
- Controls `effective_due_date` computation

### 6.4 Per-Project Sync Configuration

**Location**: `/admin/workhub/data-scope`

Stored in `ph_config` under key `sync_project_config`:

```json
{
  "ESS": {
    "lookback_months": 3,
    "status_categories": ["To Do", "In Progress", "Done"],
    "issue_types": ["Epic", "Story", "Bug", "Sub-task"],
    "fix_versions": ["Release 2.0", "Release 2.1"]
  }
}
```

### 6.5 User Mapping

**Location**: `/admin/workhub/user-mapping`

3-column enterprise interface:
1. **Jira Users** — All synced assignees
2. **Matching Suggestions** — Fuzzy matches with confidence scores
3. **Catalyst Profiles** — Platform users from `resource_inventory`

Actions: Accept (auto-link) / Unlink / Manual search

### 6.6 Status Mapping

**Location**: `/admin/workhub/status-mapping`

Maps Jira statuses to Catalyst status categories for consistent reporting.

---

## 7. Performance Engineering

### 7.1 Decisions & Optimisations

| Problem | Solution | Impact |
|---|---|---|
| Release list loaded all `ph_issues` client-side in batches | `fn_ph_release_summary()` RPC — single server-side aggregation | 4+ requests → 1, seconds → <200ms |
| Filter dropdowns scanned entire table per filter | `fn_ph_work_item_filters()` RPC — single JSONB response | 4 full scans → 1 function call |
| Release detail loaded all issues for version filtering | JSONB `@>` containment + GIN index | Full download → indexed query |
| Work items table rendered all rows | `@tanstack/react-virtual` row virtualisation | DOM: 3000+ → ~30 visible |
| Large datasets paginated client-side | Server-side pagination (50/page) with `{ count: 'exact' }` | Consistent <500ms loads |

### 7.2 Caching Strategy

| Hook | `staleTime` | `refetchInterval` | Rationale |
|---|---|---|---|
| `useWorkItems` | 30s | 60s | Active editing context |
| `useJiraReleases` | 60s | — | Aggregated data changes infrequently |
| `useWorkItemFilters` | 120s | — | Filter options rarely change |
| `useWHReleases` | 30s | — | Active management |
| `useIssueProjectKeys` | 60s | — | Stable metadata |

### 7.3 Query Key Architecture

All ProjectHub queries use the `['projecthub', ...]` prefix for efficient invalidation:

```typescript
// Granular invalidation
queryClient.invalidateQueries({ queryKey: ['projecthub', 'work-items'] });

// Module-wide invalidation (e.g., after sync)
queryClient.invalidateQueries({ queryKey: ['projecthub'] });
```

---

## 8. Security Model

### 8.1 Row Level Security (RLS)

RLS is enabled on all `ph_*` tables with authenticated read/write policies.

### 8.2 API Token Storage

Jira API tokens stored in `ph_jira_connection.api_token` — accessed only by Edge Functions, never exposed to frontend.

### 8.3 Edge Function Authentication

All edge functions validate the Supabase JWT before processing requests.

---

## 9. Design System

### 9.1 Design Tokens

ProjectHub uses a ring-fenced `--ph-*` token system:

```css
:root {
  --ph-primary: 217 91% 60%;       /* #2563eb — Primary blue */
  --ph-primary-hover: 217 91% 50%;
  --ph-surface: 0 0% 100%;          /* White surface */
  --ph-surface-alt: 220 14% 96%;    /* Subtle grey */
  --ph-border: 220 13% 91%;
  --ph-text: 222 47% 11%;
  --ph-text-secondary: 220 9% 46%;
  --ph-text-tertiary: 220 9% 64%;
  --ph-success: 160 84% 39%;
  --ph-warning: 38 92% 50%;
  --ph-danger: 0 84% 60%;
  --ph-font-mono: 'JetBrains Mono', monospace;
}
```

**Banned**: "Golden Hour" palette is explicitly prohibited.

### 9.2 Typography

| Context | Font | Weight |
|---|---|---|
| Page titles | Sora | 600 |
| UI text | Inter | 400/500 |
| Code/keys | JetBrains Mono | 400 |

### 9.3 Layout

- **Sidebar**: Fixed 240px, 9 module links
- **Detail drawer**: Slide-in, 480px width
- **Responsive breakpoint**: 1024px (sidebar → hamburger)
- **Mode**: Light-only (no dark mode)

---

## 10. Architecture Decision Records (ARDs)

### ARD-001: Database Prefix Convention (`ph_`)

**Context**: WorkHub tables used `wh_` prefix but the module was renamed to ProjectHub.
**Decision**: Migrate all tables, views, functions, and triggers to `ph_` prefix.
**Rationale**: Consistent naming between brand, frontend, and backend layers.
**Status**: ✅ Completed

### ARD-002: Server-Side Release Aggregation

**Context**: Client-side batching downloaded all `ph_issues` rows to aggregate release stats, causing 2–5 second load times.
**Decision**: Replace with `fn_ph_release_summary()` PostgreSQL function.
**Rationale**: Single query with JOINs executes in <200ms vs multiple round-trips.
**Trade-off**: SQL function must be updated if status categorisation logic changes.
**Status**: ✅ Completed

### ARD-003: JSONB Containment for Fix Version Filtering

**Context**: Release detail pages filtered work items by fix version name, requiring full table download.
**Decision**: Use PostgreSQL `@>` containment operator with GIN index on `ph_issues.fix_versions`.
**Rationale**: Sub-second queries even with 6,000+ records.
**Status**: ✅ Completed

### ARD-004: Cursor-Based Jira Pagination

**Context**: Offset-based pagination caused `410 Gone` errors on Jira Cloud.
**Decision**: Use `nextPageToken` cursor pagination via POST `/rest/api/3/search`.
**Rationale**: Avoids deep-offset issues, required by Jira Cloud's newest endpoints.
**Status**: ✅ Completed

### ARD-005: Identity Resolution Chain

**Context**: Need to display Catalyst roles and avatars for Jira assignees.
**Decision**: 3-table mapping chain: `ph_user_mapping` → `profiles` → `resource_inventory`.
**Rationale**: Enables role-aware display without duplicating data.
**Fallback**: Defaults to "Team Member" when no role mapping exists.
**Status**: ✅ Completed

### ARD-006: Hard Delete Pruning Strategy

**Context**: When sync criteria change, stale issues must be removed.
**Decision**: Hard delete items that no longer match sync criteria (vs. soft delete).
**Rationale**: Keeps `ph_issues` as a clean cache of current Jira state.
**Risk**: Data loss if sync misconfigured; mitigated by sync logs.
**Status**: ✅ Completed

### ARD-007: Single Filter RPC

**Context**: Four filter dropdowns each performed full-table scans to get distinct values.
**Decision**: Single `fn_ph_work_item_filters()` function returning all distinct values in one JSONB blob.
**Rationale**: 4 queries → 1, with TanStack Query deduplication sharing the result.
**Status**: ✅ Completed

### ARD-008: Module Separation (TestHub / ReleaseHub / ProjectHub)

**Context**: Overlapping concerns between test management, release management, and project tracking.
**Decision**: 3-phase separation with shared quality library.
**Rationale**: Clear ownership boundaries, independent evolution.
**Status**: 🔄 In Progress (Phase 1 complete)

---

## 11. Edge Functions

### `wh-test-connection`

**Purpose**: Validates Jira Cloud connectivity with 5 sequential checks.
**Endpoint**: POST
**Input**: `{ siteUrl, email, apiToken }`
**Output**: `{ steps: [{ name, status, duration_ms }], overall: 'pass' | 'fail' }`

### `wh-jira-sync`

**Purpose**: Synchronises Jira issues to `ph_issues`.
**Endpoint**: POST
**Input**: `{ projectKeys?: string[], fullSync?: boolean }`
**Output**: `{ created, updated, pruned, errors, duration_ms }`

**Process**:
1. Reads per-project config from `ph_config`
2. Auto-discovers accessible projects (fallback)
3. Generates project-specific JQL with lookback window
4. Paginates via `nextPageToken`
5. Upserts to `ph_issues` (ON CONFLICT issue_key)
6. Prunes stale items via `ph_prune_stale()`
7. Logs to `ph_jira_sync_log`

### `wh-fetch-issue-stats`

**Purpose**: Fetches aggregate statistics from `ph_issues` for the admin dashboard.
**Endpoint**: GET
**Output**: `{ totalIssues, byProject, byType, byStatus }`

---

## 12. API Reference

### TanStack Query Hooks

#### Data Hooks

| Hook | Returns | Source |
|---|---|---|
| `useWorkItems(filters, pagination)` | Paginated work items | `ph_issues` (PostgREST) |
| `useJiraReleases()` | All releases with stats | `fn_ph_release_summary` (RPC) |
| `useJiraRelease(name)` | Single release | Derived from `useJiraReleases` |
| `useWHReleases()` | Managed releases | `ph_releases` |
| `useRelease(id)` | Single managed release | `ph_releases` |
| `useReleaseProgress()` | Release progress | `vw_ph_release_progress` |
| `useReleaseProgressById(id)` | Single release progress | `vw_ph_release_progress` |
| `useWorkItemFilters()` | Filter options | `fn_ph_work_item_filters` (RPC) |
| `useIssueTypes()` | Distinct issue types | Derived from `useWorkItemFilters` |
| `useIssueStatuses()` | Distinct statuses | Derived from `useWorkItemFilters` |
| `useIssueProjectKeys()` | Distinct project keys | Derived from `useWorkItemFilters` |
| `useIssueFixVersions()` | Distinct fix versions | Derived from `useWorkItemFilters` |
| `useDashboardKPIs()` | Dashboard metrics | `vw_ph_dashboard_kpis` |
| `useCalendarEvents()` | Calendar data | `vw_ph_calendar_events` |
| `useResources()` | Resource list | `ph_resources` |
| `useThemes()` | Theme list | `ph_themes` |

#### Mutation Hooks

| Hook | Action | Target |
|---|---|---|
| `useCreateRelease()` | Create release | `ph_releases` |
| `useUpdateRelease()` | Update release | `ph_releases` |
| `useDeleteRelease()` | Delete release | `ph_releases` + `ph_work_items` |
| `useUpdateWorkItem()` | Update single item | `ph_issues` |
| `useBulkUpdateWorkItems()` | Bulk update items | `ph_issues` |

#### Admin Hooks

| Hook | Purpose | Source |
|---|---|---|
| `useJiraConnection()` | Read/write connection config | `ph_jira_connection` |
| `useSyncEngine()` | Trigger and monitor sync | Edge Function + `ph_jira_sync_log` |
| `useAdminConfig()` | Read/write `ph_config` | `ph_config` |
| `useJiraIssueStats()` | Admin dashboard stats | Edge Function |

### Type Definitions

All types are defined in `src/types/workhub.types.ts`:

```typescript
// Core enums
type WorkItemType = 'Epic' | 'Story' | 'Subtask' | 'Bug' | 'Task' | 'Incident';
type WorkItemStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | 'Cancelled';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type ReleaseStatus = 'Planned' | 'Active' | 'At Risk' | 'Completed' | 'Cancelled';
type ThemeStatus = 'Active' | 'Completed' | 'On Hold';
type SyncSource = 'jira' | 'catalyst' | 'manual';
type Department = 'Engineering' | 'Design' | 'QA' | 'Platform' | 'Data' | 'Security' | 'Product' | 'DevOps' | 'Management';

// Core interfaces
interface Release { id, name, title, description, status, start_date, target_date, ... }
interface Theme { id, name, description, color, progress, status, ... }
interface WorkItem { id, item_key, item_type, summary, status, priority, parent_id, depth, ... }
interface Resource { id, user_id, name, role, department, capacity_hours_per_week, ... }
interface JiraProject { id, jira_project_id, project_key, name, is_active, ... }

// Aggregated interfaces
interface ReleaseProgress extends Release { total_items, done_items, completion_percent, ... }
interface ThemeProgress extends Theme { total_items, epic_count, story_count, ... }
interface ResourceUtilization extends Resource { utilization_percent, active_items, ... }
interface WorkItemFull extends WorkItem { project_name, release_name, theme_name, ... }

// Supporting
interface DashboardKPIs { active_releases, blocked_items, overall_completion_percent, ... }
interface CalendarEvent { entity_id, event_type, event_title, event_date, ... }
interface SyncLogEntry { id, sync_type, status, items_created, items_updated, ... }
```

---

## Appendix: Migration Checklist (WorkHub → ProjectHub)

### ✅ Completed
- [x] Database: 22 `wh_` tables → `ph_` tables
- [x] Database: 6 `vw_wh_` views → `vw_ph_` views
- [x] Database: 12 functions renamed to `fn_ph_`/`ph_`
- [x] Database: 10 triggers recreated
- [x] Hooks: All query hooks use `ph_` table names
- [x] Hooks: Query keys use `['projecthub', ...]`
- [x] Performance: Server-side release aggregation
- [x] Performance: Single filter RPC
- [x] Performance: GIN index on fix_versions

### 🔄 Pending
- [ ] CSS Tokens: `--wh-*` → `--ph-*` in `workhub.module.css`
- [ ] File paths: `src/components/workhub/` → `src/components/projecthub/`
- [ ] Routes: `/workhub/*` → `/projecthub/*`
- [ ] Admin routes: `/admin/workhub/*` → `/admin/projecthub/*`
- [ ] Edge functions: Internal `wh_` table references
- [ ] Top nav: "WorkHub" label → "ProjectHub"
- [ ] Sidebar: Module label update
- [ ] CatalystShell: `isWorkHubRoute` detection

---

*This document is the single source of truth for ProjectHub architecture. Update when making structural changes.*
