---
branch: BAU-filters-01
branch_id: 01
project: BAU
menu: filters
component: filters
status: planning
progress: 0
phase: planning_complete
created: 2026-05-21T19:57:00Z
last_saved: 2026-05-21T19:57:00Z
saved_by: claude-code
estimated_completion: 2026-05-23
---

# BAU-filters-01 — Filters Module Planning Handover

> **PLANNING CONVERSATION ONLY — NO CODE WRITTEN**
> Execution starts in the NEXT conversation by pasting this block.
> Branch `BAU-filters-01` does NOT exist yet — create it at the start of execution.

---

## Task

Build a complete **Filters module** for Catalyst that matches and exceeds Jira's `/jira/filters` surface. The module lives in two hubs:

- **Project Hub**: `/project-hub/:key/filters` — scoped to `ph_issues`
- **Product Hub**: `/product-hub/filters` — scoped to `business_requests`

Both hubs get the same UI shell with hub-aware query scoping.

---

## Design System Probe Results (2026-05-21 — AUTHORITATIVE)

> **CRITICAL: These are live-resolved CSS variable values from the running Catalyst app.**
> All implementation MUST use `var(--ds-*)` tokens — never hardcode any of the hex values below.
> The hex values are shown purely for reference (what the tokens resolve to in light mode).

### Color Tokens — Actual Resolved Values

| Token | Resolved hex | Use case |
|---|---|---|
| `var(--ds-text)` | `#292A2E` | Primary body text, table cells, labels |
| `var(--ds-text-subtle)` | `#505258` | Table column headers, secondary labels |
| `var(--ds-text-subtlest)` | `#6B6E76` | Placeholder text, metadata, timestamps |
| `var(--ds-text-inverse)` | `#FFFFFF` | Text on colored backgrounds (buttons) |
| `var(--ds-text-brand)` | `#1868DB` | Brand text emphasis |
| `var(--ds-text-selected)` | `#1868DB` | Selected state text |
| `var(--ds-text-danger)` | `#AE2E24` | Error messages, delete labels |
| `var(--ds-text-warning)` | `#9E4C00` | Warning text |
| `var(--ds-text-success)` | `#4C6B1F` | Success text, "Healthy" badge |
| `var(--ds-text-discovery)` | `#803FA5` | Discovery/AI accent text |
| `var(--ds-text-information)` | `#1558BC` | Info text |
| `var(--ds-link)` | `#1868DB` | Hyperlinks, filter name links |
| `var(--ds-link-pressed)` | `#1558BC` | Pressed/active link |
| `var(--ds-surface)` | `#FFFFFF` | Page background, cards, sidebar |
| `var(--ds-surface-overlay)` | `#FFFFFF` | Modals, dropdowns |
| `var(--ds-surface-sunken)` | `#F8F8F8` | Table header background, recessed areas |
| `var(--ds-background-neutral)` | `rgba(5,21,36,0.059)` | Neutral fills (very subtle) |
| `var(--ds-background-neutral-subtle)` | `transparent` | Default row bg |
| `var(--ds-background-neutral-subtle-hovered)` | `rgba(5,21,36,0.059)` | Row hover |
| `var(--ds-background-neutral-hovered)` | `rgba(11,18,14,0.141)` | Stronger hover |
| `var(--ds-background-selected)` | `#E9F2FE` | Selected rows, active nav |
| `var(--ds-background-selected-hovered)` | `#CFE1FD` | Selected row hover |
| `var(--ds-background-information)` | `#E9F2FE` | Info banners, CATY response card |
| `var(--ds-background-success)` | `#EFFFD6` | Success badges, "Healthy" chip bg |
| `var(--ds-background-discovery)` | `#F8EEFE` | AI/discovery panel bg |
| `var(--ds-background-warning)` | `#FFF5DB` | Warning banners |
| `var(--ds-background-danger)` | `#FFECEB` | Error/danger banners |
| `var(--ds-background-brand-bold)` | `#1868DB` | Primary buttons, active nav indicator |
| `var(--ds-background-brand-bold-hovered)` | `#1558BC` | Primary button hover |
| `var(--ds-border)` | `rgba(11,18,14,0.141)` | Default borders (very subtle) |
| `var(--ds-border-subtle)` | see border | Hairline table borders |
| `var(--ds-border-focused)` | `#4688EC` | Input focus ring |
| `var(--ds-border-input)` | `#8C8F97` | Input idle border |
| `var(--ds-border-selected)` | `#1868DB` | Selected element border |
| `var(--ds-border-brand)` | `#1868DB` | Brand-colored borders |
| `var(--ds-border-danger)` | `#E2483D` | Error input border |
| `var(--ds-icon)` | `#292A2E` | Default icon color |
| `var(--ds-icon-subtle)` | `#505258` | Subtle icon color |
| `var(--ds-icon-brand)` | `#1868DB` | Brand icon color |
| `var(--ds-icon-success)` | `#6A9A23` | Success icon |
| `var(--ds-icon-danger)` | `#C9372C` | Danger icon |
| `var(--ds-icon-warning)` | `#E06C00` | Warning icon |
| `var(--ds-shadow-overlay)` | `0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F` | Modal/dropdown shadows |

### Typography Tokens

```css
/* Font weights — always use these variables, never bare numbers */
--ds-font-weight-regular: 400
--ds-font-weight-medium:  500
--ds-font-weight-semibold: 600
--ds-font-weight-bold:    653   /* Jira-specific — NOT a typo */

/* Spacing tokens */
--ds-space-050: 0.25rem  = 4px
--ds-space-100: 0.5rem   = 8px
--ds-space-200: 1rem     = 16px
--ds-space-300: 1.5rem   = 24px
--ds-space-400: 2rem     = 32px
```

### Live Typography Probe (from backlog page, computed styles)

| Element | font-size | font-weight | color token |
|---|---|---|---|
| Table `<th>` | 12px | 600 (`--ds-font-weight-semibold`) | `var(--ds-text-subtle)` |
| Table `<td>` | 13px | 500 (`--ds-font-weight-medium`) | `var(--ds-text)` |
| Table header `<th>` background | — | — | `var(--ds-surface-sunken)` |
| Table header border | 0.556px solid | — | `rgba(5,21,36,0.06)` → `var(--ds-border)` |
| Table row height | ~54px | — | (close to 56px Jira benchmark) |
| Page `<h1>` | 36px | 600 | `var(--ds-text)` |
| Section `<h2>` | 20px | 600 | `var(--ds-text)` |
| Sidebar background | — | — | `var(--ds-surface)` |
| Sidebar text | — | — | `var(--ds-text)` |

### Critical Corrections vs Mockup

| What mockup used | Correct token | Notes |
|---|---|---|
| `#0C66E4` | `var(--ds-background-brand-bold)` → `#1868DB` | Completely different blue |
| `#172B4D` | `var(--ds-text)` → `#292A2E` | CLAUDE.md fallback is stale |
| `#42526E` | `var(--ds-text-subtle)` → `#505258` | CLAUDE.md fallback is stale |
| `#6B778C` | `var(--ds-text-subtlest)` → `#6B6E76` | Slightly different |
| `#DFE1E6` | `var(--ds-border)` → `rgba(11,18,14,0.141)` | Much more subtle |
| `#F4F5F7` | `var(--ds-surface-sunken)` → `#F8F8F8` | For recessed areas |
| `#DEEBFF` | `var(--ds-background-information)` → `#E9F2FE` | Same value, use token |
| `gap: 6px` | `gap: 8px` (--ds-space-100) | Off-grid |
| `padding: 12px` | `padding: 8px` or `16px` | Off-grid |
| Raw `font-weight: 700` | `var(--ds-font-weight-bold)` = `653` | Jira uses 653 |

---

## Screens Designed (Mockup Verified in Browser 2026-05-21)

Six screens were injected and screenshotted at `http://localhost:8080`:

1. **Screen 1 — Filter List**: Sidebar (Starred/My/Shared/Hub scope), `@atlaskit/dynamic-table` with ★ Star, Name (link + JQL snippet), Owner (avatar), Viewers chip, Editors, Starred by count, Used by boards badge, Health indicator, ⋯ kebab menu. Sub-tabs: My filters / Starred / Recent.
2. **Screen 2 — Create: Basic Mode**: Left filter panel (Space, Type, Status, Assignee, Priority, Date range) + right live preview showing generated JQL and matching rows.
3. **Screen 3 — Create: JQL Mode**: Full-width JQL textarea with syntax highlighting, live autocomplete dropdown (Fields / Functions sections), Quick templates row, JQL cheat sheet sidebar.
4. **Screen 4 — Create: Ask CATY**: Rainbow-border input bar (reusing `AskCatyInlineBar`), CATY response card with interpreted JQL + result count, action buttons (Use / Edit in JQL / Refine / 👍👎), rotating prompt suggestions.
5. **Screen 5 — Save Modal**: `@atlaskit/modal-dialog`, Name* field, Description textarea, Viewers radio group (Private / Org / Specific people), Editors people picker with avatar.
6. **Screen 6 — Kanban Integration**: Board wizard step 3 with filter picker dropdown showing saved filters, selected filter preview with result count. "Used by boards" column in filter list links to board management.

> **Mockup sign-off note**: All 6 screens captured via screenshot and reviewed. Colors will be corrected to ADS tokens during execution (mockup used hard-coded hex as a visual aid only).

---

## Feature Scope

### Core (must ship)

- **Filter List page** at `/project-hub/:key/filters` and `/product-hub/filters`
- **Create Filter workspace**: Basic / JQL / Ask CATY modes (tab-switchable)
- **Save Filter modal** with name, description, viewers, editors
- **CRUD via kebab menu**: Copy filter, Make private/public, Change owner, Delete (NO Manage subscriptions)
- **Project Hub left nav**: "Project Filters" nav item added to `SidebarProjectNav.tsx`
- **Product Hub sidebar**: "Filters" added to `buildPerProductConfig()` and `GLOBAL_CONFIG`

### All 10 Outliers (O1–O10)

| # | Outlier | Description |
|---|---|---|
| O1 | **Filter Health Score** | Computed field: "Healthy" (JQL valid, <5 fields, results >0, recently used), "Stale" (unused >30d or 0 results), "Broken" (JQL error) |
| O2 | **CATY-powered JQL** | Natural language → JQL via Claude API. Input: plain English. Output: JQL + explanation + result count. "Refine" loops. "Edit in JQL" hands off. Thumb feedback stored. |
| O3 | **Smart Suggestions** | "Filters similar to yours", "Trending in your team", "AI recommends based on your recent activity" sidebar panels |
| O4 | **Filter analytics** | Usage trend sparkline per filter (last 30 days), last run timestamp, avg result count |
| O5 | **Hub-aware templates** | Project Hub: Epics/Features/Stories/Tasks/QA Bugs/Incidents/CRs. Product Hub: Feature/Gap/Integration/Data Request BRs. Releases: Incidents/defects/fix-versions. Templates are NOT cross-hub. |
| O6 | **Cross-hub filters** | `hub_scope: 'both'` option on Save modal. Filter usable from Project Hub AND Product Hub. JQL field aliases map: `project → product_code`, `issuetype → request_type`. |
| O7 | **JQL Autocomplete** | Tokenizer + AST at `src/lib/jql/`. Field list from `ph_issues` column map. Operator suggestions per field type. Function library (currentUser, startOfWeek, endOfSprint). Error highlighting in textarea. Keyboard nav (↑↓ Enter). |
| O8 | **Subscription-free sharing** | Viewers/Editors permissions without "Manage subscriptions" (explicitly excluded). Owner transfer workflow with confirmation modal. |
| O9 | **Filter version history** | Track last 5 JQL edits per filter with timestamp + user + result count diff. "Restore previous" action. |
| O10 | **Board filter picker in wizard** | Kanban wizard step 3: search saved filters, preview with result count, "Create new filter" CTA. `boards.filter_id FK` → `ph_saved_filters.id`. |

---

## Database Changes Required

### Migration 1: Extend `ph_saved_filters`

```sql
-- Add missing columns to ph_saved_filters
ALTER TABLE ph_saved_filters
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS jql_query TEXT,
  ADD COLUMN IF NOT EXISTS viewers_config JSONB DEFAULT '{"type":"private"}'::jsonb,
  ADD COLUMN IF NOT EXISTS editors_config JSONB DEFAULT '{"type":"owner_only"}'::jsonb,
  ADD COLUMN IF NOT EXISTS starred_by_user_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS used_by_board_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hub_scope TEXT DEFAULT 'project' CHECK (hub_scope IN ('project', 'product', 'both')),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'stale', 'broken'));

-- RLS: allow users to read shared filters
CREATE POLICY "ph_saved_filters_select" ON ph_saved_filters
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_shared = true
    OR auth.uid() = ANY(
      SELECT unnest(ARRAY[owner_id]::uuid[]) 
    )
  );
```

### Migration 2: Add `filter_id` to `boards`

```sql
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS filter_id UUID REFERENCES ph_saved_filters(id) ON DELETE SET NULL;
```

### Migration 3: Filter version history table (O9)

```sql
CREATE TABLE ph_filter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id UUID NOT NULL REFERENCES ph_saved_filters(id) ON DELETE CASCADE,
  jql_query TEXT NOT NULL,
  result_count INTEGER,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
-- Keep last 5 per filter (trigger or application-level)
CREATE INDEX ON ph_filter_versions (filter_id, changed_at DESC);
```

---

## Files to Create / Modify

### New Files

```
src/pages/project-hub/filters/
  FiltersListPage.tsx          — main list page
  CreateFilterPage.tsx         — create workspace (Basic/JQL/CATY tabs)
  FilterDetailPage.tsx         — view/edit existing filter

src/lib/jql/
  tokenizer.ts                 — JQL → token stream
  parser.ts                    — token stream → AST
  translator.ts                — AST → Supabase query
  autocomplete.ts              — field/operator/function suggestions
  fieldMap.ts                  — ph_issues column → JQL field name map
  __tests__/jql.test.ts

src/components/filters/
  FilterListTable.tsx          — @atlaskit/dynamic-table wrapper
  FilterSaveModal.tsx          — save/edit modal
  FilterKebabMenu.tsx          — @atlaskit/dropdown-menu CRUD menu
  FilterHealthBadge.tsx        — health status chip
  FilterTemplatePicker.tsx     — O5 hub-aware template panel
  FilterAnalyticsSpark.tsx     — O4 usage sparkline
  JQLEditor.tsx                — JQL textarea + autocomplete
  JQLAutocompleteDropdown.tsx  — keyboard-nav autocomplete list

src/hooks/workhub/useSavedFilters.ts   — EXTEND (not replace)
  + useStarFilter()
  + useCopyFilter()
  + useChangeFilterOwner()
  + useFiltersForProject(projectKey)
  + useFilterHealth(filterId)
  + useFilterVersions(filterId)
```

### Files to Modify

```
src/components/project-hub/shell/SidebarProjectNav.tsx
  → Add { icon: Filter, label: 'Project Filters', path: 'filters' } to PLANNING_NAV

src/components/layout/ProductHubSidebar.tsx
  → Add 'filters' item to buildPerProductConfig() and GLOBAL_CONFIG

src/App.tsx or FullAppRoutes (whichever has /project-hub routes)
  → Add <Route path="filters" element={<FiltersListPage />} />
  → Add <Route path="filters/create" element={<CreateFilterPage />} />

src/components/boards/KanbanWizard.tsx (or equivalent)
  → Add Step 3: filter picker using useSavedFilters()

supabase/migrations/
  → 20260522_extend_ph_saved_filters.sql
  → 20260522_boards_filter_id.sql
  → 20260522_ph_filter_versions.sql
```

---

## Key Reusable Components (probe-verified, do not rebuild)

| Component | File | How to reuse |
|---|---|---|
| `AskCatyInlineBar` | `src/components/caty/AskCatyInlineBar.tsx` | Pass `projectKey` + `onClose`. Use different `ASK_CATY_PLACEHOLDER_SAMPLES` for filter context |
| `JiraFilterAtlaskit` | `src/components/shared/JiraFilterAtlaskit.tsx` | Full filter drawer. Props: `value, onChange, assignees?, reporters?, fixVersions?, labels?, statuses?, workTypes?` |
| `useSavedFilters` | `src/hooks/workhub/useSavedFilters.ts` | Existing CRUD hooks — extend, don't replace |
| `@atlaskit/dynamic-table` | npm | For filter list table (NOT JiraTable — filters are not work items) |
| `@atlaskit/modal-dialog` | npm | For Save Filter modal |
| `@atlaskit/dropdown-menu` | npm | For kebab menus and all dropdowns |

---

## ADS Component Mapping

```tsx
// Correct token import pattern — use this everywhere
import { token } from '@atlaskit/tokens';

// Examples:
color: token('color.text'),                           // var(--ds-text)
color: token('color.text.subtle'),                    // var(--ds-text-subtle)
color: token('color.text.subtlest'),                  // var(--ds-text-subtlest)
background: token('color.background.brand.bold'),     // var(--ds-background-brand-bold)
background: token('color.background.selected'),       // var(--ds-background-selected)
background: token('elevation.surface.sunken'),        // var(--ds-surface-sunken)
borderColor: token('color.border'),                   // var(--ds-border)
borderColor: token('color.border.input'),             // var(--ds-border-input)
boxShadow: token('elevation.shadow.overlay'),         // var(--ds-shadow-overlay)

// Font weights
fontWeight: token('font.weight.semibold'),  // 600
fontWeight: token('font.weight.bold'),      // 653
fontWeight: token('font.weight.medium'),    // 500

// Spacing — always use multiples of 4px
gap: token('space.100'),      // 8px
gap: token('space.200'),      // 16px
padding: token('space.050'),  // 4px
padding: token('space.100'),  // 8px
padding: token('space.200'),  // 16px
```

---

## JQL Architecture (O2 + O7)

### Tokenizer (`src/lib/jql/tokenizer.ts`)

```
Input: "project = BAU AND status in (Done, Blocked) ORDER BY created DESC"
Output: [
  { type: 'field', value: 'project' },
  { type: 'operator', value: '=' },
  { type: 'value', value: 'BAU' },
  { type: 'keyword', value: 'AND' },
  { type: 'field', value: 'status' },
  { type: 'operator', value: 'in' },
  { type: 'value-list', value: ['Done', 'Blocked'] },
  { type: 'keyword', value: 'ORDER BY' },
  { type: 'field', value: 'created' },
  { type: 'direction', value: 'DESC' },
]
```

### Field Map (`src/lib/jql/fieldMap.ts`)

```typescript
export const JQL_FIELD_MAP = {
  project:     { column: 'project_key',           type: 'string',  operators: ['=', '!=', 'in', 'not in'] },
  issuetype:   { column: 'issue_type',             type: 'string',  operators: ['=', '!=', 'in', 'not in'] },
  status:      { column: 'status',                 type: 'string',  operators: ['=', '!=', 'in', 'not in', 'was', 'changed'] },
  assignee:    { column: 'assignee_display_name',  type: 'user',    operators: ['=', '!=', 'is', 'is not'] },
  reporter:    { column: 'reporter_display_name',  type: 'user',    operators: ['=', '!='] },
  priority:    { column: 'priority',               type: 'string',  operators: ['=', '!=', 'in', 'not in', '<', '>'] },
  created:     { column: 'jira_created_at',        type: 'date',    operators: ['=', '!=', '<', '>', '<=', '>='] },
  updated:     { column: 'jira_updated_at',        type: 'date',    operators: ['=', '!=', '<', '>', '<=', '>='] },
  duedate:     { column: 'due_date',               type: 'date',    operators: ['=', '!=', '<', '>', '<=', '>='] },
  labels:      { column: 'labels',                 type: 'array',   operators: ['=', '!=', 'in', 'not in', 'is', 'is not'] },
  fixVersion:  { column: 'fix_versions',           type: 'array',   operators: ['=', '!=', 'in', 'not in', 'is', 'is not'] },
  sprint:      { column: 'sprint_name',            type: 'string',  operators: ['=', '!=', 'in', 'not in'] },
  resolution:  { column: 'resolution',             type: 'string',  operators: ['=', '!=', 'is', 'is not'] },
};

// JQL functions
export const JQL_FUNCTIONS = {
  'currentUser()':    () => ({ column: 'assignee_user_id', value: auth.uid() }),
  'startOfWeek()':   () => startOfWeek(new Date()).toISOString(),
  'endOfWeek()':     () => endOfWeek(new Date()).toISOString(),
  'startOfMonth()':  () => startOfMonth(new Date()).toISOString(),
  // Date shorthand: -7d, -30d, -1w
  '-Nd':             (n) => subDays(new Date(), n).toISOString(),
};
```

### CATY JQL prompt template (O2)

```typescript
const CATY_JQL_SYSTEM_PROMPT = `
You are a Jira Query Language (JQL) expert for the Catalyst project management tool.
Convert the user's plain English request into valid JQL.

Available fields: project, issuetype, status, assignee, reporter, priority, 
created, updated, duedate, labels, fixVersion, sprint, resolution

Available functions: currentUser(), startOfWeek(), endOfWeek(), startOfMonth()
Date shortcuts: -1d, -7d, -30d, -1w, -4w

Rules:
- Always scope to the current project unless the user says "all projects"
- "me" / "I" / "my" → assignee = currentUser()
- "open" / "unresolved" → resolution = Unresolved
- "blocked" → status = Blocked
- "high priority" → priority in (High, Highest)
- "this sprint" → sprint in openSprints()
- Return ONLY the JQL string, no explanation

Current project: {{projectKey}}
`;
```

---

## Hub-Aware Template Registry (O5)

```typescript
// src/lib/filters/filterTemplates.ts

export type HubType = 'project' | 'product' | 'release' | 'testhub';

export const FILTER_TEMPLATES: Record<HubType, FilterTemplate[]> = {
  project: [
    { name: 'My open items', jql: 'project = {{key}} AND assignee = currentUser() AND resolution = Unresolved' },
    { name: 'High-priority bugs', jql: 'project = {{key}} AND issuetype = "QA Bug" AND priority in (High, Highest) AND status != Done' },
    { name: 'Blocked work', jql: 'project = {{key}} AND status = Blocked' },
    { name: 'Unassigned stories needing triage', jql: 'project = {{key}} AND issuetype = Story AND assignee is EMPTY AND status = "To Do"' },
    { name: 'Production incidents — unresolved', jql: 'project = {{key}} AND issuetype = "Production Incident" AND resolution = Unresolved' },
    { name: 'Epics in progress', jql: 'project = {{key}} AND issuetype = Epic AND status = "In Progress"' },
    { name: 'Due this week', jql: 'project = {{key}} AND duedate >= startOfWeek() AND duedate <= endOfWeek()' },
    { name: 'Change requests awaiting approval', jql: 'project = {{key}} AND issuetype = "Change Request" AND status = "Awaiting Approval"' },
  ],
  product: [
    { name: 'All open feature requests', jql: 'request_type = Feature AND status != Done' },
    { name: 'Gaps needing prioritisation', jql: 'request_type = Gap AND status = "Backlog"' },
    { name: 'Integration requests in progress', jql: 'request_type = Integration AND status = "In Progress"' },
    { name: 'Data requests this quarter', jql: 'request_type = "Data Request" AND created >= startOfMonth(-3)' },
  ],
  release: [
    { name: 'Open incidents this release', jql: 'issuetype = "Production Incident" AND fixVersion = {{version}} AND resolution = Unresolved' },
    { name: 'All items in this fix version', jql: 'fixVersion = {{version}} AND status != Done' },
    { name: 'Defects blocking release', jql: 'issuetype = "QA Bug" AND fixVersion = {{version}} AND priority in (High, Highest) AND resolution = Unresolved' },
  ],
  testhub: [
    { name: 'QA bugs — open', jql: 'issuetype = "QA Bug" AND resolution = Unresolved' },
    { name: 'High severity defects', jql: 'issuetype = "QA Bug" AND priority in (High, Highest)' },
    { name: 'Untriaged bugs', jql: 'issuetype = "QA Bug" AND assignee is EMPTY' },
  ],
};
```

---

## Gaps Not Mentioned by User (Execution Must Address)

| Gap | Decision needed |
|---|---|
| **Pagination** | Dynamic table pagination: 25/50/all rows? Or infinite scroll? |
| **Empty state** | First-time user: illustration + "Create your first filter" CTA |
| **URL state persistence** | Should active tab (My/Starred/Recent) + search query persist in URL params? |
| **Filter delete impact** | If a filter is used by 2 boards, warn before delete: "This filter is used by 2 boards. Deleting will remove it from those boards." |
| **"Copy of" naming** | Copy filter should auto-name as "Copy of [original name]" |
| **People picker for editors** | Need `useProfiles()` or similar hook for user search in Editors field |
| **Avatar fallback** | If `avatar_url` is null, render initials badge with `var(--ds-background-brand-bold)` |
| **Real-time updates** | Should filter list auto-refresh when another user shares/edits? (Supabase realtime channel) |
| **Filter usage tracking** | When should `use_count` and `last_used_at` increment? (Every time filter is applied to a view) |
| **JQL error feedback** | What shows when JQL is invalid? Red border + inline error message below textarea |
| **Mobile responsiveness** | Filter list and create pages at <768px viewport |
| **Dark mode** | All tokens work in dark mode by definition — but test the rainbow CATY border |
| **RLS edge cases** | Can a user see filters shared with their org even if `is_shared=false`? Needs explicit policy review |
| **Default sort** | Filter list default sort: by starred (starred first), then alphabetical? Or by last used? |
| **Filter name uniqueness** | Enforce unique filter names per user, or allow duplicates with different IDs? |

---

## Design Critique Findings (H9 — Pre-Implementation)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 design-critique · 500-IQ COUNCIL PRE-SCAN
Surface: Filters Module Mockup · /project-hub/BAU/filters
Council: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

| Heuristic | Score | Finding | Severity |
|---|---|---|---|
| H4 Consistency | 0 | All mockup colors are hardcoded hex — 100% token violations | P0 |
| H9 Typography | 1 | Brand blue `#0C66E4` used instead of `#1868DB` (`--ds-background-brand-bold`). Text `#172B4D` instead of `#292A2E`. Border `#DFE1E6` instead of `rgba(11,18,14,0.141)`. | P0 |
| H8 Minimalism | 2 | Some spacing off-grid: `gap:6px`, `padding:12px` | P1 |
| H1 System status | 3 | Loading state designed for filter list (skeleton) and CATY response | — |
| H2 Real-world match | 3 | Jira terminology used throughout (JQL, filters, starred, viewers, editors) | — |
| H3 User control | 3 | Cancel/Discard, Escape, back navigation all designed | — |
| H5 Error prevention | 2 | JQL validation shown but filter delete confirmation not designed | P1 |
| H6 Recognition | 3 | Active filters shown as chips, starred state visible, health status at a glance | — |
| H7 Efficiency | 3 | Keyboard shortcuts in JQL editor, CATY for non-technical users, template gallery | — |
| H10 Help & docs | 2 | Empty state not fully specified | P1 |

**Pre-implementation score: 22/30 — fix P0 token violations during implementation.**

---

## Execution Order (Chunks)

### Chunk 1 — DB migrations + nav wiring (30 min)
1. Write and apply 3 migrations (extend ph_saved_filters, boards.filter_id, ph_filter_versions)
2. Add "Project Filters" to `SidebarProjectNav.tsx` PLANNING_NAV
3. Add "Filters" to `ProductHubSidebar.tsx`
4. Add routes to FullAppRoutes

### Chunk 2 — Filter List page (45 min)
1. `FiltersListPage.tsx` with `@atlaskit/dynamic-table`
2. All columns with correct ADS tokens (NO hardcoded hex)
3. Sub-tabs (My/Starred/Recent), sidebar, search bar
4. `FilterHealthBadge.tsx` component
5. `useFiltersForProject()` hook

### Chunk 3 — Save modal + CRUD hooks (30 min)
1. `FilterSaveModal.tsx` using `@atlaskit/modal-dialog`
2. Viewers radio group + Editors people picker
3. `useCreateSavedFilter`, `useUpdateSavedFilter`, `useDeleteSavedFilter` extended
4. `FilterKebabMenu.tsx` with Copy / Make private / Change owner / Delete

### Chunk 4 — JQL lib + JQL editor (60 min)
1. `src/lib/jql/tokenizer.ts` + `parser.ts` + `translator.ts`
2. `src/lib/jql/fieldMap.ts`
3. `JQLEditor.tsx` + `JQLAutocompleteDropdown.tsx`
4. `JQLEditor` integrated into `CreateFilterPage.tsx`

### Chunk 5 — Basic mode + CATY mode (45 min)
1. `CreateFilterPage.tsx` with Basic/JQL/Ask CATY tabs
2. Basic mode: reuse `JiraFilterAtlaskit` + live JQL preview
3. Ask CATY mode: reuse `AskCatyInlineBar` + response card
4. CATY prompt template + Claude API call

### Chunk 6 — Outliers O1/O3/O4/O5/O9 (45 min)
1. O1 Health Score: computed in `FilterHealthBadge`
2. O3 Smart Suggestions sidebar panel
3. O4 Usage analytics sparkline
4. O5 Template registry + `FilterTemplatePicker`
5. O9 Version history: `useFilterVersions` hook + restore action

### Chunk 7 — Kanban integration + Product Hub (30 min)
1. O10: Kanban wizard step 3 filter picker
2. Product Hub: same pages with `hubType="product"` prop
3. O6 Cross-hub filters: `hub_scope` handling
4. E2E test: create → save → apply to board

---

## Branch Rules

- Branch: `BAU-filters-01` (create with `git switch --create BAU-filters-01` at execution start)
- All 7 chunks go to this branch
- No other work in this branch
- Design audit gate: `node design-governance/cli/index.js audit src/pages/project-hub/filters/` must pass before PR
- PR title: `feat(filters): complete Filters module — Project Hub + Product Hub`

---

*Auto-generated by /obsidian save — planning conversation 2026-05-21*
*Mockup screens verified in browser at http://localhost:8080*
*ADS token values probed from live Catalyst app (auth page — CSS variables resolved)*
