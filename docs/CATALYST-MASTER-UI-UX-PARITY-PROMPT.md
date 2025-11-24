# CATALYST MASTER UI/UX PARITY PROMPT
## Jira Align-Inspired Enterprise Agile Platform

> **Version:** 2.0  
> **Purpose:** Comprehensive UI theme and UX behavior specification for full Jira Align parity  
> **Rule:** Behavioral parity required. UI must be ORIGINAL — never copy Atlassian proprietary assets, icons, colors, or text verbatim.

---

## ⛔ CRITICAL CONSTRAINTS

```
DO NOT:
- Copy Atlassian color hex values
- Use Atlassian proprietary icons (use Lucide/Heroicons instead)
- Reproduce Atlassian UI text verbatim
- Break existing routes, schema, or functionality

DO:
- Match BEHAVIOR exactly as documented in Jira Align Help/KB
- Create ORIGINAL visual styling
- Add only non-breaking components/tables/settings
- Reference public Jira Align documentation for feature behavior
```

---

# PART 1: GLOBAL UI FOUNDATION

## 1.1 App Shell Architecture

### Left Sidebar (Fixed, Collapsible)
```
┌─────────────────────────────────────────────────────┐
│ [Logo]                                    [Collapse]│
├─────────────────────────────────────────────────────┤
│ 📊 Portfolio                                    ▾   │
│    ├── Portfolio Room                               │
│    ├── Themes                                       │
│    ├── Initiatives                                  │
│    ├── Epics                                        │
│    ├── Portfolio Kanban                             │
│    ├── Portfolio Roadmap                            │
│    └── Insights                                     │
├─────────────────────────────────────────────────────┤
│ 🎯 Program                                      ▾   │
│    ├── Program Room                                 │
│    ├── Program Board                                │
│    ├── Features                                     │
│    ├── Dependencies                                 │
│    ├── ROAM                                         │
│    ├── Capacity                                     │
│    └── Releases                                     │
├─────────────────────────────────────────────────────┤
│ 👥 Team                                         ▾   │
│    ├── Team Room                                    │
│    ├── Sprint Board                                 │
│    ├── Backlog                                      │
│    ├── Sprints                                      │
│    └── Velocity                                     │
├─────────────────────────────────────────────────────┤
│ 📈 Insights                                     ▾   │
│    ├── Predictability                               │
│    ├── Flow Metrics                                 │
│    └── Custom Reports                               │
├─────────────────────────────────────────────────────┤
│ ⚙️ Admin                                        ▾   │
│    ├── Organization                                 │
│    ├── Hierarchy                                    │
│    ├── Custom Fields                                │
│    ├── Integrations                                 │
│    └── Permissions                                  │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Collapsed state: 56px width, icons only, tooltip on hover
- Expanded state: 240px width, icons + labels
- Active item: highlighted background + left border accent
- Nested items: indented 16px, smaller font
- Persist state per user in localStorage
- Keyboard: `[` to toggle collapse

### Top Header Bar (Fixed, 56px height)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Breadcrumb]           [🔍 Search... ⌘K]    [+ Create ▾] [🔔] [?] [Avatar]│
└──────────────────────────────────────────────────────────────────────────┘
```

**Components:**
- **Breadcrumb**: Current context path (Portfolio > Program > PI)
- **Global Search**: Center-left, expands on focus, ⌘K shortcut
- **Create Button**: Dropdown with context-aware options
- **Notifications**: Bell icon with unread count badge
- **Help**: Links to docs, keyboard shortcuts, support
- **Profile Menu**: User avatar, settings, logout

### Content Canvas
- Max-width: 1600px for dashboards/rooms
- Full-width for boards and grids
- Background: subtle neutral (not pure white)
- Padding: 24px standard, 16px on tablet

---

## 1.2 Visual Theme System

### Design Tokens (Create Original Values)

```typescript
// theme/tokens.ts
export const tokens = {
  // Colors - ORIGINAL values, NOT Atlassian
  colors: {
    // Primary brand
    primary: {
      50: '#EEF4FF',
      100: '#DCE8FF',
      200: '#B8D1FF',
      500: '#2563EB',  // Main primary
      600: '#1D4ED8',
      700: '#1E40AF',
    },
    // Semantic
    success: { 500: '#10B981', 600: '#059669' },
    warning: { 500: '#F59E0B', 600: '#D97706' },
    danger: { 500: '#EF4444', 600: '#DC2626' },
    info: { 500: '#3B82F6', 600: '#2563EB' },
    // Neutrals
    neutral: {
      0: '#FFFFFF',
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    // Health (RAG)
    health: {
      green: '#22C55E',
      yellow: '#EAB308',
      red: '#EF4444',
      gray: '#9CA3AF',
    },
    // Work item types
    workItem: {
      theme: '#8B5CF6',
      epic: '#6366F1',
      feature: '#3B82F6',
      story: '#22C55E',
      subtask: '#64748B',
      defect: '#EF4444',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      mono: 'JetBrains Mono, Menlo, monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  // Spacing (4px base)
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  // Borders
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    panel: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.1)',
  },

  // Z-index
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    toast: 500,
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
};
```

### Dark Mode
- Implement via CSS custom properties
- Toggle in profile menu
- Persist preference
- All components must support both modes

---

## 1.3 Core Reusable Components

### Component Library (Build Once, Use Everywhere)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `ScopeSelector` | Portfolio/Program/Team dropdown | `value`, `onChange`, `showAll` |
| `PISelector` | Multi-select PI with status badges | `value`, `onChange`, `showClosed` |
| `IterationSelector` | Iteration dropdown within PI | `piId`, `value`, `onChange` |
| `TeamSelector` | Team dropdown with program filter | `programId`, `value`, `onChange` |
| `UserSelector` | User picker with avatar search | `value`, `onChange`, `multiple` |
| `SavedViewsDropdown` | Load/save view configurations | `entityType`, `onApply` |
| `ColumnChooserModal` | Toggle visible columns | `entityType`, `columns`, `onSave` |
| `BulkActionsBar` | Multi-select action toolbar | `selectedIds`, `actions` |
| `RightDetailsPanel` | Slide-out detail view | `entityType`, `entityId`, `onClose` |
| `WorkItemLinkModal` | Create/edit work item links | `sourceId`, `onSave` |
| `RecycleBinDialog` | View/restore deleted items | `entityType`, `onRestore` |
| `GlobalSearchOverlay` | Search modal with results | `onSelect` |
| `HealthBadge` | RAG status indicator | `status`, `size` |
| `StatusBadge` | Work item state badge | `state`, `entityType` |
| `PIBadge` | PI indicator with state | `piName`, `piState` |
| `WIPBadge` | WIP limit indicator | `current`, `limit` |
| `EmptyState` | No data placeholder | `icon`, `title`, `action` |
| `LoadingState` | Skeleton/spinner | `variant`, `count` |
| `ErrorState` | Error display with retry | `error`, `onRetry` |
| `ConfirmDialog` | Confirmation modal | `title`, `message`, `onConfirm` |
| `Toast` | Notification toast | `type`, `message`, `duration` |

---

# PART 2: LIST VIEW PATTERN

## 2.1 Standard List Screen Layout

Every list screen follows this exact structure:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FILTER BAR                                                                │
│ [ScopeSelector] [PISelector] [Status ▾] [Owner ▾] [More Filters] [Clear] │
├──────────────────────────────────────────────────────────────────────────┤
│ TOOLBAR                                                                   │
│ [Saved Views ▾] [Columns] [Bulk Edit] [Export ▾]    [🔍 Filter] [≡ / ▤]  │
├──────────────────────────────────────────────────────────────────────────┤
│ DATA GRID                                                                 │
│ ☐ │ ID        │ Name              │ Status    │ Owner  │ PI      │ Health│
│───┼───────────┼───────────────────┼───────────┼────────┼─────────┼───────│
│ ☐ │ F-1234    │ User Auth Module  │ ● Active  │ @john  │ PI 24.3 │ 🟢    │
│ ☐ │ F-1235    │ Payment Gateway   │ ○ Backlog │ @sarah │ PI 24.4 │ 🟡    │
│   │           │                   │           │        │         │       │
├──────────────────────────────────────────────────────────────────────────┤
│ PAGINATION                                                                │
│ Showing 1-25 of 156                              [◀] [1] [2] [3] [...] [▶]│
└──────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Column Chooser Parity (CRITICAL)

**Jira Align Behavior:** Columns shown in the list MUST match fields enabled in Details Panel settings.

### Implementation:

```typescript
// Database table
CREATE TABLE details_panel_settings (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,      -- 'feature', 'story', 'epic', etc.
  field_key TEXT NOT NULL,        -- 'status', 'owner', 'pi_id', etc.
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER,
  UNIQUE(entity_type, field_key)
);

// Column Chooser must filter by this
const enabledFields = await getEnabledFields(entityType);
const availableColumns = allColumns.filter(col => 
  enabledFields.includes(col.fieldKey)
);
```

**Rules:**
- If field is disabled in Details Panel settings → HIDE from Column Chooser
- If field is disabled → HIDE from grid even if previously visible
- Saved views must respect current enabled fields
- Admin can toggle field visibility in Settings > [Entity] > Details Panel

## 2.3 Grid Interactions

| Action | Behavior |
|--------|----------|
| **Row click** | Opens RightDetailsPanel for that item |
| **Checkbox click** | Toggles row selection, shows BulkActionsBar |
| **Column header click** | Sorts by column (asc → desc → none) |
| **Column header drag** | Reorders columns |
| **Column edge drag** | Resizes column width |
| **Inline edit** | Double-click cell to edit (specific fields only) |
| **Right-click row** | Context menu: View, Edit, Link, Clone, Delete |
| **Shift+click** | Range select rows |
| **Cmd/Ctrl+click** | Toggle individual row selection |

## 2.4 Inline Quick Edit Fields

Only these fields support inline editing (per entity):

| Entity | Inline Editable Fields |
|--------|------------------------|
| Theme | status, owner |
| Epic | status, owner, health, target_pi |
| Feature | status, owner, health, pi, iteration, points |
| Story | status, assignee, sprint, story_points |
| Dependency | status, risk_level, committed_date |

---

# PART 3: RIGHT DETAILS PANEL

## 3.1 Panel Behavior

```
┌─────────────────────────────────────────┐
│ [←] F-1234: User Authentication Module  │ ← Sticky Header
│ [Status ▾] [Owner ▾] [@] [⋮ More ▾]     │
├─────────────────────────────────────────┤
│ [Details][Design][Spend][Links][...]    │ ← Tabs
├─────────────────────────────────────────┤
│                                         │
│  Tab Content Area                       │
│  (scrollable)                           │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ ▼ Quick Links                     [+]   │ ← Links Tray (collapsible)
│   🔗 Jira: PROJ-456                     │
│   🔗 Confluence: Design Doc             │
├─────────────────────────────────────────┤
│ Updated 2 hours ago by @john            │ ← Footer
└─────────────────────────────────────────┘
```

**Specifications:**
- Width: 40% of viewport (min 400px, max 600px)
- Slide-in from right with 200ms animation
- Click outside or press Escape to close
- Deep-linkable: `/features/F-1234?panel=true`
- Keyboard navigation between tabs (←/→)

## 3.2 Tabs by Entity Type

### Feature Details Panel Tabs

| Tab | Contents |
|-----|----------|
| **Details** | All core fields: description, acceptance criteria, type, state, program, epic, PI, iteration, owner, points, WSJF, health, blocked status |
| **Design** | Design approach, technical notes, architecture links, mockup attachments |
| **Spend** | Budget allocation, actual spend, cost tracking, capitalization flag |
| **Links** | Work item links (parent/child/related), external links, Jira/ADO sync |
| **Forecast** | Delivery forecast, confidence, risk factors, predicted completion |
| **Milestones** | Key milestones with dates, status, dependencies |

### Story Details Panel Tabs

| Tab | Contents |
|-----|----------|
| **Details** | Description, acceptance criteria, type, state, feature, team, sprint, assignee, points, blocked |
| **Subtasks** | List of subtasks with inline add/edit |
| **Links** | Work item links, external references |
| **Activity** | Comments, history, state changes |

### Epic Details Panel Tabs

| Tab | Contents |
|-----|----------|
| **Details** | Description, theme, state, owner, programs, WSJF, health |
| **Features** | List of child features with status rollup |
| **Links** | Related epics, dependencies, external links |
| **Forecast** | Delivery timeline, completion prediction |
| **Activity** | Comments, history |

## 3.3 Links Tray Component

Collapsible section at bottom of every Details Panel:

```typescript
interface LinksTrayProps {
  entityType: string;
  entityId: string;
  onAddLink: () => void;
}

// Display format
<LinksTray>
  <LinksTrayHeader>
    Quick Links ({count})
    <CollapseToggle />
    <AddLinkButton />
  </LinksTrayHeader>
  <LinksTrayContent>
    {externalLinks.map(link => (
      <LinkRow 
        icon={getLinkIcon(link.type)} 
        label={link.title}
        url={link.url}
        onRemove={() => removeLink(link.id)}
      />
    ))}
  </LinksTrayContent>
</LinksTray>
```

---

# PART 4: WORK ITEM LINKS

## 4.1 Link Types

```typescript
const LINK_TYPES = {
  // Hierarchical
  PARENT_OF: { label: 'Parent of', inverse: 'CHILD_OF', icon: '↑' },
  CHILD_OF: { label: 'Child of', inverse: 'PARENT_OF', icon: '↓' },
  
  // Dependencies
  BLOCKS: { label: 'Blocks', inverse: 'BLOCKED_BY', icon: '🚫' },
  BLOCKED_BY: { label: 'Blocked by', inverse: 'BLOCKS', icon: '⛔' },
  DEPENDS_ON: { label: 'Depends on', inverse: 'REQUIRED_BY', icon: '→' },
  REQUIRED_BY: { label: 'Required by', inverse: 'DEPENDS_ON', icon: '←' },
  
  // Relations
  RELATES_TO: { label: 'Relates to', inverse: 'RELATES_TO', icon: '↔' },
  DUPLICATES: { label: 'Duplicates', inverse: 'DUPLICATED_BY', icon: '⊜' },
  DUPLICATED_BY: { label: 'Duplicated by', inverse: 'DUPLICATES', icon: '⊜' },
  CLONES: { label: 'Clones', inverse: 'CLONED_BY', icon: '⎘' },
  CLONED_BY: { label: 'Cloned by', inverse: 'CLONES', icon: '⎘' },
};
```

## 4.2 WorkItemLinkModal

```
┌─────────────────────────────────────────────────────┐
│ Link Work Item                               [✕]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Link Type                                           │
│ [Depends on                               ▾]        │
│                                                     │
│ Target Item(s)                                      │
│ [🔍 Search features, stories, epics...        ]    │
│ ┌─────────────────────────────────────────────┐    │
│ │ ☑ F-1234: User Auth Module                  │    │
│ │ ☑ F-1235: Session Management                │    │
│ │ ☐ S-5678: Login API                         │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ Due Iteration (optional)                            │
│ [PI 24.3 - Iteration 2                    ▾]        │
│                                                     │
│ Notes                                               │
│ ┌─────────────────────────────────────────────┐    │
│ │ Need auth completed before payment flow     │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                           [Cancel]  [Create Links]  │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Multi-select target items
- Creates bidirectional links (source and target both show link)
- Validates no circular dependencies for BLOCKS/DEPENDS_ON
- Shows warning if linking across different PIs

## 4.3 Links Tab Display

```
┌─────────────────────────────────────────────────────┐
│ OUTBOUND LINKS (This item depends on)               │
├─────────────────────────────────────────────────────┤
│ → F-1234 │ User Auth Module │ Depends on │ 🟢 Done │
│ → E-567  │ Core Platform    │ Child of   │ 🟡 Active│
├─────────────────────────────────────────────────────┤
│ INBOUND LINKS (Items depending on this)             │
├─────────────────────────────────────────────────────┤
│ ← F-1456 │ Payment Flow     │ Depends on │ 🔵 Ready │
│ ← S-789  │ Checkout API     │ Blocked by │ ⏳ Wait  │
└─────────────────────────────────────────────────────┘
```

---

# PART 5: DELETE & RECYCLE BIN

## 5.1 Delete Behavior

```typescript
// Soft delete rules
const deleteRules = {
  // Work items go to recycle bin
  softDelete: ['theme', 'initiative', 'epic', 'feature', 'story', 'subtask'],
  
  // These are hard deleted immediately
  hardDelete: ['comment', 'attachment', 'link'],
  
  // Cascade behavior
  cascade: {
    theme: ['initiative'],      // Deleting theme marks initiatives deleted
    initiative: ['epic'],       // etc.
    epic: ['feature'],
    feature: ['story'],
    story: ['subtask'],
  },
};
```

**Delete Confirmation Dialog:**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Delete Feature?                          [✕]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Are you sure you want to delete:                    │
│                                                     │
│ F-1234: User Authentication Module                  │
│                                                     │
│ This will also delete:                              │
│ • 5 Stories                                         │
│ • 12 Subtasks                                       │
│                                                     │
│ Items will be moved to the Recycle Bin and can be  │
│ restored within 30 days.                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                            [Cancel]  [🗑️ Delete]    │
└─────────────────────────────────────────────────────┘
```

## 5.2 Recycle Bin Dialog

Access: List screen → More Actions (⋮) → Recycle Bin

```
┌─────────────────────────────────────────────────────────────────┐
│ 🗑️ Recycle Bin                                           [✕]   │
├─────────────────────────────────────────────────────────────────┤
│ [Type ▾] [Program ▾] [PI ▾] [Deleted By ▾]  [🔍 Search]        │
├─────────────────────────────────────────────────────────────────┤
│ ☐ │ Type    │ ID      │ Name              │ Deleted    │ By    │
│───┼─────────┼─────────┼───────────────────┼────────────┼───────│
│ ☑ │ Feature │ F-1234  │ User Auth Module  │ 2 days ago │ @john │
│ ☐ │ Story   │ S-5678  │ Login API         │ 2 days ago │ @john │
│ ☐ │ Story   │ S-5679  │ Session Store     │ 2 days ago │ @john │
├─────────────────────────────────────────────────────────────────┤
│ Selected: 1 item                   [Restore] [Permanently Delete]│
└─────────────────────────────────────────────────────────────────┘
```

**Restore Rules (Jira Align parity):**
- Restoring a parent restores ONLY the parent, not children
- Show warning: "Child items remain in Recycle Bin"
- User must explicitly restore children if needed
- Cannot restore if parent no longer exists (error message)

**Permissions:**
- View Recycle Bin: All users can see items they deleted
- Restore: Requires `restore_items` permission
- Permanently Delete: Requires `admin_delete` permission

---

# PART 6: GLOBAL SEARCH

## 6.1 Search Overlay

Trigger: Click search input or press `⌘K` / `Ctrl+K`

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 Search Catalyst...                                         [✕]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ RECENT SEARCHES                                                     │
│   🕐 user authentication                                            │
│   🕐 #1234                                                          │
│   🕐 payment flow                                                   │
│                                                                     │
│ QUICK ACTIONS                                                       │
│   ➕ Create Feature                                                 │
│   ➕ Create Story                                                   │
│   📋 Go to Program Board                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

After typing:
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 user auth                                                  [✕]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ FEATURES (3)                                                        │
│   🔷 F-1234 │ User Authentication Module      │ PI 24.3 │ 🟢 Done  │
│   🔷 F-1567 │ Auth Token Refresh              │ PI 24.4 │ 🔵 Active│
│   🔷 F-1890 │ OAuth Integration               │ Backlog │ ○ Funnel │
│                                                                     │
│ STORIES (5)                                                         │
│   🟢 S-4567 │ Login API endpoint              │ Sprint 3│ ✓ Done   │
│   🟢 S-4568 │ JWT validation                  │ Sprint 3│ → Active │
│   🟢 S-4569 │ Password reset flow             │ Sprint 4│ ○ Ready  │
│   ... +2 more                                                       │
│                                                                     │
│ EPICS (1)                                                           │
│   🟣 E-234  │ Identity & Access Management    │ Active  │ 🟡 At Risk│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 6.2 Search Query Patterns

| Pattern | Behavior | Example |
|---------|----------|---------|
| `#<number>` | Search by internal ID | `#1234` → finds item with ID 1234 |
| `<KEY-123>` | Search by Jira/external key | `PROJ-456` → finds mapped item |
| `type:<type>` | Filter by entity type | `type:feature auth` |
| `status:<status>` | Filter by status | `status:active payment` |
| `owner:@<name>` | Filter by owner | `owner:@john api` |
| `pi:<name>` | Filter by PI | `pi:24.3 feature` |
| Free text | Title + description search | `payment gateway` |

## 6.3 Search Result Actions

- **Click result**: Opens RightDetailsPanel
- **⌘+Click / Ctrl+Click**: Opens in new tab
- **Enter on highlighted**: Opens RightDetailsPanel
- **Arrow keys**: Navigate results
- **Escape**: Close overlay

---

# PART 7: DIRECT & DEEP LINKS

## 7.1 URL Patterns

```typescript
// Deep link routes
const routes = {
  // List views
  '/themes': 'Themes list',
  '/epics': 'Epics list',
  '/features': 'Features list',
  '/features?pi=24.3&status=active': 'Filtered features',
  
  // Detail panel (opens panel overlay)
  '/features/F-1234': 'Feature detail (full page)',
  '/features?panel=F-1234': 'Features list with panel open',
  
  // Boards
  '/program-board?pi=24.3': 'Program board for PI',
  '/sprint-board?team=alpha&sprint=3': 'Sprint board',
  
  // Direct open (for BI/dashboard links)
  '/open/feature/F-1234': 'Direct to feature panel',
  '/open/story/S-5678?redirect=/team-room': 'Open then redirect',
};
```

## 7.2 Deep Link Behavior

```typescript
// /open/:entityType/:entityId route handler
function handleDeepLink(entityType, entityId, searchParams) {
  // 1. Verify authentication
  if (!isAuthenticated()) {
    saveRedirectUrl(currentUrl);
    redirect('/login');
    return;
  }
  
  // 2. Load context (parent list or appropriate view)
  const parentRoute = getParentRoute(entityType);
  navigateToBackground(parentRoute);
  
  // 3. Open details panel
  openDetailsPanel(entityType, entityId);
  
  // 4. Handle redirect param
  if (searchParams.redirect) {
    onPanelClose(() => navigate(searchParams.redirect));
  }
}
```

## 7.3 Copy Link Actions

Every work item has in its action menu:
- **Copy Link**: Copies list URL with panel param
- **Copy Direct Link**: Copies `/open/...` URL for dashboards/BI

```typescript
// Example outputs
copyLink('feature', 'F-1234');
// → https://app.catalyst.com/features?panel=F-1234

copyDirectLink('feature', 'F-1234');
// → https://app.catalyst.com/open/feature/F-1234
```

---

# PART 8: ROOM PATTERN (DASHBOARDS)

## 8.1 Room Layout Structure

Rooms are PI-scoped decision cockpits with 3-panel layout:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ROOM HEADER                                                              │
│ [ScopeSelector] [PISelector] [Date Range ▾]     [⚙️ Configure] [↗ Share] │
├────────────────────┬─────────────────────────────┬───────────────────────┤
│ LEFT PANEL (25%)   │ CENTER PANEL (50%)          │ RIGHT PANEL (25%)     │
│ Strategy/Context   │ Plan/Execution              │ Metrics/KPIs          │
│                    │                             │                       │
│ ┌────────────────┐ │ ┌─────────────────────────┐ │ ┌───────────────────┐ │
│ │ Objectives     │ │ │ Timeline / Backlog      │ │ │ Objectives %     │ │
│ │ Progress       │ │ │                         │ │ │ ████████░░ 78%   │ │
│ └────────────────┘ │ │                         │ │ └───────────────────┘ │
│                    │ │                         │ │                       │
│ ┌────────────────┐ │ │                         │ │ ┌───────────────────┐ │
│ │ Theme Health   │ │ │                         │ │ │ Dependencies      │ │
│ │ 🟢 8  🟡 3  🔴 1│ │ │                         │ │ │ At Risk: 4        │ │
│ └────────────────┘ │ │                         │ │ └───────────────────┘ │
│                    │ └─────────────────────────┘ │                       │
│ ┌────────────────┐ │                             │ ┌───────────────────┐ │
│ │ Initiatives    │ │ ┌─────────────────────────┐ │ │ ROAM Summary      │ │
│ │ Tracking       │ │ │ Quick Actions           │ │ │ R:2 O:5 A:3 M:8   │ │
│ └────────────────┘ │ │ [Board] [Capacity] [+]  │ │ └───────────────────┘ │
│                    │ └─────────────────────────┘ │                       │
├────────────────────┴─────────────────────────────┴───────────────────────┤
│ FOOTER: Last updated 5 min ago │ Auto-refresh: ON │ Next refresh: 55s    │
└──────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Room Types

### Portfolio Room
- **Left**: Theme progress, Initiative health, Strategic objectives
- **Center**: PI Roadmap, Epic/BR Backlog grid (expandable)
- **Right**: Objectives %, Dependency risk, ROAM summary, Capacity variance

### Program Room
- **Left**: PI Objectives, Feature status distribution
- **Center**: Program Board mini-view, Feature backlog
- **Right**: Story burndown, Team capacity, Risks count

### Team Room
- **Left**: Sprint goal, Velocity trend
- **Center**: Sprint burndown, Current sprint stories
- **Right**: WIP status, Blocked items, Team availability

---

# PART 9: BOARD PATTERNS

## 9.1 Program Board

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PROGRAM BOARD                                                            │
│ [Program ▾] [PI 24.3 ▾]  [Swimlanes: Teams ▾] [Dependencies ☑]  [⛶ Full] │
├──────────────────────────────────────────────────────────────────────────┤
│         │ Iteration 1   │ Iteration 2   │ Iteration 3   │ IP Sprint     │
│         │ Jan 1-14      │ Jan 15-28     │ Jan 29-Feb 11 │ Feb 12-25     │
├─────────┼───────────────┼───────────────┼───────────────┼───────────────┤
│ Team    │ ┌───────────┐ │ ┌───────────┐ │               │               │
│ Alpha   │ │ F-1234    │─┼→│ F-1567    │ │               │               │
│         │ │ Auth      │ │ │ Tokens    │ │               │               │
│         │ │ 🟢 8pts   │ │ │ 🟡 5pts   │ │               │               │
│         │ └───────────┘ │ └───────────┘ │               │               │
├─────────┼───────────────┼───────────────┼───────────────┼───────────────┤
│ Team    │ ┌───────────┐ │               │ ┌───────────┐ │               │
│ Beta    │ │ F-1890    │ │               │ │ F-2001    │ │               │
│         │ │ Payment   │ │               │ │ Checkout  │ │               │
│         │ │ 🔴 13pts  │ │               │ │ 🟢 8pts   │ │               │
│         │ └───────────┘ │               │ └───────────┘ │               │
└─────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

**Interactions:**
- Drag features between iterations (updates `iteration_id`)
- Drag features between team rows (updates `team_id`)
- Hover connector handle → drag to create dependency
- Click dependency line → edit/delete
- Click feature card → opens RightDetailsPanel

## 9.2 Sprint Board

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SPRINT BOARD                                                             │
│ [Team ▾] Sprint 3: User Onboarding      Jan 15-28     [⚙️] [📊 Burndown] │
├──────────────────────────────────────────────────────────────────────────┤
│ To Do (5)        │ In Progress (3)   │ In Review (2)   │ Done (12)      │
│ WIP: -           │ WIP: 3/5 🟢       │ WIP: 2/3 🟢     │                │
├──────────────────┼───────────────────┼─────────────────┼────────────────┤
│ ┌──────────────┐ │ ┌───────────────┐ │ ┌─────────────┐ │ ┌────────────┐ │
│ │ S-4567       │ │ │ S-4568        │ │ │ S-4570      │ │ │ S-4565     │ │
│ │ Login API    │ │ │ JWT valid     │ │ │ Reset flow  │ │ │ DB setup   │ │
│ │ 🟢 Story 3pts│ │ │ 🟢 Story 2pts │ │ │ 🟡 Spike 1pt│ │ │ ✓ Story 2pt│ │
│ │ @john        │ │ │ @sarah        │ │ │ @mike       │ │ │ @john      │ │
│ │ [≡] [💬 2]   │ │ │ [≡] [💬 5]    │ │ │ [≡]        │ │ │ [≡] [💬 1] │ │
│ └──────────────┘ │ └───────────────┘ │ └─────────────┘ │ └────────────┘ │
│ ┌──────────────┐ │ ┌───────────────┐ │ ┌─────────────┐ │ ┌────────────┐ │
│ │ S-4571       │ │ │ S-4572        │ │ │ S-4573      │ │ │ ...        │ │
│ │ ...          │ │ │ ...           │ │ │ ...         │ │ │            │ │
│ └──────────────┘ │ └───────────────┘ │ └─────────────┘ │ └────────────┘ │
└──────────────────┴───────────────────┴─────────────────┴────────────────┘
```

**Features:**
- Columns from `board_configs` table
- WIP limits with visual warning (yellow when at limit, red when over)
- Drag cards between columns (updates `state`)
- Swimlane toggle (by assignee, by story type)
- Quick filters (by assignee avatars, by blocked)

## 9.3 ROAM Board

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ROAM BOARD                                                               │
│ [Program ▾] [PI 24.3 ▾]                               [+ Add Risk] [📊]  │
├──────────────────────────────────────────────────────────────────────────┤
│ Resolved (8)     │ Owned (5)        │ Accepted (3)    │ Mitigated (12)   │
│ 🟢               │ 🟡               │ 🟠              │ 🔵               │
├──────────────────┼──────────────────┼─────────────────┼──────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────┐ │ ┌──────────────┐ │
│ │ R-101        │ │ │ R-104        │ │ │ R-107       │ │ │ R-110        │ │
│ │ Vendor delay │ │ │ API breaking │ │ │ Budget risk │ │ │ Resource gap │ │
│ │ Score: 6     │ │ │ Score: 12 ⚠️ │ │ │ Score: 8    │ │ │ Score: 4     │ │
│ │ @john        │ │ │ @sarah       │ │ │ @mike       │ │ │ @lisa        │ │
│ │ Due: Jan 15  │ │ │ Due: Jan 20  │ │ │ Accepted    │ │ │ Mitigated    │ │
│ └──────────────┘ │ └──────────────┘ │ └─────────────┘ │ └──────────────┘ │
└──────────────────┴──────────────────┴─────────────────┴──────────────────┘
```

---

# PART 10: VALIDATION & TESTING

## 10.1 UI Parity Test Suite

After building, display a "UI Parity Test" panel that verifies:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🧪 UI PARITY TEST RESULTS                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ COLUMN CHOOSER PARITY                                                   │
│ ✅ Features list shows only enabled fields                              │
│ ✅ Disabled fields hidden from Column Chooser                           │
│ ✅ Saved views respect enabled fields                                   │
│                                                                         │
│ DETAILS PANEL                                                           │
│ ✅ Feature panel shows all 6 tabs                                       │
│ ✅ Inline edits save correctly                                          │
│ ✅ Links tray displays and updates                                      │
│                                                                         │
│ WORK ITEM LINKS                                                         │
│ ✅ WorkItemLinkModal creates links                                      │
│ ✅ Bidirectional links visible on both items                            │
│ ✅ Link types display correct icons                                     │
│                                                                         │
│ RECYCLE BIN                                                             │
│ ✅ Delete moves items to Recycle Bin                                    │
│ ✅ Cascade delete marks children                                        │
│ ✅ Restore honors parent/child rules                                    │
│ ⚠️ Permanent delete requires admin role (untested - needs admin)        │
│                                                                         │
│ GLOBAL SEARCH                                                           │
│ ✅ #ID search works                                                     │
│ ✅ Jira key search works (if integration exists)                        │
│ ✅ Free text search returns results                                     │
│ ✅ Keyboard navigation works                                            │
│                                                                         │
│ DEEP LINKS                                                              │
│ ✅ /open/:type/:id opens panel                                          │
│ ✅ Unauthenticated redirects to login                                   │
│ ✅ Copy Link produces correct URL                                       │
│                                                                         │
│ BOARDS                                                                  │
│ ✅ Program Board drag updates iteration                                 │
│ ✅ Sprint Board drag updates status                                     │
│ ✅ Dependency lines render                                              │
│ ✅ WIP limits enforce visually                                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ PASSED: 18/19 │ WARNINGS: 1 │ FAILED: 0                                 │
│                                                    [Run Again] [Export] │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10.2 Required Seed Data

```sql
-- Minimum seed data for testing
INSERT INTO features VALUES 
  ('F-1234', 'User Authentication Module', 'done', ...),
  ('F-1567', 'Token Refresh Service', 'active', ...);

INSERT INTO work_item_links VALUES
  ('F-1234', 'F-1567', 'depends_on', ...);

INSERT INTO recycle_bin VALUES
  ('F-9999', 'Deprecated Feature', 'feature', ...);

INSERT INTO integration_mappings VALUES
  ('jira', 'PROJ-456', 'feature', 'F-1234', ...);
```

---

# PART 11: ACCESSIBILITY & PERFORMANCE

## 11.1 Accessibility Requirements

- **Keyboard Navigation**: All interactive elements reachable via Tab
- **Focus Indicators**: Visible focus ring on all focusable elements
- **ARIA Labels**: All icons and non-text elements have labels
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI elements
- **Screen Reader**: Semantic HTML, live regions for updates
- **Reduced Motion**: Respect `prefers-reduced-motion`

## 11.2 Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3.0s |
| List view render (100 items) | < 500ms |
| Board render (50 cards) | < 300ms |
| Search results | < 200ms |
| Panel open animation | 200ms |

## 11.3 Performance Optimizations

- Virtual scrolling for lists > 100 items
- Lazy load panel content
- Debounce search input (300ms)
- Memoize expensive computations
- Prefetch on hover for likely navigation
- Service worker for static assets

---

# APPENDIX: QUICK REFERENCE

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Global Search |
| `⌘N` / `Ctrl+N` | Create new item |
| `⌘/` / `Ctrl+/` | Show keyboard shortcuts |
| `Escape` | Close modal/panel |
| `[` | Toggle sidebar |
| `G then H` | Go to Home |
| `G then P` | Go to Program Board |
| `G then B` | Go to Backlog |
| `J` / `K` | Navigate list up/down |
| `Enter` | Open selected item |
| `E` | Edit selected item |
| `L` | Link selected item |
| `Delete` | Delete selected item |

## Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Done/Resolved | Green | #22C55E |
| Active/In Progress | Blue | #3B82F6 |
| Ready/Backlog | Gray | #64748B |
| Blocked/At Risk | Red | #EF4444 |
| Warning | Yellow | #EAB308 |

---

**END OF MASTER UI/UX PARITY PROMPT**
