# Catalyst Hub Architecture — ReleaseHub, TestHub, IncidentHub

> Complete functional, technical, integration, and wiring documentation.

---

## Table of Contents

1. [ReleaseHub — Release Management](#1-releasehub--release-management)
2. [TestHub — QA & Test Management](#2-testhub--qa--test-management)
3. [IncidentHub — Incident & Operations Management](#3-incidenthub--incident--operations-management)
4. [Cross-Hub Wiring & Data Flow](#4-cross-hub-wiring--data-flow)

---

## 1. ReleaseHub — Release Management

### 1.1 Functional Scope

ReleaseHub manages the release lifecycle across the portfolio — from planning through UAT to production deployment.

#### Features

| Feature | Route | Description |
|---------|-------|-------------|
| Command Center | `/releasehub/command-center` | Executive dashboard with KPIs: pass rate, open defects, blocked tests, release health |
| All Releases | `/releasehub/all` | Portfolio-wide view (cards, table, timeline modes) with bulk actions |
| Release Dashboard | `/releasehub/dashboard` | Overview metrics for all releases |
| Release Detail (R360) | `/releasehub/:releaseId` | Deep-dive with V5 dashboard |
| Calendar | `/releasehub/calendar` | Visual timeline of release schedules |
| Compare | `/releasehub/compare` | Side-by-side release metric comparison |
| Quality Gates | `/releasehub/quality-gates` | Go/no-go gate definitions and status |
| Coverage Reports | `/releasehub/coverage` | Test coverage analysis |
| RTM | `/releasehub/rtm` | Requirements Traceability Matrix |
| Production Events | `/releasehub/production-events` | Post-release event tracking |
| Ask AI | `/releasehub/ask-ai` | AI-powered release intelligence |

### 1.2 Technical Stack

#### Pages (`src/pages/releases/`)

| Page Component | Route |
|----------------|-------|
| `CommandCenterPage.tsx` | `/releasehub/command-center` |
| `ReleaseDashboardOverviewPage.tsx` | `/releasehub/dashboard` |
| `AllReleasesPage.tsx` | `/releasehub/all` |
| `CalendarPage.tsx` | `/releasehub/calendar` |
| `ComparePage.tsx` | `/releasehub/compare` |
| `QualityGatesPage.tsx` | `/releasehub/quality-gates` |
| `CoverageReportsPage.tsx` | `/releasehub/coverage` |
| `ReleaseDashboardV5Page.tsx` | `/releasehub/:releaseId` |

#### Components (`src/components/releases/`)

```
src/components/releases/
├── all-releases/          # Portfolio views (cards, table, timeline)
├── coverage/              # Coverage analysis components
├── cycle-command-center/  # Cycle-level command center
├── dashboard/             # Release dashboard widgets
├── defects/               # Defect list/detail components
├── quality-gates/         # Gate definitions and status
├── smart-assignment/      # AI-powered test assignment
├── test-case-detail/      # Test case detail view
├── test-cases/            # Test case library (table, grid, kanban, dialogs)
├── test-cycles/           # Cycle management components
├── test-execution/        # Execution runner components
├── ReleaseCard.tsx        # Release card component
├── ReleaseTable.tsx       # Release table component
├── ReleaseTimeline.tsx    # Gantt-style timeline
├── ReleaseToolbar.tsx     # Filters and actions toolbar
├── ReleaseAIInsights.tsx  # AI insight panel
├── ReleaseHealthChip.tsx  # Health indicator badge
├── ReleaseStatusBadge.tsx # Status lozenge
└── release-utils.ts       # Shared utilities
```

#### Hooks (`src/hooks/releases/`)

| Hook | Purpose |
|------|---------|
| `useAllReleases` | Fetches all releases with filtering/sorting |
| `useReleaseAI` | AI-powered release insights and recommendations |
| `useReleaseQualityGates` | Quality gate CRUD and status tracking |
| `useReleaseReadiness` | Release readiness score calculation |
| `useReleasesFilter` | Filter state management |
| `useReleasesSelection` | Multi-select for bulk actions |
| `useReleasesV2` | V2 release data fetching with enhanced joins |

#### Types (`src/types/releases.ts`)

```typescript
type ReleaseStatus = 'planning' | 'active' | 'uat' | 'released' | 'archived';
type ReleaseHealth = 'healthy' | 'at_risk' | 'critical';

interface Release {
  id: string;
  name: string;
  version: string;
  description: string | null;
  status: ReleaseStatus;
  start_date: string | null;
  target_date: string | null;
  release_date: string | null;
  progress: number;
  health: ReleaseHealth;
  is_blocked: boolean;
  blocked_reason: string | null;
  owner_id: string | null;
  project_id: string | null;
  release_vehicle_id: string;
  test_cases_total: number;
  test_cases_passed: number;
  defects_open: number;
  coverage_percent: number;
  created_at: string;
  updated_at: string | null;
}
```

#### Sidebar (`src/components/layout/ReleasesManagementSidebar.tsx`)

```
Badge: RL | Label: Releases

├── Dashboards
│   ├── Command Center        → /releases/command-center
│   ├── Release Dashboard     → /releases/dashboard
│   └── My Test Scope         → /releases/my-scope [badge: 5]
├── Releases
│   ├── All Releases          → /releases/all
│   ├── Calendar View         → /releases/calendar
│   └── Release Compare       → /releases/compare
├── Test Planning
│   ├── Test Plans            → /releases/test-plans
│   ├── Test Cases            → /releases/test-cases
│   ├── Test Sets             → /releases/test-sets
│   ├── Test Cycles           → /releases/test-cycles
│   ├── Test Execution        → /releases/execution
│   └── Defects               → /releases/defects [badge: 8, danger]
└── Analytics & AI
    ├── Ask AI                → /releases/ask-ai
    ├── Coverage Reports      → /releases/coverage
    ├── Quality Gates         → /releases/quality-gates
    └── RTM                   → /releases/rtm
```

### 1.3 Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `releases` | Core release records | id, name, version, status, target_date, progress, health, test_cases_total, test_cases_passed, defects_open, coverage_percent, project_id, owner_id |
| `release_vehicles` | Release vehicles/trains | id, name |

### 1.4 Routing (App.tsx)

```
/releasehub                    → redirect to /releasehub/command-center
/releasehub/command-center     → ReleasesCommandCenter
/releasehub/dashboard          → ReleaseDashboardOverviewPage
/releasehub/all                → AllReleasesPage
/releasehub/calendar           → CalendarPage
/releasehub/compare            → ComparePage
/releasehub/ask-ai             → AskAIPage
/releasehub/coverage           → CoverageReportsPage
/releasehub/quality-gates      → QualityGatesPage
/releasehub/rtm                → RTMPage
/releasehub/production-events  → ProductionEventsPage
/releasehub/:releaseId         → ReleaseDashboardV5Page

# Legacy redirect
/releases/*                    → redirect to /releasehub/command-center
```

---

## 2. TestHub — QA & Test Management

### 2.1 Functional Scope

TestHub is the comprehensive QA management module covering the entire test lifecycle — from test case authoring through execution to defect tracking.

#### Features

| Feature | Route | Description |
|---------|-------|-------------|
| Dashboard | `/testhub/dashboard` | QA health overview, execution trends, defect density |
| Test Repository | `/testhub/repository` | Folder-organized test case library with versioning |
| Shared Steps | `/testhub/shared-steps` | Reusable test step library |
| Test Sets | `/testhub/test-sets` | Grouped test case collections |
| Test Set Detail | `/testhub/test-sets/:setId` | Individual test set management |
| Test Plans | `/testhub/test-plans` | Hierarchical test planning |
| Plan Detail | `/testhub/test-plans/:planId` | Individual plan management |
| Test Cycles | `/testhub/cycles` | Execution cycles with progress tracking |
| Cycle Detail | `/testhub/cycles/:cycleId` | Cycle management and scope |
| Cycle Report | `/testhub/cycles/:cycleId/report` | Cycle execution report |
| Test Execution | `/testhub/cycles/:cycleId/execute` | Execute tests within a cycle |
| Execution Hub | `/testhub/execution` | Central execution dashboard |
| Test Runs | `/testhub/runs` | Execution history browser |
| Defects | `/testhub/defects` | Full defect lifecycle management |
| Defect Detail | `/testhub/defects/:defectId` | Individual defect view |
| Requirements | `/testhub/requirements` | Requirements coverage tracking |
| Requirement Detail | `/testhub/requirements/:requirementId` | Individual requirement |
| Coverage Matrix | `/testhub/coverage-matrix` | Requirements-to-tests mapping |
| Traceability | `/testhub/traceability` | End-to-end traceability |
| Environments | `/testhub/environments` | Test environment management |
| Environment Detail | `/testhub/environments/:environmentId` | Individual environment |
| Reports | `/testhub/reports` | QA analytics and reports |
| Report Detail | `/testhub/reports/:reportId` | Individual report view |
| Tags | `/testhub/tags` | Test case tagging system |
| Settings | `/testhub/settings` | Module configuration |
| Activity | `/testhub/activity` | Activity feed |
| My Scope | `/testhub/my-scope` | Personal test assignments |
| Import/Export | `/testhub/import-export` | Bulk data operations |
| Caty AI | `/testhub/caty` | AI-powered test generation |
| Docs | `/testhub/docs` | TestHub documentation |

### 2.2 Technical Stack

#### Shell Architecture

TestHub uses an **Outlet-based nested routing shell**:

```tsx
// src/pages/testhub/TestHubPage.tsx
<Route path="/testhub" element={<TestHubPage />}>
  <Route index element={<Navigate to="/testhub/dashboard" />} />
  <Route path="repository" element={<TestRepositoryPage />} />
  <Route path="cycles" element={<TestCyclesPage />} />
  ...
</Route>
```

#### Components

```
src/components/test-management/
├── TMCommandCenter.tsx          # TestHub command center widget
├── DataRowResultsSummary.tsx    # Data-driven test results summary
├── DataRowSelectionModal.tsx    # Data row picker for parameterized tests
├── ExecuteWithDataButton.tsx    # Execute with data rows trigger
├── SubstitutedText.tsx          # Template variable substitution display
├── TestDataPanel.tsx            # Test data management panel
└── index.ts                     # Barrel exports

src/components/releases/test-cases/
├── TestCasesTable.tsx           # Main table view
├── TestCasesGrid.tsx            # Grid/card view
├── TestCasesKanban.tsx          # Kanban board view
├── TestCaseEmptyState.tsx       # Empty state component
├── CreateTestCaseDialogEnterprise/ # Multi-step creation wizard
├── EditTestCaseDialog.tsx       # Edit form
├── TestCaseDetailDrawer.tsx     # Side drawer detail view
├── TestFolderSidebar.tsx        # Folder tree navigation
├── BulkActionsBar.tsx           # Bulk operations toolbar
├── BulkAssignDialog.tsx         # Bulk assign to user
├── BulkMoveDialog.tsx           # Bulk move to folder
├── BulkTagsDialog.tsx           # Bulk tag management
├── ExecuteTestCaseDialog.tsx    # Single test execution
├── ExportTestCasesDialog.tsx    # Export to CSV/Excel
├── ImportTestCasesDialog.tsx    # Import from CSV/Excel
├── TestCaseTemplatesDialog.tsx  # Template library
├── AIGenerateTestCasesDialog.tsx # AI generation from requirements
├── AdvancedFiltersDialog.tsx    # Advanced filter panel
├── KeyboardShortcutsDialog.tsx  # Keyboard shortcut reference
└── MoveToFolderDialog.tsx       # Move to folder picker
```

#### Hooks (`src/hooks/test-management/`) — 28 hooks

| Hook | DB Table | Purpose |
|------|----------|---------|
| `useTestCases` | `tm_test_cases` | Full CRUD with joins to priorities, types, folders, releases, profiles |
| `useTestCycles` | `tm_test_cycles` | Cycle CRUD, clone, complete, reopen |
| `useTestRuns` | `tm_test_runs` | Run execution management |
| `useDefects` | `tm_defects` | Defect lifecycle CRUD |
| `useFolders` | `tm_folders` | Folder hierarchy CRUD |
| `useTestSteps` | `tm_test_steps` | Step management within test cases |
| `useTestPlans` | — | Test plan CRUD |
| `useTestData` | — | Data-driven testing support |
| `useAIGeneration` | — | Gemini-powered test case generation from requirements |
| `useReports` | — | Report generation and analytics |
| `useTrendHooks` | — | Trend data for dashboards |
| `useTestCaseVersions` | — | Version history |
| `useAutoVersioning` | — | Automatic version increment on save |
| `useTestCaseComments` | — | Comment thread management |
| `useTestCaseAuditLog` | — | Audit trail for changes |
| `useTestCaseTags` | — | Tag CRUD and assignment |
| `useTestCaseRelease` | `tm_test_cases` | Release assignment (updates release_id) |
| `useDataRowResults` | `tm_test_runs` | Data-driven execution results |
| `useCreateRunWithDataRows` | `tm_test_runs` | Create runs with parameterized data |
| `useQATesters` | `profiles` | QA tester lookup |
| `useProjects` | `projects` | Project lookup |
| `useReleases` | `releases` | Release lookup for assignment |
| `useRepositoryData` | `tm_test_cases` | Repository tree with folder counts |
| `useTestCyclesEnhanced` | `tm_test_cycles` | Enhanced cycle data with scope items |
| `useTestCaseExecutionHistory` | — | Historical execution data |
| `useLinkedItemsForAI` | — | Fetch requirements context for AI generation |
| `useAdminConfig` | — | Admin configuration |
| `useTestCaseRelease` | — | Release assignment |

#### Additional Hooks (`src/hooks/testhub/`)

| Hook | Purpose |
|------|---------|
| `useCommandCenter` | TestHub command center metrics and data |
| `useReleases` | Release data specific to TestHub context |

#### Types (`src/types/test-cases.ts`)

```typescript
type TestCaseType = 'functional' | 'regression' | 'smoke' | 'integration' 
                  | 'e2e' | 'performance' | 'security' | 'usability';
type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';
type TestCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';
type TestCaseLastRun = 'passed' | 'failed' | 'not_run';

interface TestCase {
  id: string;           // Database UUID — use for ALL DB operations
  key?: string;         // Display key like "TC-0001" — UI only
  title: string;
  release: string;
  type: TestCaseType;
  priority: TestCasePriority;
  status: TestCaseStatus;
  steps: number;
  lastRun: TestCaseLastRun;
  assignee: TestCaseAssignee;
  updated: string;
  folderId?: string | null;
  folderName?: string | null;
  folderPath?: string | null;
  description?: string;
  preconditions?: string;
  postconditions?: string;
  tags?: string[];
  automationStatus?: 'automated' | 'manual' | 'in_progress';
  testSteps?: TestCaseStep[];
}

interface TestCaseStep {
  id: string;
  step: number;
  action: string;
  expectedResult: string;
  testData?: string;
}
```

#### Sidebar (`src/components/layout/TestManagementSidebar.tsx`)

```
Badge: TES | Label: Tests

├── Command Center           → /releases/command-center
├── My Work                  → /releases/my-scope
├── Test Cases               → /releases/test-cases
├── Test Sets                → /releases/test-plans
├── Test Cycles              → /releases/test-cycles
├── Test Execution           → /releases/execution
├── Defects                  → /releases/defects
├── Requirements             → /releases/rtm
├── Traceability             → /releases/coverage
├── Reports                  → /releases/quality-gates
└── Settings (footer)        → /releases/dashboard
```

### 2.3 Database Tables

All TestHub tables use the `tm_` prefix:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `tm_test_cases` | Core test cases | id, case_key, title, status, priority_id, type_id, folder_id, release_id, assigned_to, version, project_id, created_by |
| `tm_test_cycles` | Execution cycles | id, cycle_key, name, status, release_id, start_date, end_date, project_id |
| `tm_test_runs` | Individual run executions | id, run_number, status, executed_by, cycle_scope_id |
| `tm_defects` | Defects | id, status, severity, created_at, updated_at |
| `tm_folders` | Test case folder hierarchy | id, name, path, project_id, parent_id |
| `tm_case_priorities` | Priority lookup | id, name, sort_order |
| `tm_case_types` | Type lookup | id, name |
| `tm_test_steps` | Steps within test cases | id, test_case_id, step_number, action, expected_result |
| `tm_cycle_scope_items` | Test cases assigned to cycles | id, cycle_id, test_case_id |
| `daily_execution_stats` | Aggregated daily execution metrics | date, passed, failed, blocked, skipped |
| `cc_activity_log` | Command center activity tracking | id, type, message, project_id, release_id, test_case_id, cycle_id, defect_id, user_id |

### 2.4 AI Integration

TestHub integrates with **Caty AI** for automated test case generation:

1. **Input**: Requirements from ProductHub (fetched via `useLinkedItemsForAI`)
2. **Model**: Google Gemini (via Lovable AI — no API key required)
3. **Output**: Generated test cases with steps, expected results, and data
4. **Component**: `AIGenerateTestCasesDialog.tsx`
5. **Hook**: `useAIGeneration.ts`

### 2.5 Routing (App.tsx lines 655-692)

```
/testhub                              → Outlet shell (TestHubPage)
  /dashboard                          → TestHubDashboardPage
  /repository                         → TestRepositoryPage
  /shared-steps                       → SharedStepsPage
  /test-sets                          → TestSetsPage
  /test-sets/:setId                   → TestSetDetailPage
  /cycles                             → TestCyclesPage
  /cycles/:cycleId                    → TestCycleDetailPage
  /cycles/:cycleId/report             → CycleReportPage
  /cycles/:cycleId/execute            → TestHubExecutionPage
  /execution                          → ExecutionHubPage
  /runs                               → TestRunsPage
  /defects                            → TestHubDefectsPage
  /defects/:defectId                  → DefectDetailPage
  /requirements                       → TestHubRequirementsPage
  /requirements/:requirementId        → RequirementDetailPage
  /coverage-matrix                    → CoverageMatrixPage
  /traceability                       → TraceabilityPage
  /environments                       → EnvironmentsListPage
  /environments/:environmentId        → EnvironmentDetailPage
  /reports                            → TestHubReportsPage
  /reports/:reportId                  → ReportDetailPage
  /tags                               → TagsListPage
  /settings                           → TestHubSettingsPage
  /activity                           → ActivityFeedPage
  /my-scope                           → MyTestScopePage
  /import-export                      → ImportExportPage
  /test-plans                         → TestPlansListPage
  /test-plans/:planId                 → PlanDetailPage
  /releases                           → ReleasesListPage
  /releases/command-center            → CommandCenterPage
  /releases/quality-gates             → QualityGatesPage
  /releases/:releaseId                → ReleaseDetailPage
  /caty                               → CatyAIPage
  /docs                               → TestHubDocsPage
```

---

## 3. IncidentHub — Incident & Operations Management

### 3.1 Functional Scope

IncidentHub manages production and QA incident lifecycle with strict governance, SLA enforcement, and committee-based resolution.

#### Features

| Feature | Route | Description |
|---------|-------|-------------|
| Incident List | `/release/incidents` | Room-based incident listing with filters |
| Incident Dashboard | `/release/incidents/dashboard` | Operational metrics overview |
| Incident Analytics | `/release/incidents/analytics` | Trend analysis and reporting |
| Incident Insights | `/release/incidents/insights` | AI-driven incident insights |
| Incident Kanban | `/release/incidents/kanban` | Visual workflow board |
| Create Incident | `/release/incidents/create` | Incident creation form |
| Incident Reports | `/release/incidents/reports` | Report generation |
| Incident Detail | `/release/incidents/:incidentId` | Full incident room (see below) |
| Command Center | `/release/incident-command-center` | Real-time operational command |
| Committee Queue | `/release/committee-queue` | Pending governance approvals |

#### Incident Detail Room Features

- **SLA Tracking** — Automated resolution deadlines per severity
- **Committee Voting** — Multi-member approval for closure with designated veto powers
- **CAP Workflows** — Corrective Action Plan documentation (root cause, remediation)
- **Major Incident Mode** — Incident commander assignment, Slack channel integration
- **Linked Work Items** — Connect to epics, stories, defects, tasks
- **Attachments** — File upload and management
- **Timeline** — Full event history (status changes, assignments, comments)
- **Comments** — Threaded discussion
- **Watchers** — Notification subscription management

### 3.2 Technical Stack

#### Pages (`src/pages/release/`)

| Page Component | Route |
|----------------|-------|
| `IncidentRoomList.tsx` | `/release/incidents` |
| `IncidentsDashboard.tsx` | `/release/incidents/dashboard` |
| `IncidentRoomDetail.tsx` | `/release/incidents/:incidentId` |
| `CreateIncidentPage.tsx` | `/release/incidents/create` |
| `IncidentReportsPage.tsx` | `/release/incidents/reports` |
| `IncidentCommandCenter.tsx` | `/release/incident-command-center` |
| `CAPCommitteeQueuePage.tsx` | `/release/committee-queue` |

Lazy-loaded pages:
- `IncidentAnalyticsPage` → `/release/incidents/analytics`
- `IncidentInsightsPage` → `/release/incidents/insights`
- `IncidentKanbanPage` → `/release/incidents/kanban`

#### Components (`src/components/incidents/`)

```
src/components/incidents/
├── badges/                      # Severity, priority, status badges
├── detail/                      # Detail view sub-components
├── modal/                       # Modal dialogs
│
├── IncidentListTable.tsx        # Main list table with resizable columns
├── IncidentHeader.tsx           # Detail page header
├── IncidentDescription.tsx      # Rich text description editor
├── IncidentDetailsPanel.tsx     # Side panel with metadata
├── IncidentTimeline.tsx         # Event timeline
├── IncidentCommandBar.tsx       # Action bar (assign, escalate, resolve)
├── IncidentStatusDropdown.tsx   # Status transition dropdown
│
├── CAPGovernanceSection.tsx     # CAP workflow and governance
├── AddApproverDialog.tsx        # Add committee member
├── ConversionDialog.tsx         # Convert defect → incident
│
├── IncidentAttachments.tsx      # File attachment management
├── IncidentWatchersWidget.tsx   # Watcher management widget
├── WatchersPanel.tsx            # Full watchers panel
├── LinkedItemsPanel.tsx         # Linked work items display
├── LinkedWorkItemsPicker.tsx    # Work item picker dialog
├── SlackIntegrationPanel.tsx    # Slack channel connection
│
├── CreateIncidentDialog.tsx     # Quick create dialog
├── CreateIncidentModal.tsx      # Full create modal
├── DeleteIncidentDialog.tsx     # Delete confirmation
│
├── InlineEditCell.tsx           # Inline field editing
├── InlineReleasePicker.tsx      # Release assignment picker
├── InlineUserPicker.tsx         # User assignment picker
│
├── SlaStatusCard.tsx            # SLA timer and status
├── MajorIncidentPanel.tsx       # Major incident controls
├── EventLogSection.tsx          # Event log viewer
├── IncidentFiltersDialog.tsx    # Advanced filters
├── ResizableHeader.tsx          # Table column resize
├── TablePill.tsx                # Table badge/pill component
│
├── index.ts                     # Barrel exports
└── useIncidentColumnWidths.ts   # Column width persistence
```

#### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useIncidents` | `src/hooks/useIncidents.ts` | Core incident CRUD operations |
| `useIncidentColumns` | `src/hooks/useIncidentColumns.ts` | Table column configuration |
| `useIncidentCommandCenter` | `src/hooks/useIncidentCommandCenter.ts` | Command center metrics |
| `useIncidentCommittee` | `src/hooks/useIncidentCommittee.ts` | Committee voting system |
| `useIncidentTeams` | `src/hooks/useIncidentTeams.ts` | Team assignment management |
| `useIncidentUserProfiles` | `src/hooks/useIncidentUserProfiles.ts` | User profile lookups |
| `useIncidentWatchers` | `src/hooks/useIncidentWatchers.ts` | Watcher subscription management |
| `useIncidentWorkItems` | `src/hooks/useIncidentWorkItems.ts` | Linked work items CRUD |
| `useIncidentAttachments` | `src/hooks/useIncidentAttachments.ts` | File attachment management |
| `useOpenIncidentCount` | `src/hooks/useOpenIncidentCount.ts` | Badge count for navigation |
| `useCommitteeQueue` | `src/hooks/useCommitteeQueue.ts` | Committee queue data |

#### Types (`src/types/release.ts`)

```typescript
interface Incident {
  id: string;
  summary: string;
  description: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3';
  impact: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'pending' | 'resolved' 
        | 'closed' | 'reopened' | 'cancelled';
  assignee: Assignee;
  reporter: Assignee;
  component: string;
  components?: string[];
  labels?: string[];
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  linkedItems: LinkedItem[];
  watchers: string[];
  watcherDetails?: Assignee[];
  comments: Comment[];
  attachments?: Attachment[];
  timeline?: TimelineEvent[];
  isMajorIncident?: boolean;
  incidentCommander?: Assignee;
  slackChannel?: string;
  releaseVersion?: string;
}

interface Assignee {
  id: string;
  name: string;
  initials: string;
  email?: string;
}

interface LinkedItem {
  type: 'story' | 'defect' | 'task' | 'epic';
  id: string;
  summary: string;
  status?: string;
  assignee?: string;
}

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'assignment' | 'comment' 
      | 'attachment' | 'created' | 'major_incident';
  user: string;
  time: string;
  event: string;
  dotColor: 'gold' | 'gray' | 'blue' | 'green' | 'red';
}
```

#### Governance Model

```
Incident Created
    │
    ▼
[Open] → Assigned to team/individual
    │
    ▼
[In Progress] → Investigation & remediation
    │
    ├── SLA Timer running (per severity)
    │   ├── SEV1: 4 hours
    │   ├── SEV2: 8 hours
    │   └── SEV3: 24 hours
    │
    ▼
[Resolved] → Fix applied
    │
    ▼
[Committee Review] → CAP submitted
    │
    ├── All members vote (approve/reject)
    ├── Designated roles have VETO power
    │
    ▼
[Closed] ← All approvals received
    │
    └── Can be [Reopened] if issue recurs
```

### 3.3 Routing (App.tsx lines 1079-1099)

```
# Canonical Routes
/release                              → redirect to /release/incidents
/release/incidents                    → IncidentRoomList
/release/incidents/dashboard          → IncidentsDashboard
/release/incidents/analytics          → IncidentAnalyticsPage (lazy)
/release/incidents/insights           → IncidentInsightsPage (lazy)
/release/incidents/kanban             → IncidentKanbanPage (lazy)
/release/incidents/create             → CreateIncident
/release/incidents/reports            → IncidentReports
/release/incidents/:incidentId        → IncidentRoomDetail

# Support Routes
/release/incident-command-center      → IncidentCommandCenter
/release/committee-queue              → CommitteeQueue

# Legacy Redirects
/release/incident-room                → /release/incidents
/release/incident-room/:incidentId    → /release/incidents/:incidentId
/release/incident-reports             → /release/incidents/reports
```

---

## 4. Cross-Hub Wiring & Data Flow

### 4.1 Architecture Diagram

```
┌──────────────────┐     test metrics        ┌──────────────────┐
│    RELEASEHUB     │◄───────────────────────│      TESTHUB      │
│    /releasehub    │   shared-quality lib    │     /testhub      │
│                   │───────────────────────►│                    │
│  • Quality Gates  │  quality gates,         │  • Test Cases     │
│  • Coverage       │  readiness data         │  • Test Cycles    │
│  • Release Health │                         │  • Test Runs      │
│  • RTM            │                         │  • Defects        │
└────────┬──────────┘                         │  • Requirements   │
         │                                    │  • AI Generation  │
         │ releaseVersion                     └────────┬──────────┘
         │ incident counts                             │
         │                                             │ defect → incident
         │                                             │ escalation
         ▼                                             ▼
┌─────────────────────────────────────────────────────────┐
│                     INCIDENTHUB                          │
│                   /release/incidents                      │
│                                                          │
│    SLA Enforcement ─ Committee Governance ─ CAP Plans    │
│    Major Incident Mode ─ Slack Integration               │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Shared Quality Library

Located at `src/lib/shared-quality/`:

```
src/lib/shared-quality/
├── hooks/
│   ├── useDefects.ts        # TestHub OWNS full CRUD, ReleaseHub READS
│   ├── useQualityGates.ts   # ReleaseHub OWNS full CRUD, TestHub READS
│   ├── useReadiness.ts      # ReleaseHub OWNS
│   └── index.ts
├── utils/
│   └── (shared utilities)
└── index.ts
```

**Ownership Model:**

| Domain | Owner | Reader |
|--------|-------|--------|
| Defects | TestHub (full CRUD) | ReleaseHub (read-only) |
| Quality Gates | ReleaseHub (full CRUD) | TestHub (read-only) |
| Readiness | ReleaseHub (full CRUD) | — |

### 4.3 Database Foreign Key Relationships

```sql
-- TestHub → ReleaseHub
tm_test_cases.release_id       → releases.id

-- Activity Log links all three hubs
cc_activity_log.release_id     → releases.id
cc_activity_log.test_case_id   → tm_test_cases.id
cc_activity_log.cycle_id       → tm_test_cycles.id
cc_activity_log.defect_id      → tm_defects.id
cc_activity_log.user_id        → profiles.id
cc_activity_log.project_id     → projects.id

-- IncidentHub → ReleaseHub
incidents.releaseVersion       → releases (soft reference)
```

### 4.4 Shell Routing (CatalystShell.tsx)

The CatalystShell determines which sidebar to render based on the current route:

| Route Pattern | Sidebar Component | Badge |
|---------------|-------------------|-------|
| `/releasehub/*` | `ReleasesManagementSidebar` | RL |
| `/testhub/*` | `TestManagementSidebar` | TES |
| `/release/*` | Incident-specific sidebar | — |
| `/releases/*` | Legacy → redirects to `/releasehub/*` | — |

### 4.5 Data Flow Examples

#### Test Case → Release Health
```
1. Tester creates test case in TestHub (tm_test_cases)
2. Test case assigned to release (release_id FK)
3. Tester executes test in cycle (tm_test_runs)
4. Results aggregate to release metrics:
   - releases.test_cases_total
   - releases.test_cases_passed
   - releases.coverage_percent
5. ReleaseHub Command Center displays updated health
```

#### Defect → Incident Escalation
```
1. Defect discovered during testing (tm_defects)
2. Defect severity warrants production incident
3. ConversionDialog converts defect → incident
4. IncidentHub creates incident with:
   - Linked defect reference
   - Release version context
   - Inherited severity/priority
5. SLA timer starts based on severity
6. Committee reviews via committee-queue
```

#### Release Readiness Flow
```
1. Quality Gates defined in ReleaseHub
2. TestHub execution feeds pass rates
3. Defect counts feed from TestHub
4. Coverage matrix validates requirements mapping
5. Readiness score calculated (useReleaseReadiness)
6. Go/no-go decision at Quality Gates page
```

---

## 5. Quick Reference

### All Routes Summary

```
/releasehub/*                  — Release Management (11 routes)
/testhub/*                     — QA & Test Management (30+ routes, nested)
/release/incidents/*           — Incident Management (8 routes)
/release/incident-command-center — Incident Command Center
/release/committee-queue       — Governance Queue
```

### All Hook Files

```
src/hooks/releases/            — 7 hooks (release CRUD, AI, filters)
src/hooks/test-management/     — 28 hooks (test lifecycle)
src/hooks/testhub/             — 2 hooks (command center, releases)
src/hooks/useIncidents.ts      — + 10 incident-specific hooks
src/lib/shared-quality/hooks/  — 3 shared hooks (defects, gates, readiness)
```

### All Type Files

```
src/types/releases.ts          — Release, ReleaseStatus, ReleaseHealth
src/types/test-cases.ts        — TestCase, TestCaseStep, TestCaseType
src/types/release.ts           — Incident, Assignee, LinkedItem, TimelineEvent
```
