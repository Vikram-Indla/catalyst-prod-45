// =====================================================
// RELEASE MODULE - COMPLETE FEATURE HIERARCHY TREE
// Comprehensive feature list with all connections
// =====================================================

export interface FeatureNode {
  id: string;
  name: string;
  type: 'module' | 'route' | 'feature' | 'sub-feature' | 'component' | 'action' | 'data' | 'integration';
  description?: string;
  dbTables?: string[];
  hooks?: string[];
  components?: string[];
  children?: FeatureNode[];
}

export const RELEASE_MODULE_FEATURE_TREE: FeatureNode = {
  id: 'releases-module',
  name: 'Release & Test Management Module',
  type: 'module',
  description: 'Enterprise-grade release lifecycle and quality assurance platform',
  dbTables: ['releases', 'release_vehicles', 'projects', 'profiles', 'teams'],
  children: [
    // =========================================================
    // 1. COMMAND CENTER
    // =========================================================
    {
      id: 'command-center',
      name: 'Command Center',
      type: 'route',
      description: 'Real-time release monitoring and control hub',
      dbTables: ['releases', 'tm_test_cycles', 'tm_test_runs', 'tm_defects'],
      hooks: ['useCommandCenterKPIs', 'useReleaseHealth', 'useDefectTrends', 'useActivities'],
      components: ['CommandCenterPage.tsx'],
      children: [
        {
          id: 'cc-kpi-dashboard',
          name: 'KPI Dashboard',
          type: 'feature',
          description: 'Key performance indicators overview',
          children: [
            {
              id: 'cc-kpi-cards',
              name: 'KPI Cards',
              type: 'sub-feature',
              children: [
                { id: 'cc-kpi-active-releases', name: 'Active Releases Count', type: 'component', description: 'Total releases in active state' },
                { id: 'cc-kpi-pass-rate', name: 'Overall Pass Rate', type: 'component', description: 'Aggregate test pass percentage' },
                { id: 'cc-kpi-open-defects', name: 'Open Defects', type: 'component', description: 'Unresolved defect count' },
                { id: 'cc-kpi-critical-defects', name: 'Critical Defects', type: 'component', description: 'Blocker/Critical severity count' },
                { id: 'cc-kpi-blocked-tests', name: 'Blocked Tests', type: 'component', description: 'Tests unable to execute' },
                { id: 'cc-kpi-execution-progress', name: 'Execution Progress', type: 'component', description: 'Overall test completion %' },
              ]
            },
            {
              id: 'cc-kpi-trends',
              name: 'Trend Indicators',
              type: 'sub-feature',
              children: [
                { id: 'cc-trend-up', name: 'Positive Trend (↑)', type: 'data' },
                { id: 'cc-trend-down', name: 'Negative Trend (↓)', type: 'data' },
                { id: 'cc-trend-stable', name: 'Stable Trend (→)', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'cc-health-grid',
          name: 'Release Health Grid',
          type: 'feature',
          description: 'Visual health status of all active releases',
          children: [
            {
              id: 'cc-health-cards',
              name: 'Health Cards',
              type: 'sub-feature',
              children: [
                { id: 'cc-health-good', name: 'Good Health (Green)', type: 'component', description: 'All gates passing' },
                { id: 'cc-health-warning', name: 'Warning Health (Amber)', type: 'component', description: 'Some gates at risk' },
                { id: 'cc-health-critical', name: 'Critical Health (Red)', type: 'component', description: 'Blocking issues present' },
              ]
            },
            {
              id: 'cc-health-metrics',
              name: 'Per-Release Metrics',
              type: 'sub-feature',
              children: [
                { id: 'cc-hm-pass-rate', name: 'Pass Rate %', type: 'data' },
                { id: 'cc-hm-execution', name: 'Execution %', type: 'data' },
                { id: 'cc-hm-defects', name: 'Open Defects', type: 'data' },
                { id: 'cc-hm-blockers', name: 'Blockers', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'cc-defect-trends',
          name: 'Defect Trends Chart',
          type: 'feature',
          description: '7-day defect trend visualization',
          children: [
            { id: 'cc-dt-opened', name: 'Opened Defects Line', type: 'component' },
            { id: 'cc-dt-closed', name: 'Closed Defects Line', type: 'component' },
            { id: 'cc-dt-net', name: 'Net Change Indicator', type: 'component' },
          ]
        },
        {
          id: 'cc-activity-feed',
          name: 'Live Activity Feed',
          type: 'feature',
          description: 'Real-time activity stream with Supabase Realtime',
          hooks: ['useActivities'],
          children: [
            {
              id: 'cc-activity-types',
              name: 'Activity Types',
              type: 'sub-feature',
              children: [
                { id: 'cc-act-execution', name: 'Test Execution Events', type: 'data' },
                { id: 'cc-act-defect', name: 'Defect Status Changes', type: 'data' },
                { id: 'cc-act-release', name: 'Release Updates', type: 'data' },
                { id: 'cc-act-cycle', name: 'Cycle Progress', type: 'data' },
              ]
            },
            {
              id: 'cc-activity-actions',
              name: 'Activity Actions',
              type: 'sub-feature',
              children: [
                { id: 'cc-act-refresh', name: 'Manual Refresh', type: 'action' },
                { id: 'cc-act-filter', name: 'Filter by Type', type: 'action' },
                { id: 'cc-act-navigate', name: 'Navigate to Source', type: 'action' },
              ]
            }
          ]
        },
        {
          id: 'cc-milestones',
          name: 'Upcoming Milestones',
          type: 'feature',
          description: 'Release timeline and deadlines',
          children: [
            { id: 'cc-ms-list', name: 'Milestone List', type: 'component' },
            { id: 'cc-ms-countdown', name: 'Days Remaining', type: 'data' },
            { id: 'cc-ms-status', name: 'On Track / At Risk', type: 'data' },
          ]
        },
        {
          id: 'cc-quality-summary',
          name: 'Quality Gates Summary',
          type: 'feature',
          description: 'Aggregate quality gate status',
          children: [
            { id: 'cc-qg-passing', name: 'Passing Gates Count', type: 'data' },
            { id: 'cc-qg-failing', name: 'Failing Gates Count', type: 'data' },
            { id: 'cc-qg-blocked', name: 'Blocked Releases', type: 'data' },
          ]
        },
        {
          id: 'cc-exports',
          name: 'Export Options',
          type: 'feature',
          children: [
            { id: 'cc-exp-pdf', name: 'Export Dashboard PDF', type: 'action' },
            { id: 'cc-exp-csv', name: 'Export KPIs CSV', type: 'action' },
            { id: 'cc-exp-excel', name: 'Export KPIs Excel', type: 'action' },
            { id: 'cc-exp-docs', name: 'Download Documentation', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 2. DASHBOARD
    // =========================================================
    {
      id: 'dashboard',
      name: 'Release Dashboard',
      type: 'route',
      description: 'Personalized release overview and quick actions',
      dbTables: ['releases', 'tm_test_runs', 'tm_defects', 'profiles'],
      hooks: ['useDashboardMetrics', 'useMyReleases'],
      components: ['ReleaseDashboardPage.tsx'],
      children: [
        {
          id: 'dash-summary',
          name: 'Summary Section',
          type: 'feature',
          children: [
            { id: 'dash-my-releases', name: 'My Releases Widget', type: 'component' },
            { id: 'dash-quick-stats', name: 'Quick Stats Cards', type: 'component' },
            { id: 'dash-recent-activity', name: 'Recent Activity List', type: 'component' },
          ]
        },
        {
          id: 'dash-charts',
          name: 'Dashboard Charts',
          type: 'feature',
          children: [
            { id: 'dash-progress-chart', name: 'Progress Over Time', type: 'component' },
            { id: 'dash-defect-chart', name: 'Defect Distribution', type: 'component' },
          ]
        },
        {
          id: 'dash-quick-actions',
          name: 'Quick Actions',
          type: 'feature',
          children: [
            { id: 'dash-create-release', name: 'Create Release', type: 'action' },
            { id: 'dash-start-cycle', name: 'Start Test Cycle', type: 'action' },
            { id: 'dash-view-defects', name: 'View Open Defects', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 3. MY SCOPE
    // =========================================================
    {
      id: 'my-scope',
      name: 'My Scope',
      type: 'route',
      description: 'Personal test assignment and execution queue',
      dbTables: ['tm_test_runs', 'tm_test_cases', 'tm_test_cycles', 'profiles'],
      hooks: ['useMyTestScope', 'useTestAssignments'],
      components: ['MyScopePage.tsx'],
      children: [
        {
          id: 'scope-assigned',
          name: 'Assigned Tests',
          type: 'feature',
          description: 'Tests assigned to current user',
          children: [
            {
              id: 'scope-queue',
              name: 'Execution Queue',
              type: 'sub-feature',
              children: [
                { id: 'scope-pending', name: 'Pending Tests', type: 'component' },
                { id: 'scope-in-progress', name: 'In Progress Tests', type: 'component' },
                { id: 'scope-blocked', name: 'Blocked Tests', type: 'component' },
              ]
            },
            {
              id: 'scope-filters',
              name: 'Filter Options',
              type: 'sub-feature',
              children: [
                { id: 'scope-by-cycle', name: 'Filter by Cycle', type: 'action' },
                { id: 'scope-by-priority', name: 'Filter by Priority', type: 'action' },
                { id: 'scope-by-status', name: 'Filter by Status', type: 'action' },
              ]
            }
          ]
        },
        {
          id: 'scope-execution',
          name: 'Quick Execution',
          type: 'feature',
          children: [
            { id: 'scope-run-test', name: 'Run Selected Test', type: 'action' },
            { id: 'scope-bulk-update', name: 'Bulk Status Update', type: 'action' },
            { id: 'scope-log-defect', name: 'Log Defect', type: 'action' },
          ]
        },
        {
          id: 'scope-stats',
          name: 'Personal Statistics',
          type: 'feature',
          children: [
            { id: 'scope-completed-today', name: 'Completed Today', type: 'data' },
            { id: 'scope-remaining', name: 'Remaining Count', type: 'data' },
            { id: 'scope-pass-rate', name: 'My Pass Rate', type: 'data' },
          ]
        }
      ]
    },

    // =========================================================
    // 4. ALL RELEASES
    // =========================================================
    {
      id: 'all-releases',
      name: 'All Releases',
      type: 'route',
      description: 'Complete release portfolio management',
      dbTables: ['releases', 'release_vehicles', 'projects', 'profiles'],
      hooks: ['useAllReleases', 'useReleaseFilters'],
      components: ['AllReleasesPage.tsx', 'ReleasesTableView.tsx', 'ReleasesCardView.tsx', 'ReleasesTimelineView.tsx'],
      children: [
        {
          id: 'all-views',
          name: 'View Modes',
          type: 'feature',
          children: [
            {
              id: 'all-table-view',
              name: 'Table View',
              type: 'sub-feature',
              children: [
                { id: 'all-table-columns', name: 'Configurable Columns', type: 'component' },
                { id: 'all-table-sort', name: 'Column Sorting', type: 'action' },
                { id: 'all-table-resize', name: 'Column Resize', type: 'action' },
                { id: 'all-table-pagination', name: 'Pagination Controls', type: 'component' },
              ]
            },
            {
              id: 'all-card-view',
              name: 'Card View',
              type: 'sub-feature',
              children: [
                { id: 'all-card-health', name: 'Health Indicator', type: 'component' },
                { id: 'all-card-progress', name: 'Progress Bar', type: 'component' },
                { id: 'all-card-metrics', name: 'Mini Metrics', type: 'component' },
              ]
            },
            {
              id: 'all-timeline-view',
              name: 'Timeline View',
              type: 'sub-feature',
              children: [
                { id: 'all-timeline-gantt', name: 'Gantt Chart', type: 'component' },
                { id: 'all-timeline-zoom', name: 'Zoom Controls', type: 'action' },
                { id: 'all-timeline-scroll', name: 'Timeline Navigation', type: 'action' },
              ]
            }
          ]
        },
        {
          id: 'all-filters',
          name: 'Filter System',
          type: 'feature',
          children: [
            { id: 'all-filter-status', name: 'Status Filter', type: 'component', description: 'planning, active, uat, released, archived' },
            { id: 'all-filter-health', name: 'Health Filter', type: 'component', description: 'good, warning, critical' },
            { id: 'all-filter-search', name: 'Search Box', type: 'component' },
            { id: 'all-filter-date', name: 'Date Range Filter', type: 'component' },
            { id: 'all-filter-owner', name: 'Owner Filter', type: 'component' },
          ]
        },
        {
          id: 'all-actions',
          name: 'Release Actions',
          type: 'feature',
          children: [
            { id: 'all-create', name: 'Create Release', type: 'action' },
            { id: 'all-edit', name: 'Edit Release', type: 'action' },
            { id: 'all-delete', name: 'Delete Release', type: 'action' },
            { id: 'all-archive', name: 'Archive Release', type: 'action' },
            { id: 'all-duplicate', name: 'Duplicate Release', type: 'action' },
          ]
        },
        {
          id: 'all-bulk',
          name: 'Bulk Operations',
          type: 'feature',
          children: [
            { id: 'all-bulk-select', name: 'Multi-Select', type: 'action' },
            { id: 'all-bulk-status', name: 'Bulk Status Change', type: 'action' },
            { id: 'all-bulk-export', name: 'Bulk Export', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 5. CALENDAR
    // =========================================================
    {
      id: 'calendar',
      name: 'Release Calendar',
      type: 'route',
      description: 'Visual release scheduling and timeline management',
      dbTables: ['releases', 'release_vehicles'],
      hooks: ['useCalendarReleases', 'useCalendarEvents'],
      components: ['CalendarPage.tsx', 'CalendarView.tsx'],
      children: [
        {
          id: 'cal-views',
          name: 'Calendar Views',
          type: 'feature',
          children: [
            { id: 'cal-month', name: 'Month View', type: 'component' },
            { id: 'cal-week', name: 'Week View', type: 'component' },
            { id: 'cal-quarter', name: 'Quarter View', type: 'component' },
            { id: 'cal-year', name: 'Year View', type: 'component' },
          ]
        },
        {
          id: 'cal-events',
          name: 'Event Types',
          type: 'feature',
          children: [
            { id: 'cal-release-dates', name: 'Release Target Dates', type: 'data' },
            { id: 'cal-milestones', name: 'Milestones', type: 'data' },
            { id: 'cal-freeze-windows', name: 'Code Freeze Windows', type: 'data' },
            { id: 'cal-deployments', name: 'Deployment Windows', type: 'data' },
          ]
        },
        {
          id: 'cal-interactions',
          name: 'Calendar Interactions',
          type: 'feature',
          children: [
            { id: 'cal-drag-drop', name: 'Drag to Reschedule', type: 'action' },
            { id: 'cal-click-detail', name: 'Click for Details', type: 'action' },
            { id: 'cal-today', name: 'Jump to Today', type: 'action' },
            { id: 'cal-navigate', name: 'Navigate Periods', type: 'action' },
          ]
        },
        {
          id: 'cal-filters',
          name: 'Calendar Filters',
          type: 'feature',
          children: [
            { id: 'cal-by-vehicle', name: 'Filter by Vehicle', type: 'action' },
            { id: 'cal-by-status', name: 'Filter by Status', type: 'action' },
            { id: 'cal-by-team', name: 'Filter by Team', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 6. COMPARE
    // =========================================================
    {
      id: 'compare',
      name: 'Release Comparison',
      type: 'route',
      description: 'Side-by-side release metrics comparison',
      dbTables: ['releases', 'tm_test_cycles', 'tm_test_runs', 'tm_defects'],
      hooks: ['useCompareReleases', 'useCompareMetrics'],
      components: ['ComparePage.tsx', 'CompareSelector.tsx', 'CompareChart.tsx'],
      children: [
        {
          id: 'compare-selection',
          name: 'Release Selection',
          type: 'feature',
          children: [
            { id: 'compare-select-a', name: 'Select Release A', type: 'component' },
            { id: 'compare-select-b', name: 'Select Release B', type: 'component' },
            { id: 'compare-swap', name: 'Swap Releases', type: 'action' },
          ]
        },
        {
          id: 'compare-metrics',
          name: 'Comparison Metrics',
          type: 'feature',
          children: [
            {
              id: 'compare-test-metrics',
              name: 'Test Metrics',
              type: 'sub-feature',
              children: [
                { id: 'compare-total-tests', name: 'Total Tests', type: 'data' },
                { id: 'compare-pass-rate', name: 'Pass Rate', type: 'data' },
                { id: 'compare-execution', name: 'Execution %', type: 'data' },
                { id: 'compare-blocked', name: 'Blocked Count', type: 'data' },
              ]
            },
            {
              id: 'compare-defect-metrics',
              name: 'Defect Metrics',
              type: 'sub-feature',
              children: [
                { id: 'compare-total-defects', name: 'Total Defects', type: 'data' },
                { id: 'compare-critical', name: 'Critical Defects', type: 'data' },
                { id: 'compare-resolved', name: 'Resolved Count', type: 'data' },
                { id: 'compare-open', name: 'Open Count', type: 'data' },
              ]
            },
            {
              id: 'compare-schedule-metrics',
              name: 'Schedule Metrics',
              type: 'sub-feature',
              children: [
                { id: 'compare-duration', name: 'Duration Days', type: 'data' },
                { id: 'compare-velocity', name: 'Team Velocity', type: 'data' },
                { id: 'compare-on-track', name: 'On Track Status', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'compare-visualizations',
          name: 'Comparison Charts',
          type: 'feature',
          children: [
            { id: 'compare-radar', name: 'Radar Chart', type: 'component' },
            { id: 'compare-bar', name: 'Bar Chart', type: 'component' },
            { id: 'compare-table', name: 'Comparison Table', type: 'component' },
          ]
        },
        {
          id: 'compare-export',
          name: 'Export Comparison',
          type: 'feature',
          children: [
            { id: 'compare-pdf', name: 'Export PDF Report', type: 'action' },
            { id: 'compare-share', name: 'Share Link', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 7. TEST PLANS
    // =========================================================
    {
      id: 'test-plans',
      name: 'Test Plans',
      type: 'route',
      description: 'Test planning and strategy management',
      dbTables: ['tm_test_plans', 'tm_test_plan_cases', 'releases', 'projects'],
      hooks: ['useTestPlans', 'useTestPlanCases'],
      components: ['TestPlansPage.tsx', 'TestPlanForm.tsx', 'TestPlanDetails.tsx'],
      children: [
        {
          id: 'plans-list',
          name: 'Plans List View',
          type: 'feature',
          children: [
            { id: 'plans-table', name: 'Plans Table', type: 'component' },
            { id: 'plans-search', name: 'Search Plans', type: 'component' },
            { id: 'plans-filter-status', name: 'Status Filter', type: 'component' },
          ]
        },
        {
          id: 'plans-crud',
          name: 'Plan Management',
          type: 'feature',
          children: [
            {
              id: 'plans-create',
              name: 'Create Plan',
              type: 'sub-feature',
              children: [
                { id: 'plans-name', name: 'Plan Name', type: 'data' },
                { id: 'plans-description', name: 'Description', type: 'data' },
                { id: 'plans-release-link', name: 'Link to Release', type: 'data' },
                { id: 'plans-scope', name: 'Define Scope', type: 'data' },
                { id: 'plans-schedule', name: 'Set Schedule', type: 'data' },
              ]
            },
            { id: 'plans-edit', name: 'Edit Plan', type: 'action' },
            { id: 'plans-delete', name: 'Delete Plan', type: 'action' },
            { id: 'plans-duplicate', name: 'Duplicate Plan', type: 'action' },
          ]
        },
        {
          id: 'plans-cases',
          name: 'Test Case Assignment',
          type: 'feature',
          children: [
            { id: 'plans-add-cases', name: 'Add Test Cases', type: 'action' },
            { id: 'plans-remove-cases', name: 'Remove Test Cases', type: 'action' },
            { id: 'plans-reorder-cases', name: 'Reorder Cases', type: 'action' },
            { id: 'plans-case-count', name: 'Total Case Count', type: 'data' },
          ]
        },
        {
          id: 'plans-status',
          name: 'Plan Status',
          type: 'feature',
          children: [
            { id: 'plans-draft', name: 'Draft Status', type: 'data' },
            { id: 'plans-active', name: 'Active Status', type: 'data' },
            { id: 'plans-completed', name: 'Completed Status', type: 'data' },
            { id: 'plans-archived', name: 'Archived Status', type: 'data' },
          ]
        }
      ]
    },

    // =========================================================
    // 8. TEST CASES
    // =========================================================
    {
      id: 'test-cases',
      name: 'Test Cases Library',
      type: 'route',
      description: 'Centralized test case repository with full CRUD',
      dbTables: ['tm_test_cases', 'tm_test_steps', 'tm_test_folders', 'projects', 'profiles'],
      hooks: ['useTestCases', 'useTestFolders', 'useTestSteps', 'useTestCaseTags'],
      components: ['TestCasesPage.tsx', 'TestCaseForm.tsx', 'TestCaseDetails.tsx', 'FolderTree.tsx'],
      children: [
        {
          id: 'cases-folder-tree',
          name: 'Folder Structure',
          type: 'feature',
          description: 'Hierarchical test case organization',
          children: [
            { id: 'cases-folder-create', name: 'Create Folder', type: 'action' },
            { id: 'cases-folder-rename', name: 'Rename Folder', type: 'action' },
            { id: 'cases-folder-delete', name: 'Delete Folder', type: 'action' },
            { id: 'cases-folder-move', name: 'Move Folder', type: 'action' },
            { id: 'cases-folder-expand', name: 'Expand/Collapse', type: 'action' },
          ]
        },
        {
          id: 'cases-list',
          name: 'Test Case List',
          type: 'feature',
          children: [
            {
              id: 'cases-table',
              name: 'Cases Table',
              type: 'sub-feature',
              children: [
                { id: 'cases-col-key', name: 'Case Key Column', type: 'component' },
                { id: 'cases-col-title', name: 'Title Column', type: 'component' },
                { id: 'cases-col-status', name: 'Status Column', type: 'component' },
                { id: 'cases-col-priority', name: 'Priority Column', type: 'component' },
                { id: 'cases-col-type', name: 'Type Column', type: 'component' },
                { id: 'cases-col-assigned', name: 'Assigned To Column', type: 'component' },
                { id: 'cases-col-updated', name: 'Last Updated Column', type: 'component' },
              ]
            },
            {
              id: 'cases-filters',
              name: 'Filter Options',
              type: 'sub-feature',
              children: [
                { id: 'cases-filter-status', name: 'Status Filter', type: 'component' },
                { id: 'cases-filter-priority', name: 'Priority Filter', type: 'component' },
                { id: 'cases-filter-type', name: 'Type Filter', type: 'component' },
                { id: 'cases-filter-assigned', name: 'Assignee Filter', type: 'component' },
                { id: 'cases-filter-tags', name: 'Tags Filter', type: 'component' },
                { id: 'cases-filter-search', name: 'Text Search', type: 'component' },
              ]
            }
          ]
        },
        {
          id: 'cases-crud',
          name: 'Test Case CRUD',
          type: 'feature',
          children: [
            {
              id: 'cases-create',
              name: 'Create Test Case',
              type: 'sub-feature',
              children: [
                { id: 'cases-field-key', name: 'Auto-Generated Key', type: 'data' },
                { id: 'cases-field-title', name: 'Title (Required)', type: 'data' },
                { id: 'cases-field-description', name: 'Description', type: 'data' },
                { id: 'cases-field-preconditions', name: 'Preconditions', type: 'data' },
                { id: 'cases-field-priority', name: 'Priority Selection', type: 'data' },
                { id: 'cases-field-type', name: 'Type Selection', type: 'data' },
                { id: 'cases-field-status', name: 'Status Selection', type: 'data' },
                { id: 'cases-field-estimated', name: 'Estimated Duration', type: 'data' },
                { id: 'cases-field-assigned', name: 'Assigned To', type: 'data' },
                { id: 'cases-field-tags', name: 'Tags', type: 'data' },
              ]
            },
            { id: 'cases-edit', name: 'Edit Test Case', type: 'action' },
            { id: 'cases-delete', name: 'Delete Test Case', type: 'action' },
            { id: 'cases-duplicate', name: 'Clone Test Case', type: 'action' },
          ]
        },
        {
          id: 'cases-steps',
          name: 'Test Steps Management',
          type: 'feature',
          description: 'Step-by-step test instructions',
          children: [
            { id: 'cases-step-add', name: 'Add Step', type: 'action' },
            { id: 'cases-step-edit', name: 'Edit Step', type: 'action' },
            { id: 'cases-step-delete', name: 'Delete Step', type: 'action' },
            { id: 'cases-step-reorder', name: 'Drag to Reorder', type: 'action' },
            {
              id: 'cases-step-fields',
              name: 'Step Fields',
              type: 'sub-feature',
              children: [
                { id: 'cases-step-num', name: 'Step Number', type: 'data' },
                { id: 'cases-step-action', name: 'Action Description', type: 'data' },
                { id: 'cases-step-expected', name: 'Expected Result', type: 'data' },
                { id: 'cases-step-data', name: 'Test Data', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'cases-ai',
          name: 'AI Generation',
          type: 'feature',
          description: 'AI-powered test case generation',
          children: [
            { id: 'cases-ai-generate', name: 'Generate from Description', type: 'action' },
            { id: 'cases-ai-steps', name: 'Auto-Generate Steps', type: 'action' },
            { id: 'cases-ai-suggest', name: 'Suggest Improvements', type: 'action' },
          ]
        },
        {
          id: 'cases-bulk',
          name: 'Bulk Operations',
          type: 'feature',
          children: [
            { id: 'cases-bulk-select', name: 'Multi-Select', type: 'action' },
            { id: 'cases-bulk-move', name: 'Bulk Move to Folder', type: 'action' },
            { id: 'cases-bulk-status', name: 'Bulk Status Update', type: 'action' },
            { id: 'cases-bulk-delete', name: 'Bulk Delete', type: 'action' },
            { id: 'cases-bulk-export', name: 'Export Selected', type: 'action' },
          ]
        },
        {
          id: 'cases-import-export',
          name: 'Import/Export',
          type: 'feature',
          children: [
            { id: 'cases-import-csv', name: 'Import from CSV', type: 'action' },
            { id: 'cases-import-excel', name: 'Import from Excel', type: 'action' },
            { id: 'cases-export-csv', name: 'Export to CSV', type: 'action' },
            { id: 'cases-export-excel', name: 'Export to Excel', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 9. TEST CYCLES
    // =========================================================
    {
      id: 'test-cycles',
      name: 'Test Cycles',
      type: 'route',
      description: 'Test execution cycle management',
      dbTables: ['tm_test_cycles', 'tm_test_runs', 'tm_test_cases', 'releases', 'profiles'],
      hooks: ['useTestCycles', 'useCycleTestRuns', 'useCycleProgress'],
      components: ['TestCyclesPage.tsx', 'CycleForm.tsx', 'CycleDetails.tsx', 'CycleProgress.tsx'],
      children: [
        {
          id: 'cycles-list',
          name: 'Cycles List View',
          type: 'feature',
          children: [
            { id: 'cycles-table', name: 'Cycles Table', type: 'component' },
            { id: 'cycles-search', name: 'Search Cycles', type: 'component' },
            { id: 'cycles-filter-status', name: 'Status Filter', type: 'component' },
            { id: 'cycles-filter-release', name: 'Release Filter', type: 'component' },
          ]
        },
        {
          id: 'cycles-crud',
          name: 'Cycle Management',
          type: 'feature',
          children: [
            {
              id: 'cycles-create',
              name: 'Create Cycle',
              type: 'sub-feature',
              children: [
                { id: 'cycles-field-name', name: 'Cycle Name', type: 'data' },
                { id: 'cycles-field-description', name: 'Description', type: 'data' },
                { id: 'cycles-field-release', name: 'Link to Release', type: 'data' },
                { id: 'cycles-field-env', name: 'Environment', type: 'data' },
                { id: 'cycles-field-start', name: 'Start Date', type: 'data' },
                { id: 'cycles-field-end', name: 'End Date', type: 'data' },
              ]
            },
            { id: 'cycles-edit', name: 'Edit Cycle', type: 'action' },
            { id: 'cycles-delete', name: 'Delete Cycle', type: 'action' },
            { id: 'cycles-duplicate', name: 'Clone Cycle', type: 'action' },
          ]
        },
        {
          id: 'cycles-test-runs',
          name: 'Test Run Management',
          type: 'feature',
          children: [
            { id: 'cycles-add-tests', name: 'Add Test Cases', type: 'action' },
            { id: 'cycles-remove-tests', name: 'Remove Test Cases', type: 'action' },
            { id: 'cycles-assign-tester', name: 'Assign Tester', type: 'action' },
            { id: 'cycles-bulk-assign', name: 'Bulk Assign', type: 'action' },
          ]
        },
        {
          id: 'cycles-status',
          name: 'Cycle Status Workflow',
          type: 'feature',
          children: [
            { id: 'cycles-status-draft', name: 'Draft', type: 'data' },
            { id: 'cycles-status-active', name: 'Active', type: 'data' },
            { id: 'cycles-status-paused', name: 'Paused', type: 'data' },
            { id: 'cycles-status-completed', name: 'Completed', type: 'data' },
            { id: 'cycles-status-cancelled', name: 'Cancelled', type: 'data' },
          ]
        },
        {
          id: 'cycles-progress',
          name: 'Progress Tracking',
          type: 'feature',
          children: [
            { id: 'cycles-progress-bar', name: 'Progress Bar', type: 'component' },
            { id: 'cycles-status-breakdown', name: 'Status Breakdown', type: 'component' },
            { id: 'cycles-burndown', name: 'Execution Burndown', type: 'component' },
          ]
        },
        {
          id: 'cycles-environments',
          name: 'Environment Types',
          type: 'feature',
          children: [
            { id: 'cycles-env-dev', name: 'Development', type: 'data' },
            { id: 'cycles-env-qa', name: 'QA', type: 'data' },
            { id: 'cycles-env-staging', name: 'Staging', type: 'data' },
            { id: 'cycles-env-uat', name: 'UAT', type: 'data' },
            { id: 'cycles-env-prod', name: 'Production', type: 'data' },
          ]
        }
      ]
    },

    // =========================================================
    // 10. EXECUTION
    // =========================================================
    {
      id: 'execution',
      name: 'Test Execution',
      type: 'route',
      description: 'Real-time test execution interface',
      dbTables: ['tm_test_runs', 'tm_test_cases', 'tm_test_steps', 'tm_defects', 'profiles'],
      hooks: ['useTestExecution', 'useExecutionQueue', 'useStepExecution'],
      components: ['ExecutionPage.tsx', 'ExecutionRunner.tsx', 'StepExecutor.tsx', 'DefectQuickCreate.tsx'],
      children: [
        {
          id: 'exec-queue',
          name: 'Execution Queue',
          type: 'feature',
          children: [
            { id: 'exec-pending-list', name: 'Pending Tests List', type: 'component' },
            { id: 'exec-select-test', name: 'Select Test to Run', type: 'action' },
            { id: 'exec-queue-filters', name: 'Queue Filters', type: 'component' },
          ]
        },
        {
          id: 'exec-runner',
          name: 'Test Runner Interface',
          type: 'feature',
          children: [
            {
              id: 'exec-test-info',
              name: 'Test Information Panel',
              type: 'sub-feature',
              children: [
                { id: 'exec-info-key', name: 'Test Key', type: 'data' },
                { id: 'exec-info-title', name: 'Test Title', type: 'data' },
                { id: 'exec-info-description', name: 'Description', type: 'data' },
                { id: 'exec-info-preconditions', name: 'Preconditions', type: 'data' },
              ]
            },
            {
              id: 'exec-steps',
              name: 'Step-by-Step Execution',
              type: 'sub-feature',
              children: [
                { id: 'exec-step-list', name: 'Steps List', type: 'component' },
                { id: 'exec-step-current', name: 'Current Step Highlight', type: 'component' },
                { id: 'exec-step-pass', name: 'Mark Step Passed', type: 'action' },
                { id: 'exec-step-fail', name: 'Mark Step Failed', type: 'action' },
                { id: 'exec-step-skip', name: 'Skip Step', type: 'action' },
                { id: 'exec-step-note', name: 'Add Step Note', type: 'action' },
              ]
            }
          ]
        },
        {
          id: 'exec-results',
          name: 'Result Recording',
          type: 'feature',
          children: [
            {
              id: 'exec-status-options',
              name: 'Status Options',
              type: 'sub-feature',
              children: [
                { id: 'exec-status-pass', name: 'Passed', type: 'action' },
                { id: 'exec-status-fail', name: 'Failed', type: 'action' },
                { id: 'exec-status-blocked', name: 'Blocked', type: 'action' },
                { id: 'exec-status-skip', name: 'Skipped', type: 'action' },
                { id: 'exec-status-na', name: 'Not Applicable', type: 'action' },
              ]
            },
            {
              id: 'exec-evidence',
              name: 'Evidence Capture',
              type: 'sub-feature',
              children: [
                { id: 'exec-attach-screenshot', name: 'Attach Screenshot', type: 'action' },
                { id: 'exec-attach-file', name: 'Attach File', type: 'action' },
                { id: 'exec-add-comment', name: 'Add Comment', type: 'action' },
                { id: 'exec-record-duration', name: 'Record Duration', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'exec-defect-link',
          name: 'Defect Integration',
          type: 'feature',
          children: [
            { id: 'exec-create-defect', name: 'Create Defect from Failure', type: 'action' },
            { id: 'exec-link-existing', name: 'Link Existing Defect', type: 'action' },
            { id: 'exec-view-defects', name: 'View Linked Defects', type: 'action' },
          ]
        },
        {
          id: 'exec-navigation',
          name: 'Execution Navigation',
          type: 'feature',
          children: [
            { id: 'exec-prev-test', name: 'Previous Test', type: 'action' },
            { id: 'exec-next-test', name: 'Next Test', type: 'action' },
            { id: 'exec-save-continue', name: 'Save & Continue', type: 'action' },
            { id: 'exec-save-exit', name: 'Save & Exit', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 11. DEFECTS
    // =========================================================
    {
      id: 'defects',
      name: 'Defects Management',
      type: 'route',
      description: 'Complete defect lifecycle management',
      dbTables: ['tm_defects', 'defects', 'defect_comments', 'defect_attachments', 'tm_test_runs', 'profiles'],
      hooks: ['useDefects', 'useDefectDetails', 'useDefectComments', 'useDefectAttachments'],
      components: ['DefectsPage.tsx', 'DefectForm.tsx', 'DefectDetails.tsx', 'DefectTable.tsx'],
      children: [
        {
          id: 'defects-list',
          name: 'Defects List View',
          type: 'feature',
          children: [
            {
              id: 'defects-table',
              name: 'Defects Table',
              type: 'sub-feature',
              children: [
                { id: 'defects-col-id', name: 'Defect ID Column', type: 'component' },
                { id: 'defects-col-title', name: 'Title Column', type: 'component' },
                { id: 'defects-col-severity', name: 'Severity Column', type: 'component' },
                { id: 'defects-col-priority', name: 'Priority Column', type: 'component' },
                { id: 'defects-col-status', name: 'Status Column', type: 'component' },
                { id: 'defects-col-assigned', name: 'Assigned To Column', type: 'component' },
                { id: 'defects-col-reporter', name: 'Reporter Column', type: 'component' },
                { id: 'defects-col-created', name: 'Created Date Column', type: 'component' },
              ]
            },
            {
              id: 'defects-filters',
              name: 'Filter Options',
              type: 'sub-feature',
              children: [
                { id: 'defects-filter-severity', name: 'Severity Filter', type: 'component' },
                { id: 'defects-filter-priority', name: 'Priority Filter', type: 'component' },
                { id: 'defects-filter-status', name: 'Status Filter', type: 'component' },
                { id: 'defects-filter-assigned', name: 'Assignee Filter', type: 'component' },
                { id: 'defects-filter-release', name: 'Release Filter', type: 'component' },
                { id: 'defects-filter-search', name: 'Text Search', type: 'component' },
              ]
            }
          ]
        },
        {
          id: 'defects-crud',
          name: 'Defect CRUD',
          type: 'feature',
          children: [
            {
              id: 'defects-create',
              name: 'Create Defect',
              type: 'sub-feature',
              children: [
                { id: 'defects-field-title', name: 'Title (Required)', type: 'data' },
                { id: 'defects-field-description', name: 'Description', type: 'data' },
                { id: 'defects-field-severity', name: 'Severity (Blocker/Critical/Major/Minor/Trivial)', type: 'data' },
                { id: 'defects-field-priority', name: 'Priority (Highest/High/Medium/Low/Lowest)', type: 'data' },
                { id: 'defects-field-steps', name: 'Steps to Reproduce', type: 'data' },
                { id: 'defects-field-expected', name: 'Expected Result', type: 'data' },
                { id: 'defects-field-actual', name: 'Actual Result', type: 'data' },
                { id: 'defects-field-env', name: 'Environment', type: 'data' },
                { id: 'defects-field-assigned', name: 'Assigned To', type: 'data' },
                { id: 'defects-field-release', name: 'Target Release', type: 'data' },
              ]
            },
            { id: 'defects-edit', name: 'Edit Defect', type: 'action' },
            { id: 'defects-delete', name: 'Delete Defect', type: 'action' },
            { id: 'defects-duplicate', name: 'Clone Defect', type: 'action' },
          ]
        },
        {
          id: 'defects-status-workflow',
          name: 'Status Workflow',
          type: 'feature',
          children: [
            { id: 'defects-status-open', name: 'Open', type: 'data' },
            { id: 'defects-status-in-progress', name: 'In Progress', type: 'data' },
            { id: 'defects-status-fixed', name: 'Fixed', type: 'data' },
            { id: 'defects-status-verified', name: 'Verified', type: 'data' },
            { id: 'defects-status-closed', name: 'Closed', type: 'data' },
            { id: 'defects-status-reopened', name: 'Reopened', type: 'data' },
            { id: 'defects-status-wontfix', name: 'Won\'t Fix', type: 'data' },
            { id: 'defects-status-duplicate', name: 'Duplicate', type: 'data' },
          ]
        },
        {
          id: 'defects-severity-levels',
          name: 'Severity Levels',
          type: 'feature',
          children: [
            { id: 'defects-sev-blocker', name: 'Blocker (Showstopper)', type: 'data' },
            { id: 'defects-sev-critical', name: 'Critical (Major functionality broken)', type: 'data' },
            { id: 'defects-sev-major', name: 'Major (Significant impact)', type: 'data' },
            { id: 'defects-sev-minor', name: 'Minor (Low impact)', type: 'data' },
            { id: 'defects-sev-trivial', name: 'Trivial (Cosmetic)', type: 'data' },
          ]
        },
        {
          id: 'defects-attachments',
          name: 'Attachments',
          type: 'feature',
          children: [
            { id: 'defects-attach-upload', name: 'Upload Attachment', type: 'action' },
            { id: 'defects-attach-screenshot', name: 'Add Screenshot', type: 'action' },
            { id: 'defects-attach-delete', name: 'Delete Attachment', type: 'action' },
            { id: 'defects-attach-preview', name: 'Preview Attachment', type: 'action' },
          ]
        },
        {
          id: 'defects-comments',
          name: 'Comments & Activity',
          type: 'feature',
          children: [
            { id: 'defects-comment-add', name: 'Add Comment', type: 'action' },
            { id: 'defects-comment-edit', name: 'Edit Comment', type: 'action' },
            { id: 'defects-comment-delete', name: 'Delete Comment', type: 'action' },
            { id: 'defects-activity-log', name: 'Activity History', type: 'component' },
          ]
        },
        {
          id: 'defects-linking',
          name: 'Defect Linking',
          type: 'feature',
          children: [
            { id: 'defects-link-test', name: 'Link to Test Run', type: 'action' },
            { id: 'defects-link-release', name: 'Link to Release', type: 'action' },
            { id: 'defects-link-defect', name: 'Link Related Defect', type: 'action' },
            { id: 'defects-mark-duplicate', name: 'Mark as Duplicate', type: 'action' },
          ]
        },
        {
          id: 'defects-bulk',
          name: 'Bulk Operations',
          type: 'feature',
          children: [
            { id: 'defects-bulk-select', name: 'Multi-Select', type: 'action' },
            { id: 'defects-bulk-status', name: 'Bulk Status Update', type: 'action' },
            { id: 'defects-bulk-assign', name: 'Bulk Assign', type: 'action' },
            { id: 'defects-bulk-export', name: 'Export Selected', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 12. ASK AI
    // =========================================================
    {
      id: 'ask-ai',
      name: 'Ask AI',
      type: 'route',
      description: 'AI-powered testing assistant',
      dbTables: ['tm_test_cases', 'tm_defects', 'releases'],
      hooks: ['useAIAssistant'],
      components: ['AskAIPage.tsx', 'AIChat.tsx'],
      children: [
        {
          id: 'ai-chat',
          name: 'AI Chat Interface',
          type: 'feature',
          children: [
            { id: 'ai-input', name: 'Query Input', type: 'component' },
            { id: 'ai-response', name: 'AI Response Display', type: 'component' },
            { id: 'ai-history', name: 'Chat History', type: 'component' },
          ]
        },
        {
          id: 'ai-capabilities',
          name: 'AI Capabilities',
          type: 'feature',
          children: [
            { id: 'ai-generate-cases', name: 'Generate Test Cases', type: 'action' },
            { id: 'ai-analyze-defects', name: 'Analyze Defect Patterns', type: 'action' },
            { id: 'ai-suggest-coverage', name: 'Suggest Coverage Gaps', type: 'action' },
            { id: 'ai-predict-risks', name: 'Predict Release Risks', type: 'action' },
            { id: 'ai-optimize-execution', name: 'Optimize Execution Order', type: 'action' },
          ]
        },
        {
          id: 'ai-context',
          name: 'Context Selection',
          type: 'feature',
          children: [
            { id: 'ai-context-release', name: 'Select Release Context', type: 'action' },
            { id: 'ai-context-cycle', name: 'Select Cycle Context', type: 'action' },
            { id: 'ai-context-project', name: 'Select Project Context', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 13. COVERAGE
    // =========================================================
    {
      id: 'coverage',
      name: 'Coverage Reports',
      type: 'route',
      description: 'Test coverage analysis and gap identification',
      dbTables: ['tm_test_cases', 'requirements', 'features', 'stories'],
      hooks: ['useCoverageData', 'useCoverageMatrix', 'useGapAnalysis'],
      components: ['CoverageReportsPage.tsx', 'CoverageMatrix.tsx', 'GapAnalysis.tsx'],
      children: [
        {
          id: 'coverage-metrics',
          name: 'Coverage Metrics',
          type: 'feature',
          children: [
            { id: 'coverage-overall', name: 'Overall Coverage %', type: 'data' },
            { id: 'coverage-by-feature', name: 'Coverage by Feature', type: 'data' },
            { id: 'coverage-by-priority', name: 'Coverage by Priority', type: 'data' },
            { id: 'coverage-by-type', name: 'Coverage by Type', type: 'data' },
          ]
        },
        {
          id: 'coverage-matrix',
          name: 'Traceability Matrix',
          type: 'feature',
          children: [
            { id: 'coverage-matrix-view', name: 'Matrix Grid View', type: 'component' },
            { id: 'coverage-requirement-tests', name: 'Requirements to Tests', type: 'data' },
            { id: 'coverage-tests-requirements', name: 'Tests to Requirements', type: 'data' },
          ]
        },
        {
          id: 'coverage-gaps',
          name: 'Gap Analysis',
          type: 'feature',
          children: [
            { id: 'coverage-uncovered', name: 'Uncovered Requirements', type: 'component' },
            { id: 'coverage-orphan-tests', name: 'Orphan Test Cases', type: 'component' },
            { id: 'coverage-recommendations', name: 'Coverage Recommendations', type: 'component' },
          ]
        },
        {
          id: 'coverage-reports',
          name: 'Coverage Reports',
          type: 'feature',
          children: [
            { id: 'coverage-export-pdf', name: 'Export PDF Report', type: 'action' },
            { id: 'coverage-export-excel', name: 'Export Excel Report', type: 'action' },
            { id: 'coverage-schedule', name: 'Schedule Reports', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // 14. QUALITY GATES
    // =========================================================
    {
      id: 'quality-gates',
      name: 'Quality Gates',
      type: 'route',
      description: 'Release readiness gate management',
      dbTables: ['quality_gates', 'quality_gate_rules', 'releases', 'tm_test_runs', 'tm_defects'],
      hooks: ['useQualityGates', 'useGateEvaluation', 'useGateHistory'],
      components: ['QualityGatesPage.tsx', 'GateCard.tsx', 'GateRuleForm.tsx'],
      children: [
        {
          id: 'gates-overview',
          name: 'Gates Overview',
          type: 'feature',
          children: [
            { id: 'gates-summary', name: 'Gates Summary Cards', type: 'component' },
            { id: 'gates-passing', name: 'Passing Gates Count', type: 'data' },
            { id: 'gates-failing', name: 'Failing Gates Count', type: 'data' },
            { id: 'gates-warnings', name: 'Warning Gates Count', type: 'data' },
          ]
        },
        {
          id: 'gates-types',
          name: 'Gate Types',
          type: 'feature',
          children: [
            {
              id: 'gates-test-execution',
              name: 'Test Execution Gates',
              type: 'sub-feature',
              children: [
                { id: 'gate-pass-rate', name: 'Pass Rate >= X%', type: 'data' },
                { id: 'gate-execution-rate', name: 'Execution >= X%', type: 'data' },
                { id: 'gate-blocked-limit', name: 'Blocked Tests <= X', type: 'data' },
              ]
            },
            {
              id: 'gates-defect',
              name: 'Defect Gates',
              type: 'sub-feature',
              children: [
                { id: 'gate-no-blockers', name: 'Zero Blocker Defects', type: 'data' },
                { id: 'gate-critical-limit', name: 'Critical Defects <= X', type: 'data' },
                { id: 'gate-open-limit', name: 'Open Defects <= X', type: 'data' },
              ]
            },
            {
              id: 'gates-coverage',
              name: 'Coverage Gates',
              type: 'sub-feature',
              children: [
                { id: 'gate-coverage-min', name: 'Coverage >= X%', type: 'data' },
                { id: 'gate-critical-covered', name: 'Critical Features Covered', type: 'data' },
              ]
            }
          ]
        },
        {
          id: 'gates-management',
          name: 'Gate Management',
          type: 'feature',
          children: [
            { id: 'gates-create', name: 'Create Gate Rule', type: 'action' },
            { id: 'gates-edit', name: 'Edit Gate Rule', type: 'action' },
            { id: 'gates-delete', name: 'Delete Gate Rule', type: 'action' },
            { id: 'gates-enable', name: 'Enable/Disable Gate', type: 'action' },
          ]
        },
        {
          id: 'gates-evaluation',
          name: 'Gate Evaluation',
          type: 'feature',
          children: [
            { id: 'gates-auto-eval', name: 'Auto-Evaluate', type: 'action' },
            { id: 'gates-manual-override', name: 'Manual Override', type: 'action' },
            { id: 'gates-history', name: 'Evaluation History', type: 'component' },
          ]
        },
        {
          id: 'gates-blocking',
          name: 'Release Blocking',
          type: 'feature',
          children: [
            { id: 'gates-block-release', name: 'Block Release', type: 'action' },
            { id: 'gates-unblock-release', name: 'Unblock Release', type: 'action' },
            { id: 'gates-approval-required', name: 'Approval Required', type: 'data' },
          ]
        }
      ]
    },

    // =========================================================
    // 15. RTM (Requirements Traceability Matrix)
    // =========================================================
    {
      id: 'rtm',
      name: 'Requirements Traceability Matrix',
      type: 'route',
      description: 'End-to-end requirements traceability',
      dbTables: ['requirements', 'tm_test_cases', 'tm_defects', 'features', 'stories'],
      hooks: ['useRTMData', 'useTraceabilityLinks'],
      components: ['RTMPage.tsx', 'RTMMatrix.tsx', 'TraceabilityTree.tsx'],
      children: [
        {
          id: 'rtm-matrix',
          name: 'Traceability Matrix',
          type: 'feature',
          children: [
            { id: 'rtm-grid', name: 'Matrix Grid', type: 'component' },
            { id: 'rtm-requirements', name: 'Requirements List', type: 'component' },
            { id: 'rtm-test-mapping', name: 'Test Case Mapping', type: 'component' },
          ]
        },
        {
          id: 'rtm-linking',
          name: 'Link Management',
          type: 'feature',
          children: [
            { id: 'rtm-create-link', name: 'Create Link', type: 'action' },
            { id: 'rtm-delete-link', name: 'Delete Link', type: 'action' },
            { id: 'rtm-bulk-link', name: 'Bulk Link', type: 'action' },
          ]
        },
        {
          id: 'rtm-coverage',
          name: 'Coverage Analysis',
          type: 'feature',
          children: [
            { id: 'rtm-coverage-stats', name: 'Coverage Statistics', type: 'component' },
            { id: 'rtm-uncovered', name: 'Uncovered Requirements', type: 'component' },
            { id: 'rtm-over-tested', name: 'Over-Tested Areas', type: 'component' },
          ]
        },
        {
          id: 'rtm-filters',
          name: 'RTM Filters',
          type: 'feature',
          children: [
            { id: 'rtm-filter-req-type', name: 'Requirement Type Filter', type: 'component' },
            { id: 'rtm-filter-coverage', name: 'Coverage Status Filter', type: 'component' },
            { id: 'rtm-filter-priority', name: 'Priority Filter', type: 'component' },
          ]
        },
        {
          id: 'rtm-export',
          name: 'RTM Export',
          type: 'feature',
          children: [
            { id: 'rtm-export-pdf', name: 'Export PDF', type: 'action' },
            { id: 'rtm-export-excel', name: 'Export Excel', type: 'action' },
            { id: 'rtm-export-csv', name: 'Export CSV', type: 'action' },
          ]
        }
      ]
    },

    // =========================================================
    // SHARED COMPONENTS & INTEGRATIONS
    // =========================================================
    {
      id: 'shared',
      name: 'Shared Components & Integrations',
      type: 'module',
      description: 'Cross-cutting components used across routes',
      children: [
        {
          id: 'shared-navigation',
          name: 'Navigation',
          type: 'feature',
          children: [
            { id: 'shared-sidebar', name: 'Releases Sidebar', type: 'component' },
            { id: 'shared-breadcrumb', name: 'Breadcrumb Trail', type: 'component' },
            { id: 'shared-header', name: 'Page Header', type: 'component' },
          ]
        },
        {
          id: 'shared-context',
          name: 'Context Selection',
          type: 'feature',
          children: [
            { id: 'shared-release-selector', name: 'Release Selector', type: 'component' },
            { id: 'shared-project-selector', name: 'Project Selector', type: 'component' },
            { id: 'shared-vehicle-selector', name: 'Vehicle Selector', type: 'component' },
          ]
        },
        {
          id: 'shared-modals',
          name: 'Shared Modals',
          type: 'feature',
          children: [
            { id: 'shared-confirm-dialog', name: 'Confirmation Dialog', type: 'component' },
            { id: 'shared-delete-dialog', name: 'Delete Confirmation', type: 'component' },
            { id: 'shared-form-modal', name: 'Form Modal Wrapper', type: 'component' },
          ]
        },
        {
          id: 'shared-data-display',
          name: 'Data Display',
          type: 'feature',
          children: [
            { id: 'shared-data-table', name: 'DataTable Component', type: 'component' },
            { id: 'shared-empty-state', name: 'Empty State', type: 'component' },
            { id: 'shared-loading', name: 'Loading States', type: 'component' },
            { id: 'shared-error', name: 'Error Boundaries', type: 'component' },
          ]
        },
        {
          id: 'shared-integrations',
          name: 'External Integrations',
          type: 'feature',
          children: [
            { id: 'int-supabase', name: 'Supabase (Database)', type: 'integration' },
            { id: 'int-realtime', name: 'Supabase Realtime', type: 'integration' },
            { id: 'int-storage', name: 'Supabase Storage', type: 'integration' },
            { id: 'int-lovable-ai', name: 'Lovable AI Models', type: 'integration' },
          ]
        }
      ]
    },

    // =========================================================
    // DATABASE SCHEMA SUMMARY
    // =========================================================
    {
      id: 'database',
      name: 'Database Schema',
      type: 'module',
      description: 'Core database tables and relationships',
      children: [
        {
          id: 'db-releases',
          name: 'Release Tables',
          type: 'feature',
          children: [
            { id: 'db-releases-table', name: 'releases', type: 'data', description: 'Core release records' },
            { id: 'db-vehicles', name: 'release_vehicles', type: 'data', description: 'Release vehicle/product lines' },
            { id: 'db-projects', name: 'projects', type: 'data', description: 'Project definitions' },
          ]
        },
        {
          id: 'db-test-management',
          name: 'Test Management Tables',
          type: 'feature',
          children: [
            { id: 'db-test-plans', name: 'tm_test_plans', type: 'data', description: 'Test plan definitions' },
            { id: 'db-test-cases', name: 'tm_test_cases', type: 'data', description: 'Test case library' },
            { id: 'db-test-steps', name: 'tm_test_steps', type: 'data', description: 'Test case steps' },
            { id: 'db-test-folders', name: 'tm_test_folders', type: 'data', description: 'Folder organization' },
            { id: 'db-test-cycles', name: 'tm_test_cycles', type: 'data', description: 'Execution cycles' },
            { id: 'db-test-runs', name: 'tm_test_runs', type: 'data', description: 'Individual test executions' },
          ]
        },
        {
          id: 'db-defects',
          name: 'Defect Tables',
          type: 'feature',
          children: [
            { id: 'db-tm-defects', name: 'tm_defects', type: 'data', description: 'Test-linked defects' },
            { id: 'db-defects-table', name: 'defects', type: 'data', description: 'General defect records' },
            { id: 'db-defect-comments', name: 'defect_comments', type: 'data', description: 'Defect discussion' },
            { id: 'db-defect-attachments', name: 'defect_attachments', type: 'data', description: 'Defect files' },
          ]
        },
        {
          id: 'db-users',
          name: 'User Tables',
          type: 'feature',
          children: [
            { id: 'db-profiles', name: 'profiles', type: 'data', description: 'User profiles' },
            { id: 'db-teams', name: 'teams', type: 'data', description: 'Team definitions' },
          ]
        }
      ]
    }
  ]
};

// =====================================================
// TREE RENDERING UTILITIES
// =====================================================

function renderTreeNode(node: FeatureNode, indent: number = 0): string {
  const prefix = '│   '.repeat(indent);
  const connector = indent === 0 ? '' : '├── ';
  
  let typeIcon = '';
  switch (node.type) {
    case 'module': typeIcon = '📦'; break;
    case 'route': typeIcon = '🔗'; break;
    case 'feature': typeIcon = '⚙️'; break;
    case 'sub-feature': typeIcon = '🔧'; break;
    case 'component': typeIcon = '🧩'; break;
    case 'action': typeIcon = '▶️'; break;
    case 'data': typeIcon = '📊'; break;
    case 'integration': typeIcon = '🔌'; break;
  }
  
  let line = `${prefix}${connector}${typeIcon} ${node.name}`;
  
  if (node.description) {
    line += ` — ${node.description}`;
  }
  
  let result = line + '\n';
  
  if (node.dbTables && node.dbTables.length > 0) {
    result += `${prefix}│   📚 Tables: ${node.dbTables.join(', ')}\n`;
  }
  
  if (node.hooks && node.hooks.length > 0) {
    result += `${prefix}│   🎣 Hooks: ${node.hooks.join(', ')}\n`;
  }
  
  if (node.children) {
    node.children.forEach((child, index) => {
      result += renderTreeNode(child, indent + 1);
    });
  }
  
  return result;
}

export function generateFeatureTreeText(): string {
  const header = `
================================================================================
RELEASE & TEST MANAGEMENT MODULE - COMPLETE FEATURE HIERARCHY
================================================================================
Generated: ${new Date().toISOString()}
Total Routes: 15 | Core Tables: 20+ | Hooks: 50+
================================================================================

LEGEND:
📦 Module     - Top-level functional module
🔗 Route      - Application route/page
⚙️ Feature    - Major functional feature
🔧 Sub-feature - Detailed sub-capability
🧩 Component  - UI component
▶️ Action     - User action/interaction
📊 Data       - Data field/metric
🔌 Integration - External service integration
📚 Tables     - Database tables used
🎣 Hooks      - React Query hooks

================================================================================
FEATURE TREE
================================================================================

`;

  return header + renderTreeNode(RELEASE_MODULE_FEATURE_TREE);
}

export function generateFeatureTreeMarkdown(): string {
  function renderMarkdown(node: FeatureNode, level: number = 1): string {
    const heading = '#'.repeat(Math.min(level, 6));
    let result = '';
    
    // Type badge
    const typeBadge = `\`${node.type.toUpperCase()}\``;
    
    result += `${heading} ${node.name} ${typeBadge}\n\n`;
    
    if (node.description) {
      result += `> ${node.description}\n\n`;
    }
    
    if (node.dbTables && node.dbTables.length > 0) {
      result += `**Database Tables:** \`${node.dbTables.join('`, `')}\`\n\n`;
    }
    
    if (node.hooks && node.hooks.length > 0) {
      result += `**Hooks:** \`${node.hooks.join('`, `')}\`\n\n`;
    }
    
    if (node.components && node.components.length > 0) {
      result += `**Components:** \`${node.components.join('`, `')}\`\n\n`;
    }
    
    if (node.children) {
      node.children.forEach(child => {
        result += renderMarkdown(child, level + 1);
      });
    }
    
    return result;
  }
  
  const header = `# Release & Test Management Module - Complete Feature Hierarchy

**Generated:** ${new Date().toISOString()}

---

## Overview

| Metric | Count |
|--------|-------|
| Total Routes | 15 |
| Core Database Tables | 20+ |
| React Query Hooks | 50+ |
| UI Components | 100+ |

---

## Legend

| Icon | Type | Description |
|------|------|-------------|
| 📦 | Module | Top-level functional module |
| 🔗 | Route | Application route/page |
| ⚙️ | Feature | Major functional feature |
| 🔧 | Sub-feature | Detailed sub-capability |
| 🧩 | Component | UI component |
| ▶️ | Action | User action/interaction |
| 📊 | Data | Data field/metric |
| 🔌 | Integration | External service integration |

---

`;

  return header + renderMarkdown(RELEASE_MODULE_FEATURE_TREE);
}

export function downloadFeatureTree(format: 'text' | 'markdown' = 'markdown'): void {
  const content = format === 'markdown' 
    ? generateFeatureTreeMarkdown() 
    : generateFeatureTreeText();
  
  const extension = format === 'markdown' ? 'md' : 'txt';
  const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain';
  
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `release-module-feature-tree-${new Date().toISOString().split('T')[0]}.${extension}`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Count total features
export function countFeatures(node: FeatureNode = RELEASE_MODULE_FEATURE_TREE): number {
  let count = 1;
  if (node.children) {
    node.children.forEach(child => {
      count += countFeatures(child);
    });
  }
  return count;
}
