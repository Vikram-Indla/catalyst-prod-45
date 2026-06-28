export type ReportStatus = 'ready' | 'partial' | 'needs-data';

export interface ReportDef {
  slug: string;
  label: string;
  description: string;
  category: string;
  status: ReportStatus;
  usesDateRange: boolean;
  gapNote?: string;
}

export const REPORT_CATEGORIES = [
  'Execution',
  'Cases',
  'Defects',
  'Multi-Cycle',
  'Project',
  'Traceability',
] as const;

export const REPORT_DEFS: ReportDef[] = [
  // Execution
  {
    slug: 'execution-overview',
    label: 'Execution Overview',
    description: 'Status breakdown and overall progress across all runs.',
    category: 'Execution',
    status: 'partial',
    usesDateRange: true,
    gapNote: 'Folder dimension requires indirect join — ships without folder grouping.',
  },
  {
    slug: 'execution-summary',
    label: 'Execution Summary',
    description: 'Per-cycle summary: total, passed, failed, blocked, pass rate.',
    category: 'Execution',
    status: 'ready',
    usesDateRange: true,
  },
  {
    slug: 'execution-burndown',
    label: 'Execution Burndown',
    description: 'Remaining unexecuted tests over time vs ideal line.',
    category: 'Execution',
    status: 'partial',
    usesDateRange: true,
    gapNote: 'Requires scope count from tm_cycle_scope — formula fixed in this release.',
  },
  {
    slug: 'execution-burnup',
    label: 'Execution Burnup',
    description: 'Cumulative executed and cumulative passed over time.',
    category: 'Execution',
    status: 'ready',
    usesDateRange: true,
  },
  {
    slug: 'execution-distribution',
    label: 'Execution Distribution',
    description: 'Run count broken down by status.',
    category: 'Execution',
    status: 'ready',
    usesDateRange: true,
  },
  {
    slug: 'execution-history',
    label: 'Execution History',
    description: 'Full history of runs with case, executor, result, timestamp.',
    category: 'Execution',
    status: 'ready',
    usesDateRange: true,
  },
  // Cases
  {
    slug: 'case-distribution',
    label: 'Case Distribution',
    description: 'Test cases grouped by status, priority, and type.',
    category: 'Cases',
    status: 'partial',
    usesDateRange: false,
    gapNote: 'Priority and type dimensions added in this release.',
  },
  {
    slug: 'case-usage',
    label: 'Case Usage',
    description: 'How often each test case appears in cycles and executions.',
    category: 'Cases',
    status: 'ready',
    usesDateRange: false,
  },
  // Defects
  {
    slug: 'defect-summary',
    label: 'Defect Summary',
    description: 'Defects grouped by severity and status.',
    category: 'Defects',
    status: 'ready',
    usesDateRange: true,
  },
  {
    slug: 'defect-impact',
    label: 'Defect Impact',
    description: 'Defects linked to test cases — severity and impact.',
    category: 'Defects',
    status: 'partial',
    usesDateRange: false,
    gapNote: 'Requirement linkage pending tm_defects.linked_work_item_id confirmation.',
  },
  {
    slug: 'defect-trend',
    label: 'Defect Trend',
    description: 'Defect creation trend over time.',
    category: 'Defects',
    status: 'partial',
    usesDateRange: true,
    gapNote: 'Closure trend gated on resolved_at field — creation trend ready.',
  },
  // Multi-Cycle
  {
    slug: 'multi-cycle-comparison',
    label: 'Multi-Cycle Comparison',
    description: 'Side-by-side pass rate comparison across cycles.',
    category: 'Multi-Cycle',
    status: 'ready',
    usesDateRange: false,
  },
  {
    slug: 'multi-cycle-summary',
    label: 'Multi-Cycle Summary',
    description: 'One row per cycle — aggregated metrics.',
    category: 'Multi-Cycle',
    status: 'ready',
    usesDateRange: false,
  },
  {
    slug: 'multi-cycle-detail',
    label: 'Multi-Cycle Detail',
    description: 'Per-case results across every selected cycle.',
    category: 'Multi-Cycle',
    status: 'ready',
    usesDateRange: false,
  },
  {
    slug: 'multi-cycle-distribution',
    label: 'Multi-Cycle Distribution',
    description: 'Status distribution pivot: status × cycle.',
    category: 'Multi-Cycle',
    status: 'ready',
    usesDateRange: false,
  },
  // Project
  {
    slug: 'project-overview',
    label: 'Project Overview',
    description: 'Top-level executive view: cases, cycles, runs, pass rate, coverage.',
    category: 'Project',
    status: 'ready',
    usesDateRange: false,
  },
  {
    slug: 'project-metrics',
    label: 'Project Metrics',
    description: 'Velocity, defect rate, and pass-rate trend over time.',
    category: 'Project',
    status: 'partial',
    usesDateRange: true,
    gapNote: 'Retest rate and blocked aging need schema additions.',
  },
  {
    slug: 'project-activity',
    label: 'Project Activity',
    description: 'Recent test activity: date, action, user, entity, cycle.',
    category: 'Project',
    status: 'ready',
    usesDateRange: true,
  },
  // Traceability
  {
    slug: 'traceability-summary',
    label: 'Traceability Summary',
    description: 'Requirement coverage: linked issues with case count and pass rate.',
    category: 'Traceability',
    status: 'partial',
    usesDateRange: false,
    gapNote: 'Coverage % and execution status added in this release.',
  },
  {
    slug: 'traceability-detail',
    label: 'Traceability Detail',
    description: 'Requirement → test case → execution → defect chain.',
    category: 'Traceability',
    status: 'ready',
    usesDateRange: false,
  },
];

export const STATUS_BADGE_LABEL: Record<ReportStatus, string> = {
  ready: 'Ready',
  partial: 'Partial',
  'needs-data': 'Needs Data',
};

export const FORMULA_EXPLANATIONS: Record<string, string> = {
  'execution-overview': 'Pass Rate = Passed Runs ÷ Total Executed Runs × 100. Blocked and Not Run excluded from denominator.',
  'execution-summary': 'Pass Rate = Passed ÷ (Total − Not Run) × 100. Formula shown per cycle row.',
  'execution-burndown': 'Remaining = Total Scope − Cumulative Executed. Ideal Line = Total Scope ÷ Sprint Days × Day Index.',
  'execution-burnup': 'Cumulative Executed = rolling sum of daily runs. Cumulative Passed = rolling sum of passed runs.',
  'execution-distribution': 'Each segment = count of runs with that status. Share = count ÷ total × 100.',
  'case-distribution': 'Count of cases per status/priority/type. Share = count ÷ total cases × 100.',
  'case-usage': 'Cycle Count = number of tm_cycle_scope rows for this test case across all cycles.',
  'defect-summary': 'Total per severity = sum across all statuses. Aging = current date − created_at in days.',
  'defect-impact': 'Impact Score = linked case count × severity weight (Critical=4, Major=3, Minor=2, Trivial=1).',
  'defect-trend': 'Daily Created = count of defects with created_at on that date.',
  'multi-cycle-comparison': 'Pass Rate per cycle = passed scope items ÷ total scope items × 100. Delta = current − previous cycle pass rate.',
  'multi-cycle-summary': 'Duration = end_date − start_date in days. Pass Rate from tm_cycle_scope.execution_status.',
  'multi-cycle-detail': 'Latest status per case per cycle from tm_cycle_scope.execution_status.',
  'multi-cycle-distribution': 'Pivot: status rows × cycle columns. Cell = count of scope items with that status in that cycle.',
  'project-overview': 'Coverage % = cases with at least one run ÷ total cases × 100. Pass Rate = passed runs ÷ total runs × 100.',
  'project-metrics': 'Velocity = total runs ÷ days in range. Defect Rate = total defects ÷ total runs × 100.',
  'project-activity': 'Activity sourced from tm_test_runs.executed_at ordered descending.',
  'traceability-summary': 'Coverage % = cases linked to ph_issues ÷ total cases × 100. Pass Rate = passed latest runs ÷ linked cases × 100.',
  'traceability-detail': 'Latest run status = most recent tm_test_runs.status for each test case.',
};
