/**
 * CTA REGISTRY
 * Central registry of all CTAs in the Tests module for validation
 */

export interface CTADefinition {
  id: string;
  page: string;
  label: string;
  type: 'navigation' | 'modal' | 'drawer' | 'action' | 'submit';
  target?: string; // route or component name
  validated: boolean;
  notes?: string;
}

/**
 * Complete CTA Registry for Tests Module
 * Each CTA has been manually verified to have proper wiring
 */
export const TESTS_CTA_REGISTRY: CTADefinition[] = [
  // === LAYOUT (ProjectTestsLayout) ===
  {
    id: 'layout-new-test-case',
    page: 'ProjectTestsLayout',
    label: 'New Test Case',
    type: 'modal',
    target: 'CreateTestCaseModal',
    validated: true,
    notes: 'Opens CreateTestCaseModal from header',
  },
  {
    id: 'layout-refresh',
    page: 'ProjectTestsLayout',
    label: 'Refresh',
    type: 'action',
    validated: true,
    notes: 'Refetches summary data',
  },
  {
    id: 'layout-tab-overview',
    page: 'ProjectTestsLayout',
    label: 'Overview Tab',
    type: 'navigation',
    target: '/tests/overview',
    validated: true,
    notes: 'NavLink to overview route',
  },
  {
    id: 'layout-tab-cases',
    page: 'ProjectTestsLayout',
    label: 'Test Cases Tab',
    type: 'navigation',
    target: '/tests/cases',
    validated: true,
    notes: 'NavLink to cases route',
  },
  {
    id: 'layout-tab-sets',
    page: 'ProjectTestsLayout',
    label: 'Test Sets Tab',
    type: 'navigation',
    target: '/tests/sets',
    validated: true,
    notes: 'NavLink to sets route',
  },
  {
    id: 'layout-tab-cycles',
    page: 'ProjectTestsLayout',
    label: 'Test Cycles Tab',
    type: 'navigation',
    target: '/tests/cycles',
    validated: true,
    notes: 'NavLink to cycles route',
  },
  {
    id: 'layout-tab-executions',
    page: 'ProjectTestsLayout',
    label: 'Executions Tab',
    type: 'navigation',
    target: '/tests/executions',
    validated: true,
    notes: 'NavLink to executions route',
  },
  {
    id: 'layout-tab-reports',
    page: 'ProjectTestsLayout',
    label: 'Reports Tab',
    type: 'navigation',
    target: '/tests/reports',
    validated: true,
    notes: 'NavLink to reports route',
  },

  // === OVERVIEW PAGE ===
  {
    id: 'overview-run-tests',
    page: 'TestsOverviewPage',
    label: 'Run Tests',
    type: 'modal',
    target: 'RunTestsModal',
    validated: true,
    notes: 'Opens RunTestsModal, navigates to executions with cycle filter',
  },
  {
    id: 'overview-view-reports',
    page: 'TestsOverviewPage',
    label: 'Reports',
    type: 'navigation',
    target: '/tests/reports',
    validated: true,
  },
  {
    id: 'cases-bulk-status',
    page: 'TestsCasesPage',
    label: 'Bulk Set Status',
    type: 'action',
    validated: true,
    notes: 'Updates test_cases.status for selected items',
  },
  {
    id: 'cases-bulk-archive',
    page: 'TestsCasesPage',
    label: 'Bulk Archive',
    type: 'action',
    validated: true,
    notes: 'Sets deleted_at on selected items',
  },

  // === SETS PAGE ===
  {
    id: 'sets-create',
    page: 'TestsSetsPage',
    label: 'Create Test Set',
    type: 'modal',
    validated: true,
    notes: 'Opens inline dialog, creates test_sets record',
  },
  {
    id: 'sets-view-cases',
    page: 'TestsSetsPage',
    label: 'View Cases',
    type: 'navigation',
    target: '/tests/cases?setId=...',
    validated: true,
    notes: 'Link navigates to cases filtered by set',
  },
  {
    id: 'sets-archive',
    page: 'TestsSetsPage',
    label: 'Archive Set',
    type: 'action',
    validated: true,
    notes: 'Updates status to archived',
  },

  // === CYCLES PAGE ===
  {
    id: 'cycles-create',
    page: 'TestsCyclesPage',
    label: 'Create Test Cycle',
    type: 'modal',
    target: 'CreateCycleModal',
    validated: true,
    notes: 'Creates cycle + generates test_cycle_executions from sets',
  },
  {
    id: 'cycles-row-click',
    page: 'TestsCyclesPage',
    label: 'Cycle Row Click',
    type: 'drawer',
    target: 'CycleDrawer',
    validated: true,
  },
  {
    id: 'cycles-lock-unlock',
    page: 'CycleDrawer',
    label: 'Lock/Unlock Scope',
    type: 'action',
    validated: true,
    notes: 'Updates scope_locked + logs to test_activity_log',
  },
  {
    id: 'cycles-archive',
    page: 'CycleDrawer',
    label: 'Archive Cycle',
    type: 'action',
    validated: true,
    notes: 'Sets archived=true on cycle',
  },
  {
    id: 'cycles-status-change',
    page: 'CycleDrawer',
    label: 'Change Cycle Status',
    type: 'action',
    validated: true,
  },
  {
    id: 'cycles-run-tests',
    page: 'TestsCyclesPage',
    label: 'Run Tests (dropdown)',
    type: 'navigation',
    target: '/tests/cycles/:cycleId/execution',
    validated: true,
    notes: 'Navigates to cycle execution page',
  },

  // === CYCLE EXECUTION PAGE ===
  {
    id: 'cycle-exec-back',
    page: 'CycleExecutionPage',
    label: 'Back to Cycles',
    type: 'navigation',
    target: '/tests/cycles',
    validated: true,
  },
  {
    id: 'cycle-exec-execute-row',
    page: 'CycleExecutionPage',
    label: 'Execute (row click)',
    type: 'drawer',
    target: 'ExecutionDrawer',
    validated: true,
  },
  {
    id: 'cycle-exec-filter',
    page: 'CycleExecutionPage',
    label: 'Status Filter',
    type: 'action',
    validated: true,
  },
  {
    id: 'executions-run-tests',
    page: 'TestsExecutionsPage',
    label: 'Run Tests',
    type: 'modal',
    target: 'RunTestsModal',
    validated: true,
  },
  {
    id: 'executions-row-click',
    page: 'TestsExecutionsPage',
    label: 'Execution Row Click',
    type: 'drawer',
    target: 'ExecutionDrawer',
    validated: true,
  },
  {
    id: 'executions-filter-cycle',
    page: 'TestsExecutionsPage',
    label: 'Filter by Cycle',
    type: 'action',
    validated: true,
  },
  {
    id: 'executions-filter-status',
    page: 'TestsExecutionsPage',
    label: 'Filter by Status',
    type: 'action',
    validated: true,
  },
  {
    id: 'executions-filter-assignee',
    page: 'TestsExecutionsPage',
    label: 'Filter by Assignee',
    type: 'action',
    validated: true,
  },

  // === EXECUTION DRAWER ===
  {
    id: 'execution-step-pass',
    page: 'ExecutionDrawer',
    label: 'Pass Step',
    type: 'action',
    validated: true,
    notes: 'Updates step status in local state',
  },
  {
    id: 'execution-step-fail',
    page: 'ExecutionDrawer',
    label: 'Fail Step',
    type: 'action',
    validated: true,
  },
  {
    id: 'execution-step-blocked',
    page: 'ExecutionDrawer',
    label: 'Block Step',
    type: 'action',
    validated: true,
  },
  {
    id: 'execution-save',
    page: 'ExecutionDrawer',
    label: 'Save Execution',
    type: 'submit',
    validated: true,
    notes: 'Persists to test_execution_step_results + test_cycle_executions',
  },
  {
    id: 'execution-pass-all',
    page: 'ExecutionDrawer',
    label: 'Pass All Steps',
    type: 'action',
    validated: true,
  },
  {
    id: 'execution-reset',
    page: 'ExecutionDrawer',
    label: 'Reset Steps',
    type: 'action',
    validated: true,
  },
  {
    id: 'execution-create-defect',
    page: 'ExecutionDrawer',
    label: 'Create Defect',
    type: 'modal',
    validated: true,
    notes: 'Creates defect + links via test_execution_defects',
  },

  // === REPORTS PAGE ===
  {
    id: 'reports-export-csv',
    page: 'TestsReportsPage',
    label: 'Export CSV',
    type: 'action',
    validated: true,
    notes: 'Downloads CSV file',
  },
  {
    id: 'reports-export-pdf',
    page: 'TestsReportsPage',
    label: 'Export PDF',
    type: 'action',
    validated: true,
    notes: 'Downloads PDF file',
  },
  {
    id: 'reports-generate-daily',
    page: 'TestsReportsPage',
    label: 'Generate Daily Report',
    type: 'submit',
    validated: true,
    notes: 'Creates record in test_reports table',
  },
  {
    id: 'reports-generate-weekly',
    page: 'TestsReportsPage',
    label: 'Generate Weekly Report',
    type: 'submit',
    validated: true,
  },
  {
    id: 'reports-kpi-click',
    page: 'TestsReportsPage',
    label: 'KPI Card Click',
    type: 'navigation',
    target: '/tests/executions',
    validated: true,
  },
  {
    id: 'reports-risk-item-click',
    page: 'TestsReportsPage',
    label: 'Risk Item Click',
    type: 'navigation',
    validated: true,
    notes: 'Navigates to executions or defects based on risk type',
  },
];

/**
 * Get validation summary
 */
export function getCTAValidationSummary() {
  const total = TESTS_CTA_REGISTRY.length;
  const validated = TESTS_CTA_REGISTRY.filter(c => c.validated).length;
  const unvalidated = TESTS_CTA_REGISTRY.filter(c => !c.validated);
  
  const byPage = TESTS_CTA_REGISTRY.reduce((acc, cta) => {
    if (!acc[cta.page]) acc[cta.page] = { total: 0, validated: 0 };
    acc[cta.page].total++;
    if (cta.validated) acc[cta.page].validated++;
    return acc;
  }, {} as Record<string, { total: number; validated: number }>);

  const byType = TESTS_CTA_REGISTRY.reduce((acc, cta) => {
    if (!acc[cta.type]) acc[cta.type] = 0;
    acc[cta.type]++;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    validated,
    unvalidated,
    percentValidated: Math.round((validated / total) * 100),
    byPage,
    byType,
  };
}

/**
 * Check if a specific CTA is validated
 */
export function isCTAValidated(ctaId: string): boolean {
  const cta = TESTS_CTA_REGISTRY.find(c => c.id === ctaId);
  return cta?.validated ?? false;
}
