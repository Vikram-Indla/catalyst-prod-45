# Release & Test Management Module - Complete Technical Specification

**Generated:** 2026-02-06  
**Module Version:** 5.0  
**Base Route:** `/releases/*`

---

## Table of Contents

1. [Overview](#overview)
2. [Route Architecture](#route-architecture)
3. [Database Schema](#database-schema)
4. [Hooks & Data Layer](#hooks--data-layer)
5. [Components](#components)
6. [Design System & CSS](#design-system--css)
7. [Functional Specifications](#functional-specifications)

---

## Overview

The Release & Test Management module provides comprehensive release lifecycle management, test execution, defect tracking, and quality gate monitoring. It is fully integrated with a live database and contains no mock data fallbacks in core dashboards.

### Key Features
- **Command Center**: Executive dashboard with KPIs, health metrics, and real-time data
- **All Releases**: Portfolio-wide release management with cards, table, and timeline views
- **Test Management**: Test cases, test plans, test cycles, and execution workflows
- **Defect Tracking**: Full defect lifecycle with Kanban and table views
- **Quality Gates**: Configurable quality thresholds with pass/fail tracking
- **Coverage Reports**: Test coverage analysis and RTM (Requirements Traceability Matrix)
- **Calendar View**: Visual release timeline and scheduling

---

## Route Architecture

### Primary Routes (`/releases/*`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/releases` | `Navigate → /releases/command-center` | Default redirect |
| `/releases/command-center` | `CommandCenterPage` | Executive dashboard with KPIs |
| `/releases/dashboard` | `ReleaseDashboardOverviewPage` | Release overview dashboard |
| `/releases/all` | `AllReleasesPage` | All releases portfolio view |
| `/releases/calendar` | `CalendarPage` | Release calendar visualization |
| `/releases/compare` | `ComparePage` | Release comparison tool |
| `/releases/my-scope` | `MyTestScopePage` | Personal test scope |
| `/releases/test-plans` | `ReleasesTestPlansPage` | Test plan management |
| `/releases/test-plans/:planId` | `ReleasesTestPlanDetailPage` | Test plan details |
| `/releases/test-cases` | `ReleasesTestCasesPage` | Test case library |
| `/releases/test-cases/:id` | `ReleasesTestCaseDetailPage` | Test case details |
| `/releases/test-cycles` | `ReleasesTestCyclesPage` | Test cycle management |
| `/releases/test-cycles/:cycleId` | `ReleasesCycleCommandCenter` | Cycle command center |
| `/releases/templates` | `ReleasesCycleTemplatesPage` | Cycle templates |
| `/releases/workload` | `WorkloadDashboard` | Team workload dashboard |
| `/releases/execution` | `ExecutionPage` | Test execution hub |
| `/releases/execution/:cycleId/:testCaseId` | `ReleasesTestExecutionPage` | Execute specific test |
| `/releases/execute/:cycleId/:testCaseId` | `TestExecutionFocusPage` | Focus mode execution |
| `/releases/ask-ai` | `AskAIPage` | AI-powered test assistance |
| `/releases/coverage` | `CoverageReportsPage` | Coverage analysis |
| `/releases/quality-gates` | `QualityGatesPage` | Quality gate configuration |
| `/releases/rtm` | `RTMPage` | Requirements Traceability Matrix |
| `/releases/defects` | `ReleasesDefectsPage` | Defect management |
| `/releases/defects/:id` | `ReleasesDefectDetailPage` | Defect details |
| `/releases/:releaseId` | `ReleaseDashboardV5Page` | Individual release dashboard |

### Incident Module Routes (`/release/*`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/release/incidents` | `IncidentRoomList` | Incident list view |
| `/release/incidents/dashboard` | `IncidentsDashboard` | Incident dashboard |
| `/release/incidents/analytics` | `IncidentAnalyticsPage` | Incident analytics |
| `/release/incidents/insights` | `IncidentInsightsPage` | AI insights |
| `/release/incidents/kanban` | `IncidentKanbanPage` | Kanban board |
| `/release/incidents/create` | `CreateIncident` | Create new incident |
| `/release/incidents/reports` | `IncidentReports` | Incident reports |
| `/release/incidents/:incidentId` | `IncidentRoomDetail` | Incident details |
| `/release/incident-command-center` | `IncidentCommandCenter` | Incident command center |
| `/release/committee-queue` | `CommitteeQueue` | CAP committee queue |

---

## Database Schema

### Core Tables

#### `releases`
```sql
CREATE TABLE releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  description TEXT,
  status TEXT DEFAULT 'planned',
  target_date TIMESTAMP WITH TIME ZONE,
  release_date TIMESTAMP WITH TIME ZONE,
  release_vehicle_id UUID REFERENCES release_vehicles(id),
  owner_id UUID REFERENCES profiles(id),
  readiness_pct NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `test_cases`
```sql
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  preconditions TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  type TEXT DEFAULT 'manual',
  folder_id UUID REFERENCES test_folders(id),
  project_id UUID REFERENCES projects(id),
  created_by UUID REFERENCES profiles(id),
  assignee_id UUID REFERENCES profiles(id),
  estimated_time INTEGER,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `tm_test_cycles`
```sql
CREATE TABLE tm_test_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  release_id UUID REFERENCES releases(id),
  project_id UUID REFERENCES projects(id),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  planned_execution_date TIMESTAMP WITH TIME ZONE,
  environment TEXT,
  build_version TEXT,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `tm_test_executions`
```sql
CREATE TABLE tm_test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) NOT NULL,
  cycle_id UUID REFERENCES tm_test_cycles(id) NOT NULL,
  status TEXT DEFAULT 'not_run',
  executed_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  notes TEXT,
  actual_result TEXT,
  defects_found TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `defects`
```sql
CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id TEXT NOT NULL UNIQUE,
  defect_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  workflow_status TEXT DEFAULT 'new',
  environment TEXT,
  steps_to_reproduce JSONB,
  expected_result TEXT NOT NULL,
  actual_result TEXT NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  reporter_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  target_release_id UUID REFERENCES releases(id),
  test_case_id UUID REFERENCES test_cases(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),
  resolution TEXT,
  root_cause TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `quality_gates`
```sql
CREATE TABLE quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT DEFAULT '>=',
  is_blocking BOOLEAN DEFAULT false,
  release_id UUID REFERENCES releases(id),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `test_steps` | Test case steps with expected results |
| `test_folders` | Hierarchical test organization |
| `tm_test_plans` | Test plan definitions |
| `tm_test_plan_cases` | Test plan to test case mapping |
| `tm_cycle_templates` | Reusable cycle templates |
| `defect_attachments` | Defect file attachments |
| `defect_comments` | Defect comments/discussion |
| `defect_history` | Defect change audit log |
| `daily_execution_stats` | Aggregated daily statistics |

---

## Hooks & Data Layer

### Release Hooks (`src/hooks/releases/`)

#### `useAllReleases`
```typescript
import { useAllReleases } from '@/hooks/releases/useAllReleases';

const { data, isLoading, refetch } = useAllReleases({
  filter: { status: ['active'], search: '' },
  sort: { column: 'name', direction: 'asc' },
  page: 0,
  pageSize: 12,
});
// Returns: { releases: Release[], total: number }
```

#### `useReleaseQualityGates`
```typescript
import { useReleaseQualityGates } from '@/hooks/releases/useReleaseQualityGates';

const { data: gates, isLoading } = useReleaseQualityGates(releaseId);
// Returns quality gate status and metrics
```

#### `useReleasesFilter`
```typescript
import { useReleasesFilter } from '@/hooks/releases/useReleasesFilter';

const { filter, setFilter, clearFilters } = useReleasesFilter();
```

#### `useReleasesSelection`
```typescript
import { useReleasesSelection } from '@/hooks/releases/useReleasesSelection';

const { selected, toggle, toggleAll, clear, selectAllState } = useReleasesSelection(ids);
```

### Command Center Hooks (`src/modules/command-center/hooks/`)

```typescript
import {
  useCommandCenterKPIs,
  useReleaseHealth,
  useDefectTrends,
  useQualityGates,
  useTestProgress,
  useTeamPerformance,
  useActivities,
  useMilestones,
} from '@/modules/command-center/hooks';

// KPIs with trend data
const { data: kpis } = useCommandCenterKPIs();

// Release health with pass rates
const { data: releases } = useReleaseHealth(limit);

// Defect trend chart data
const { data: trends } = useDefectTrends('30d');

// Quality gate status
const { data: gates } = useQualityGates();

// Test execution progress
const { data: progress } = useTestProgress(weeks);

// Team performance metrics
const { data: team } = useTeamPerformance(limit);

// Recent activity feed
const { data: activities } = useActivities(limit);

// Upcoming milestones
const { data: milestones } = useMilestones(limit);
```

### Core Release Hook (`src/hooks/useReleases.ts`)

```typescript
import { useReleases, useCreateRelease, Release } from '@/hooks/useReleases';

// Get releases for a vehicle
const { data: releases } = useReleases(vehicleId);

// Create new release
const createRelease = useCreateRelease();
createRelease.mutate({
  release_vehicle_id: vehicleId,
  name: 'Release 2.0',
  target_date: '2026-03-01',
  notes: 'Major feature release',
});
```

---

## Components

### All Releases Feature (`src/features/all-releases/`)

#### Exports
```typescript
export { SummaryCards } from './components/SummaryCards';
export { AIInsightsBar } from './components/AIInsightsBar';
export { ReleaseCard } from './components/ReleaseCard';
export { CardGridView } from './components/CardGridView';
export { ViewToggle } from './components/ViewToggle';
export { FilterBar } from './components/FilterBar';

export { 
  calculateHealthScore, 
  getHealthLevel, 
  getHealthResult,
  HEALTH_THRESHOLDS 
} from './utils/healthScore';

export type { 
  HealthLevel, 
  HealthResult, 
  HealthScoreInputs,
  ViewMode,
  ReleaseSummary,
  AIReleaseInsight,
  Release as EnhancedRelease,
} from './types';
```

#### Health Score Calculation
```typescript
// HEALTH_THRESHOLDS
const HEALTH_THRESHOLDS = {
  healthy: 80,    // >= 80%
  attention: 60,  // 60-79%
  at_risk: 40,    // 40-59%
  critical: 0,    // < 40%
};

// Calculate health score
const score = calculateHealthScore({
  passRate: 85,
  coverage: 70,
  openDefects: 5,
  blockerDefects: 0,
  daysRemaining: 14,
});
```

### Release Calendar Feature (`src/features/release-calendar/`)

```typescript
export { ReleaseCalendar } from './components/ReleaseCalendar';
export { CalendarHeader } from './components/CalendarHeader';
export { CalendarAIInsights } from './components/CalendarAIInsights';
export { CalendarGrid } from './components/CalendarGrid';
export { ReleaseBar } from './components/ReleaseBar';
```

### Release Dashboard Feature (`src/features/release-dashboard/`)

```typescript
// Signoff management
export { SignoffPanel } from './components/SignoffPanel';

// Hooks
export { 
  useReleaseSignoffs,
  useRequestSignoff,
  useSubmitSignoff,
} from './hooks/useSignoff';
```

### Defect Components (`src/components/releases/defects/`)

| Component | Description |
|-----------|-------------|
| `DefectTableView` | Sortable, filterable defect table |
| `DefectKanbanView` | Kanban board by status |
| `ReportDefectModal` | Create new defect form |
| `EditDefectModal` | Edit existing defect |
| `ReassignModal` | Bulk reassign defects |

---

## Design System & CSS

### Color Tokens (Catalyst V5)

```typescript
// src/lib/catalyst-colors.ts
export const CATALYST_V5 = {
  // Primary
  primary: '#2563eb',
  primaryLighter: '#eff6ff',
  
  // Status Colors
  teal: '#0d9488',
  tealLighter: '#f0fdfa',
  
  warning: '#d97706',
  warningLighter: '#fef3c7',
  
  danger: '#ef4444',
  dangerLighter: '#fef2f2',
  
  // Semantic
  success: '#10b981',
  info: '#3b82f6',
};
```

### Health Status Colors

```css
/* Healthy */
.health-healthy {
  background-color: #f0fdfa;
  color: #0d9488;
}

/* Attention */
.health-attention {
  background-color: #fef3c7;
  color: #d97706;
}

/* At Risk */
.health-at-risk {
  background-color: #fef2f2;
  color: #ef4444;
}

/* Critical */
.health-critical {
  background-color: #fef2f2;
  color: #dc2626;
}
```

### Component Styling Patterns

```tsx
// KPI Card with accent border
<motion.div
  className="relative bg-card border rounded-xl p-5 overflow-hidden"
>
  <div 
    className="absolute top-0 left-0 right-0 h-1"
    style={{ backgroundColor: colors.border }}
  />
  {/* Content */}
</motion.div>

// Progress Ring
<ProgressRing 
  percentage={85} 
  status="healthy" 
  size={48} 
/>

// Badge variants
<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
  v2.1
</Badge>
```

### Responsive Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }

/* Max container width */
.max-w-\[1440px\] { max-width: 1440px; }
```

---

## Functional Specifications

### Command Center Dashboard

**Auto-Refresh:** 2-minute interval  
**Export Formats:** PDF, CSV, Excel  
**Documentation Downloads:**
- Module Documentation (.md)
- Feature Hierarchy Tree (.md)
- Complete Technical Spec (.md)

**KPI Cards (Clickable to filter):**
1. Total Tests - Test case count
2. Pass Rate - Execution success percentage
3. Open Defects - Unresolved defect count
4. Blocked Tests - Blocked execution count

**Sections:**
- Release Health (top 5 by risk)
- Test Progress (stacked bar chart)
- Defect Trends (line chart)
- Quality Gates (pass/warning/fail)
- Team Performance (executions per member)
- Activity Feed (recent actions)
- Upcoming Milestones

### All Releases Page

**View Modes:**
- Cards (default) - Visual cards with health indicators
- Table - Sortable/filterable data grid
- Timeline - Gantt-style timeline

**Filters:**
- Status: planning, in_progress, testing, staging, released, cancelled
- Health: healthy, attention, at_risk, critical
- Quarter: Q1-Q4 or custom range
- Search: text search across name/description

**Bulk Actions:**
- Change Status
- Reassign Owner
- Archive

**Export Options:**
- CSV (filtered or all)
- Excel (filtered or all)

### Test Execution Flow

1. **Select Cycle** → `/releases/test-cycles/:cycleId`
2. **Choose Test Case** → View in cycle context
3. **Execute** → `/releases/execute/:cycleId/:testCaseId`
4. **Record Result** → Pass/Fail/Blocked with notes
5. **Log Defect** (if failed) → Automatic linking

### Quality Gates

**Standard Gates:**
| Gate | Metric | Threshold |
|------|--------|-----------|
| Pass Rate | Test pass % | >= 95% |
| Coverage | Code coverage | >= 80% |
| Blocker Defects | Critical bugs | = 0 |
| Performance | Response time | <= 2s |
| Security Scan | Vulnerabilities | = 0 |

**Status Logic:**
- `passed`: Current value meets threshold
- `warning`: Within 10% of threshold
- `failed`: Below threshold

### Defect Workflow States

```
new → in_progress → in_review → resolved → closed
         ↓              ↓
      blocked       reopened
```

**Severity Levels:** Blocker, Critical, Major, Minor, Trivial  
**Priority Levels:** Highest, High, Medium, Low, Lowest

---

## Export Utilities

### Available Exports

```typescript
import { exportToCSV } from '@/lib/exportUtils';
import { exportToExcel, exportToCsv, exportToPdf } from '@/utils/exports';
import { downloadDocumentation } from '@/utils/releaseModuleDocumentation';
import { downloadFeatureTree } from '@/utils/releaseModuleFeatureTree';
import { downloadCompleteSpec } from '@/utils/releaseModuleCompleteSpec';

// Basic CSV export
exportToCSV(data, 'releases', ['id', 'name', 'status']);

// Rich exports with formatting
exportToExcel(data, 'releases-report', columns);
exportToPdf(data, 'releases-report', columns);

// Documentation downloads
downloadDocumentation();
downloadFeatureTree();
downloadCompleteSpec();
```

---

## Integration Points

### Supabase Client

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query releases
const { data, error } = await supabase
  .from('releases')
  .select('*, owner:profiles(*)')
  .eq('status', 'active')
  .order('target_date', { ascending: true });
```

### React Query Keys

```typescript
// Release keys
const releaseKeys = {
  all: ['releases'] as const,
  forVehicle: (vehicleId: string) => [...releaseKeys.all, 'vehicle', vehicleId],
};

// Command center keys
const commandCenterKeys = {
  kpis: ['command-center', 'kpis'],
  health: (limit: number) => ['command-center', 'health', limit],
  defects: (period: string) => ['command-center', 'defects', period],
  gates: ['command-center', 'gates'],
};
```

---

## File Structure

```
src/
├── pages/releases/
│   ├── AllReleasesPage.tsx
│   ├── CalendarPage.tsx
│   ├── CommandCenterPage.tsx
│   ├── ComparePage.tsx
│   ├── CoverageReportsPage.tsx
│   ├── CycleCommandCenter.tsx
│   ├── CycleTemplatesPage.tsx
│   ├── DefectDetailPage.tsx
│   ├── DefectsPage.tsx
│   ├── ExecutionPage.tsx
│   ├── MyTestScopePage.tsx
│   ├── QualityGatesPage.tsx
│   ├── ReleaseDashboardOverviewPage.tsx
│   ├── ReleaseDashboardV5Page.tsx
│   ├── TestCaseDetailPage.tsx
│   ├── TestCasesLibraryPage.tsx
│   ├── TestCasesPage.tsx
│   ├── TestCyclesPage.tsx
│   ├── TestExecutionPage.tsx
│   ├── TestPlanDetailPage.tsx
│   └── TestPlansPage.tsx
├── pages/release/
│   ├── CAPCommitteeQueuePage.tsx
│   ├── CreateIncidentPage.tsx
│   ├── IncidentCommandCenter.tsx
│   ├── IncidentDashboardPage.tsx
│   ├── IncidentReportsPage.tsx
│   ├── IncidentRoomDetail.tsx
│   ├── IncidentRoomList.tsx
│   ├── IncidentsListPage.tsx
│   └── IncidentViewPage.tsx
├── features/
│   ├── all-releases/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── index.ts
│   │   └── types.ts
│   ├── release-calendar/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── index.ts
│   │   └── types.ts
│   └── release-dashboard/
│       ├── components/
│       ├── hooks/
│       ├── types/
│       └── utils/
├── hooks/releases/
│   ├── useAllReleases.ts
│   ├── useReleaseQualityGates.ts
│   ├── useReleaseReadiness.ts
│   ├── useReleasesFilter.ts
│   └── useReleasesSelection.ts
├── modules/command-center/
│   ├── hooks/
│   └── types/
└── components/releases/
    └── defects/
        ├── DefectTableView.tsx
        ├── DefectKanbanView.tsx
        ├── ReportDefectModal.tsx
        ├── EditDefectModal.tsx
        └── ReassignModal.tsx
```

---

## API Reference Summary

### REST-like Supabase Queries

| Operation | Table | Example |
|-----------|-------|---------|
| List releases | `releases` | `.select('*').order('target_date')` |
| Get release by ID | `releases` | `.select('*').eq('id', id).single()` |
| Create release | `releases` | `.insert({ name, status })` |
| Update release | `releases` | `.update({ status }).eq('id', id)` |
| List test cases | `test_cases` | `.select('*, steps:test_steps(*)')` |
| Get defects | `defects` | `.select('*').eq('project_id', projectId)` |
| Log execution | `tm_test_executions` | `.insert({ test_case_id, cycle_id, status })` |

---

*End of Release Module Technical Specification*
