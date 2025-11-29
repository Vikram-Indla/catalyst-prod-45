# Epic Backlog Module

A comprehensive backlog management system for Jira Align-style epic tracking with advanced features including drag-drop ranking, Kanban board, WSJF prioritization, and detailed epic management.

## Features

### Core Functionality
- **List View**: Traditional list-based backlog with PI sections
- **Kanban View**: State-based columns with drag-drop state transitions
- **Drag & Drop Ranking**: Reorder items within sections by dragging
- **Context Menu**: Right-click actions for quick operations
- **Quick Add**: Inline item creation without leaving the page
- **Epic Details Panel**: Comprehensive slide-out with 6 tabs
- **Unassigned Backlog**: Side panel for items not assigned to any PI
- **Filters & Search**: Advanced filtering by portfolio, state, health, and more
- **Column Configuration**: Customize which columns are displayed
- **CSV Export**: Export backlog items to CSV file
- **WSJF Prioritization**: Weighted Shortest Job First scoring

### Epic Details Tabs
1. **Details**: Basic information (description, state, health, owner, estimate)
2. **Children**: List of child features with progress tracking
3. **Intake**: Strategic drivers, investment type, customers
4. **Benefits**: Business value, cost savings, customer impact
5. **Value**: Strategic value score, estimate confidence, MVP/capitalization flags
6. **Forecast**: Dates (start, end, target, initiation), effort estimates

### Context Menu Actions
- Open epic details
- Duplicate epic
- Move to top/bottom of list
- Move to specific Program Increment
- Move to parking lot (soft archive)
- Delete (soft delete)

### Data Management
- **State Management**: React Context with URL parameter sync
- **Mutations**: TanStack Query for optimistic updates
- **Soft Deletes**: Items marked as deleted without removal
- **Ranking System**: Global rank field for ordering
- **PI Assignment**: Link epics to Program Increments

## File Structure

```
src/modules/backlog/
├── README.md                           # This file
├── index.ts                           # Module exports
├── types.ts                           # TypeScript interfaces
├── hooks/
│   ├── useBacklogState.tsx           # State management with Context
│   └── useBacklogActions.ts          # Mutation hooks for CRUD operations
├── api/
│   └── backlogApi.ts                 # API layer for data fetching
├── utils/
│   └── exportCsv.ts                  # CSV export utility
└── components/
    ├── BacklogWorkspace.tsx          # Main container component
    ├── BacklogHeader.tsx             # Top navigation bar
    ├── BacklogToolbar.tsx            # Action buttons toolbar
    ├── BacklogListView.tsx           # List view with sections
    ├── BacklogKanbanView.tsx         # Kanban board view
    ├── BacklogSection.tsx            # PI section with items
    ├── BacklogContextMenu.tsx        # Right-click menu
    ├── QuickAddRow.tsx               # Inline add form
    ├── EpicDetailsPanel.tsx          # Slide-out details panel
    ├── UnassignedBacklogPanel.tsx    # Unassigned items panel
    ├── BacklogFiltersDialog.tsx      # Filter configuration
    ├── BacklogColumnsDialog.tsx      # Column selection
    └── PrioritizationDialog.tsx      # WSJF calculation
```

## Usage

### Basic Implementation

```tsx
import { BacklogStateProvider, BacklogWorkspace } from '@/modules/backlog';

export default function BacklogPage() {
  return (
    <BacklogStateProvider>
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
```

### Using Backlog State

```tsx
import { useBacklogState } from '@/modules/backlog';

function CustomComponent() {
  const {
    scope,
    type,
    view,
    filters,
    setView,
    setFilters,
    // ... other state
  } = useBacklogState();

  // Access or modify backlog state
}
```

### Using Backlog Actions

```tsx
import { useBacklogActions } from '@/modules/backlog';

function CustomComponent() {
  const actions = useBacklogActions('epic');

  const handleDuplicate = (itemId: string) => {
    actions.duplicate(itemId);
  };

  const handleMoveToPI = (itemId: string, piId: string) => {
    actions.moveToPI(itemId, piId);
  };
}
```

### CSV Export

```tsx
import { exportBacklogToCsv } from '@/modules/backlog';

function ExportButton({ items }: { items: BacklogItem[] }) {
  const handleExport = () => {
    exportBacklogToCsv(items, 'my-backlog-export.csv');
  };

  return <button onClick={handleExport}>Export</button>;
}
```

## Database Schema

### Required Tables
- `epics` - Main epic items
- `features` - Child features
- `program_increments` - PI definitions
- `epic_program_increments` - Epic-PI assignments
- `portfolios` - Portfolio groupings
- `strategic_themes` - Theme groupings

### Key Fields
- `global_rank` - Global ordering position
- `parked_at` - Soft archive timestamp
- `deleted_at` - Soft delete timestamp
- `state` - Epic state (not_started, in_progress, accepted)
- `health` - Health indicator (green, yellow, red, gray)
- `mvp` - MVP flag
- `blocked` - Blocking flag

## State Management

### URL Parameters
The backlog state syncs with URL query parameters:
- `scope` - Viewing scope (portfolio, program, team)
- `type` - Item type (epic, feature, story)
- `timeboxType` - Timebox type (pi, sprint)
- `timeboxId` - Selected timebox ID
- `view` - View mode (list, kanban, sprint)
- `columns` - Visible columns (comma-separated)

### Context Provider
```tsx
<BacklogStateProvider>
  {/* All backlog components have access to state */}
</BacklogStateProvider>
```

## Testing

### E2E Tests (Playwright)
- `e2e/epic-backlog-list.spec.ts` - List view tests
- `e2e/epic-backlog-kanban.spec.ts` - Kanban view tests
- `e2e/epic-backlog-filters.spec.ts` - Filter dialog tests
- `e2e/epic-backlog-actions.spec.ts` - Actions and dialogs tests
- `e2e/epic-search-filter.spec.ts` - Search functionality tests
- `e2e/epic-details-panel.spec.ts` - Details panel tests

### Running Tests
```bash
npm run test:e2e
```

## Best Practices

### Performance
- Use React Query for caching and optimistic updates
- Implement virtualization for large lists (future enhancement)
- Debounce search inputs
- Lazy load detail panels

### Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in dialogs
- Screen reader friendly

### State Updates
- Use mutations for server updates
- Optimistic UI updates where appropriate
- Invalidate queries after mutations
- Handle loading and error states

## Future Enhancements
- [ ] Bulk operations (move, delete multiple items)
- [ ] Advanced filtering (saved filters, filter presets)
- [ ] Sprint view for sprint-scoped items
- [ ] Timeline view with Gantt-style visualization
- [ ] Import from CSV
- [ ] Real-time collaboration indicators
- [ ] Undo/redo for actions
- [ ] Item templates
- [ ] Custom fields support
- [ ] Automated ranking algorithms

## Dependencies
- `@hello-pangea/dnd` - Drag and drop
- `@tanstack/react-query` - Data fetching and caching
- `@radix-ui/*` - UI primitives
- `sonner` - Toast notifications
- `lucide-react` - Icons

## Routes
- `/portfolio/:portfolioId/backlog` - Portfolio-scoped backlog
- `/backlog/epics` - Global epic backlog
- Primary route: Uses portfolio context from URL parameters
