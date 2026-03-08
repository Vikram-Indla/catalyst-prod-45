# WORK ITEM HIERARCHY MODULE — PREFLIGHT AUDIT
**Generated:** 2026-03-08  
**Status:** AUDIT ONLY — No code changes

---

## SECTION 1: ROUTES & NAVIGATION

| Check | Answer |
|-------|--------|
| Route registered at | `/project-hub/:key/hierarchy` (App.tsx line 1256) |
| Reads projectId from URL? | ✅ Yes — `useParams<{ key: string }>()` reads `key` (project key, not UUID) |
| "Hierarchy" in project sidebar? | ❌ **NOT FOUND** — no sidebar component links to `/hierarchy` within ProjectHub |
| Top nav shows all 9 hubs? | ✅ Yes — TopNav.tsx renders Home, StrategyHub, ProductHub, ProjectHub, ReleaseHub, TestHub, IncidentHub, TaskHub, PlanHub |
| Main page component | `src/pages/project-hub/HierarchyPage.tsx` (lazy-loaded as `HierarchyPageLazy`) |

**NOTE:** The page exists at a valid route but is **not discoverable** from any sidebar navigation. Users must type the URL manually.

---

## SECTION 2: DATABASE (Supabase)

### Tables

| Table | Status | Notes |
|-------|--------|-------|
| `projects` | ✅ EXISTS | Referenced in types.ts |
| `project_members` | ✅ EXISTS | Referenced in types.ts |
| `hi_project_sequences` | ✅ EXISTS | `project_id` (FK → projects), `last_number` |
| `hi_hierarchy_levels` | ✅ EXISTS | `id`, `name`, `color`, `color_text`, `icon`, `sort_order` |
| `hi_statuses` | ✅ EXISTS | `id`, `project_id`, `name`, `color`, `color_text`, `is_default`, `is_terminal`, `sort_order` |
| `hi_priorities` | ✅ EXISTS | `id`, `name`, `color`, `color_text`, `sort_order` |
| `hi_project_versions` | ✅ EXISTS | `id`, `project_id`, `name`, `archived`, `released`, `release_date` |
| `hi_work_items` | ✅ EXISTS | Full schema: `project_id`, `key`, `title`, `hierarchy_level` (FK → levels), `parent_id` (self-ref), `root_id`, `status_id` (FK → statuses), `priority_id` (FK → priorities), `assignee_id`, `reporter_id`, `fix_version_id` (FK → versions), `due_date`, `labels`, `description`, `sort_order`, `created_at`, `updated_at` |

### Database Functions/RPCs

| Function | Status | Notes |
|----------|--------|-------|
| `hi_get_hierarchy_tree` | ✅ EXISTS | Recursive CTE, returns flattened tree with joined status/priority/assignee data |
| `hi_get_project_work_items` | ✅ EXISTS | Flat list with optional `p_hierarchy_level`, `p_status_id`, `p_limit`, `p_offset` filters |
| `hi_validate_hierarchy_move` | ✅ EXISTS | Cycle detection — returns boolean |
| `hi_generate_work_item_key` | ✅ EXISTS | Trigger on `hi_work_items` BEFORE INSERT, auto-generates `PROJ-NNN` key |
| `validate_parent_level` (trigger) | ⚠️ PARTIAL | Exists as part of migration `20260227171351` but named `hi_validate_parent_level` — flexible model, checks `hi_hierarchy_levels` |
| `check_hierarchy_cycle` (trigger) | ⚠️ PARTIAL | Cycle check is in `hi_validate_hierarchy_move` RPC, not a separate trigger |
| `hi_provision_project_defaults` | ✅ EXISTS | Trigger on `projects` AFTER INSERT — auto-creates default statuses + sequence |

---

## SECTION 3: TYPESCRIPT TYPES

| Check | Answer |
|-------|--------|
| `src/types/hierarchy.ts` exists? | ✅ Yes |
| Exported interfaces/types | `HierarchyLevel`, `WorkItemStatus`, `WorkItemAssignee`, `WorkItemPriority`, `WorkItemVersion`, `WorkItemStats`, `WorkItem` (7 total) |
| `HIERARCHY_LEVELS` config exists? | ✅ Yes — 4 levels: Epic (1), Feature (2), Story (3), Sub-task (4) |
| `canBeParentOf()` helper exists? | ✅ Yes — `canBeParentOf(parentLevel, childLevel): boolean` |
| `PARENT_RULES` map exists? | ✅ Yes — `{ 1: [], 2: [1], 3: [1,2], 4: [3] }` |
| `getHierarchyLevel()` exists? | ✅ Yes — lookup by level number |

---

## SECTION 4: SERVICE LAYER

### `src/services/hierarchyService.ts` (hi_ schema — native hierarchy)

| Check | Answer |
|-------|--------|
| Exists? | ✅ Yes |
| Hardcodes PROJECT_ID? | ✅ **No** — comment says "NO hardcoded PROJECT_ID — always passed as parameter" |
| Exported functions | `fetchHierarchyTree(rootId)`, `fetchProjectWorkItems(projectId, filters?)`, `fetchRootEpics(projectId)`, `fetchAllWorkItemsTree(projectId)` |
| `transformWorkItem()` snake→camelCase? | ✅ Yes — full mapping from DB columns to TS interface |
| `buildTree()` flat→nested? | ✅ Yes — Map-based tree builder |

### `src/services/jiraHierarchyService.ts` (Jira sync — **ACTUALLY USED BY HierarchyPage**)

| Check | Answer |
|-------|--------|
| Exists? | ✅ Yes |
| Data source | `ph_issues` table (Jira synced) + `ph_hierarchy_overrides` for local DnD overrides |
| `transformJiraIssue()` | Maps `issue_type` → hierarchy level via hardcoded switch, builds `WorkItem` type |
| `buildJiraTree()` | ✅ Flat→nested + `computeStats()` for descendant progress |
| `saveHierarchyOverride()` | ✅ Upserts to `ph_hierarchy_overrides` for DnD persistence |

**⚠️ CRITICAL FINDING:** Two parallel service layers exist:
1. `hierarchyService.ts` → talks to `hi_work_items` via RPCs (native hierarchy)
2. `jiraHierarchyService.ts` → talks to `ph_issues` via direct queries (Jira sync)

**The HierarchyPage uses ONLY the Jira service.** The native `hi_` service is used by `useHierarchy.ts` hooks but those hooks are NOT consumed by the HierarchyPage.

---

## SECTION 5: TANSTACK QUERY HOOKS

### `src/hooks/useHierarchy.ts` (Native hi_ schema — NOT used by HierarchyPage)

| Hook | Status | Accepts projectId? | Query Key |
|------|--------|-------------------|-----------|
| `useRootEpics` | ✅ EXISTS | ✅ Yes | `['hierarchy', projectId, 'roots']` |
| `useHierarchyTree` | ✅ EXISTS | Via rootId | `['hierarchy', 'tree', rootId]` |
| `useFullHierarchyTree` | ✅ EXISTS | ✅ Yes | `['hierarchy', projectId, 'full-tree']` |
| `useCreateWorkItem` | ✅ EXISTS | ✅ Yes | Invalidates `['hierarchy', projectId]` |
| `useMoveWorkItem` | ✅ EXISTS | ✅ Yes | Uses `hi_validate_hierarchy_move` RPC |
| `useDeleteWorkItem` | ✅ EXISTS | ✅ Yes | Deletes from `hi_work_items` |
| `useStatuses` | ✅ EXISTS | ✅ Yes | `['hierarchy', projectId, 'statuses']` from `hi_statuses` |
| `usePriorities` | ✅ EXISTS | N/A (global) | `['hierarchy', 'priorities']` from `hi_priorities` |
| `useUpdateWorkItem` | ❌ MISSING | — | No inline update hook in useHierarchy.ts |

### `src/hooks/useJiraHierarchy.ts` (Jira source — **USED by HierarchyPage**)

| Hook | Status | Accepts projectKey? | Query Key |
|------|--------|-------------------|-----------|
| `useJiraHierarchyTree` | ✅ EXISTS | ✅ Yes | `['jira-hierarchy', projectKey]` |
| `useMoveJiraHierarchyItem` | ✅ EXISTS | ✅ Yes | Saves to `ph_hierarchy_overrides` |

**Cache isolation:** ✅ All query keys include `projectId` or `projectKey`.

---

## SECTION 6: UI COMPONENTS

| Component | Status | File Path | Key Props | What It Renders |
|-----------|--------|-----------|-----------|-----------------|
| HierarchyPage | ✅ EXISTS | `src/pages/project-hub/HierarchyPage.tsx` | reads `key` from URL | Full page: header + toolbar + 2-column (tree + detail) |
| WorkItemTree | ✅ EXISTS | `src/components/hierarchy/WorkItemTree.tsx` | `items, selectedId, onSelect, onMove, allExpanded` | 44px rows with chevron, icon, key, title, priority bars, progress, status pill, avatar, actions menu |
| DetailPanel | ✅ EXISTS | `src/components/hierarchy/DetailPanel.tsx` | `item, onAddChild` | Sticky sidebar: key, title, status pill, priority bars, assignee, release, progress, due date, + Add Child button |
| CreateWorkItemModal | ✅ EXISTS | `src/components/hierarchy/CreateWorkItemModal.tsx` | `open, onClose, projectId, parentItem` | Two-step modal: type selection → details form (title, priority dropdown, description) |
| TreeSkeleton | ✅ EXISTS | Inside WorkItemTree.tsx | `rows` | Shimmer loading placeholder |
| DetailPanelSkeleton | ✅ EXISTS | Inside DetailPanel.tsx | — | Shimmer loading placeholder |
| StatusDropdown (inline) | ❌ MISSING | — | — | No inline status change |
| HierarchyToolbar | ⚠️ INLINE | Inside HierarchyPage.tsx | — | Expand All / Collapse All / Refresh buttons (no search, no filters) |

### Data source per component:

| Component | Data Source | Uses hooks? | Uses Supabase directly? |
|-----------|-----------|-------------|------------------------|
| HierarchyPage | `useJiraHierarchyTree(projectKey)` | ✅ Yes (Jira hooks) | No |
| WorkItemTree | Props from parent | N/A (pure render) | No |
| DetailPanel | Props from parent | N/A (pure render) | No |
| CreateWorkItemModal | `useCreateWorkItem`, `useStatuses`, `usePriorities` | ✅ Yes (native hi_ hooks) | No |

**⚠️ CONFLICT:** HierarchyPage reads from Jira (`ph_issues`), but CreateWorkItemModal writes to native schema (`hi_work_items`). These are **two different data stores**. Creating a work item via the modal will NOT appear in the Jira-sourced tree.

---

## SECTION 7: DATA WIRING AUDIT

| Data Point | Status | Source |
|-----------|--------|--------|
| Work item list (tree rows) | ✅ WIRED | `ph_issues` via `useJiraHierarchyTree` |
| Work item key (e.g. BAU-3990) | ✅ WIRED | `issue_key` from `ph_issues` |
| Work item title | ✅ WIRED | `summary` from `ph_issues` |
| Hierarchy level / type icon | ✅ WIRED | `issue_type` → `JiraIssueTypeIcon` (SVG) + hardcoded level mapping |
| Status display (badge/pill) | ✅ WIRED | Dot+text pill, color derived from `status_category` |
| Status change (inline dropdown) | ❌ MOCK | **Not implemented** — no inline status editing |
| Priority display (bars) | ✅ WIRED | 4 monochrome bars from `priority` field |
| Parent key | ⚠️ PARTIAL | Used for tree building but **not displayed** in detail panel |
| Fix version / sprint | ✅ WIRED | `fix_versions[0]` shown as purple pill |
| Assignee (avatar + name) | ✅ WIRED | Initials avatar from `assignee_display_name` |
| Created timestamp | 🚫 MISSING | Not shown in UI (data available) |
| Reporter | 🚫 MISSING | Not shown in UI (data not fetched) |
| Progress (completed/total) | ✅ WIRED | Computed client-side via `computeStats()` recursive function |
| Description | 🚫 MISSING | Not shown in detail panel (not fetched from DB) |
| Subtasks/children list in detail | 🚫 MISSING | Detail panel shows no children list |
| Search/filter functionality | ❌ MOCK | **Not implemented** — no search bar, no filters |
| Pagination ("50 of N") | 🚫 MISSING | No pagination — loads up to 2000 items via `.limit(2000)` |
| Expand/collapse tree | ✅ WIRED | Toggle per row + Expand All / Collapse All buttons |
| Realtime subscription | 🚫 MISSING | No realtime — manual Refresh button only |
| Empty states | ✅ WIRED | "No work items found" with Jira sync suggestion |
| Loading states (skeleton) | ✅ WIRED | `TreeSkeleton` shimmer component |
| Error states (toast/retry) | ✅ WIRED | Error message + Retry button |

---

## SECTION 8: DESIGN SYSTEM COMPLIANCE

| Check | Current Value | Expected (V11/V12) | Pass? |
|-------|--------------|---------------------|-------|
| Font family | `'Inter', sans-serif` (inline) | Inter | ✅ |
| Row height | 44px (`height: 44, maxHeight: 44`) | 44px | ✅ |
| Card background | `#FFFFFF` | `#FFFFFF` | ✅ |
| Page background | `#F8FAFC` | `#F8FAFC` | ✅ |
| Border color | `#E2E8F0` | `#E2E8F0` | ✅ |
| Primary blue | `#2563EB` (key text, avatar, create CTA) | `#2563EB` | ✅ |
| Status display | Dot+text pill (`6px dot + 11px text`) | Dot+text (Linear style) | ✅ |
| Priority display | 4 monochrome bars (`12×4px, gap 2px`) | 4 monochrome bars | ✅ |
| Table container | `1px solid #E2E8F0`, `borderRadius: 8` | 1px border, NO shadow | ✅ |
| Native `<select>`? | ❌ None — uses custom `CustomSelect` | BANNED | ✅ |
| Golden Hour colors? | ❌ None found | BANNED | ✅ |
| Box shadows? | None on tree/cards | Minimal/none | ✅ |
| Empty cell em-dash | Uses `—` in `EmptyValue` component | `—` (#94A3B8) | ✅ |
| Focus ring | `0 0 0 3px rgba(37,99,235,0.12)` on inputs | Blue focus ring | ✅ |

**Design score: 14/14 — Full compliance**

---

## SECTION 9: WHAT'S MISSING FOR JIRA PARITY

| Feature | Current State | Needed |
|---------|--------------|--------|
| 8-column data table | Tree has: Grip, Chevron, Icon, Key, Title, Priority, Progress, Status, Avatar, Actions | ⚠️ Missing: Checkbox, Parent column, Fix Version column, Created column |
| Filled status badges | Dot+text pill (Linear style) | Need: Colored bg + white uppercase text + dropdown chevron (Jira style) |
| Inline status change | ❌ Not implemented | Click badge → dropdown → Supabase update |
| Column sorting | ❌ Not implemented | Click header → sort asc/desc |
| Search toolbar | ❌ Not implemented | Search by key or title |
| Avatar stack filter | ❌ Not implemented | Filter by assignee |
| Filter/Group buttons | ❌ Not implemented | Status, Priority, Assignee, Type filters |
| Detail panel breadcrumb | ❌ Not implemented | Parent / Child key trail |
| Detail panel subtasks list | ❌ Not implemented | Children with type icon + key + mini status |
| Detail panel activity | ❌ Not implemented | Comment input + tabs |
| Detail panel description | ❌ Not implemented | Rich text description display |
| Pagination footer | ❌ Not implemented | "50 of N" + refresh |
| View toggles (table/split) | ❌ Not implemented | Two icon buttons for tree vs split view |
| Sidebar nav link | ❌ Not implemented | "Hierarchy" link in ProjectHub sidebar |
| Inline edit (title) | ❌ Not implemented | Click title → inline edit → save |
| Bulk actions | ❌ Not implemented | Checkbox → bulk status/priority change |
| Realtime updates | ❌ Not implemented | Supabase realtime subscription |

---

## SUMMARY

### IMPLEMENTATION SCORE: 38/100

**Breakdown:**
- Routes & Navigation: 3/5 (60%) — route exists, page works, but no sidebar link
- Database: 9/10 (90%) — all `hi_` tables + RPCs exist, RLS not verified
- Types: 5/5 (100%) — complete type system with parent rules
- Service Layer: 4/5 (80%) — two parallel services, only Jira service is used
- Hooks: 8/10 (80%) — complete set but split across two hook files
- UI Components: 4/7 (57%) — core tree + detail + create modal exist, missing filters/search/inline-edit
- Data Wiring: 11/21 (52%) — tree renders real data, but many fields not shown, no mutations beyond DnD
- Design System: 14/14 (100%) — fully compliant with V11/V12 spec

### TOP 5 GAPS

1. **Dual Data Source Conflict** — HierarchyPage reads from `ph_issues` (Jira), CreateWorkItemModal writes to `hi_work_items` (native). These never intersect. Items created via modal are invisible in the tree.

2. **No Inline Status Change** — Status is display-only. No dropdown, no mutation hook for updating status. This is the #1 Jira parity gap.

3. **No Search/Filter/Sort** — The toolbar has only Expand/Collapse/Refresh. No search input, no filter dropdowns, no column sorting.

4. **No Sidebar Navigation** — The hierarchy page is not linked from any ProjectHub sidebar. Users cannot discover it.

5. **Detail Panel is Minimal** — Shows only 6 fields (status, priority, assignee, release, progress, due date). Missing: description, created date, reporter, parent breadcrumb, children list, activity feed, comments.

### RECOMMENDATION: **PATCH + UNIFY**

Do NOT rebuild. The component architecture is solid and design-compliant. Instead:

1. **Unify data source** — Decide: Jira sync (`ph_issues`) OR native (`hi_work_items`). If Jira is primary, disable the CreateWorkItemModal or wire it to create `ph_issues`. If native is primary, switch HierarchyPage to use `useFullHierarchyTree`.

2. **Add inline status change** — Create `useUpdateWorkItemStatus` mutation + `StatusDropdown` component.

3. **Add search + filter toolbar** — Client-side filter on the already-loaded tree (up to 2000 items).

4. **Add sidebar link** — Single line in ProjectHub sidebar config.

5. **Enrich detail panel** — Add description, parent breadcrumb, children list, created/reporter fields.
