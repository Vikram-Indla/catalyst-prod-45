/**
 * Report Types Configuration for Catalyst Test Management
 * Defines all report categories, types, and their input fields
 */

export interface ReportFieldConfig {
  id: string;
  label: string;
  type: 'cycle-select' | 'cycle-multi-select' | 'date-range' | 'folder-select' | 'user-select' | 'checkbox' | 'dropdown' | 'defect-select' | 'requirement-select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface ReportTypeConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  fields: ReportFieldConfig[];
}

export interface ReportCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'traceability', name: 'Traceability', icon: 'Link', description: 'Requirements coverage and mapping' },
  { id: 'case', name: 'Case', icon: 'FileText', description: 'Test case distribution and analysis' },
  { id: 'automation', name: 'Automation', icon: 'Cpu', description: 'Automation coverage and trends' },
  { id: 'single-cycle', name: 'Single Cycle', icon: 'Circle', description: 'Individual cycle execution' },
  { id: 'multi-cycle', name: 'Multi Cycle', icon: 'Layers', description: 'Cross-cycle comparison' },
  { id: 'run', name: 'Run', icon: 'Play', description: 'Test run analysis' },
  { id: 'defect', name: 'Defect', icon: 'Bug', description: 'Defect impact and trends' },
  { id: 'project', name: 'Project', icon: 'Briefcase', description: 'Project-level metrics' },
  { id: 'user', name: 'User', icon: 'User', description: 'User activity tracking' }
];

export const REPORT_TYPES: ReportTypeConfig[] = [
  // Traceability
  {
    id: 'traceability-summary',
    name: 'Traceability Summary',
    category: 'traceability',
    description: 'High-level requirements coverage with priority, execution, and defect distribution',
    icon: 'FileSearch',
    fields: [
      { id: 'requirements', label: 'Requirements', type: 'requirement-select', required: false, placeholder: 'All requirements' }
    ]
  },
  {
    id: 'traceability-detail',
    name: 'Traceability Detail',
    category: 'traceability',
    description: 'End-to-end mapping of requirements to cases, executions, and defects',
    icon: 'Network',
    fields: [
      { id: 'requirements', label: 'Requirements', type: 'requirement-select', required: false, placeholder: 'All requirements' },
      { id: 'includeDefects', label: 'Include Defects', type: 'checkbox', required: false }
    ]
  },
  // Case
  {
    id: 'case-distribution',
    name: 'Case Distribution',
    category: 'case',
    description: 'Analyzes test case data by coverage, priority, release, creation date, and status',
    icon: 'PieChart',
    fields: [
      { id: 'folders', label: 'Folders', type: 'folder-select', required: false, placeholder: 'All folders' },
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false },
      { id: 'priority', label: 'Priority', type: 'dropdown', required: false, options: [
        { value: 'all', label: 'All Priorities' },
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ]},
      { id: 'status', label: 'Status', type: 'dropdown', required: false, options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
        { value: 'approved', label: 'Approved' },
        { value: 'deprecated', label: 'Deprecated' }
      ]}
    ]
  },
  // Automation
  {
    id: 'automation-coverage',
    name: 'Automation Coverage',
    category: 'automation',
    description: 'Shows automation coverage by owner, priority, sets, and cycles',
    icon: 'Settings',
    fields: [
      { id: 'cycles', label: 'Cycles', type: 'cycle-multi-select', required: false, placeholder: 'All cycles' },
      { id: 'groupBy', label: 'Group By', type: 'dropdown', required: false, options: [
        { value: 'owner', label: 'Owner' },
        { value: 'priority', label: 'Priority' },
        { value: 'folder', label: 'Folder' }
      ]}
    ]
  },
  {
    id: 'automation-burndown',
    name: 'Automation Burndown',
    category: 'automation',
    description: 'Cases automated over time with saved manual effort',
    icon: 'TrendingDown',
    fields: [
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: true },
      { id: 'users', label: 'Team Members', type: 'user-select', required: false, placeholder: 'All team members' }
    ]
  },
  // Single Cycle Execution
  {
    id: 'execution-summary',
    name: 'Execution Summary',
    category: 'single-cycle',
    description: 'Current status of a single test cycle',
    icon: 'BarChart2',
    fields: [
      { id: 'cycle', label: 'Select Cycle', type: 'cycle-select', required: true, placeholder: 'Search for cycles...' }
    ]
  },
  {
    id: 'execution-history',
    name: 'Execution History',
    category: 'single-cycle',
    description: 'History of all runs with defect details',
    icon: 'History',
    fields: [
      { id: 'cycle', label: 'Select Cycle', type: 'cycle-select', required: true, placeholder: 'Search for cycles...' },
      { id: 'includeDefects', label: 'Include Defects', type: 'checkbox', required: false }
    ]
  },
  {
    id: 'execution-burndown',
    name: 'Execution Burndown',
    category: 'single-cycle',
    description: 'Burndown rate for a cycle',
    icon: 'TrendingDown',
    fields: [
      { id: 'cycle', label: 'Select Cycle', type: 'cycle-select', required: true, placeholder: 'Search for cycles...' },
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false }
    ]
  },
  // Multi-Cycle Execution
  {
    id: 'multi-cycle-summary',
    name: 'Multi-Cycle Summary',
    category: 'multi-cycle',
    description: 'Current status of multiple cycles together',
    icon: 'BarChart3',
    fields: [
      { id: 'cycles', label: 'Select Cycles', type: 'cycle-multi-select', required: true, min: 2, placeholder: 'Select at least 2 cycles...' }
    ]
  },
  {
    id: 'multi-cycle-detail',
    name: 'Multi-Cycle Detail',
    category: 'multi-cycle',
    description: 'Execution details across multiple cycles',
    icon: 'Table',
    fields: [
      { id: 'cycles', label: 'Select Cycles', type: 'cycle-multi-select', required: true, min: 2, placeholder: 'Select cycles...' }
    ]
  },
  {
    id: 'multi-cycle-distribution',
    name: 'Multi-Cycle Distribution',
    category: 'multi-cycle',
    description: 'Cycle progress by user, priority, type, requirements, and tags',
    icon: 'Grid3X3',
    fields: [
      { id: 'cycles', label: 'Select Cycles', type: 'cycle-multi-select', required: true, min: 2, placeholder: 'Select cycles...' },
      { id: 'groupBy', label: 'Group By', type: 'dropdown', required: true, options: [
        { value: 'assignee', label: 'Assignee' },
        { value: 'priority', label: 'Priority' },
        { value: 'type', label: 'Case Type' },
        { value: 'folder', label: 'Folder' }
      ]}
    ]
  },
  {
    id: 'multi-cycle-comparison',
    name: 'Multi-Cycle Comparison',
    category: 'multi-cycle',
    description: 'Compare results across multiple cycles',
    icon: 'GitCompare',
    fields: [
      { id: 'cycles', label: 'Select Cycles', type: 'cycle-multi-select', required: true, min: 2, max: 5, placeholder: 'Select 2-5 cycles to compare...' }
    ]
  },
  // Run
  {
    id: 'run-distribution',
    name: 'Run Distribution',
    category: 'run',
    description: 'Analyzes cycle data by multiple criteria',
    icon: 'LayoutGrid',
    fields: [
      { id: 'cycles', label: 'Select Cycles', type: 'cycle-multi-select', required: true, placeholder: 'Select cycles...' },
      { id: 'groupBy', label: 'Group By', type: 'dropdown', required: false, options: [
        { value: 'status', label: 'Run Status' },
        { value: 'assignee', label: 'Assignee' },
        { value: 'priority', label: 'Priority' }
      ]}
    ]
  },
  // Defect
  {
    id: 'defect-impact',
    name: 'Defect Impact',
    category: 'defect',
    description: 'Impact of defects on cases and requirements',
    icon: 'AlertTriangle',
    fields: [
      { id: 'defects', label: 'Select Defects', type: 'defect-select', required: false, placeholder: 'Select specific defects or leave empty for all' },
      { id: 'cycle', label: 'Or Filter by Cycle', type: 'cycle-select', required: false, placeholder: 'Select cycle...' }
    ]
  },
  {
    id: 'defect-trend',
    name: 'Defect Trend',
    category: 'defect',
    description: 'All defects in a cycle with status over time',
    icon: 'TrendingUp',
    fields: [
      { id: 'cycle', label: 'Select Cycle', type: 'cycle-select', required: true, placeholder: 'Search for cycles...' },
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false }
    ]
  },
  // Project
  {
    id: 'project-metrics',
    name: 'Project Metrics',
    category: 'project',
    description: 'Key metrics and activity summary',
    icon: 'Activity',
    fields: [
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false }
    ]
  },
  {
    id: 'project-activity',
    name: 'Project Activity',
    category: 'project',
    description: 'Activity tracking over time',
    icon: 'Calendar',
    fields: [
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false },
      { id: 'activityType', label: 'Activity Type', type: 'dropdown', required: false, options: [
        { value: 'all', label: 'All Activities' },
        { value: 'cases', label: 'Case Activities' },
        { value: 'executions', label: 'Execution Activities' },
        { value: 'defects', label: 'Defect Activities' }
      ]}
    ]
  },
  // User
  {
    id: 'user-activity',
    name: 'User Activity',
    category: 'user',
    description: 'User activity over time',
    icon: 'Users',
    fields: [
      { id: 'users', label: 'Select Users', type: 'user-select', required: false, placeholder: 'All users' },
      { id: 'dateRange', label: 'Date Range', type: 'date-range', required: false },
      { id: 'activityType', label: 'Activity Type', type: 'dropdown', required: false, options: [
        { value: 'all', label: 'All Activities' },
        { value: 'cases', label: 'Case Activities' },
        { value: 'executions', label: 'Execution Activities' },
        { value: 'defects', label: 'Defect Activities' }
      ]}
    ]
  }
];

// Helper to get reports by category
export function getReportsByCategory(categoryId: string): ReportTypeConfig[] {
  return REPORT_TYPES.filter(rt => rt.category === categoryId);
}

// Helper to get a report type by ID
export function getReportTypeById(id: string): ReportTypeConfig | undefined {
  return REPORT_TYPES.find(rt => rt.id === id);
}

// Helper to get category by ID
export function getCategoryById(id: string): ReportCategory | undefined {
  return REPORT_CATEGORIES.find(c => c.id === id);
}
