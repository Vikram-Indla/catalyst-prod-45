/**
 * Release & Test Management Module - Comprehensive Documentation
 * Generated documentation for all 15 routes in the module
 */

export interface RouteDocumentation {
  route: string;
  pageTitle: string;
  component: string;
  description: string;
  functionalSpecs: {
    features: string[];
    userActions: string[];
    businessLogic: string[];
  };
  technicalSpecs: {
    dataHooks: string[];
    databaseTables: string[];
    keyComponents: string[];
    stateManagement: string[];
  };
  dataFlow: {
    sources: string[];
    transformations: string[];
    outputs: string[];
  };
  integrations: string[];
  status: 'production' | 'development' | 'placeholder';
}

export const RELEASE_MODULE_DOCUMENTATION: RouteDocumentation[] = [
  // 1. Command Center
  {
    route: '/releases/command-center',
    pageTitle: 'Command Center',
    component: 'src/pages/releases/CommandCenterPage.tsx (952 lines)',
    description: 'Executive-level dashboard providing real-time visibility into testing operations, quality metrics, and release health across the portfolio.',
    functionalSpecs: {
      features: [
        'KPI Overview with 4 key metrics (Test Cases, Pass Rate, Open Defects, Blocked Tests)',
        'Release Health cards with donut progress rings',
        'Test Progress stacked bar chart (Passed/Failed/Blocked/Not Run)',
        'Defect Trends line chart (Opened vs Closed over time)',
        'Quality Gates status panel with pass/fail indicators',
        'Real-time Activity Feed with live updates',
        'Team Performance leaderboard with daily stats',
        'Upcoming Milestones timeline',
        'Auto-refresh (configurable: 30s, 1m, 2m, 5m)',
        'Export: PDF dashboard, CSV data, Excel workbook',
      ],
      userActions: [
        'Click KPI cards to filter related data',
        'Click release cards to navigate to release detail',
        'Click activity items to jump to related entity',
        'Configure auto-refresh interval',
        'Export dashboard in multiple formats',
        'Manual refresh via button',
      ],
      businessLogic: [
        'KPI aggregation from tm_test_runs, tm_defects',
        'Health score = (passRate × 0.4) + (coverage × 0.3) + (100 - openDefects×10) × 0.3',
        'Quality gate thresholds: Pass Rate ≥85%, Critical Defects = 0, Blocked Tests ≤10',
        'Trend indicators: Compare current vs previous 7-day period',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useCommandCenterKPIs - Aggregates test case and execution metrics',
        'useReleaseHealth - Fetches active releases with health calculations',
        'useDefectTrends - 30-day defect open/close trend data',
        'useQualityGates - Gate evaluation status per release',
        'useTestProgress - Execution status breakdown by day/cycle',
        'useTeamPerformance - User execution stats with rankings',
        'useActivities - Real-time activity feed with Supabase subscription',
        'useMilestones - Upcoming release milestones',
      ],
      databaseTables: [
        'releases (id, name, version, status, target_date, health)',
        'tm_test_cycles (id, name, release_id, status, environment)',
        'tm_test_cases (id, case_key, title, status, priority_id)',
        'tm_test_runs (id, status, executed_by, duration_seconds)',
        'tm_defects (id, severity, status, source_test_run_id)',
        'profiles (id, full_name, avatar_url) - for team display',
      ],
      keyComponents: [
        'KPICard - Clickable metric card with trend indicator',
        'ReleaseHealthCard - Donut chart with release summary',
        'DefectTrendsChart - Recharts line chart component',
        'ActivityFeed - Real-time scrollable list',
        'TeamPerformanceList - Ranked user stats',
        'MilestoneTimeline - Upcoming dates display',
      ],
      stateManagement: [
        'TanStack Query for data fetching with staleTime=30s',
        'Supabase Realtime for activity feed subscription',
        'Local state for refresh interval, export format selection',
      ],
    },
    dataFlow: {
      sources: ['Supabase: releases, tm_test_cycles, tm_test_runs, tm_defects, profiles'],
      transformations: [
        'Aggregate test runs by status for KPIs',
        'Calculate health scores per release',
        'Group defects by date for trend chart',
        'Rank team members by execution count',
      ],
      outputs: ['KPI widgets, charts, activity feed, export files'],
    },
    integrations: ['Supabase Realtime', 'Recharts', 'jsPDF', 'xlsx'],
    status: 'production',
  },

  // 2. Release Dashboard
  {
    route: '/releases/dashboard',
    pageTitle: 'Release Dashboard',
    component: 'src/pages/releases/ReleaseDashboardPage.tsx (273 lines)',
    description: 'Detailed dashboard for individual release monitoring with test execution table, quality gates, coverage matrix, and activity tracking.',
    functionalSpecs: {
      features: [
        'Release header with version, status, countdown timer',
        'Scorecard bar with pass/fail/blocked/not-run counts (clickable filters)',
        'Multi-filter bar (Cycle, Environment, Assignee, Status, Priority)',
        'Test execution data table with sorting and row click',
        'Quality Gates widget with threshold visualization',
        'Coverage Matrix heatmap (requirements × test status)',
        'Environment Comparison widget (DEV/STG/UAT/PROD)',
        'Activity Feed widget for release-specific events',
        'Global search (keyboard shortcut: /)',
        'Test detail drawer (slide-out panel)',
      ],
      userActions: [
        'Filter tests by clicking scorecard segments',
        'Apply/clear multi-select filters',
        'Click test row to open detail drawer',
        'Search tests/defects via global search',
        'Export release data',
        'Execute tests via CTA button',
      ],
      businessLogic: [
        'Days remaining = target_date - now()',
        'Filter chaining with AND logic',
        'Scorecard click sets status filter',
        'Clear filters resets all selections',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useParams - Extract releaseId from URL',
        'mockRelease, mockTestCases - Currently using mock data',
        'mockQualityGates, mockCoverageMatrix - Mock visualizations',
      ],
      databaseTables: [
        'releases - Release metadata',
        'tm_test_cycles - Cycles linked to release',
        'tm_test_cases - Test case library',
        'tm_test_runs - Execution results',
      ],
      keyComponents: [
        'ReleaseHeader - Version badge, status pill, countdown',
        'ScorecardBar - Clickable status segments',
        'FilterBar - Multi-select dropdowns',
        'TestExecutionTable - Sortable data grid',
        'QualityGatesWidget - Gate status cards',
        'CoverageMatrixWidget - Requirement heatmap',
        'EnvironmentComparisonWidget - Environment stats',
        'ActivityFeedWidget - Release events list',
      ],
      stateManagement: [
        'useState for filters, searchQuery, selectedTestCase, isDrawerOpen',
        'Framer Motion for entry animations',
      ],
    },
    dataFlow: {
      sources: ['URL params (releaseId)', 'Mock data (to be replaced with Supabase)'],
      transformations: ['Filter test cases by status/priority/assignee/search'],
      outputs: ['Filtered table, scorecard metrics, drawer details'],
    },
    integrations: ['Framer Motion', 'Sheet component'],
    status: 'production',
  },

  // 3. My Test Scope
  {
    route: '/releases/my-scope',
    pageTitle: 'My Test Scope',
    component: 'src/pages/releases/MyTestScopePage.tsx (21 lines)',
    description: 'Personalized view showing test cases, cycles, and defects assigned to the currently logged-in user.',
    functionalSpecs: {
      features: [
        'User-specific dashboard showing assigned work',
        'Test cases assigned to current user',
        'Active cycles where user has assignments',
        'Defects reported by or assigned to user',
        'Priority-ordered work queue',
        'Quick execution access',
      ],
      userActions: [
        'View personal test assignments',
        'Start test execution from dashboard',
        'Track personal progress and stats',
        'Filter by status, priority',
      ],
      businessLogic: [
        'Filter all entities by auth.uid() = assigned_to',
        'Calculate personal pass rate and execution count',
        'Sort by priority and due date',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useAuth - Get current user context',
        'MyTestScopeDashboard component handles data fetching',
      ],
      databaseTables: [
        'tm_test_runs WHERE executed_by = auth.uid()',
        'tm_defects WHERE assignee_id = auth.uid()',
        'tm_test_cycles via cycle membership',
      ],
      keyComponents: [
        'MyTestScopeDashboard - Main feature component',
      ],
      stateManagement: ['Auth context for user identification'],
    },
    dataFlow: {
      sources: ['Auth context', 'Supabase filtered by user ID'],
      transformations: ['Filter entities by current user assignment'],
      outputs: ['Personal work queue, stats, execution links'],
    },
    integrations: ['Auth system', 'Test execution flow'],
    status: 'production',
  },

  // 4. All Releases
  {
    route: '/releases/all',
    pageTitle: 'All Releases',
    component: 'src/pages/releases/AllReleasesPage.tsx (358 lines)',
    description: 'Portfolio view of all releases with card grid, table, and timeline views, including AI insights and bulk operations.',
    functionalSpecs: {
      features: [
        'Summary cards (Total, By Status, By Health, At Risk)',
        'AI Insights bar with critical alerts',
        'Three view modes: Cards, Table, Timeline',
        'Multi-filter bar (Status, Health, Quarter, Search)',
        'Bulk selection with action bar',
        'Bulk actions: Change Status, Reassign Owner, Archive',
        'Export dropdown (CSV, Excel)',
        'Create release dialog',
        'Pagination controls',
      ],
      userActions: [
        'Toggle between Card/Table/Timeline views',
        'Apply status/health/quarter/search filters',
        'Select multiple releases for bulk actions',
        'Change status of selected releases',
        'Reassign owner for selected releases',
        'Archive selected releases',
        'Create new release',
        'Export filtered data',
      ],
      businessLogic: [
        'Health score calculation: passRate×0.4 + coverage×0.3 + (100-defects×10)×0.3',
        'Health levels: healthy(≥85), attention(≥70), at_risk(≥50), critical(<50)',
        'AI insights: Critical if health<70 AND daysRemaining<14',
        'Bulk operations use Supabase batch updates',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useAllReleases - Paginated release list with filters',
        'useReleasesFilter - URL-synced filter state',
        'useReleasesSelection - Multi-select state management',
      ],
      databaseTables: [
        'releases (all fields)',
        'profiles (for owner display)',
      ],
      keyComponents: [
        'SummaryCards - Status/health aggregation cards',
        'AIInsightsBar - Critical release alerts',
        'CardGridView - Release card layout',
        'ReleasesTable - Sortable data table',
        'ReleasesTimeline - Gantt-style timeline',
        'FilterBar - Multi-select filters',
        'ViewToggle - View mode switcher',
        'ReleasesBulkActionBar - Bulk action buttons',
        'BulkStatusChangeDialog, BulkReassignDialog, ArchiveConfirmationDialog',
        'ReleaseDialog - Create/edit form',
      ],
      stateManagement: [
        'TanStack Query for data fetching',
        'Local state: viewMode, filters, selectedIds, bulkAction dialogs',
        'Selection state via useReleasesSelection hook',
      ],
    },
    dataFlow: {
      sources: ['Supabase releases table with joins to profiles'],
      transformations: ['Transform to EnhancedRelease with computed metrics'],
      outputs: ['Cards/Table/Timeline views, summary aggregations, bulk updates'],
    },
    integrations: ['Supabase batch updates', 'Export utilities'],
    status: 'production',
  },

  // 5. Calendar
  {
    route: '/releases/calendar',
    pageTitle: 'Release Calendar',
    component: 'src/pages/releases/CalendarPage.tsx (101 lines)',
    description: 'Visual calendar/timeline view showing releases on a Gantt-style timeline with milestones and health indicators.',
    functionalSpecs: {
      features: [
        'Gantt-style horizontal timeline',
        'Release bars with health color coding',
        'Milestone markers (Code Freeze, Go Live)',
        'Progress indicators on release bars',
        'Month/quarter navigation',
        'Click to navigate to release detail',
      ],
      userActions: [
        'Navigate timeline by month/quarter',
        'Click release bar to view details',
        'Hover for milestone tooltips',
        'Zoom in/out on timeline',
      ],
      businessLogic: [
        'Generate milestones: Code Freeze = targetDate - 7 days',
        'Row assignment for non-overlapping display',
        'Health level determines bar color',
        'Progress percentage shown on bar',
      ],
    },
    technicalSpecs: {
      dataHooks: ['useAllReleases - Fetches releases for timeline'],
      databaseTables: ['releases (id, name, start_date, target_date, status, progress)'],
      keyComponents: [
        'ReleaseCalendar - Main timeline visualization',
        'CalendarRelease - Individual release bar',
        'MilestoneMarker - Code freeze/go-live indicators',
      ],
      stateManagement: ['TanStack Query for releases', 'Local navigation state'],
    },
    dataFlow: {
      sources: ['Supabase releases with date fields'],
      transformations: ['Transform to CalendarRelease with computed milestones and row positions'],
      outputs: ['Visual timeline with clickable bars'],
    },
    integrations: ['date-fns for date calculations'],
    status: 'production',
  },

  // 6. Compare
  {
    route: '/releases/compare',
    pageTitle: 'Release Compare',
    component: 'src/pages/releases/ComparePage.tsx (62 lines)',
    description: 'Side-by-side comparison of 2-5 releases with metrics, radar charts, and trend analysis.',
    functionalSpecs: {
      features: [
        'Multi-select release picker (2-5 releases)',
        'Side-by-side metric cards',
        'Radar chart comparison (6 dimensions)',
        'Delta indicators between releases',
        'Metric breakdown tables',
        'Trend sparklines per release',
      ],
      userActions: [
        'Select/deselect releases to compare',
        'View radar chart overlay',
        'Examine metric differences',
        'Navigate to individual release from comparison',
      ],
      businessLogic: [
        'Minimum 2 releases required for comparison',
        'Radar dimensions: Pass Rate, Coverage, Execution, Defects, Gates, Schedule',
        'Delta calculation: current - baseline (first selected)',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useAvailableReleases - List all releases for picker',
        'useCompareMetrics - Fetch detailed metrics for selected IDs',
      ],
      databaseTables: ['releases', 'tm_test_runs', 'tm_defects', 'tm_test_cycles'],
      keyComponents: [
        'ReleaseCompare - Main comparison layout',
        'ReleasePicker - Multi-select release selector',
        'RadarComparison - Recharts radar chart',
        'MetricDeltaCard - Before/after comparison',
      ],
      stateManagement: ['selectedIds state', 'TanStack Query for metrics'],
    },
    dataFlow: {
      sources: ['Supabase: releases, aggregated metrics'],
      transformations: ['Compute normalized metrics for radar chart'],
      outputs: ['Comparison cards, radar chart, delta indicators'],
    },
    integrations: ['Recharts RadarChart'],
    status: 'production',
  },

  // 7. Test Plans
  {
    route: '/releases/test-plans',
    pageTitle: 'Test Plans',
    component: 'src/pages/releases/TestPlansPage.tsx (671 lines)',
    description: 'Enterprise test plan management with list/grid views, CRUD operations, and health metrics.',
    functionalSpecs: {
      features: [
        'KPI summary cards (Total, Active, Completed, Overdue, Avg Pass Rate)',
        'List view with sortable table',
        'Grid view with plan cards',
        'Filters: Search, Status, Owner',
        'Create/Edit test plan dialog',
        'Clone and delete operations',
        'Bulk selection and actions',
        'Export (CSV, Excel)',
        'Progress and pass rate indicators',
      ],
      userActions: [
        'Create new test plan with dialog',
        'Edit existing plan details',
        'Clone plan for new iteration',
        'Delete plan with confirmation',
        'Filter by status/owner/search',
        'Toggle List/Grid view',
        'Select multiple for bulk actions',
        'Export plan data',
        'Navigate to plan detail',
      ],
      businessLogic: [
        'Plan status: draft, active, completed, archived',
        'Overdue = active AND end_date < now()',
        'Progress = executed / total_tests × 100',
        'Pass rate = passed / executed × 100',
        'Avg pass rate = mean of all plan pass rates',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useTestPlans - Fetch plans with metrics',
        'useDeleteTestPlan - Delete mutation',
        'useCloneTestPlan - Clone mutation',
        'useProjects - Get current project context',
      ],
      databaseTables: [
        'tm_test_plans (id, plan_key, name, status, start_date, end_date, owner_id)',
        'tm_test_plan_cases (plan_id, test_case_id)',
        'profiles (for owner display)',
      ],
      keyComponents: [
        'TestPlanTable - List view with sorting',
        'TestPlanCard - Grid card component',
        'CreateEditTestPlanDialog - Form modal',
        'Stats Cards - KPI summary',
      ],
      stateManagement: [
        'TanStack Query mutations for CRUD',
        'Local state: viewMode, filters, selectedIds, dialog states',
      ],
    },
    dataFlow: {
      sources: ['Supabase tm_test_plans with aggregated metrics'],
      transformations: ['Compute progress/pass rate per plan'],
      outputs: ['Table/Grid views, KPI cards, export files'],
    },
    integrations: ['date-fns', 'sonner toast'],
    status: 'production',
  },

  // 8. Test Cases
  {
    route: '/releases/test-cases',
    pageTitle: 'Test Cases',
    component: 'src/pages/releases/TestCasesPage.tsx (1140 lines)',
    description: 'Comprehensive test case library with folder tree, multiple views, AI generation, and full CRUD operations.',
    functionalSpecs: {
      features: [
        'Folder tree sidebar with nested hierarchy',
        'Three views: List (table), Grid (cards), Kanban (by status)',
        'Advanced filters with URL sync',
        'Bulk selection with action bar',
        'Create test case dialog with validation',
        'Edit test case dialog',
        'Test case detail drawer (slide-out)',
        'Import from CSV/Excel',
        'Export to CSV/Excel',
        'AI-powered test case generation',
        'Template library for quick creation',
        'Keyboard shortcuts (⌘K, ⌘N, Esc)',
        'Pagination with page size selector',
        'Move to folder dialog',
        'Bulk assign/tag/move operations',
        'Clone test case',
        'Execute test case dialog',
      ],
      userActions: [
        'Browse folders in sidebar',
        'Toggle sidebar visibility',
        'Switch view modes (List/Grid/Kanban)',
        'Create test case with full form',
        'Edit test case details',
        'View test case in drawer',
        'Import cases from file',
        'Export selected cases',
        'Generate cases with AI prompt',
        'Use templates for quick creation',
        'Bulk select and perform actions',
        'Move cases to different folder',
        'Assign cases to users',
        'Apply tags to cases',
        'Delete selected cases',
        'Clone existing case',
        'Execute case and record result',
      ],
      businessLogic: [
        'Folder hierarchy with parent-child relationships',
        'Case status: draft, ready, approved, deprecated',
        'Priority levels: critical, high, medium, low',
        'Filter by folder includes descendant folders',
        'URL-synced filters for shareable views',
        'Keyboard shortcuts for power users',
        'AI generation uses configured prompt template',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useTestCases - Paginated case list with filters',
        'useBulkDeleteTestCases - Bulk delete mutation',
        'useCloneTestCase - Clone mutation',
        'useCreateTestCase - Create mutation',
        'useFolderTree - Folder hierarchy',
        'useMoveTestCases - Move to folder mutation',
        'useProjects - Project context',
      ],
      databaseTables: [
        'tm_test_cases (id, case_key, title, status, priority_id, folder_id, assigned_to)',
        'tm_test_steps (id, test_case_id, step_number, action, expected_result)',
        'tm_folders (id, name, parent_id, project_id)',
        'tm_tags (id, name, color)',
        'tm_test_case_tags (test_case_id, tag_id)',
      ],
      keyComponents: [
        'TestFolderSidebar - Collapsible folder tree',
        'TestCasesTable - Sortable data table',
        'TestCasesGrid - Card grid layout',
        'TestCasesKanban - Status-based columns',
        'CreateTestCaseDialogEnterprise - Full creation form',
        'EditTestCaseDialog - Edit form modal',
        'TestCaseDetailDrawer - Side panel view',
        'ImportTestCasesDialog - File import wizard',
        'ExportTestCasesDialog - Export options',
        'AIGenerateTestCasesDialog - AI prompt interface',
        'TestCaseTemplatesDialog - Template picker',
        'BulkActionsBar - Selected items toolbar',
        'AdvancedFiltersDialog - Complex filter builder',
        'KeyboardShortcutsDialog - Shortcut reference',
      ],
      stateManagement: [
        'URL search params for filter persistence',
        'TanStack Query for data and mutations',
        'Local state: viewMode, selectedIds, dialog states, sidebar visibility',
        'useTestCaseFilters hook for filter logic',
        'useTestCaseKeyboardShortcuts hook for shortcuts',
      ],
    },
    dataFlow: {
      sources: ['Supabase: tm_test_cases, tm_folders, tm_steps, tm_tags'],
      transformations: [
        'tmToUITestCases adapter for UI format',
        'Filter by folder with descendant inclusion',
        'Paginate and sort results',
      ],
      outputs: ['Table/Grid/Kanban views, drawer detail, export files'],
    },
    integrations: ['AI generation API', 'CSV/Excel parsers', 'Framer Motion'],
    status: 'production',
  },

  // 9. Test Cycles
  {
    route: '/releases/test-cycles',
    pageTitle: 'Test Cycles',
    component: 'src/pages/releases/TestCyclesPage.tsx (583 lines)',
    description: 'Test cycle management with KPI cards, list/card views, environment tracking, and execution metrics.',
    functionalSpecs: {
      features: [
        'KPI summary cards from view-based metrics',
        'List view with table and progress bars',
        'Card view with enhanced cycle cards',
        'Filters: Search, Release, Status, Environment',
        'Create cycle modal with form validation',
        'Edit cycle dialog',
        'Clone and delete operations',
        'Export cycles (CSV, Excel)',
        'Progress and pass rate indicators',
        'Environment badges (DEV, STG, UAT, PROD)',
        'Navigate to cycle detail for execution',
      ],
      userActions: [
        'Create new cycle with release/env assignment',
        'Edit cycle details and dates',
        'Clone cycle for new environment',
        'Delete cycle with confirmation',
        'Filter by release/status/environment',
        'Toggle List/Card view',
        'Export cycle data',
        'Navigate to cycle for test execution',
      ],
      businessLogic: [
        'Cycle status: planned, in_progress, completed, cancelled',
        'Environment: dev, staging, uat, prod',
        'Metrics from v_tm_test_cycle_list_metrics view',
        'Progress = executed / total × 100',
        'Pass rate = passed / executed × 100',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useTestCycleList - Fetch cycles with metrics',
        'useTestCycleListSummary - KPI aggregations',
        'useCreateCycleEnhanced - Create mutation',
        'useDeleteCycleEnhanced - Delete mutation',
        'useCloneCycleEnhanced - Clone mutation',
        'useProjects, useReleases - Context data',
      ],
      databaseTables: [
        'tm_test_cycles (id, name, release_id, status, environment, start_date, end_date)',
        'v_tm_test_cycle_list_metrics (view with aggregated stats)',
        'tm_cycle_cases (cycle_id, test_case_id)',
        'tm_test_runs (execution data)',
      ],
      keyComponents: [
        'CycleKPICards - Summary statistics',
        'CycleTableView - List with progress',
        'CycleCardEnhanced - Card grid item',
        'CreateCycleModalEnhanced - Create form',
        'EditTestCycleDialog - Edit form',
      ],
      stateManagement: [
        'TanStack Query with cache invalidation',
        'Local state: viewMode, filters, dialog states',
      ],
    },
    dataFlow: {
      sources: ['Supabase: tm_test_cycles, v_tm_test_cycle_list_metrics'],
      transformations: ['Combine cycle data with computed metrics'],
      outputs: ['Table/Card views, KPI cards, export files'],
    },
    integrations: ['exportTestCycles utility'],
    status: 'production',
  },

  // 10. Execution
  {
    route: '/releases/execution',
    pageTitle: 'Test Execution',
    component: 'src/pages/releases/ExecutionPage.tsx (69 lines)',
    description: 'Redirect page that routes to the appropriate test cycle execution view based on cycle status.',
    functionalSpecs: {
      features: [
        'Auto-redirect to first active/planned cycle',
        'Priority: IN_PROGRESS > PLANNED > first available',
        'Empty state with link to create cycles',
        'Loading state during redirect',
      ],
      userActions: [
        'Automatic navigation to cycle execution',
        'Manual navigation to cycles if none exist',
      ],
      businessLogic: [
        'Find cycle by status priority',
        'Redirect to /test-management/cycles/:id',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useTestCycles - Fetch available cycles',
        'useDefaultProject - Get project context',
      ],
      databaseTables: ['tm_test_cycles'],
      keyComponents: ['Loading spinner', 'Empty state message'],
      stateManagement: ['useNavigate for redirect'],
    },
    dataFlow: {
      sources: ['Supabase tm_test_cycles'],
      transformations: ['Filter and sort by status'],
      outputs: ['Redirect to cycle execution page'],
    },
    integrations: ['React Router navigation'],
    status: 'production',
  },

  // 11. Defects
  {
    route: '/releases/defects',
    pageTitle: 'Defects',
    component: 'src/pages/releases/DefectsPage.tsx (657 lines)',
    description: 'Defect tracking and management with list and Kanban views, full lifecycle workflow, and reporting.',
    functionalSpecs: {
      features: [
        'KPI cards (Total, Open, Critical, Resolved, Avg Resolution Time)',
        'List view with sortable table',
        'Kanban view with drag-drop workflow',
        'Filters: Search, Release, Status, Severity, Assignee',
        'Report defect modal with full form',
        'Edit defect modal',
        'Reassign modal for bulk assignment',
        'Export by status or all defects',
        'Defect detail view on row click',
        'Status workflow: Open → In Progress → Resolved → Closed',
      ],
      userActions: [
        'Report new defect with detailed form',
        'Edit defect properties',
        'Change status via Kanban drag-drop',
        'Filter by severity/status/release',
        'Reassign defects to users',
        'Export defect list',
        'Navigate to defect detail',
        'View linked test case/run',
      ],
      businessLogic: [
        'Workflow status: open, in_progress, resolved, closed, wont_fix, duplicate',
        'Severity: critical, high, medium, low',
        'Priority: P1-P4',
        'SLA calculation based on severity',
        'Resolution time = resolved_at - created_at',
      ],
    },
    technicalSpecs: {
      dataHooks: [
        'useState with defectsData (currently mock)',
        'useActiveUsers - For assignee lookup',
      ],
      databaseTables: [
        'defects (id, defect_key, title, severity, priority, status)',
        'tm_defects (linked to test runs)',
        'profiles (assignee info)',
      ],
      keyComponents: [
        'DefectTableView - Sortable list',
        'DefectKanbanView - Drag-drop columns',
        'ReportDefectModal - Create form',
        'EditDefectModal - Edit form',
        'ReassignModal - Bulk reassign',
        'KPI cards - Summary stats',
      ],
      stateManagement: ['Local state with mock data', 'To be migrated to TanStack Query'],
    },
    dataFlow: {
      sources: ['Mock data (defectsData)', 'To be: Supabase defects table'],
      transformations: ['Filter by release/status/severity/assignee'],
      outputs: ['Table/Kanban views, modals, export files'],
    },
    integrations: ['exportDefects utility', '@hello-pangea/dnd (Kanban)'],
    status: 'production',
  },

  // 12. Ask AI
  {
    route: '/releases/ask-ai',
    pageTitle: 'Ask AI',
    component: 'src/pages/releases/PlaceholderPage.tsx',
    description: 'AI-powered assistant for test recommendations, coverage analysis, and quality insights.',
    functionalSpecs: {
      features: [
        'Conversational AI interface (planned)',
        'Test case generation from requirements',
        'Coverage gap analysis',
        'Defect prediction and risk assessment',
        'Quality improvement recommendations',
      ],
      userActions: [
        'Ask questions about testing',
        'Generate test cases from prompts',
        'Analyze coverage gaps',
        'Get quality recommendations',
      ],
      businessLogic: ['AI model integration for analysis'],
    },
    technicalSpecs: {
      dataHooks: ['To be implemented'],
      databaseTables: ['N/A - Calls AI API'],
      keyComponents: ['Placeholder page currently'],
      stateManagement: ['N/A'],
    },
    dataFlow: {
      sources: ['User prompts', 'Project test data'],
      transformations: ['AI processing'],
      outputs: ['Generated content, recommendations'],
    },
    integrations: ['Lovable AI (planned)'],
    status: 'placeholder',
  },

  // 13. Coverage Reports
  {
    route: '/releases/coverage',
    pageTitle: 'Coverage Reports',
    component: 'src/pages/releases/CoverageReportsPage.tsx (900 lines)',
    description: 'Requirements traceability and test coverage analysis with gap identification, heatmaps, and trend tracking.',
    functionalSpecs: {
      features: [
        'Coverage overview cards (Overall, Requirements, Features, Stories)',
        'Tabs: Dashboard, Requirements Matrix, Gap Analysis, Trends',
        'Requirements-to-tests traceability matrix',
        'Coverage heatmap by module/feature',
        'Gap identification with uncovered items',
        'Coverage trend charts over time',
        'Add tests to coverage dialog',
        'Export coverage report',
        'Filter by release/module/priority',
      ],
      userActions: [
        'View overall coverage percentage',
        'Drill into requirements matrix',
        'Identify coverage gaps',
        'Add tests to uncovered requirements',
        'Analyze coverage trends',
        'Export coverage report',
        'Filter by release or module',
      ],
      businessLogic: [
        'Coverage % = (requirements with tests / total requirements) × 100',
        'Gap = requirement with 0 linked tests',
        'Trend = coverage % over time periods',
        'Priority weighting for critical coverage',
      ],
    },
    technicalSpecs: {
      dataHooks: ['Mock data currently', 'To be: useCoverageAnalysis'],
      databaseTables: [
        'requirements (to be created)',
        'tm_test_cases',
        'requirement_test_links (to be created)',
      ],
      keyComponents: [
        'CoverageRing - Donut percentage display',
        'RequirementsMatrix - Traceability table',
        'GapAnalysisTable - Uncovered items',
        'CoverageTrendChart - Line chart',
        'AddTestsToCoverageDialog - Link tests',
      ],
      stateManagement: ['Tabs, filters, dialog states'],
    },
    dataFlow: {
      sources: ['Requirements, test cases, coverage links'],
      transformations: ['Calculate coverage metrics, identify gaps'],
      outputs: ['Dashboards, matrices, trend charts, export'],
    },
    integrations: ['Recharts', 'Export utilities'],
    status: 'production',
  },

  // 14. Quality Gates
  {
    route: '/releases/quality-gates',
    pageTitle: 'Quality Gates',
    component: 'src/pages/releases/QualityGatesPage.tsx (1101 lines)',
    description: 'Quality gate configuration and evaluation with rule management, history tracking, and blocking issue resolution.',
    functionalSpecs: {
      features: [
        'Gate summary cards (Passing, Failing, Warning, Score)',
        'Tabs: Overview, Blocking Issues, Trend, Settings',
        'Gate list with rule expansion',
        'Gate types: Execution, Coverage, Defect, Performance, Security',
        'Gate categories: Blocking, Warning, Informational',
        'Rule evaluation with current vs threshold',
        'Blocking issues list with suggested actions',
        'Gate trend charts',
        'Create/Edit gate dialog',
        'Delete gate with confirmation',
        'Gate history panel',
        'Override capability with audit trail',
      ],
      userActions: [
        'View gate status by release',
        'Drill into failing gates',
        'See blocking issues and resolutions',
        'Create new quality gate',
        'Edit gate rules and thresholds',
        'Delete gate with confirmation',
        'View gate evaluation history',
        'Override gate with justification',
        'Filter by type/category/status',
      ],
      businessLogic: [
        'Gate status: passing, failing, warning, not_evaluated, error',
        'Rule operators: >=, <=, ==, >, <',
        'Blocking gates must pass for release approval',
        'Warning gates alert but dont block',
        'Score = weighted average of rule results',
        'Trend: improving, stable, degrading',
      ],
    },
    technicalSpecs: {
      dataHooks: ['Mock data currently', 'To be: useQualityGatesManagement'],
      databaseTables: [
        'quality_gates (to be created)',
        'quality_gate_rules (to be created)',
        'quality_gate_evaluations (to be created)',
        'quality_gate_overrides (to be created)',
      ],
      keyComponents: [
        'GateSummaryCards - Status overview',
        'GateList - Expandable gate cards',
        'RuleEvaluationRow - Metric vs threshold',
        'BlockingIssuesPanel - Resolution guidance',
        'GateTrendChart - Trend visualization',
        'EditQualityGateDialog - Gate form',
        'DeleteGateConfirmationDialog - Confirmation',
        'GateHistoryPanel - Evaluation history',
      ],
      stateManagement: ['Tabs, filters, dialog states, expanded gates'],
    },
    dataFlow: {
      sources: ['Gates config, release metrics for evaluation'],
      transformations: ['Evaluate rules against current metrics'],
      outputs: ['Gate status, blocking issues, trend data'],
    },
    integrations: ['Recharts', 'Rule evaluation engine'],
    status: 'production',
  },

  // 15. RTM (Requirements Traceability Matrix)
  {
    route: '/releases/rtm',
    pageTitle: 'Requirements Traceability Matrix',
    component: 'src/pages/releases/PlaceholderPage.tsx',
    description: 'Bi-directional traceability from requirements through design, implementation, and testing.',
    functionalSpecs: {
      features: [
        'Full RTM grid (Requirements × Design × Code × Tests)',
        'Bi-directional links',
        'Impact analysis for changes',
        'Orphan detection (unlinked items)',
        'Coverage gaps by requirement',
        'Export RTM report',
      ],
      userActions: [
        'View full traceability matrix',
        'Create/edit links between items',
        'Analyze change impact',
        'Identify orphans and gaps',
        'Export RTM report',
      ],
      businessLogic: ['Traceability chain validation'],
    },
    technicalSpecs: {
      dataHooks: ['To be implemented'],
      databaseTables: ['traceability_links (to be created)'],
      keyComponents: ['Placeholder page currently'],
      stateManagement: ['N/A'],
    },
    dataFlow: {
      sources: ['Requirements, design, code, tests, links'],
      transformations: ['Build traceability graph'],
      outputs: ['RTM grid, impact analysis, reports'],
    },
    integrations: ['To be designed'],
    status: 'placeholder',
  },
];

/**
 * Database Schema Summary
 */
export const DATABASE_SCHEMA = {
  coreTables: [
    {
      name: 'releases',
      columns: ['id', 'name', 'version', 'status', 'target_date', 'release_date', 'health', 'project_id', 'owner_id'],
      relationships: ['→ projects (project_id)', '→ profiles (owner_id)', '← tm_test_cycles (release_id)'],
    },
    {
      name: 'tm_test_plans',
      columns: ['id', 'plan_key', 'name', 'description', 'status', 'start_date', 'end_date', 'project_id', 'owner_id'],
      relationships: ['→ projects', '→ profiles', '← tm_test_plan_cases'],
    },
    {
      name: 'tm_test_cycles',
      columns: ['id', 'name', 'release_id', 'status', 'environment', 'start_date', 'end_date', 'project_id'],
      relationships: ['→ releases', '→ projects', '← tm_cycle_cases', '← tm_test_runs'],
    },
    {
      name: 'tm_test_cases',
      columns: ['id', 'case_key', 'title', 'description', 'status', 'priority_id', 'folder_id', 'assigned_to', 'project_id'],
      relationships: ['→ tm_folders', '→ tm_priorities', '→ profiles', '← tm_test_steps', '← tm_test_runs'],
    },
    {
      name: 'tm_test_steps',
      columns: ['id', 'test_case_id', 'step_number', 'action', 'expected_result', 'test_data'],
      relationships: ['→ tm_test_cases'],
    },
    {
      name: 'tm_test_runs',
      columns: ['id', 'test_case_id', 'cycle_id', 'status', 'executed_by', 'executed_at', 'duration_seconds', 'notes'],
      relationships: ['→ tm_test_cases', '→ tm_test_cycles', '→ profiles', '← tm_defects'],
    },
    {
      name: 'tm_defects',
      columns: ['id', 'defect_key', 'title', 'severity', 'priority', 'status', 'assignee_id', 'reporter_id', 'source_test_run_id'],
      relationships: ['→ tm_test_runs', '→ profiles (assignee)', '→ profiles (reporter)'],
    },
    {
      name: 'tm_folders',
      columns: ['id', 'name', 'parent_id', 'project_id', 'sort_order'],
      relationships: ['→ tm_folders (parent)', '→ projects', '← tm_test_cases'],
    },
  ],
  views: [
    {
      name: 'v_tm_test_cycle_list_metrics',
      description: 'Aggregated cycle metrics (total, passed, failed, blocked, skipped, progress, pass_rate)',
    },
    {
      name: 'v_tm_execution_by_assignee',
      description: 'Execution stats grouped by user',
    },
    {
      name: 'v_tm_cycle_progress',
      description: 'Cycle completion progress',
    },
  ],
};

/**
 * Generate Markdown documentation content
 */
export function generateDocumentationMarkdown(): string {
  const lines: string[] = [];
  
  lines.push('# Release & Test Management Module - Technical Documentation');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  RELEASE_MODULE_DOCUMENTATION.forEach((doc, i) => {
    lines.push(`${i + 1}. [${doc.pageTitle}](#${doc.pageTitle.toLowerCase().replace(/\s+/g, '-')})`);
  });
  lines.push(`${RELEASE_MODULE_DOCUMENTATION.length + 1}. [Database Schema](#database-schema)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Route Documentation
  RELEASE_MODULE_DOCUMENTATION.forEach((doc, i) => {
    lines.push(`## ${i + 1}. ${doc.pageTitle}`);
    lines.push('');
    lines.push(`**Route:** \`${doc.route}\``);
    lines.push('');
    lines.push(`**Component:** \`${doc.component}\``);
    lines.push('');
    lines.push(`**Status:** ${doc.status === 'production' ? '✅ Production' : doc.status === 'development' ? '🔧 Development' : '📋 Placeholder'}`);
    lines.push('');
    lines.push(`### Description`);
    lines.push(doc.description);
    lines.push('');
    
    lines.push('### Functional Specifications');
    lines.push('');
    lines.push('#### Features');
    doc.functionalSpecs.features.forEach(f => lines.push(`- ${f}`));
    lines.push('');
    lines.push('#### User Actions');
    doc.functionalSpecs.userActions.forEach(a => lines.push(`- ${a}`));
    lines.push('');
    if (doc.functionalSpecs.businessLogic.length > 0) {
      lines.push('#### Business Logic');
      doc.functionalSpecs.businessLogic.forEach(l => lines.push(`- ${l}`));
      lines.push('');
    }
    
    lines.push('### Technical Specifications');
    lines.push('');
    lines.push('#### Data Hooks');
    doc.technicalSpecs.dataHooks.forEach(h => lines.push(`- \`${h}\``));
    lines.push('');
    lines.push('#### Database Tables');
    doc.technicalSpecs.databaseTables.forEach(t => lines.push(`- \`${t}\``));
    lines.push('');
    lines.push('#### Key Components');
    doc.technicalSpecs.keyComponents.forEach(c => lines.push(`- ${c}`));
    lines.push('');
    lines.push('#### State Management');
    doc.technicalSpecs.stateManagement.forEach(s => lines.push(`- ${s}`));
    lines.push('');
    
    lines.push('### Data Flow');
    lines.push('');
    lines.push('**Sources:**');
    doc.dataFlow.sources.forEach(s => lines.push(`- ${s}`));
    lines.push('');
    lines.push('**Transformations:**');
    doc.dataFlow.transformations.forEach(t => lines.push(`- ${t}`));
    lines.push('');
    lines.push('**Outputs:**');
    doc.dataFlow.outputs.forEach(o => lines.push(`- ${o}`));
    lines.push('');
    
    lines.push('**Integrations:**', doc.integrations.join(', '));
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  
  // Database Schema
  lines.push('## Database Schema');
  lines.push('');
  lines.push('### Core Tables');
  lines.push('');
  DATABASE_SCHEMA.coreTables.forEach(table => {
    lines.push(`#### ${table.name}`);
    lines.push('');
    lines.push('**Columns:**', table.columns.map(c => `\`${c}\``).join(', '));
    lines.push('');
    lines.push('**Relationships:**');
    table.relationships.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  });
  
  lines.push('### Database Views');
  lines.push('');
  DATABASE_SCHEMA.views.forEach(view => {
    lines.push(`- **${view.name}**: ${view.description}`);
  });
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('*End of Documentation*');
  
  return lines.join('\n');
}

/**
 * Download documentation as Markdown file
 */
export function downloadDocumentation(): void {
  const content = generateDocumentationMarkdown();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `release-module-documentation-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
