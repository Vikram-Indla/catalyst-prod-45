# Resource 360° Module — Complete Technical Specification

> **Version**: 3.0 — Assignment-Based Aging  
> **Last Updated**: 2026-03-03  
> **Status**: Production  
> **Owner**: Catalyst PMO

---

## 1. PURPOSE & OVERVIEW

Resource 360° (R360) provides a **per-person workload intelligence view**. For any resource in the organization, it answers:

- What tickets are currently on this person's plate?
- How long has each ticket been sitting **since it was assigned to them** (not since it was created)?
- Which tickets are carried over from previous weeks/months?
- What was the person's workload in any given historical week?

### 1.1 Key Design Decisions

| Decision | Rule |
|----------|------|
| **Aging basis** | `assigned_at` (from `jira_sync_changelog`) — NOT `jira_created_at` |
| **Identity resolution** | `jira_account_id` first → fallback to `assignee_display_name` (case-insensitive) |
| **Role-based visibility** | Developers see assigned items only; PMs/BAs/QAs see assigned + reported-by items |
| **Current week** | Shows ALL open items + done items resolved this week |
| **Past weeks** | Shows items assigned before/during that week AND still open, or resolved that week |
| **Carry-over** | Badge like "From W48, Jan" on items assigned before the viewed period |
| **Stale threshold** | >14 days since assignment = stale (red) |

---

## 2. ROUTES

| Route | Page Component | Purpose |
|-------|---------------|---------|
| `/project-hub/resources-v2` | `R360ResourcesListing.tsx` | Team directory with department filters |
| `/project-hub/resources-v2/:resourceId` | `R360MemberDetail.tsx` | **Primary**: Individual member 360° view |
| `/project-hub/resource360/:resourceId` | `Resource360Page.tsx` | **Legacy V1**: Ring/Chronology/List views |
| `/resource360/members/:memberId` | `Resource360MemberDetail.tsx` | **Legacy V2**: Uses `r360md_*` views |

> **CANONICAL ROUTE**: `/project-hub/resources-v2/:resourceId` → `R360MemberDetail.tsx`  
> The other two page components (`Resource360Page.tsx`, `Resource360MemberDetail.tsx`) are legacy and should be consolidated.

---

## 3. DATABASE TABLES & VIEWS

### 3.1 Primary Tables

| Table | Purpose |
|-------|---------|
| `resource_inventory` | Master resource registry (name, role, department, vendor, jira_account_id, profile_id) |
| `ph_issues` | All Jira issues synced via webhook (assignee_account_id, reporter_account_id, status, status_category, etc.) |
| `jira_sync_changelog` | Historical field changes from Jira (field_name='assignee', to_string, to_value, jira_created_at) |
| `profiles` | User profiles with avatar_url |

### 3.2 Legacy Views (used by V1/V2 only)

| View | Used By |
|------|---------|
| `r360_resource_summary_view` | `resource360Service.ts` fallback |
| `r360_work_items_enriched_view` | `resource360Service.ts` fallback |
| `r360md_members` | `resource360MdService.ts` |
| `r360md_chronology_view` | `resource360MdService.ts` |
| `r360md_member_kpis_view` | `resource360MdService.ts` |

### 3.3 Identity Resolution Query Pattern

```typescript
// ALWAYS prefer jira_account_id
if (resource.jira_account_id) {
  query.eq('assignee_account_id', resource.jira_account_id);
} else {
  query.eq('assignee_display_name', resource.name);
}
```

---

## 4. SERVICE LAYER

### 4.1 `r360Service.ts` — Canonical Service

**File**: `src/services/r360Service.ts`

#### Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getResources()` | — | `R360Resource[]` | All active resources from `resource_inventory` |
| `getMemberOverview(resourceId)` | UUID | Profile + KPIs | Resource metadata + aggregated open/stale/done counts |
| `getMemberWorkItems(resourceId, filters?)` | UUID + optional filters | `R360WorkItem[]` | All work items with assignment-based aging |
| `getSiblings(parentKey)` | Issue key | Sibling items | Only returns siblings when parent is a Story |

#### Assignment Date Resolution (`fetchAssignmentDates`)

```
1. Query jira_sync_changelog WHERE field_name = 'assignee' AND issue_key IN (...)
2. Order by jira_created_at DESC (most recent first)
3. For each entry, match by:
   a. jira_account_id === to_value (preferred)
   b. resource.name.toLowerCase() === to_string.toLowerCase() (fallback)
4. Return Record<issue_key, assignment_timestamp>
5. If no changelog entry → fall back to jira_created_at
```

#### Age Computation

```typescript
function computeAge(fromDate: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(fromDate).getTime()) / 86400000));
  return {
    age_days: days,
    age_class: days <= 7 ? 'green' : days <= 14 ? 'amber' : 'red'
  };
}
```

#### Carry-Over Label

```typescript
function computeCarriedFromLabel(assignedAt: string, periodStart: Date): string | null {
  // Returns null if assigned within current period
  // Returns "From W48, Jan" if assigned before period start
}
```

### 4.2 `resource360Service.ts` — Legacy V1 Service

**File**: `src/services/resource360Service.ts`

- Uses 10-minute in-memory LKG cache
- Queries `ph_issues` directly via `assignee_account_id`
- Does NOT use assignment-based aging (uses `jira_created_at` as `assigned_date`)
- Resolves fix_versions inheritance from parent issues
- Computes `days_until_due` from fix version release dates

### 4.3 `resource360MdService.ts` — Legacy V2 Service

**File**: `src/services/resource360MdService.ts`

- Queries `r360md_*` database views
- Simpler interface, no client-side age computation

---

## 5. ROLE CLASSIFICATION SYSTEM

**File**: `src/constants/r360RoleClassification.ts`

### Developer Roles (assigned items only)
`.net developer`, `.net lead`, `backend architect`, `backend developer`, `data engineer`, `database engineer`, `devops`, `infrastructure engineer`, `mobile developer`, `react developer`, `react lead`, `service engineer`, `support engineer`

### Contributor Roles (assigned + reported-by items)
`ba`, `business analyst`, `delivery manager`, `ea`, `enterprise architect`, `pmo`, `product owner`, `project manager`, `qa tester`, `solutions architect`, `technical po`, `ux designer`

**Rule**: If a role is NOT in the developer set, it's treated as a contributor role.

For contributor roles:
1. Fetch items where `assignee_account_id` matches (primary)
2. ALSO fetch items where `reporter_account_id` matches (contributed)
3. Exclude items from contributed set where the person is already the assignee
4. Tag items with `role_on_item: 'Assignee' | 'Contributor'`
5. Contributor items get purple accent color (`#7C3AED`) in all views

---

## 6. DATA TYPE — `R360WorkItem`

**File**: `src/types/r360.ts`

```typescript
interface R360WorkItem {
  id: string;
  item_key: string;          // e.g. "BAU-4189"
  title: string;
  item_type: string;         // "Bug", "Task", "Story", "Sub-task", "Epic"
  priority: string;          // "Highest", "High", "Medium", "Low"
  status: string;            // Raw Jira status
  status_category: string;   // Normalized: "to_do", "in_progress", "in_qa", "done", "blocked"
  status_label: string;      // Display label
  status_color: string;      // Text color
  status_bg: string;         // Background color
  status_dot: string;        // Dot indicator color
  project_key: string;       // "BAU", "SEN", etc.
  project_name: string;
  assignee_name: string;
  reporter_name: string;
  parent_key: string | null;
  parent_title: string | null;
  sprint_name: string | null;
  story_points: number | null;
  fix_version: string | null;
  due_date: string | null;
  created_at: string;        // jira_created_at
  updated_at: string;        // jira_updated_at
  resolved_at: string | null;
  labels: string[];

  // ═══ ASSIGNMENT-BASED FIELDS ═══
  assigned_at: string;              // When assigned to this person (from changelog)
  age_days: number;                 // Days since assigned_at
  age_class: 'green' | 'amber' | 'red';  // ≤7d green, ≤14d amber, >14d red
  carried_from_label: string | null; // "From W48, Jan" — computed at view layer
  group_date: string;               // YYYY-MM-DD for chronology grouping
  date_label: string;               // "Today, Mar 3" / "Yesterday, Mar 2" / "Mon, Mar 1"
  role_on_item: 'Assignee' | 'Contributor';
}
```

---

## 7. STATUS MAPPING

**File**: `src/constants/r360.ts`

| Jira Status | Category | Display Label | Dot Color |
|-------------|----------|--------------|-----------|
| To Do, Open, Backlog, ToDo, Ready for Development | `to_do` | To Do / Backlog / Ready | `#D97706` (amber) |
| In Progress, In Development, Under Implementation, Technical validation | `in_progress` | In Progress / Validation | `#2563EB` (blue) |
| Implementation Review, Ready for QA, In Review, Code Review | `in_qa` | In Review | `#0D9488` (teal) |
| Done, Closed, Resolved | `done` | Done | `#16A34A` (green) |
| Blocked | `blocked` | Blocked | `#EF4444` (red) |

**Default** (unmapped status): `{ category: 'to_do', label: 'Unknown', color: '#334155', bg: '#F1F5F9', dot: '#64748B' }`

---

## 8. UI ARCHITECTURE — `R360MemberDetail.tsx`

### 8.1 Page Layout (top → bottom)

```
┌──────────────────────────────────────────────────┐
│  STICKY HEADER                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Profile: Avatar | Name | Role · Dept | OPEN | STALE │
│  │ Tabs: Ring | Chronology | Board | [Back] [Q1] [Intelligence] │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │ Period Nav: [Weekly|Monthly] | 📅 This Week  │ │
│  │ Jan 5 – Jan 11, 2026 | ‹ › | All(N) To Do(N) In Prog(N) │
│  └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  VIEW CONTENT (Ring / Chronology / Board)         │
├──────────────────────────────────────────────────┤
│  DETAIL PANEL (slide-in from right, 460px)        │
└──────────────────────────────────────────────────┘
```

### 8.2 Period Navigation System

**Period Types**: Weekly (default) | Monthly

```typescript
function getWeekRange(offset: number) {
  // Sunday-based weeks
  // offset 0 = current week, -1 = last week, etc.
  return { start: Date, end: Date, label: string, range: string };
}

function getMonthRange(offset: number) {
  // Calendar month
  return { start: Date, end: Date, label: string, range: string };
}
```

### 8.3 Period Filtering Logic

```typescript
const weekItems = workItems.filter(item => {
  if (isCurrentPeriod) {
    // ALL open items always visible
    if (item.status_category !== 'done') return true;
    // Done items: only if resolved within this period
    return resolvedDate >= period.start && resolvedDate <= period.end;
  } else {
    // Past: only items assigned before period end
    if (assignedDate > period.end) return false;
    // Done: only if resolved during or after this period
    if (item.status_category === 'done') {
      return resolvedDate >= period.start;
    }
    // Open: show (they were on the plate)
    return true;
  }
});

// Then compute carry-over labels
items.map(item => ({
  ...item,
  carried_from_label: computeCarriedFromLabel(item.assigned_at, period.start),
}));
```

### 8.4 Auto-Skip Empty Periods

When navigating with arrows, if the target period is empty:
- Continue in the same direction (max 12 weeks or 6 months)
- Stop at the first period with items
- Reset skip state when user manually changes period type

### 8.5 Jump to Last Activity

When a period is empty, show a prompt:
- "N open items across all time · N stale"
- "Last activity: Mar 3, 2026"
- [Jump to last activity] button → calculates the correct offset

### 8.6 Banner KPIs

| KPI | Source | Scope |
|-----|--------|-------|
| OPEN | `allOpenItems.length` | All time (not week-scoped) |
| STALE | `allStaleItems.length` (age > 14d) | All time (not week-scoped) |

---

## 9. RING VIEW

**Canvas**: 720px height, pixel-based positioning  
**Card dimensions**: 230×155px  
**Max visible cards**: 8 (non-done items)  
**Center**: Person's avatar (96×96px, blue border with glow)

### 9.1 Slot System

8 orbital positions computed from canvas width:
```
[0] Top-left    [1] Top-center    [2] Top-right
[3] Mid-left                      [4] Mid-right
[5] Bot-left    [6] Bot-center    [7] Bot-right
```

### 9.2 Spokes

Dashed lines from center avatar to each card midpoint:
- Stroke: `#94A3B8`, width: 2px, dash: `8 5`
- Midpoint label shows age in days (e.g., "15d")

### 9.3 Card Structure

```
┌─ [3px accent bar] ─────────────────────────┐
│ [Icon] TASK TYPE                    Medium  │
│ BAU-4189 [BAU]                        15d   │
│ Title text (max 2 lines, ellipsis)          │
│ [Status Pill] [From W48, Jan] [→ Avatar]    │
└─────────────────────────────────────────────┘
```

- Accent bar color: status-based (blue/teal/amber/green/red), purple for contributor
- Age color: green ≤7d, amber ≤14d, red >14d
- Carry-over badge: amber background `#FEF3C7`, text `#92400E`
- Contributor items show: `→ [Avatar] Assignee Name`

### 9.4 Completed Badge

Right side of ring, vertically centered:
- Green circle (48px) with count
- "COMPLETED" text vertical
- Clickable → dropdown with list of done items
- Dropdown: 360px wide, max 420px height, scrollable

---

## 10. CHRONOLOGY VIEW

- Timeline with vertical line (left edge)
- Grouped by `group_date` (YYYY-MM-DD)
- Date dots: blue=today, dark=yesterday, outlined=other
- Collapsible groups with mini status distribution bar
- Cards show: icon, key, project tag, title, parent ref, status pill, age badge
- Auto-scrolls to the first date within the selected week

---

## 11. BOARD VIEW

3-column Kanban:
| Column | Categories |
|--------|-----------|
| TO DO | `to_do` + `blocked` |
| IN PROGRESS | `in_progress` + `in_qa` |
| DONE | `done` |

Each column header: dot + label + count badge

---

## 12. DETAIL PANEL

Slide-in panel (460px) from right, overlay behind.

### Sections:
1. **Header**: Item key, status pill, priority, type icon, project tag
2. **Meta Grid** (2-column): Project, Assignee/Reporter, Assigned date, Days Sitting (with progress bar), Release, Due Date
3. **Hierarchy**: Parent → Current (highlighted) tree
4. **Siblings**: Only when parent is a Story. Shows sibling sub-tasks with progress count.

### Siblings Rule:
```typescript
// Only fetch siblings for Sub-task items with Story parents
const canHaveStoryParent = normalizedItemType === 'subtask';
const siblings = useR360Siblings(canHaveStoryParent ? item.parent_key : null);
```

---

## 13. DESIGN TOKENS

**File**: `src/constants/r360.ts`

```typescript
const R360 = {
  primary: '#2563EB',    primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF', primaryDark: '#1E3A5F',
  success: '#16A34A',    successLight: '#F0FDF4',
  warning: '#D97706',    warningLight: '#FFFBEB',
  danger: '#EF4444',     dangerLight: '#FEF2F2',
  teal: '#0D9488',       tealLight: '#F0FDFA',
  purple: '#7C3AED',     purpleLight: '#F5F3FF',
  ink1: '#020617', ink2: '#0F172A', ink3: '#334155', ink4: '#64748B',
  surface: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', borderLt: '#F1F5F9',
};
```

### Department Colors
```
Delivery: #2563EB, Governance: #0D9488, Operations: #D97706,
Product: #7C3AED, Technical Support: #EF4444
```

### Project Colors
```
BAU: #2563EB, SEN: #D97706, FAC: #16A34A, OPS: #0D9488,
SUP: #64748B, LND: #7C3AED, COM: #0D9488, IN: #D97706,
DET: #EF4444, ICP: #16A34A
```

### BANNED Colors
`#C69C6D`, `#5C7C5C`, `#8B7355`, `#D4B896` — Golden Hour palette. Never use.

---

## 14. CSS ARCHITECTURE

**File**: `src/styles/r360.css`

- ALL rules scoped under `#r360-root`
- DO NOT convert to Tailwind
- Font: Inter, -apple-system
- Key classes: `.r3-page`, `.r3-profile`, `.r3-tabs`, `.r3-ring-*`, `.r3-chrono-*`, `.r3-board-*`, `.r3-panel-*`
- Skeleton animation: shimmer gradient

---

## 15. HOOKS LAYER

**File**: `src/hooks/useR360.ts`

| Hook | Service Call | Cache Key |
|------|-------------|-----------|
| `useR360Resources()` | `r360Service.getResources()` | `['r360','resources']` |
| `useR360Overview(id)` | `r360Service.getMemberOverview(id)` | `['r360','overview',id]` |
| `useR360WorkItems(id, filters)` | `r360Service.getMemberWorkItems(id, filters)` | `['r360','items',id,filters]` |
| `useR360Siblings(key)` | `r360Service.getSiblings(key)` | `['r360','siblings',key]` |

---

## 16. UTILITIES

**File**: `src/utils/r360Utils.ts`

| Function | Purpose |
|----------|---------|
| `slugify(name)` | URL-safe name |
| `initials(name)` | "John Doe" → "JD" |
| `truncate(s, len)` | Ellipsis truncation |
| `ageColor(days)` | green/amber/red class |
| `ageBarPercent(days)` | 0-100% for progress bar (21d = 100%) |
| `ageBarColor(days)` | Hex color for progress bar |
| `formatRelativeDate(dateStr)` | "Today" / "1d ago" / "5d ago" |
| `formatDate(dateStr)` | "Jan 15, 2026" |

---

## 17. FILE INVENTORY

### Active (Canonical) Files

| File | Purpose |
|------|---------|
| `src/pages/R360MemberDetail.tsx` | Main page (1066 lines, contains RingView, ChronologyView, BoardView, DetailPanel inline) |
| `src/pages/R360ResourcesListing.tsx` | Team directory |
| `src/services/r360Service.ts` | Data service with assignment-based aging |
| `src/hooks/useR360.ts` | React Query hooks |
| `src/types/r360.ts` | TypeScript interfaces |
| `src/constants/r360.ts` | Design tokens, status map, dept/project colors |
| `src/constants/r360RoleClassification.ts` | Developer vs contributor role lists |
| `src/utils/r360Utils.ts` | Utility functions |
| `src/styles/r360.css` | Scoped CSS |
| `src/components/r360/R360JiraIcons.tsx` | Jira issue type SVG icons |

### Legacy Files (to be consolidated)

| File | Purpose |
|------|---------|
| `src/pages/Resource360Page.tsx` | V1 page |
| `src/pages/Resource360MemberDetail.tsx` | V2 page (r360md_ views) |
| `src/services/resource360Service.ts` | V1 service (LKG cache, no assignment aging) |
| `src/services/resource360MdService.ts` | V2 service (r360md_ views) |
| `src/hooks/useResource360.ts` | V1+V2 hooks |
| `src/constants/resource360.ts` | V1 tokens (duplicates r360.ts) |
| `src/components/resource360/*` | 30+ legacy components |

---

## 18. KNOWN ISSUES & TECH DEBT

1. **Three parallel implementations**: Pages/services exist in triplicate. Canonical = `R360MemberDetail.tsx` + `r360Service.ts`.
2. **Inline sub-components**: RingView, ChronologyView, BoardView, DetailPanel are all defined inside `R360MemberDetail.tsx` (1066 lines). Should be extracted.
3. **No pagination**: Work items query can hit Supabase's 1000-row default limit for highly active resources.
4. **Hardcoded inline styles**: Views use extensive inline styles instead of CSS classes.
5. **Assignment date fallback**: When no changelog entry exists, falls back to `jira_created_at` — this gives misleading age for items assigned before changelog tracking began.
6. **Week start**: Uses Sunday-based weeks; some organizations prefer Monday-based.

---

## 19. REBUILD RECOMMENDATIONS

1. **Single page, extracted components**: Break `R360MemberDetail.tsx` into `<RingView>`, `<ChronologyView>`, `<BoardView>`, `<DetailPanel>` as separate files.
2. **Delete legacy**: Remove V1 (`Resource360Page`, `resource360Service`) and V2 (`Resource360MemberDetail`, `resource360MdService`) once canonical is stable.
3. **Server-side assignment dates**: Create a database function or view that joins `ph_issues` with `jira_sync_changelog` to pre-compute `assigned_at` per resource, eliminating the N+1 query pattern.
4. **Virtualization**: For resources with 100+ items, use `@tanstack/react-virtual` for chronology/board views.
5. **Move styles to CSS**: Extract all inline styles from views into `r360.css` classes.
