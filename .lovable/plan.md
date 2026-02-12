

# Standardize the Command Center Header Pattern

## Goal
Create a single reusable `CommandCenterHeader` component that produces the exact header layout seen in your screenshots -- bold title, lighter subtitle, right-aligned timestamp + action buttons -- and use it consistently across pages like ReleaseHub Command Center (`/releasehub/command-center`) and ProjectHub Dashboard (`/projecthub`).

## Current State
- **ReleaseHub Command Center** (`CommandCenterPage.tsx`): Header is built inline with raw `div` + inline styles (lines 654-700). Title: "Command Center", subtitle: "Executive overview of testing operations", right side: timestamp + Export dropdown + refresh.
- **ProjectHub Dashboard** (`WorkHubDashboard.tsx`): Header is also inline with raw `div` + inline styles (lines 48-102). Title: "Dashboard", subtitle: "Portfolio overview", right side: timestamp + refresh button.
- Both headers are visually identical in pattern but duplicated with slightly different markup and styling.

## Design

### Component: `CommandCenterHeader`

```text
+---------------------------------------------------------------+
|  Title (20px, bold, dark)          Updated just now  [Actions] |
|  Subtitle (14px, secondary)                                    |
+---------------------------------------------------------------+
|  1px border-bottom (--divider / #e2e8f0)                       |
```

**Specifications (matching your screenshots and the Catalyst V10 spec):**
- Height: 72px (padding: 16px 24px)
- Title: Inter 20px / font-weight 700 / color `--text-1` (#0f172a)
- Subtitle: Inter 14px / color `--text-2` (#64748b), 2px top margin
- Right side: flex row with gap-16, holds timestamp text (13px, tertiary color) and action slot (buttons)
- Bottom border: 1px solid `--divider`
- Background: `--bg` / card surface (white)

### Props Interface

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Bold page title |
| `subtitle` | string (optional) | Secondary description |
| `timestamp` | string (optional) | e.g. "Updated just now" |
| `onRefresh` | function (optional) | Refresh callback (shows spin icon) |
| `isRefreshing` | boolean (optional) | Controls spin animation |
| `actions` | ReactNode (optional) | Extra right-side buttons (Export, etc.) |

## Implementation Steps

### Step 1 -- Create `src/components/shared/CommandCenterHeader.tsx`
Build the reusable component with the exact layout and sizing from the screenshots, using design tokens for colors and borders.

### Step 2 -- Refactor ReleaseHub Command Center
Replace the inline header in `src/pages/releases/CommandCenterPage.tsx` (lines 654-700) with:
```tsx
<CommandCenterHeader
  title="Command Center"
  subtitle="Executive overview of testing operations"
  timestamp={getTimeAgo()}
  onRefresh={handleRefresh}
  isRefreshing={isRefreshing}
  actions={<ExportDropdown />}
/>
```

### Step 3 -- Refactor ProjectHub Dashboard
Replace the inline header in `src/components/workhub/dashboard/WorkHubDashboard.tsx` (lines 48-102) with:
```tsx
<CommandCenterHeader
  title="Dashboard"
  subtitle="Portfolio overview"
  timestamp={relativeTime(kpisQuery.dataUpdatedAt)}
  onRefresh={handleRefresh}
  isRefreshing={isRefreshing}
/>
```

### Step 4 -- Reuse on future pages
Any new page needing this header pattern simply imports `CommandCenterHeader` with the appropriate props. No more inline duplication.

## Recommendations

- This header is distinct from `GlobalPageHeader` (which uses breadcrumb + section labels) and `MasterPageHeader` (which uses a 2-row title + toolbar grid). It serves "dashboard/overview" pages that need a clean title + subtitle + timestamp pattern.
- Keep all three header components available since they serve different page archetypes:
  - `CommandCenterHeader` -- dashboard/overview pages (title + subtitle + timestamp)
  - `GlobalPageHeader` -- detail pages (breadcrumb + toolbar)
  - `MasterPageHeader` -- list pages (title + count + toolbar grid)

