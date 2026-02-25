# ═══════════════════════════════════════════════════════════════════════════
# RESOURCE 360° — COMPLETE BUILD SPECIFICATION
# ═══════════════════════════════════════════════════════════════════════════
#
# This document is the SINGLE SOURCE OF TRUTH.
# It contains EVERYTHING Lovable needs — no external references required.
# Every view, every component, every CSS rule, every data query.
#
# EXISTING ROUTE (DO NOT REBUILD):
#   /project-hub/resources → Resources listing table (already exists)
#
# NEW ROUTE (BUILD THIS):
#   /project-hub/resources/:resourceId → Member Detail (Ring/Chronology/Board)
#
# HOOK: Wire existing resource table rows to navigate to the new detail route.
# When user clicks a row in /project-hub/resources → navigate('/project-hub/resources/{id}')
# ═══════════════════════════════════════════════════════════════════════════

---

# STAGE A — ROUTE, TYPES, CONSTANTS, CSS

## A1. Route

Register ONE new route. Do NOT touch, rebuild, or delete the existing `/project-hub/resources` listing page.

```
/project-hub/resources/:resourceId  → R360MemberDetail.tsx
```

**Hook the existing listing:** In the existing Resources table at `/project-hub/resources`, find where table rows are rendered. Add an `onClick` (or wrap in a `<Link>`) so that clicking a row navigates to:

```
/project-hub/resources/${resource.id}
```

The resource `id` comes from `resource_inventory.id` — the same table the existing listing already queries.

**Back button on detail page** navigates to `/project-hub/resources`.

The detail page wraps ALL content in `<div id="r360-root">` for CSS scoping.

Sidebar: Under ProjectHub → Resource 360° section, "Team Members" links to `/project-hub/resources` and shows active state on any `/project-hub/resources*` route (both listing and detail).

## A2. TypeScript Interfaces

File: `src/types/r360.ts`

```typescript
export interface R360Resource {
  id: number;
  profile_id: string | null;
  resource_name: string;
  role_name: string;
  department: string;
  assignment: string | null;
  location: string;
  vendor: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface R360MemberView {
  resource_id: number;
  resource_name: string;
  role_name: string;
  department: string;
  assignment: string;
  location: string;
  vendor: string | null;
  avatar_url: string | null;
  total_items: number;
  open_items: number;
  done_items: number;
  stale_items: number;
  closure_pct: number;
}

export interface R360WorkItem {
  id: string;
  item_key: string;
  title: string;
  item_type: string;
  priority: string;
  status: string;
  status_category: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  status_dot: string;
  project_key: string;
  project_name: string;
  assignee_name: string;
  assignee_avatar_url: string | null;
  reporter_name: string;
  reporter_avatar_url: string | null;
  parent_key: string | null;
  parent_title: string | null;
  sprint_name: string | null;
  story_points: number | null;
  fix_version: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: string[];
  age_days: number;
  age_class: 'green' | 'amber' | 'red';
  group_date: string;
  date_label: string;
}

export interface R360Filters {
  status_categories?: string[];
  project_keys?: string[];
  item_types?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  pending_only?: boolean;
}

export type R360ViewType = 'ring' | 'chronology' | 'board';
```

## A3. Constants

File: `src/constants/r360.ts`

```typescript
export const R360_TOKENS = {
  primary: '#2563EB', primaryHover: '#1D4ED8', primaryLight: '#EFF6FF', primaryDark: '#1E3A5F',
  success: '#16A34A', successLight: '#F0FDF4', successText: '#14532D',
  warning: '#D97706', warningLight: '#FFFBEB', warningText: '#78350F',
  danger: '#EF4444', dangerLight: '#FEF2F2', dangerText: '#7F1D1D',
  teal: '#0D9488', tealLight: '#F0FDFA', tealText: '#134E4A',
  purple: '#7C3AED', purpleLight: '#F5F3FF', purpleText: '#4C1D95',
  ink1: '#020617', ink2: '#0F172A', ink3: '#334155', ink4: '#64748B',
  surface: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', borderLt: '#F1F5F9',
} as const;

// Jira Status → Display (CG-05: ToDo=AMBER, Blocked=RED ONLY)
export const R360_STATUS_MAP: Record<string, {
  category: string; label: string; color: string; bg: string; dot: string;
}> = {
  'To Do':          { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Open':           { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Backlog':        { category:'to_do',       label:'Backlog',     color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'In Progress':    { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'In Development': { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'In Review':      { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Code Review':    { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Done':           { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Closed':         { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Resolved':       { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Blocked':        { category:'blocked',     label:'Blocked',     color:'#7F1D1D', bg:'#FEF2F2', dot:'#EF4444' },
};
export const R360_STATUS_DEFAULT = { category:'to_do', label:'Unknown', color:'#334155', bg:'#F1F5F9', dot:'#64748B' };

export const R360_DEPT_COLORS: Record<string,string> = {
  Delivery:'#2563EB', Governance:'#0D9488', Operations:'#D97706',
  Product:'#7C3AED', 'Technical Support':'#EF4444',
};

export const R360_PROJECT_COLORS: Record<string,string> = {
  BAU:'#2563EB', SEN:'#D97706', FAC:'#16A34A', OPS:'#0D9488', SUP:'#64748B', LND:'#7C3AED',
};
```

## A4. Jira Icons

File: `src/components/r360/R360JiraIcons.tsx`

```tsx
export const JiraBugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A"/><circle cx="8" cy="8" r="3" fill="white"/></svg>
);
export const JiraTaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const JiraStoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
export const JiraEpicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
export const JiraSubtaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><rect x="5" y="5" width="6" height="6" rx="1" fill="white"/></svg>
);

export function getJiraIcon(type: string) {
  switch(type) {
    case 'Bug': return <JiraBugIcon />;
    case 'Story': return <JiraStoryIcon />;
    case 'Epic': return <JiraEpicIcon />;
    case 'Sub-task': return <JiraSubtaskIcon />;
    default: return <JiraTaskIcon />;
  }
}
```

## A5. Utility Functions

File: `src/utils/r360Utils.ts`

```typescript
export const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
export const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
export const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + '…' : s;
export const avatarPath = (name: string) => `/admin/users/${slugify(name)}/avatar`;

export function ageColor(days: number): 'green' | 'amber' | 'red' {
  return days <= 7 ? 'green' : days <= 14 ? 'amber' : 'red';
}

export function ageBarPercent(days: number): number {
  return Math.min(days / 21 * 100, 100);
}

export function ageBarColor(days: number): string {
  return days <= 7 ? '#16A34A' : days <= 14 ? '#D97706' : '#EF4444';
}
```

## A6. Ring-Fenced CSS

File: `src/styles/r360.css` — Import in the detail page component.

**CRITICAL: This CSS file is SACRED. Do NOT convert to Tailwind. Do NOT split. Keep as ONE file. Every rule scoped under `#r360-root`.**

The complete CSS is defined inline below within each component spec. When building, create a single CSS file containing ALL of these rules. Every rule must use the `#r360-root` scope or the `r3-` class prefix.

---

# STAGE B — DATA LAYER

## B1. Service Layer

File: `src/services/r360Service.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { R360_STATUS_MAP, R360_STATUS_DEFAULT } from '@/constants/r360';

function mapStatus(jiraStatus: string) {
  return R360_STATUS_MAP[jiraStatus] || R360_STATUS_DEFAULT;
}

function computeAge(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  return { age_days: days, age_class: (days <= 7 ? 'green' : days <= 14 ? 'amber' : 'red') as any };
}

function groupDate(dateStr: string) {
  const d = new Date(dateStr);
  const r = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const gd = `${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,'0')}-${String(r.getDate()).padStart(2,'0')}`;
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const tStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const y = new Date(today); y.setDate(y.getDate()-1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let label = gd===tStr ? `Today, ${M[r.getMonth()]} ${r.getDate()}` : gd===yStr ? `Yesterday, ${M[r.getMonth()]} ${r.getDate()}` : `${D[r.getDay()]}, ${M[r.getMonth()]} ${r.getDate()}`;
  return { group_date: gd, date_label: label };
}

export const r360Service = {

  // Get single resource for profile header
  async getResource(resourceId: number) {
    const { data, error } = await supabase.from('resource_inventory')
      .select('id, profile_id, resource_name, role_name, department, assignment, location, vendor, avatar_url, is_active')
      .eq('id', resourceId).single();
    if (error) throw error;
    return data;
  },

  // 360° KPIs from the view
  async getMemberOverview(resourceId: number) {
    const { data, error } = await supabase.from('vw_wh_resource_360')
      .select('*').eq('resource_id', resourceId).single();
    if (error) throw error;
    return data;
  },

  // Work items from ph_issues (Jira-synced)
  async getMemberWorkItems(resourceId: number, filters?: any) {
    const { data: resource } = await supabase.from('resource_inventory')
      .select('resource_name').eq('id', resourceId).single();
    if (!resource) return [];

    let query = supabase.from('ph_issues').select(`
      id, jira_key, summary, issue_type, status, priority,
      assignee_display_name, assignee_account_id, assignee_avatar_url,
      reporter_display_name, reporter_avatar_url,
      parent_key, parent_summary, sprint_name, story_points, fix_versions,
      due_date, created_at, updated_at, resolved_at, labels,
      ph_projects!inner(project_key, name)
    `).eq('assignee_display_name', resource.resource_name);

    if (filters?.search) query = query.ilike('summary', `%${filters.search}%`);
    if (filters?.date_from) query = query.gte('updated_at', filters.date_from);
    if (filters?.date_to) query = query.lte('updated_at', filters.date_to);
    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => {
      const st = mapStatus(item.status);
      const age = computeAge(item.created_at);
      const gd = groupDate(item.updated_at);
      const fv = Array.isArray(item.fix_versions) && item.fix_versions[0]?.name || null;
      return {
        id: item.id, item_key: item.jira_key, title: item.summary,
        item_type: item.issue_type, priority: item.priority, status: item.status,
        status_category: st.category, status_label: st.label,
        status_color: st.color, status_bg: st.bg, status_dot: st.dot,
        project_key: item.ph_projects?.project_key || '',
        project_name: item.ph_projects?.name || '',
        assignee_name: item.assignee_display_name || '',
        assignee_avatar_url: item.assignee_avatar_url,
        reporter_name: item.reporter_display_name || '',
        reporter_avatar_url: item.reporter_avatar_url,
        parent_key: item.parent_key, parent_title: item.parent_summary,
        sprint_name: item.sprint_name, story_points: item.story_points,
        fix_version: fv, due_date: item.due_date,
        created_at: item.created_at, updated_at: item.updated_at,
        resolved_at: item.resolved_at, labels: item.labels || [],
        ...age, ...gd,
      };
    }).filter(item => {
      if (filters?.pending_only && item.status_category === 'done') return false;
      if (filters?.status_categories?.length) return filters.status_categories.includes(item.status_category);
      return true;
    });
  },

  // Siblings: items sharing the same parent_key
  async getSiblings(parentKey: string) {
    const { data, error } = await supabase.from('ph_issues').select(`
      id, jira_key, summary, status, assignee_display_name, assignee_avatar_url, created_at
    `).eq('parent_key', parentKey).order('jira_key');
    if (error) throw error;
    return (data || []).map(item => {
      const st = mapStatus(item.status);
      const age = computeAge(item.created_at);
      return { id: item.id, item_key: item.jira_key, title: item.summary,
        status_label: st.label, status_color: st.color, status_bg: st.bg, status_dot: st.dot,
        status_category: st.category, assignee_name: item.assignee_display_name || '',
        assignee_avatar_url: item.assignee_avatar_url, ...age };
    });
  },
};
```

## B2. Hooks

File: `src/hooks/useR360.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { r360Service } from '@/services/r360Service';

export const useR360Resource = (id: number) => useQuery({ queryKey: ['r360','resource',id], queryFn: () => r360Service.getResource(id), enabled: id > 0 });
export const useR360Overview = (id: number) => useQuery({ queryKey: ['r360','overview',id], queryFn: () => r360Service.getMemberOverview(id), enabled: id > 0 });
export const useR360WorkItems = (id: number, filters?: any) => useQuery({ queryKey: ['r360','items',id,filters], queryFn: () => r360Service.getMemberWorkItems(id, filters), enabled: id > 0 });
export const useR360Siblings = (key: string|null) => useQuery({ queryKey: ['r360','siblings',key], queryFn: () => r360Service.getSiblings(key!), enabled: !!key });
```

---

# STAGE C — EVERY VIEW IN FULL DETAIL

This is the PIXEL-PERFECT specification for every component on the detail page.

---

## COMPONENT 1: PROFILE HEADER

**Appears at the top of `/project-hub/resources/:resourceId`**

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [← Back]                                          [Q1-2026] [✦ Intel]  │
├──────────────────────────────────────────────────────────────────────────┤
│ [48px Avatar]  Adnan Ali                                 ┌──────┐┌────┐│
│                React Developer · Delivery                │  12  ││  0 ││
│                                                          │ OPEN ││STALE││
│                                                          └──────┘└────┘│
├──────────────────────────────────────────────────────────────────────────┤
│ [Ring]  [Chronology]  [Board]                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Top Action Bar
- `display: flex`, `justify-content: space-between`, `align-items: center`, `margin-bottom: 16px`
- **Back button:** `display: inline-flex`, `align-items: center`, `gap: 6px`, `padding: 6px 14px`, `border: 1px solid #E2E8F0`, `border-radius: 6px`, `font-size: 13px`, `font-weight: 500`, `color: #334155`, `cursor: pointer`
  - Lucide ChevronLeft icon `14px`
  - Text: "Back"
  - Hover: `border-color: #94A3B8`, `color: #0F172A`
  - onClick: `navigate('/project-hub/resources')`
- Right side: `display: flex`, `gap: 8px`
- **Q1-2026 button:** `padding: 6px 14px`, `border: 1px solid #E2E8F0`, `border-radius: 6px`, `font-size: 13px`, `font-weight: 500`, `color: #334155`, Lucide Calendar icon `14px`
- **✦ Intelligence button:** `background: #2563EB` (BLUE — NOT PURPLE), `color: #FFFFFF`, `font-weight: 600`, `padding: 7px 16px`, `border-radius: 6px`, `border: none`, `font-size: 13px`, `box-shadow: 0 1px 3px rgba(37,99,235,.25)`, Lucide Sparkles icon `14px`
  - Hover: `background: #1D4ED8`

### Profile Card
- `background: #FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 12px`, `padding: 20px 24px`, `margin-bottom: 0`
- `display: flex`, `align-items: center`, `gap: 16px`
- **Avatar:** `48px × 48px`, `border-radius: 50%`, `flex-shrink: 0`
  - `src="/admin/users/{slugify(resource_name)}/avatar"`
  - Fallback: `background: linear-gradient(135deg, #2563EB, #0D9488)`, white initials `font-size: 16px`, `font-weight: 700`
  - `onerror` → show fallback initials div
- **Text block:** `flex: 1`
  - Name: `font-size: 18px`, `font-weight: 700`, `color: #020617`, `letter-spacing: -0.3px`, `line-height: 1.3`
  - Role: `font-size: 13px`, `font-weight: 500`, `color: #334155`, `margin-top: 2px`
  - Format: `"{role_name} · {department}"` — data from `resource_inventory.role_name` (canonical)
- **KPI Cards:** `display: flex`, `gap: 8px`, `margin-left: auto`, `flex-shrink: 0`

### KPI Cards — ONLY 2 (NO Total, NO Closure%, NO Avg Age)
- Each card: `padding: 8px 20px`, `border-radius: 8px`, `min-width: 72px`, `text-align: center`
- **Open card:** `border: 1px solid #FDE68A`, `background: #FFFBEB`
  - Value: `font-size: 20px`, `font-weight: 700`, `color: #78350F`, `font-variant-numeric: tabular-nums`
  - Label: `font-size: 10.5px`, `font-weight: 600`, `color: #334155`, `text-transform: uppercase`, `letter-spacing: .03em`
  - Data: `vw_wh_resource_360.open_items`
- **Stale card:** `border: 1px solid #E2E8F0`, `background: #FFFFFF`
  - Value: `font-size: 20px`, `font-weight: 700`, `color: #0F172A`
  - Label: same styling, text "STALE"
  - Data: `vw_wh_resource_360.stale_items`

### Tab Bar
- `margin-top: 16px`, `border-top: 1px solid #F1F5F9`, `padding-top: 14px`
- `display: flex`, `gap: 4px`
- Each tab: `padding: 7px 16px`, `font-size: 13px`, `font-weight: 500`, `color: #334155`, `border-radius: 6px`, `border-bottom: 2px solid transparent`, `cursor: pointer`
- **Active tab:** `background: #EFF6FF`, `color: #2563EB`, `font-weight: 600`, `border-bottom-color: #2563EB`
- Tabs: "Ring", "Chronology", "Board"
- Default: Ring

---

## COMPONENT 2: WEEK NAVIGATION BAR

**Shared across Ring, Chronology, Board — rendered below profile header**

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 This Week  Feb 16 – Feb 22, 2026  [‹] [›]  [All(12)] [To Do(9)] [In Prog(3)]  8 items │
└─────────────────────────────────────────────────────────────────────────┘
```

- Container: `display: flex`, `align-items: center`, `gap: 10px`, `margin: 16px 0`, `padding-bottom: 14px`, `border-bottom: 1px solid #F1F5F9`, `flex-wrap: wrap`
- **Calendar icon:** Lucide Calendar, `14px`, `color: #2563EB` (NOT a pin/location icon)
- **"This Week":** `font-size: 13px`, `font-weight: 700`, `color: #0F172A`
- **Date range:** `font-size: 13px`, `font-weight: 500`, `color: #334155`, format: "Feb 16 – Feb 22, 2026"
- **Arrow buttons:** `28px × 28px`, `border: 1px solid #E2E8F0`, `border-radius: 4px`, `background: #FFFFFF`, Lucide ChevronLeft/ChevronRight `14px`, `color: #334155`
  - Hover: `border-color: #94A3B8`
  - onClick: shift week ±7 days, recalculate date range, re-filter items
- **Filter pills:** `padding: 5px 12px`, `font-size: 12.5px`, `font-weight: 500`, `border: 1px solid #E2E8F0`, `border-radius: 20px`, `color: #334155`, `cursor: pointer`
  - **Active pill:** `background: #EFF6FF`, `border-color: #2563EB`, `color: #2563EB`, `font-weight: 600`
  - Pills: "All ({total})", "To Do ({todo_count})", "In Progress ({ip_count})"
  - Counts are live from filtered work items
  - NO "ACTIVE" label prefix
- **Item count:** `font-size: 12.5px`, `color: #334155`, `font-variant-numeric: tabular-nums`, `margin-left: auto`, text: "{n} items"
- NO search bar on Ring or Board. Search ONLY on Chronology (see Component 4).
- NO pagination. NO "Page 1/2".

---

## COMPONENT 3: RING VIEW

**Active when "Ring" tab is selected**

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    [Card 2]                                  │
│       [Card 1]                [Card 3]                       │
│              ╲      ╱  ─── 3d ago ───  ╲                     │
│               ╲    ╱                    ╲                     │
│  [Card 4] ──── [96px Avatar] ──── [Card 5]     ⬤22          │
│               ╱    ╲                    ╱     COMPLETED      │
│              ╱      ╲  ─── 4d ago ───  ╱                     │
│       [Card 6]                [Card 8]                       │
│                    [Card 7]                                  │
└──────────────────────────────────────────────────────────────┘
```

### Data
- Items: `useR360WorkItems(resourceId, { ...weekFilter, pending_only: false })` — show ALL including done
- Orbital cards: first 8 NON-DONE items (status_category !== 'done')
- Completed count: items where status_category === 'done'

### Canvas — CONTAINMENT IS CRITICAL

The ring canvas MUST fully contain all cards, spokes, labels, and the completed badge. Nothing may bleed outside.

```css
#r360-root .r3-ring-canvas {
  position: relative;
  width: 100%;
  height: 720px;          /* FIXED height, NOT min-height */
  overflow: hidden;        /* HARD CLIP — nothing bleeds */
  padding: 20px;
  box-sizing: border-box;
}
```

- `position: relative` — anchor for all absolutely positioned children
- `height: 720px` — FIXED, not `min-height`. This is the bounding box. All card positions are calculated relative to this.
- `overflow: hidden` — HARD CLIP. If any card or spoke exceeds the box, it clips. This prevents bleeding.
- `padding: 20px` — inner buffer so cards don't touch edges

**IMPORTANT:** The orbital cards use `position: absolute` with `top` and `left` in percentages. These percentages are relative to the 720px canvas. ALL card positions MUST resolve to coordinates that keep the ENTIRE card (195px wide × ~160px tall) inside the canvas with at least 10px clearance from edges.

### Center Avatar
- `position: absolute`, `left: 50%`, `top: 48%`, `transform: translate(-50%, -50%)`, `text-align: center`, `z-index: 5`
- **Avatar circle:** `96px × 96px`, `border-radius: 50%`, `border: 3px solid #2563EB`, `box-shadow: 0 0 0 6px rgba(37,99,235,.12)`
  - `src="/admin/users/{slug}/avatar"`, fallback: `background: linear-gradient(135deg, #2563EB, #0D9488)`, white initials `28px 700wt`
- **Name:** below avatar, `font-size: 13px`, `font-weight: 600`, `color: #020617`, `margin-top: 8px`
- **Role:** below name, `font-size: 11px`, `font-weight: 500`, `color: #334155`

### Orbital Card Positions (8 slots)

**All positions are percentage-based within the 720px canvas. Every card (195px × ~155px) must fit entirely inside. No card's bottom edge should exceed ~88% top, no card's right edge should exceed ~82% left.**

```
Slot 0: left:  2%, top:  2%   (top-left)
Slot 1: left: 33%, top:  0%   (top-center)
Slot 2: left: 62%, top:  2%   (top-right)
Slot 3: left:  0%, top: 35%   (middle-left)
Slot 4: left: 65%, top: 33%   (middle-right)
Slot 5: left:  2%, top: 65%   (bottom-left)
Slot 6: left: 33%, top: 68%   (bottom-center)
Slot 7: left: 62%, top: 63%   (bottom-right)
```

**Validation rule at build time:** For each card, check that:
- `top% of 720px + card_height(~155px)` < `720px - 20px padding`
- `left% of canvas_width + 195px` < `canvas_width - 20px padding`
If any card violates, shift its top/left inward until it fits.

### Orbital Card (each)
- `position: absolute`, `width: 195px`, `background: #FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 8px`, `padding: 10px 12px`, `z-index: 3`, `cursor: pointer`
- `box-shadow: 0 1px 3px rgba(15,23,42,.05)`
- Hover: `border-color: #94A3B8`, `box-shadow: 0 3px 10px rgba(15,23,42,.08)`
- Selected (panel open for this card): `border-color: #2563EB`, `box-shadow: 0 0 0 2px rgba(37,99,235,.15)`
- **3px left accent bar:** `::before` pseudo-element, `content: ''`, `position: absolute`, `left: 0`, `top: 8px`, `bottom: 8px`, `width: 3px`, `border-radius: 0 2px 2px 0`
  - Color: ToDo=`#D97706`, In Progress=`#2563EB`, In Review=`#0D9488`, Blocked=`#EF4444`

#### Card Internal Layout

```
Row 1: [Jira Icon 16px] [TYPE label]            [Priority text]
Row 2: [Key mono blue] [PROJ tag colored]        [Age "3d" colored]
Title: 12.5px 500wt, max 2 lines, clamp
Row 3: [Status Pill with dot]
```

- **Type row:** `display: flex`, `align-items: center`, `gap: 4px`, `margin-bottom: 4px`
  - Jira SVG icon (see A4)
  - Type text: `font-size: 10.5px`, `font-weight: 700`, `text-transform: uppercase`, `color: #334155`
  - Priority: `margin-left: auto`, `font-size: 10.5px`, `font-weight: 500`, `color: #64748B`
- **Key row:** `display: flex`, `align-items: center`, `gap: 6px`, `margin-bottom: 4px`
  - Key: `font-size: 11px`, `font-weight: 600`, `color: #2563EB`, `font-family: 'JetBrains Mono', monospace`
  - Project tag: `font-size: 10px`, `font-weight: 700`, `padding: 2px 6px`, `border-radius: 3px`, `color: #FFFFFF`, `background: R360_PROJECT_COLORS[project_key]`
  - Age: `margin-left: auto`, `font-size: 11px`, `font-weight: 600`
    - Color: green(≤7d)=`#16A34A`, amber(8-14d)=`#D97706`, red(>14d)=`#EF4444`
    - Text: `"{age_days}d"`
- **Title:** `font-size: 12.5px`, `font-weight: 500`, `color: #020617`, `line-height: 1.35`, `margin-bottom: 6px`
  - `-webkit-line-clamp: 2`, `overflow: hidden`, `display: -webkit-box`, `-webkit-box-orient: vertical`
- **Status pill:** `display: inline-flex`, `align-items: center`, `gap: 4px`, `padding: 3px 10px`, `border-radius: 4px`, `font-size: 11.5px`, `font-weight: 600`
  - Dot: `6px × 6px`, `border-radius: 50%`, `background: status_dot`
  - Background: `status_bg`, Color: `status_color`

### SVG Spokes (connecting center to cards)
- `<svg>` element: `position: absolute`, `inset: 0`, `width: 100%`, `height: 100%`, `z-index: 1`, `pointer-events: none`, `overflow: hidden`
- For each visible card, draw a `<line>`:
  - `stroke: #94A3B8`, `stroke-width: 2`, `stroke-dasharray: 8 5`, `stroke-linecap: round`
  - From: center point (50%, 48% of canvas)
  - To: card center (approximately `card_left + 10%`, `card_top + 10%`)
- The SVG is clipped by the canvas `overflow: hidden` — no spokes bleed outside

### Spoke Midpoint Age Labels
- For each spoke, place a label at the midpoint between center and card
- `position: absolute`, `z-index: 4`, `transform: translate(-50%, -50%)`
- `font-size: 11px`, `font-weight: 600`, `color: #334155`, `background: #F8FAFC`, `padding: 2px 8px`, `border-radius: 10px`, `border: 1px solid #E2E8F0`, `white-space: nowrap`
- Text: `"{age_days}d ago"`
- Labels must also stay within the canvas bounds (clipped by `overflow: hidden`)

### Completed Badge
- `position: absolute`, `right: 20px`, `top: 48%`, `transform: translateY(-50%)`, `z-index: 6`, `text-align: center`
- **Circle:** `48px × 48px`, `border-radius: 50%`, `background: #16A34A`, `color: #FFFFFF`, `font-size: 18px`, `font-weight: 700`
  - `display: flex`, `align-items: center`, `justify-content: center`
  - `box-shadow: 0 2px 8px rgba(22,163,74,.3)`
  - Value: count of items with status_category === 'done'
- **Label text:** below circle, `font-size: 9.5px`, `font-weight: 700`, `color: #14532D`, `text-transform: uppercase`, `letter-spacing: .05em`, `writing-mode: vertical-rl`, `margin-top: 6px`
  - Text: "COMPLETED"

### Ring Rules
- NO tooltips on hover. Click card → opens Detail Panel.
- NO search bar.
- NO pagination.
- Max 8 orbital cards. If fewer than 8 non-done items, show only those. If zero, show empty state.
- **STATUS COLOR ENFORCEMENT:** The current build has GREEN dots on To Do and In Progress pills. This is WRONG. Correct colors:
  - To Do pill: dot=`#D97706` (AMBER), bg=`#FFFBEB`, text=`#78350F`
  - In Progress pill: dot=`#2563EB` (BLUE), bg=`#EFF6FF`, text=`#1E3A5F`
  - Done pill: dot=`#16A34A` (GREEN), bg=`#F0FDF4`, text=`#14532D`
  - Blocked pill: dot=`#EF4444` (RED), bg=`#FEF2F2`, text=`#7F1D1D`
  - GREEN is ONLY for Done. AMBER is for To Do. BLUE is for In Progress. RED is ONLY for Blocked.
  - These colors come from `R360_STATUS_MAP` — enforce in CSS with `!important` if Catalyst overrides.

---

## COMPONENT 4: CHRONOLOGY VIEW

**Active when "Chronology" tab is selected**

### Layout

```
│  🔍 Search tickets...                                      │ ← search bar
│                                                             │
│  ● Today, Feb 22                    3 items  ████░░░  ▾    │ ← date header
│  │                                                          │
│  │  ┌─[BUG]─ BAU-5007 [BAU] ──────── 👤 Yazeed ● ToDo 3d ─┐│ ← item card
│  │  │  CRs Dashboard – The system shall...                  ││
│  │  │  ↳ BAU-4973 CRs Dashboard                            ││
│  │  └──────────────────────────────────────────────────────┘│
│  │                                                          │
│  │  ┌─[BUG]─ BAU-4995 [BAU] ──────── 👤 Yazeed ● IP 3d  ──┐│
│  │  │  Individual Dashboard – Licenses section...           ││
│  │  │  ↳ BAU-4970 Individual Dashboard                     ││
│  │  └──────────────────────────────────────────────────────┘│
│  │                                                          │
│  ○ Fri, Feb 21                      4 items  ██░░░░░  ▾    │
│  │                                                          │
│  │  ┌─ ... more cards ... ─┐                                │
│  │                                                          │
│  ○ Thu, Feb 20                      2 items  █░░░░░░  ▾    │
```

### Search Bar (Chronology ONLY)
- Appears above the timeline, below the week nav
- `width: 280px`, `height: 36px`, `padding: 0 12px 0 34px`, `font-size: 13px`, `border: 1px solid #E2E8F0`, `border-radius: 8px`, `background: #FFFFFF`
- Lucide Search icon at `left: 10px`, `14px`, `color: #64748B`
- Placeholder: "Search tickets..."
- Focus: `border-color: #2563EB`, `box-shadow: 0 0 0 3px rgba(37,99,235,.1)`
- Filters `useR360WorkItems` by `summary ILIKE %search%`

### Timeline Line
- `position: absolute`, `left: 15px`, `top: 28px`, `bottom: 20px`, `width: 2px`, `background: #E2E8F0`, `border-radius: 1px`
- Container for timeline items: `position: relative`, `padding-left: 0`

### Date Group Header
- `display: flex`, `align-items: center`, `gap: 12px`, `padding: 10px 0 8px`, `cursor: pointer`, `position: relative`
- **Date dot:** `10px × 10px`, `border-radius: 50%`, `margin-left: 10px`, `position: relative`, `z-index: 3`, `flex-shrink: 0`
  - **Today:** `background: #2563EB`, `border: 2px solid #2563EB` (FILLED BLUE)
  - **Yesterday:** `background: #334155`, `border: 2px solid #334155` (FILLED DARK)
  - **Older dates:** `background: #FFFFFF`, `border: 2px solid #64748B` (OUTLINED HOLLOW)
- **Date label:** `font-size: 14px`, `font-weight: 600`, `color: #0F172A`
- **Count badge:** `font-size: 11.5px`, `font-weight: 600`, `color: #334155`, `background: #F1F5F9`, `padding: 2px 8px`, `border-radius: 10px`
  - Text: "{count} items"
- **Progress mini-bar:** `display: flex`, `height: 4px`, `border-radius: 2px`, `width: 80px`, `background: #F1F5F9`, `overflow: hidden`
  - Stacked segments proportional to status counts in this date group:
  - Done segment: `background: #16A34A`
  - In Progress segment: `background: #2563EB`
  - To Do segment: `background: #D97706`
  - Blocked segment: `background: #EF4444`
- **Collapse chevron:** Lucide ChevronDown `16px`, `color: #64748B`
  - When collapsed: `transform: rotate(-90deg)`
  - `transition: transform .2s ease`
- **Click header → toggles collapse.** Items below hide/show with slide animation.

### Date Group: How to compute
- Group work items by `group_date` (Riyadh timezone date from `updated_at`)
- Sort groups descending (newest first)
- Each group has: `date_label`, list of items, status counts for mini-bar

### Item Cards (inside each date group)
- Container: `padding-left: 36px`, `display: flex`, `flex-direction: column`, `gap: 8px`, `padding-bottom: 8px`
- Each card: `display: flex`, `align-items: flex-start`, `gap: 10px`, `padding: 10px 14px`, `background: #FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 8px`, `cursor: pointer`, `position: relative`
- Hover: `border-color: #94A3B8`, `box-shadow: 0 1px 4px rgba(15,23,42,.06)`
- Hover title: `color: #2563EB`
- **3px left accent bar:** same as Ring cards — `::before` pseudo, status-colored

#### Card Structure (Left to Right)

```
[Jira Icon 24×24]  |  [Key] [PROJ tag]                |  [Avatar 20px] [Name] [Status Pill] [Age]
                    |  Title (14px, 2-line clamp)       |
                    |  ↳ ParentKey ParentTitle          |
```

- **Icon container:** `24px × 24px`, `display: flex`, `align-items: center`, `justify-content: center`, `flex-shrink: 0`
  - Renders the appropriate Jira SVG icon from `getJiraIcon(item_type)` at 16px
- **Content block:** `flex: 1`, `min-width: 0`
  - **Top line:** `display: flex`, `align-items: center`, `gap: 6px`, `margin-bottom: 3px`
    - Key: `font-size: 12.5px`, `font-weight: 600`, `color: #2563EB`, `font-family: 'JetBrains Mono', monospace`
    - Project tag: `font-size: 10px`, `font-weight: 700`, `padding: 2px 6px`, `border-radius: 3px`, `color: white`, `background: R360_PROJECT_COLORS[project_key]`
  - **Title:** `font-size: 14px`, `font-weight: 500`, `color: #020617`, `line-height: 1.35`
    - `-webkit-line-clamp: 2`, overflow hidden
  - **Parent reference** (if `parent_key` exists):
    - `font-size: 12px`, `color: #334155`, `font-weight: 500`, `margin-top: 3px`
    - Format: `"↳ {parent_key} {parent_title}"`
    - Parent key: `font-family: 'JetBrains Mono'`, `font-size: 11px`, `color: #64748B`
    - Parent title: truncated at 40 chars
- **Right meta:** `display: flex`, `align-items: center`, `gap: 8px`, `flex-shrink: 0`, `margin-left: auto`
  - **Avatar:** `20px × 20px`, `border-radius: 50%`, `src="/admin/users/{slug}/avatar"`, fallback initials `8px`
  - **Assignee name:** `font-size: 12.5px`, `font-weight: 500`, `color: #334155`, truncated at 12 chars
  - **Status pill:** same as Ring (dot + label, colored)
  - **Age badge:** `font-size: 12px`, `font-weight: 600`, color by threshold (green/amber/red), text: `"{age_days}d"`

### Click card → opens Detail Panel.

---

## COMPONENT 5: BOARD VIEW

**Active when "Board" tab is selected**

### Layout

```
┌───────────────────┬───────────────────┬───────────────────┐
│ ● TO DO       (9) │ ● IN PROGRESS (3) │ ● DONE        (6) │
│───────────────────│───────────────────│───────────────────│
│ ┌───────────────┐ │ ┌───────────────┐ │ ┌───────────────┐ │
│ │ BAU-5007 [BAU]│ │ │ BAU-4995 [BAU]│ │ │ BAU-4799 [BAU]│ │
│ │ CRs Dashboard │ │ │ Individual... │ │ │ License Pg... │ │
│ │ — Med    👤 YZ│ │ │ ↑↑ High  👤 YZ│ │ │ — Med    👤 AA│ │
│ └───────────────┘ │ └───────────────┘ │ └───────────────┘ │
│ ┌───────────────┐ │                   │ ┌───────────────┐ │
│ │ BAU-5006 [BAU]│ │                   │ │ ...           │ │
│ │ Individual... │ │                   │ │               │ │
│ └───────────────┘ │                   │ └───────────────┘ │
│ ...               │                   │ ...               │
└───────────────────┴───────────────────┴───────────────────┘
```

### Column Mapping
- **To Do:** items where `status_category` is `'to_do'`
- **In Progress:** items where `status_category` is `'in_progress'` OR `'in_qa'`
- **Done:** items where `status_category` is `'done'`
- Blocked items go into To Do column but with red accent bar

### Grid
- `display: grid`, `grid-template-columns: 1fr 1fr 1fr`, `gap: 20px`, `align-items: start`
- At `max-width: 1100px`: `grid-template-columns: 1fr` (single column stacked)

### Column Header
- `display: flex`, `align-items: center`, `gap: 8px`, `padding-bottom: 10px`, `margin-bottom: 10px`, `border-bottom: 2px solid {column_color}`
- **Dot:** `8px × 8px`, `border-radius: 50%`
  - To Do: `background: #D97706`
  - In Progress: `background: #2563EB`
  - Done: `background: #16A34A`
- **Title:** `font-size: 12px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: .04em`, `color: #0F172A`
- **Count circle:** `22px × 22px`, `border-radius: 50%`, `display: flex`, `align-items: center`, `justify-content: center`, `font-size: 11px`, `font-weight: 700`, `color: #FFFFFF`, `margin-left: auto`
  - To Do: `background: #D97706`
  - In Progress: `background: #2563EB`
  - Done: `background: #16A34A`

### Board Cards
- `background: #FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 8px`, `padding: 12px`, `cursor: pointer`, `position: relative`, `margin-bottom: 8px`
- Hover: `border-color: #94A3B8`, `box-shadow: 0 2px 6px rgba(15,23,42,.06)`
- **3px left accent bar:** `::before` pseudo, status-colored (same as Ring/Chronology)

#### Card Structure

```
[Key mono blue] [PROJ tag]              [Age colored]
Title (13.5px, 2-line clamp)
[Priority dot + label]            [Avatar 16px] [Name]
```

- **Top row:** `display: flex`, `align-items: center`, `gap: 6px`, `margin-bottom: 4px`
  - Key: `font-size: 12.5px`, `font-weight: 600`, `color: #2563EB`, `font-family: 'JetBrains Mono', monospace`
  - Project tag: colored, same as Ring
  - Age: `margin-left: auto`, `font-size: 11px`, `font-weight: 600`, colored by threshold
- **Title:** `font-size: 13.5px`, `font-weight: 500`, `color: #020617`, `line-height: 1.35`, `margin-bottom: 8px`
  - `-webkit-line-clamp: 2`, overflow hidden
- **Bottom row:** `display: flex`, `align-items: center`, `justify-content: space-between`
  - **Priority:** `display: flex`, `align-items: center`, `gap: 4px`
    - Dot: `6px × 6px`, `border-radius: 50%`
      - Highest/Critical: `background: #EF4444`
      - High: `background: #D97706`
      - Medium: `background: #D97706`
      - Low: `background: #64748B`
    - Label: `font-size: 12px`, `font-weight: 500`, `color: #334155`
  - **Assignee:** `display: flex`, `align-items: center`, `gap: 4px`
    - Avatar: `16px × 16px`, `border-radius: 50%`, `src="/admin/users/{slug}/avatar"`, fallback initials `7px`
    - Name: `font-size: 12.5px`, `font-weight: 500`, `color: #334155`, truncated at 10 chars

### Click card → opens Detail Panel.

---

## COMPONENT 6: DETAIL PANEL

**Opens when clicking any card in Ring, Chronology, or Board**

### Layout

```
┌─────────────────────────────────────────┐ ← position: fixed
│ BAU-5005                            [✕] │    top: 0, right: 0
│ ● To Do  Medium  ⬤ Bug  [BAU]          │    bottom: 0
│ Individual Dashboard – Requests Page... │    width: 460px
├─────────────────────────────────────────┤
│ PROJECT        │ ASSIGNER              │
│ BAU – Platform │ 👤 Adnan Ali          │ ← Meta Grid 2×3
├────────────────┼───────────────────────┤
│ ASSIGNED       │ DAYS SITTING          │
│ 3d ago         │ 3 ████░░░░           │
│ Feb 22, 2026   │                      │
├────────────────┼───────────────────────┤
│ RELEASE        │ DUE                   │
│ v2.4.1         │ Mar 1, 2026          │
├─────────────────────────────────────────┤
│ HIERARCHY                               │
│ [Epic] BAU-4970 Individual Dashboard   │
│   ↳                                     │
│ [Bug] BAU-5005 Current        (blue bg)│
├─────────────────────────────────────────┤
│ SIBLINGS                     0/11 done  │
│ BAU-5007 ● To Do  CRs Dashboard...  3d │
│ BAU-5006 ● To Do  Individual Das... 2d │
│ BAU-5005 ● To Do  Individual Das... 2d │ ← current (blue bg)
│ BAU-5004 ● To Do  Individual Das... 2d │
│ BAU-5003 ● To Do  Individual Das... 3d │
│ ...more rows...                         │
└─────────────────────────────────────────┘
```

### Panel Container
- `position: fixed`, `top: 0`, `right: 0`, `bottom: 0`, `width: 460px`
- `background: #FFFFFF`, `border-left: 1px solid #E2E8F0`, `z-index: 201`
- `display: flex`, `flex-direction: column`, `overflow: hidden`
- **Slide animation:** `transform: translateX(100%)` → `translateX(0)`, `transition: transform .25s cubic-bezier(.4,0,.2,1)`
- Inner body: `overflow-y: auto`, `flex: 1`

### Overlay
- `position: fixed`, `inset: 0`, `background: rgba(15,23,42,.15)`, `z-index: 200`
- Click overlay → close panel
- ESC key → close panel (add `useEffect` with keydown listener)

### Panel Header
- `padding: 16px 20px`, `border-bottom: 1px solid #E2E8F0`
- **Top row:** `display: flex`, `justify-content: space-between`, `align-items: center`, `margin-bottom: 8px`
  - Key: `font-size: 14px`, `font-weight: 700`, `color: #2563EB`, `font-family: 'JetBrains Mono', monospace`
  - Close button: `28px × 28px`, `border: 1px solid #E2E8F0`, `border-radius: 6px`, `background: #FFFFFF`, `display: flex`, `align-items: center`, `justify-content: center`, `cursor: pointer`
    - Lucide X icon `14px`, `color: #64748B`
    - Hover: `border-color: #94A3B8`, `color: #0F172A`
- **Pills row:** `display: flex`, `gap: 6px`, `flex-wrap: wrap`, `margin-bottom: 10px`
  - **Status pill:** dot + label, colored from data (same styling as card pills)
  - **Priority badge:** `font-size: 10.5px`, `font-weight: 600`, `padding: 2px 8px`, `border-radius: 4px`, `background: #F1F5F9`, `color: #334155`
    - Highest/Critical: `background: #FEF2F2`, `color: #7F1D1D`
  - **Type badge:** Jira icon + type text, `font-size: 10.5px`, `font-weight: 600`, `padding: 2px 8px`, `border-radius: 4px`, `background: type_bg_color`, `color: type_color`
  - **Project tag:** colored, same as cards
- **Title:** `font-size: 16px`, `font-weight: 600`, `color: #020617`, `line-height: 1.4`
- **NO "Open in Hub" button. NO "Copy Key" button.**

### Meta Grid (2×3)
- `display: grid`, `grid-template-columns: 1fr 1fr`, `border-bottom: 1px solid #E2E8F0`
- Each cell: `padding: 12px 20px`, `border-bottom: 1px solid #F1F5F9`
- Odd-numbered cells (left column): `border-right: 1px solid #F1F5F9`
- **Label:** `font-size: 10.5px`, `font-weight: 600`, `color: #64748B`, `text-transform: uppercase`, `letter-spacing: .04em`, `margin-bottom: 4px`
- **Value:** `font-size: 13px`, `font-weight: 500`, `color: #020617`

#### Cell 1 — Project
- Label: "PROJECT"
- Value: `project_name` (e.g., "BAU – Platform Maintenance")

#### Cell 2 — Assigner
- Label: "ASSIGNER"
- Value: `reporter_name` (from `ph_issues.reporter_display_name` — the Jira reporter)
- Render: `18px` avatar + name
- Avatar: `/admin/users/{slugify(reporter_name)}/avatar`, fallback initials

#### Cell 3 — Assigned
- Label: "ASSIGNED"
- Value: `"{age_days}d ago"`, colored by threshold (green ≤7d, amber 8-14d, red >14d)
- Sub-text: formatted date from `created_at`, `font-size: 11px`, `color: #334155`

#### Cell 4 — Days Sitting
- Label: "DAYS SITTING"
- Value: age number, colored by threshold
- **Progress bar:** `60px × 4px`, `border-radius: 2px`, `background: #F1F5F9`
  - Fill: `width: min(age_days / 21 * 100, 100)%`, `border-radius: 2px`
  - Fill color: green(≤7d)=`#16A34A`, amber(8-14d)=`#D97706`, red(>14d)=`#EF4444`

#### Cell 5 — Release
- Label: "RELEASE"
- Value: `fix_version` if it exists (e.g., "v2.4.1")
- If null AND `item_type === 'Sub-task'`: show "Inherited from {parent_key}" in `color: #2563EB`, `font-size: 12px`
- If null and NOT subtask: show "—" in `color: #64748B`

#### Cell 6 — Due
- Label: "DUE"
- Value: formatted `due_date` (e.g., "Mar 1, 2026")
- Same inheritance rule as Release: if null subtask → "Inherited from {parent_key}"
- If null and not subtask → "—"

### Hierarchy Section
- `padding: 16px 20px`, `border-bottom: 1px solid #F1F5F9`
- **Section title:** `font-size: 11px`, `font-weight: 700`, `color: #334155`, `text-transform: uppercase`, `letter-spacing: .05em`, `margin-bottom: 10px`
- Shows parent → current chain:
- **Parent row** (if `parent_key` exists):
  - `display: flex`, `align-items: center`, `gap: 6px`, `padding: 6px 8px`, `border-radius: 6px`
  - Jira Epic icon `16px`
  - Key: `11px mono #64748B`
  - Title: `12px #334155`, truncated 35 chars
- **Arrow connector:** `↳` character, `padding-left: 20px`, `color: #64748B`, `font-size: 11px`, `margin: 2px 0`
- **Current item row:**
  - Same layout as parent, BUT with:
  - `border: 1.5px solid #2563EB`, `background: #EFF6FF`, `border-radius: 6px`, `padding: 6px 8px`
  - Key in `color: #2563EB`

### Siblings Section
- `padding: 16px 20px`, `flex: 1`, `overflow-y: auto`
- **Section header:** `display: flex`, `justify-content: space-between`, `align-items: center`, `margin-bottom: 10px`
  - Title: "SIBLINGS" same styling as Hierarchy title
  - **Completion counter:** `font-size: 12px`, `font-weight: 600`, `color: #334155`, `background: #F1F5F9`, `padding: 2px 8px`, `border-radius: 10px`
    - Text: `"{done_count}/{total} done"` — e.g., "0/11 done"
- **Data:** `useR360Siblings(parent_key)` — items sharing the same `parent_key`
- **Sibling rows:** `display: flex`, `align-items: center`, `gap: 8px`, `padding: 7px 10px`, `border-radius: 6px`, `cursor: pointer`, `border: 1px solid transparent`, `margin-bottom: 2px`
  - **Key:** `font-size: 11px`, `font-family: 'JetBrains Mono'`, `color: #2563EB`, `width: 72px`, `flex-shrink: 0`
  - **Status pill:** small version — `padding: 2px 6px`, `font-size: 10.5px`, `border-radius: 3px`, dot `5px`
  - **Title:** `font-size: 12px`, `font-weight: 500`, `color: #020617`, `flex: 1`, `min-width: 0`, truncated with ellipsis
  - **Avatar:** `16px` circle, assignee avatar
  - **Age:** `font-size: 11px`, `font-weight: 600`, colored by threshold, text `"{age_days}d"`
- **Current item row:** `background: #EFF6FF`, `border-color: #2563EB`
- **Hover other rows:** `background: #F8FAFC`
- **Click sibling → panel refreshes with that item's data** (re-fetch details, update panel state)
- **Read-only panel. All Jira items locked. No edit actions anywhere.**

---

# STAGE D — DATABASE WIRING

Every visible data point must come from Supabase. ALL must be ✅ before Stage E.

| # | Data Point | Source | Query |
|---|-----------|--------|-------|
| 1 | Resource name | `resource_inventory.resource_name` | `select where id=:resourceId` |
| 2 | Resource role | `resource_inventory.role_name` (canonical, NOT profiles) | same |
| 3 | Resource department | `resource_inventory.department` | same |
| 4 | KPI: Open | `vw_wh_resource_360.open_items` | `select where resource_id=:resourceId` |
| 5 | KPI: Stale | `vw_wh_resource_360.stale_items` | same |
| 6 | Work items | `ph_issues` + `ph_projects` join | `select where assignee_display_name=:name` |
| 7 | Item key | `ph_issues.jira_key` | already in query |
| 8 | Status display | `ph_issues.status` → `R360_STATUS_MAP` client lookup | client-side |
| 9 | Project name/key | `ph_projects.name`, `.project_key` via join | already in query |
| 10 | Assignee | `ph_issues.assignee_display_name` | already in query |
| 11 | Assigner (panel) | `ph_issues.reporter_display_name` (Jira reporter) | already in query |
| 12 | Release (panel) | `ph_issues.fix_versions[0].name` | already in query |
| 13 | Due date (panel) | `ph_issues.due_date` | already in query |
| 14 | Parent key/title | `ph_issues.parent_key`, `.parent_summary` | already in query |
| 15 | Siblings | `ph_issues where parent_key=:key` | separate query |
| 16 | Date grouping | Computed from `ph_issues.updated_at` in Riyadh TZ | client-side |
| 17 | Age | Computed from `ph_issues.created_at` vs now | client-side |

**Subtask Rule:** If `item_type === 'Sub-task'` and `fix_version === null` → show "Inherited from {parent_key}". Same for `due_date`.

**Jira Lock:** All items from `ph_issues` are read-only (`is_jira_locked`). No edit UI anywhere.

**ZERO hardcoded arrays in production. Every data point from database or computed from database fields.**

---

# STAGE E — QA & POLISH

## Cycle 1: Edge Cases
- [ ] **Loading:** Skeleton screens for profile header, all 3 views, panel content
- [ ] **Empty:** "No work items found" centered with muted icon when zero items
- [ ] **Error:** Inline "Failed to load" + retry button
- [ ] **Null release/due:** Shows "Inherited from {parent_key}" for subtasks, "—" for others
- [ ] **Long titles:** 200+ chars → clamp at 2 lines with ellipsis, no overflow
- [ ] **Zero KPIs:** Open=0 and Stale=0 render correctly (not blank)
- [ ] **Age boundaries:** 7d→green, 8d→amber, 14d→amber, 15d→red

## Cycle 2: Design Compliance
- [ ] **✦ Intelligence = BLUE** `#2563EB` (NOT purple)
- [ ] **ToDo = AMBER** pills — dot `#D97706`, bg `#FFFBEB`, text `#78350F`. NOT GREEN. NOT navy. NOT red.
- [ ] **In Progress = BLUE** pills — dot `#2563EB`, bg `#EFF6FF`, text `#1E3A5F`. NOT GREEN.
- [ ] **Done = GREEN** — the ONLY status that uses green. dot `#16A34A`, bg `#F0FDF4`.
- [ ] **Blocked = RED** — the ONLY status that uses red. dot `#EF4444`, bg `#FEF2F2`.
- [ ] **If Catalyst V11 overrides status pill colors, add `!important` to force correct colors.** Inspect the rendered DOM. If dots appear green when they should be amber/blue, the Catalyst theme is bleeding in. Fix with scoped `#r360-root` CSS overrides.
- [ ] **Ring canvas `overflow: hidden`** — no cards/spokes bleed past container. Canvas height is FIXED `720px`.
- [ ] Body text `14px` Inter (or system sans)
- [ ] **3px left accent bars** on ALL cards in ALL views (Ring, Chronology, Board)
- [ ] **Jira SVG icons** (Bug=red circle, Task=blue check, Story=green bolt, Epic=purple bolt) — NOT emoji, NOT text
- [ ] Avatars from `/admin/users/{slug}/avatar` with gradient fallback
- [ ] Ring-fenced CSS under `#r360-root` — zero Catalyst V11 bleed

## Cycle 3: Integration
- [ ] **Navigation:** Click row in existing `/project-hub/resources` → detail page → Back button returns to listing
- [ ] **Panel:** Slide-in animation, ESC close, overlay click close, sibling switching
- [ ] **Tab persistence:** Switching tabs keeps panel closed state. Reopening panel shows correct item.
- [ ] **Responsive:** 1400px (compact), 1100px (board→single col), 900px (ring stacks vertically)
- [ ] **No Catalyst V11 style bleeding** into `#r360-root` scoped content

## Target: ≥9.5/10 across all CG metrics
