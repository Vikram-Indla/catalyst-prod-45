# ProjectHub — Route, Component & Wiring Map

> **Verified Against Codebase**: 2026-04-04
> **Router Source**: `src/routes/FullAppRoutes.tsx`
> **Sidebar Sources**: `src/components/layout/ProjectHubSidebar.tsx` + `src/components/project-hub/shell/Sidebar*.tsx`

---

## 1. Module-Level Routes (No Project Context)

| # | Route | Page Component | Status | Data Source |
|---|-------|---------------|--------|-------------|
| 1 | `/project-hub` | Redirect → `/project-hub/projects` | ✅ Redirect | — |
| 2 | `/project-hub/projects` | `AllProjectsPageLazy` | ✅ LIVE | `projects` via `useProjects()` + `useProjectsRealtime()` |
| 3 | `/project-hub/projects-legacy` | `ProjectListPageLazy` | ⚫ LEGACY | Old project list, not in sidebar |
| 4 | `/project-hub/portfolio-health` | Inline placeholder | 🟡 PLACEHOLDER | — |
| 5 | `/project-hub/resources` | `ResourceListingPageLazy` | ✅ LIVE | `resource_assignments` + `profiles` + `capacity_departments` |
| 6 | `/project-hub/resources/:resourceId` | `R360MemberDetailLazy` | ✅ LIVE | `profiles` + `resource_assignments` + `ph_issues` |
| 7 | `/project-hub/resources-v2` | Redirect → `/project-hub/resources` | ✅ Redirect | — |
| 8 | `/project-hub/resources-v2/:resourceId` | `R360MemberDetailLazy` | ✅ LIVE | Same as #6 |
| 9 | `/project-hub/resource360` | Redirect → `/project-hub/resource-360/009` | ✅ Redirect | — |
| 10 | `/project-hub/resource360/:id` | Redirect → `/project-hub/resource-360/009` | ✅ Redirect | — |
| 11 | `/project-hub/resource-360/:resourceId` | `Resource360PageNew` | ✅ LIVE | Resource 360 dashboard |

---

## 2. Project-Scoped Routes (`/project-hub/:key/...`)

All project-scoped routes resolve `:key` → `ph_projects.key` (uppercased) to get `projectId`.

| # | Route | Page Component | Status | Data Source |
|---|-------|---------------|--------|-------------|
| 12 | `/project-hub/:key` | Redirect → `dashboard` | ✅ Redirect | — |
| 13 | `/project-hub/:key/dashboard` | `ProjectDashboardPageLazy` | ✅ LIVE | `ph_projects` + 11-widget system via `DashboardWidgetGrid` + `useDashboardWidgetConfig` (see Widget Data Sources below) |
| 14 | `/project-hub/:key/epic-backlog` | `NativeEpicBacklogPageLazy` → `EpicBacklogPage` | ✅ LIVE | `ph_issues` filtered by `issue_type = 'Epic'` |
| 15 | `/project-hub/:key/feature-backlog` | `NativeFeatureBacklogPageLazy` → `FeatureBacklogPage` | ✅ LIVE | `ph_issues` filtered by Features |
| 16 | `/project-hub/:key/story-backlog` | `NativeStoryBacklogPageLazy` → `StoryBacklogPage` | ✅ LIVE | `ph_issues` filtered by Stories/Tasks/Bugs |
| 17 | `/project-hub/:key/hierarchy` | `HierarchyPageLazy` | ✅ LIVE | `useJiraHierarchyTree` → `ph_issues` + `ph_hierarchy_overrides`. Tree + Table views. Inline filter bar. |
| 18 | `/project-hub/:key/list` | `WorkItemsListPageLazy` | ✅ LIVE | `useProjectWorkItems(projectId)` → `ph_work_items` + `ph_work_types` + `ph_workflow_statuses` + `ph_releases` + `profiles`. Full Jira sync pipeline. |
| 19 | `/project-hub/:key/board` | `ProjectBoardPageLazy` | ✅ LIVE | Kanban board via `ph_projects` → `boards` |
| 20 | `/project-hub/:key/boards` | `ProjectBoardManagerPageLazy` | ✅ LIVE | Board listing/management |
| 21 | `/project-hub/:key/boards/:boardId` | `ProjectBoardCanvasPageLazy` → `BoardCanvasPage` | ✅ LIVE | `board_columns` + `board_issue_rank` |
| 22 | `/project-hub/:key/settings` | `PHProjectSettingsPageLazy` | ✅ LIVE | 8-tab settings: General, Members, Workflow, Types, Labels, Components, Integration (Jira), Notifications |
| 23 | `/project-hub/:key/backlog` | PHPlaceholder | 🟡 PLACEHOLDER | Phase 2 |
| 24 | `/project-hub/:key/timeline` | PHPlaceholder | 🟡 PLACEHOLDER | Phase 3 |
| 25 | `/project-hub/:key/releases` | PHPlaceholder | 🟡 PLACEHOLDER | Phase 3 |
| 26 | `/project-hub/:key/reports` | PHPlaceholder | 🟡 PLACEHOLDER | Phase 4 |
| 27 | `/project-hub/:key/sprint-predictor` | PHPlaceholder (AI badge) | 🟡 PLACEHOLDER | Phase 5 |
| 28 | `/project-hub/:key/risk-scanner` | PHPlaceholder (AI badge) | 🟡 PLACEHOLDER | Phase 5 |

**Total: 28 routes** (17 live, 5 redirects, 6 placeholders)

---

## 3. Sidebar Navigation

### Primary Implementation: `src/components/layout/ProjectHubSidebar.tsx`

**Project key extraction:**
```typescript
function extractProjectKey(pathname: string): string | undefined {
  const match = pathname.match(/^\/project-hub\/([^/]+)/);
  if (!match) return undefined;
  const segment = match[1];
  if (['projects', 'resources', 'portfolio-health'].includes(segment)) return undefined;
  return segment;
}
```

### Module Mode (no `:key` in URL)

| Item | Route | Icon |
|------|-------|------|
| All Projects | `/project-hub/projects` | FolderKanban |
| Resource 360™ | `/project-hub/resources` | Users |
| **Favourites** (dynamic) | `/project-hub/{key}/dashboard` | Star |

### Project Mode (`:key` detected)

| Section | Item | Route |
|---------|------|-------|
| — | Dashboard | `/project-hub/{key}/dashboard` |
| **Planning** | Epic Backlog | `/project-hub/{key}/epic-backlog` |
| | Feature Backlog | `/project-hub/{key}/feature-backlog` |
| | Story Backlog | `/project-hub/{key}/story-backlog` |
| | All Work Items | `/project-hub/{key}/hierarchy` |
| **Footer** | Settings | `/project-hub/{key}/settings` |

### Alternative Sidebar: `src/components/project-hub/shell/SidebarProjectNav.tsx`

Includes additional items not in the primary sidebar:

| Section | Item | Route |
|---------|------|-------|
| **Planning** | Backlog | `/project-hub/{key}/backlog` |
| | Boards | `/project-hub/{key}/boards` |
| | Timeline | `/project-hub/{key}/timeline` |
| **Tracking** | Reports | `/project-hub/{key}/reports` |
| | Releases | `/project-hub/{key}/releases` |
| **AI Intelligence** | Release Predictor | `/project-hub/{key}/sprint-predictor` |
| | Risk Scanner | `/project-hub/{key}/risk-scanner` |

### Alternative Module Nav: `src/components/project-hub/shell/SidebarModuleNav.tsx`

Includes additional items:

| Item | Route |
|------|-------|
| All Projects v2 | — |
| Resource 360° Dashboard | — |
| Workload | — |
| Capacity | — |
| Reports | — |
| Timesheet | — |

**Note:** Two sidebar implementations exist. The primary one (`ProjectHubSidebar.tsx`) is the active version used in production.

### Routed But NOT in Any Sidebar

- `/project-hub/:key/board` — Kanban board (accessible via dashboard links)
- `/project-hub/:key/list` — Work items list (accessible via direct URL)
- `/project-hub/projects-legacy` — Legacy project list

---

## 4. Dashboard Widget Data Sources

The dashboard uses 11 configurable widgets, each with its own data hook from `src/hooks/useDashboardWidgets.ts`. Widget config persisted to `dashboard_widget_config` table.

| Widget Hook | Supabase Tables |
|------------|-----------------|
| `useActiveReleases()` | `releases` |
| `useDashboardStatusCounts()` | `ph_issues` (queries `status_category`) |
| `useDashboardOverdueItems()` | `ph_issues` |
| `useDashboardOnHoldItems()` | `ph_issues` |
| `useDashboardTeamWorkload()` | `ph_issues` |
| `useDashboardScopeChange()` | `releases` + `ph_issues` |
| `useDashboardIncidents()` | `incidents` |
| `useDashboardDefects()` | `tm_defects` |
| `useDashboardRecentActivity()` | `ph_issues` |
| `useDashboardReleaseHealth()` | `releases` + `ph_issues` |

---

## 5. Jira Sync Pipeline (WorkItemsListPage)

**Source:** `src/hooks/useJiraSync.ts` + `src/services/jira-sync.service.ts`

| Hook | Tables | Purpose |
|------|--------|---------|
| `useSyncSummary(projectId)` | `project_sync_summary` | Aggregated sync stats |
| `useConflicts(projectId)` | `jira_sync_conflicts` + `ph_issues` | Unresolved field conflicts |
| `useSyncLogs(projectId)` | `jira_sync_logs` | Last 10 sync runs |
| `useWriteBackQueue(projectId)` | `jira_write_back_queue` + `ph_issues` | Pending Jira updates |
| `useTriggerSync(projectId)` | RPC: `process_sync_events` + Edge Fn: `process-outbound-sync` | Manual sync trigger |
| `useResolveConflict()` | `jira_sync_conflicts` + `ph_issues` | Conflict resolution |
| `useApproveWriteBack(queueId)` | `jira_write_back_queue` | Approve write-back |

**UI Components:** `SyncBanner`, `SyncLegend`, `SourceFilterPills`, `ConflictResolutionDrawer`, `JiraSyncDrawer`

---

## 6. Key Hooks & Services

| Hook/Service | File | Tables |
|-------------|------|--------|
| `useProjects()` | `src/hooks/useProjects.ts` | `projects` |
| `useProjectsRealtime()` | `src/hooks/useProjectHub.ts` | Realtime: `projects` + `project_members` |
| `useProjectFavorites()` | `src/hooks/useProjectHub.ts` | `project_favorites` |
| `useToggleFavorite()` | `src/hooks/useProjectHub.ts` | `project_favorites` (optimistic) |
| `useDashboardWidgetConfig()` | `src/components/project-hub/dashboard/DashboardWidgetGrid.tsx` | `dashboard_widget_config` |
| `useJiraHierarchyTree()` | `src/hooks/useJiraHierarchy.ts` | `ph_issues` + `ph_hierarchy_overrides` (via `jiraHierarchyService`) |
| `useProjectWorkItems()` | `src/hooks/useProjectWorkItems.ts` | `ph_work_items` + `ph_work_types` + `ph_workflow_statuses` + `ph_releases` + `profiles` |
| `useProjectIssues()` | `src/services/project-hub.service.ts` | `ph_sdlc_issues` |
| `useBoards()` | `src/services/project-hub.service.ts` | `ph_boards` |

---

## 7. Supabase Tables Summary

### Core ProjectHub Tables
| Table | Purpose |
|-------|---------|
| `projects` | Base project data |
| `project_favorites` | User-starred projects |
| `project_members` | Project membership |
| `dashboard_widget_config` | Widget visibility/position per user/project |
| `ph_issues` | Jira-synced issues (primary work items) |
| `ph_work_items` | Native work items with sync provenance |
| `ph_work_types` | Work item type definitions |
| `ph_workflow_statuses` | Status definitions per project |
| `ph_releases` | Release data |
| `ph_hierarchy_overrides` | Custom hierarchy parent mappings |
| `ph_sdlc_issues` | SDLC-specific issue data |
| `ph_boards` | Board definitions |
| `boards` | Shared board table (cross-hub) |
| `board_columns` | Board column definitions |
| `board_issue_rank` | Issue ranking within board columns |

### Jira Sync Tables
| Table | Purpose |
|-------|---------|
| `jira_sync_conflicts` | Unresolved field conflicts |
| `jira_sync_logs` | Sync run history |
| `jira_write_back_queue` | Pending Jira updates |
| `project_sync_summary` | Aggregated sync statistics (view) |
| `ph_jira_connection` | Jira connection config |
| `ph_sync_log` | Sync engine logs |

### Cross-Hub Tables Used
| Table | Used By |
|-------|---------|
| `profiles` | Assignee display (name, avatar) |
| `releases` | Dashboard widgets |
| `incidents` | Dashboard widgets |
| `tm_defects` | Dashboard widgets |
| `resource_assignments` | Resource 360 |
| `capacity_departments` | Resource listing |

---

## 8. Preloading Strategy

```typescript
// Called on sidebar mount — preloads the two most common landing pages
import('../../pages/projecthub/AllProjectsPage');
import('../../pages/ResourceListingPage');
```

All other page components use React.lazy with Suspense boundaries.

---

## 9. Wiring Gaps

| Gap | Description | Phase |
|-----|-------------|-------|
| Generic Backlog | Route exists, placeholder only | Phase 2 |
| Timeline | Route exists, placeholder only | Phase 3 |
| Releases (project-scoped) | Route exists, placeholder only | Phase 3 |
| Reports | Route exists, placeholder only | Phase 4 |
| Sprint/Release Predictor | Route exists, placeholder only (AI) | Phase 5 |
| Risk Scanner | Route exists, placeholder only (AI) | Phase 5 |
| Board/List not in sidebar | Routes live but no nav entry | — |
| Portfolio Health | Route exists, excluded from sidebar per exec directive | — |
| Dual sidebar implementations | Two sidebar codepaths exist | Technical debt |
