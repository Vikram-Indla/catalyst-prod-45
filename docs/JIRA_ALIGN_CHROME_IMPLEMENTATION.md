# Jira Align Navigation Chrome Implementation

## Overview
This document describes the implementation of the shared UI chrome (navigation, context, and global features) that all Jira Align modules in Catalyst rely on.

## Deliverables

### 1. JiraAlignContext (`src/contexts/JiraAlignContext.tsx`)
Global state management for Jira Align context with:
- **Tier Selection**: enterprise, portfolio, program, team
- **Entity IDs**: portfolioId, programId, teamIds[]
- **Time Frame**: piIds[] (Program Increments)
- **Strategy Context**: snapshotId
- **Persistence**: localStorage + URL query params for shareability
- **Reactivity**: All pages re-query when context changes

### 2. LeftContextPanel (`src/components/layout/LeftContextPanel.tsx`)
Collapsible left sidebar (280px expanded, 64px collapsed) with:
- **Portfolio Selector**: Visual cards with abbreviations and colors
- **Program Selector**: Dropdown with program names
- **PI Multi-Select**: Grouped by status (Selected/In Progress/Planning/Done) with Apply/Clear/Cancel actions
- **Snapshot Selector**: For Enterprise tier strategy views
- **Navigation Menu**: Dynamic menu items filtered by current tier
- **Collapse/Expand**: Button with chevron icon positioned outside sidebar edge
- **Settings Footer**: Tier-specific settings link

### 3. JiraAlignShell (`src/components/layout/JiraAlignShell.tsx`)
Enhanced with:
- **JiraAlignContextProvider**: Wraps entire shell to provide global context
- **LeftContextPanel**: Integrated into layout alongside main content
- **Global Search**: Keyboard shortcut (Cmd+K / Ctrl+K) support
- **Existing Features Maintained**:
  - Top navigation with tier buttons (Home, Enterprise, Portfolio, Program, Team)
  - Global dropdowns (Starred, Items, Create, Notifications)
  - Right-side utility icons (Search, Help, Settings, User)

### 4. SlideOutDetailsPanel (`src/components/shared/SlideOutDetailsPanel.tsx`)
Reusable right-side drawer component with:
- **Title & Subtitle**: Header with close button
- **Tab Support**: Optional tabs with automatic scroll container
- **Children Support**: Can render custom content without tabs
- **Width Options**: default (2xl), wide (4xl), full width
- **Scroll Container**: Auto-scrolling content area
- **Keyboard Navigation**: ESC to close

### 5. GlobalSearch (`src/components/layout/GlobalSearch.tsx`)
Search dialog with:
- **Keyboard Shortcut**: Cmd+K / Ctrl+K to open
- **Work Item Search**: By keywords or IDs (e.g., E-101, F-234)
- **Type Indicators**: Visual badges for Epic, Feature, Story, etc.
- **Empty States**: Helpful placeholder text
- **TODO**: API integration for actual search (currently mocked)

### 6. SourcesReference (`src/pages/dev/SourcesReference.tsx`)
Developer documentation page at `/dev/sources` listing:
- **FRD Requirements**: REQ-NAV-001, REQ-NAV-002, REQ-NAV-003
- **PDF References**: Forecast.pdf, Epic backlog.pdf with descriptions
- **Official Docs**: Links to Jira Align help center articles
- **Screenshot References**: Visual reference images with descriptions
- **Implementation Guidelines**: Non-hallucination policy, pixel-perfect matching rules

## Usage Patterns

### Accessing Context in Components
```tsx
import { useJiraAlignContext } from '@/contexts/JiraAlignContext';

function MyComponent() {
  const { tier, portfolioId, programId, piIds } = useJiraAlignContext();
  
  // Use context to filter data
  const { data } = useQuery({
    queryKey: ['items', portfolioId, piIds],
    queryFn: () => fetchItems(portfolioId, piIds),
    enabled: !!portfolioId && piIds.length > 0
  });
}
```

### Using SlideOutDetailsPanel
```tsx
import { SlideOutDetailsPanel } from '@/components/shared/SlideOutDetailsPanel';

function MyPage() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  return (
    <>
      <button onClick={() => setDetailsOpen(true)}>
        View Details
      </button>
      
      <SlideOutDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={selectedItem?.name || 'Details'}
        subtitle={selectedItem?.id}
        width="wide"
        tabs={[
          { id: 'overview', label: 'Overview', content: <Overview /> },
          { id: 'forecast', label: 'Forecast', content: <Forecast /> },
        ]}
      />
    </>
  );
}
```

## Menu Structure by Tier

### Enterprise Tier
- Strategy Room
- Roadmaps
- Objective Tree
- OKR Heatmap
- OKR Tree

### Portfolio Tier
- Portfolio Room
- Backlog (Epics)
- Roadmaps
- Objective Tree
- Work Tree
- Forecast
- Capacity

### Program Tier
- Program Room
- Backlog
- Roadmaps
- Work Tree
- Forecast
- Capacity
- Program Board

### Team Tier
- Team Room
- Capacity
- Sprint Board

## Context Persistence

### localStorage
```json
{
  "tier": "portfolio",
  "portfolioId": "1",
  "programId": null,
  "teamIds": [],
  "piIds": ["pi-5", "pi-6"],
  "snapshotId": null
}
```

### URL Query Params
```
?portfolioId=1&piIds=pi-5,pi-6
```

## Integration Checklist

When creating new Jira Align pages:
- [ ] Wrap route in JiraAlignShell (already done for all routes)
- [ ] Use `useJiraAlignContext()` to access current context
- [ ] Filter data based on selected tier, entity IDs, and PIs
- [ ] Add menu item to LeftContextPanel if needed
- [ ] Use SlideOutDetailsPanel for work item details
- [ ] Reference sources in code comments (no hallucination)

## Source Traceability

All implementations reference:
1. **FRD for JIRA Align UI.docx** - Requirements specification
2. **Forecast.pdf + Forecast.md** - Visual references for forecast/capacity
3. **Epic backlog.pdf + Epic backlog.md** - Visual references for backlog/details
4. **Jira Align Help Center** - Official documentation for behaviors

View complete source listing at: `/dev/sources`

## Known Limitations

1. **Search API**: GlobalSearch uses mock data, needs real API integration
2. **Context Validation**: No validation that selected IDs exist in database
3. **Team Multi-Select**: Currently single teamId, should support multiple teams
4. **Dynamic Menu Items**: "More items" and "More pages" expandable menus not fully implemented
5. **Recent/Starred Items**: Mock data, needs database persistence

## Future Enhancements

1. Add keyboard navigation for all dropdowns (arrow keys, Tab)
2. Implement breadcrumb trail in page headers showing context hierarchy
3. Add "Switch Context" quick-picker (Cmd+Shift+P style)
4. Persist recent searches in GlobalSearch
5. Add context validation with error states
6. Implement real-time context sync across browser tabs
