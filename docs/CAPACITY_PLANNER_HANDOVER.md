# Capacity Planner Module - Claude Visual Upgrade Handover

## 📦 Module Overview

The Capacity Planner is a resource management module for enterprise capacity planning. It provides resource utilization tracking, project allocation views, contract horizon visualization, and Gantt-style timeline views.

**Route:** `/enterprise/capacity`

---

## 🏗️ Architecture

### Core Files

| File | Purpose |
|------|---------|
| `src/pages/enterprise/CapacityPlannerPage.tsx` | Main entry (4216 lines) - orchestrates all views |
| `src/stores/capacityViewStore.ts` | Zustand store for view state management |
| `src/lib/catalyst-colors.ts` | Design tokens and color utilities |
| `src/modules/capacity-planner/index.ts` | Module exports |

### Type System
```typescript
// src/modules/capacity-planner/types/index.ts

interface CapacityResource {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  allocation?: number;
  status?: 'available' | 'healthy' | 'at_capacity' | 'over_allocated';
  contract_start_date?: string;
  contract_end_date?: string;
  country_flag_svg?: string;
}

interface ResourceAllocation {
  id: string;
  resource_id: string;
  assignment_id: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
  status: 'committed' | 'forecast';
}

type ViewType = 'cards' | 'table' | 'timeline' | 'assignments' | 'leveling';
type PeriodType = 'weekly' | 'monthly' | 'quarterly';
```

---

## 🎨 Design System - Catalyst V5

### Color Tokens (USE THESE ONLY)
```typescript
// src/lib/catalyst-colors.ts

export const CATALYST_V5 = {
  available: { hex: '#0d9488', bg: 'rgba(13, 148, 136, 0.08)', bgSolid: '#f0fdfa' },
  optimal: { hex: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', bgSolid: '#eff6ff' },
  overAllocated: { hex: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', bgSolid: '#fffbeb' },
  error: { hex: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', bgSolid: '#fef2f2' },
};

export const CATALYST = {
  blue: { 600: '#2563eb', 500: '#3b82f6', 100: '#dbeafe', 50: '#eff6ff' },
  teal: { 600: '#0d9488', 500: '#14b8a6', 100: '#ccfbf1', 50: '#f0fdfa' },
  orange: { 600: '#d97706', 500: '#f59e0b', 100: '#fef3c7', 50: '#fffbeb' },
  red: { 600: '#ef4444', 500: '#f87171', 100: '#fee2e2', 50: '#fef2f2' },
  slate: { 900: '#0f172a', 700: '#334155', 500: '#64748b', 200: '#e2e8f0', 50: '#f8fafc' },
  grey: { 900: '#0a0a0a', 700: '#404040', 500: '#737373', 200: '#e5e5e5', 50: '#fafafa' },
};
```

### Status Color Functions
```typescript
// Get colors based on allocation percentage
getAllocationTheme(percentage: number) → { status, bg, text, bar, label }
getAllocationStatus(percentage: number) → { status, color, bg, border, bar }
getUtilizationColor(percentage: number) → string
getTimelineCellColors(percentage: number) → { bg, text }
```

### CSS Variables (Dark Mode)
```css
/* From index.css - Dark mode tokens */
--surface-1: 14 14 14;      /* Base layer */
--surface-2: 23 23 23;      /* Elevated layer */
--surface-3: 38 38 38;      /* Highest layer */
--text-primary: 250 250 250;
--text-secondary: 163 163 163;
--border-default: 38 38 38;
--border-subtle: 30 30 30;
```

---

## 🧩 Component Inventory

### Header & Navigation
| Component | Location | Purpose |
|-----------|----------|---------|
| `SleekCapacityHeader` | `src/components/capacity/SleekCapacityHeader.tsx` | Main header with tabs, search, filters, stats |
| `CapacityPresentationShell` | `src/components/capacity/CapacityPresentationShell.tsx` | Presentation mode wrapper |

### Resource Views
| Component | Location | Purpose |
|-----------|----------|---------|
| `GroupedTableView` | `src/components/capacity/GroupedTableView.tsx` | Table view with grouping |
| `VirtualizedCardsView` | `src/components/capacity/VirtualizedCardsView.tsx` | Card grid (virtualized) |
| `DraggableCardsView` | `src/components/capacity/DraggableCardsView.tsx` | Drag-and-drop cards |
| `CompactResourceCard` | `src/components/capacity/CompactResourceCard.tsx` | Individual resource card |
| `CompactGroupHeader` | `src/components/capacity/CompactGroupHeader.tsx` | Group section header |

### Timeline & Gantt
| Component | Location | Purpose |
|-----------|----------|---------|
| `EnhancedTimelineView` | `src/components/capacity/timeline/` | Gantt-style timeline |
| `TimelineView` | `src/components/capacity/TimelineView.tsx` | Basic timeline |
| `MiniGantt` | `src/components/capacity/MiniGantt.tsx` | Compact Gantt bars |

### Heatmap
| Component | Location | Purpose |
|-----------|----------|---------|
| `CapacityHeatmap` | `src/components/capacity-heatmap/CapacityHeatmap.tsx` | Main heatmap grid |
| `HierarchicalHeatmap` | `src/components/capacity/HierarchicalHeatmap.tsx` | Grouped heatmap |
| `CapacityAnalyticsView` | `src/components/capacity/CapacityAnalyticsView/` | Analytics dashboard |
| `HeatmapCell` | `src/components/capacity-heatmap/HeatmapCell.tsx` | Individual cell |
| `HeatmapLegend` | `src/components/capacity-heatmap/HeatmapLegend.tsx` | Color legend |

### Project Views
| Component | Location | Purpose |
|-----------|----------|---------|
| `ProjectCapacityView` | `src/components/capacity/ProjectCapacityView/` | Project allocation view |
| `ProjectGrid` | `src/components/capacity/ProjectGrid.tsx` | Project cards grid |
| `ProjectStaffingView` | `src/components/capacity/ProjectStaffingView.tsx` | Staffing breakdown |

### Contract Views
| Component | Location | Purpose |
|-----------|----------|---------|
| `ContractHorizonView` | `src/components/contract-horizon/` | Contract timeline |
| `ContractProgressBar` | `src/components/capacity/ContractProgressBar.tsx` | Contract progress indicator |
| `ContractRingAvatar` | `src/components/capacity/ContractRingAvatar.tsx` | Avatar with contract ring |

### Modals & Panels
| Component | Location | Purpose |
|-----------|----------|---------|
| `AllocationModal` | `src/components/resource-allocation/` | Allocation booking |
| `AllocationBookingModal` | `src/components/capacity/AllocationBookingModal.tsx` | Booking editor |
| `BulkEditModal` | `src/components/capacity/BulkEditModal.tsx` | Bulk operations |
| `Resource360Drawer` | `src/components/capacity/resource360/` | Resource detail drawer |
| `NewAllocationModal` | `src/components/capacity/NewAllocationModal.tsx` | Create allocation |
| `FilterModal` | `src/components/capacity/FilterModal.tsx` | Advanced filters |

### UI Utilities
| Component | Location | Purpose |
|-----------|----------|---------|
| `Avatar360` | `src/components/capacity/Avatar360.tsx` | Avatar with status ring |
| `LocationBadge` | `src/components/capacity/LocationBadge.tsx` | Country flag + location |
| `CapacitySummaryCards` | `src/components/capacity/CapacitySummaryCards.tsx` | Summary stat cards |
| `UndoRedoControls` | `src/components/capacity/UndoRedoControls.tsx` | Undo/redo buttons |
| `ScaleWarningBanner` | `src/components/capacity/ScaleWarningBanner.tsx` | Performance warning |

---

## 🔌 Data Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useCapacityData` | `src/modules/capacity-planner/hooks/useCapacityData.ts` | Main data fetch + metrics |
| `useResourceAllocations` | `src/modules/capacity-planner/hooks/useResourceAllocations.ts` | Allocation CRUD |
| `useResourceAssignments` | `src/modules/capacity-planner/hooks/useResourceAssignments.ts` | Assignment types |
| `useAssignments` | `src/modules/capacity-planner/hooks/useAssignments.ts` | User assignments |
| `useAiRecommendations` | `src/modules/capacity-planner/hooks/useAiRecommendations.ts` | AI suggestions |
| `useCapacityDepartments` | `src/modules/capacity-planner/hooks/useCapacityDepartments.ts` | Department list |
| `useResourceManagement` | `src/modules/capacity-planner/hooks/useResourceManagement.ts` | Resource CRUD |

---

## 🗄️ State Management

### Zustand Store (`capacityViewStore.ts`)
```typescript
interface CapacityViewState {
  primaryView: 'resources' | 'projects' | 'contracts';
  resourceView: 'cards' | 'table' | 'timeline' | 'heatmap';
  projectView: 'cards' | 'timeline';
  filters: {
    departmentFilter: string;
    activeFilter: 'all' | 'available' | 'atCapacity' | 'over';
    searchQuery: string;
    groupBy: 'none' | 'assignment' | 'department';
  };
  timeline: {
    period: 'weekly' | 'monthly' | 'quarterly';
    year: number;
    scrollLeft: number;
  };
  ui: {
    isCollapsed: boolean;
    compactMode: boolean;
    expandedRows: string[];
  };
  presentationMode: boolean;
}
```

---

## 🎯 View Modes

### Primary Views
1. **Resources** → resourceView: `cards | table | timeline | heatmap`
2. **Projects** → projectView: `cards | timeline`
3. **Contracts** → Contract horizon visualization

### Tab Navigation (in header)
- Utilization (heatmap)
- Resources (table)
- Projects (cards)
- Gantt (timeline)
- Contracts (horizon)

---

## 📐 Layout Patterns

### Main Page Structure
```tsx
<PageChrome>
  {presentationMode ? (
    <CapacityPresentationShell>
      {/* View content */}
    </CapacityPresentationShell>
  ) : (
    <div className="flex flex-col h-full">
      <SleekCapacityHeader {...headerProps} />
      <div className="flex-1 overflow-auto">
        {/* Active view content */}
      </div>
    </div>
  )}
</PageChrome>
```

### Card Grid Pattern
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
  {resources.map(resource => (
    <CompactResourceCard key={resource.id} resource={resource} />
  ))}
</div>
```

### Table Pattern
```tsx
<GroupedTableView
  resources={filteredResources}
  groupBy={groupBy}
  onResourceClick={openResource360}
  onAllocationClick={openAllocationModal}
/>
```

---

## ⚠️ CRITICAL CONSTRAINTS

### DO NOT MODIFY
1. **Supabase queries** - Keep all `useQuery` / RPC calls intact
2. **Type definitions** - Keep all interfaces unchanged
3. **Hook logic** - Keep `useCapacityData`, `useResourceAllocations`, etc.
4. **Route structure** - Keep `/enterprise/capacity` path
5. **State management** - Keep Zustand store actions/shape

### STYLE-ONLY CHANGES
1. ✅ Tailwind classes on components
2. ✅ CSS variables in index.css
3. ✅ Component layout/spacing
4. ✅ Animation/transitions (framer-motion)
5. ✅ Icon choices (lucide-react)
6. ✅ Color token usage

### COLOR RULES
- Use `CATALYST_V5` tokens for status colors
- Use `CATALYST.slate` / `CATALYST.grey` for neutrals
- Use CSS variables for dark mode: `dark:bg-[var(--surface-2)]`
- NEVER hardcode hex values in components

---

## 📋 Claude Prompt Template

```
You are upgrading the visual design of the Catalyst Capacity Planner module.

CONSTRAINTS:
- ONLY modify styling (Tailwind classes, CSS)
- DO NOT change any TypeScript logic, hooks, or Supabase queries
- DO NOT change type definitions or interfaces
- DO NOT rename components or change exports
- Preserve all existing functionality

COLOR SYSTEM:
- Available/Healthy: Teal #0d9488
- Optimal/At Capacity: Blue #2563eb
- Over-allocated/Warning: Orange #d97706
- Critical/Error: Red #ef4444
- Use CATALYST_V5 tokens from src/lib/catalyst-colors.ts

DARK MODE:
- Use CSS variables: var(--surface-1), var(--surface-2), var(--text-primary)
- Prefix dark mode: dark:bg-[var(--surface-2)]

TASK:
[Describe specific visual changes here]

FILES TO REVIEW:
[List specific component files]
```

---

## 📁 File Tree

```
src/
├── components/
│   ├── capacity/
│   │   ├── CapacityAnalyticsView/
│   │   ├── ProjectCapacityView/
│   │   ├── resource360/
│   │   ├── timeline/
│   │   ├── SleekCapacityHeader.tsx
│   │   ├── CompactResourceCard.tsx
│   │   ├── GroupedTableView.tsx
│   │   ├── HierarchicalHeatmap.tsx
│   │   ├── TimelineView.tsx
│   │   ├── AllocationBookingModal.tsx
│   │   ├── Avatar360.tsx
│   │   └── [30+ more components]
│   └── capacity-heatmap/
│       ├── CapacityHeatmap.tsx
│       ├── HeatmapCell.tsx
│       ├── HeatmapLegend.tsx
│       └── [8 more components]
├── modules/capacity-planner/
│   ├── components/import/
│   ├── hooks/
│   │   ├── useCapacityData.ts
│   │   ├── useResourceAllocations.ts
│   │   └── [6 more hooks]
│   ├── types/index.ts
│   └── index.ts
├── pages/enterprise/
│   └── CapacityPlannerPage.tsx (4216 lines)
├── stores/
│   └── capacityViewStore.ts
└── lib/
    └── catalyst-colors.ts
```

---

## 🚀 Getting Started

1. Export this file
2. Export key component files you want to upgrade
3. Paste into Claude with the prompt template above
4. Return generated code here for implementation

**Need specific file contents?** Ask for:
- Individual component TSX files
- CSS module files
- Specific sections of CapacityPlannerPage.tsx
