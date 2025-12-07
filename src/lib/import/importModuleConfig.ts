// Import Module Configuration - Dynamic field mappings per module type

export type ImportModuleType = 'demands' | 'epics' | 'features' | 'stories' | 'risks' | 'milestones';

export interface ImportFieldConfig {
  key: string;
  label: string;
  dbColumn: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'relation';
  required: boolean;
  isLookup?: boolean; // Explicitly flag lookup fields for value mapping
  options?: string[];
  foreignTable?: string;
  foreignColumn?: string;
  defaultValue?: string | number | boolean | null;
}

export interface ImportModuleConfig {
  type: ImportModuleType;
  label: string;
  description: string;
  tableName: string;
  fields: ImportFieldConfig[];
  uniqueKeyField?: string;
  requiresProject?: boolean;
}

export const importModuleConfigs: ImportModuleConfig[] = [
  {
    type: 'demands',
    label: 'Demands',
    description: 'Business requests and demand items',
    tableName: 'business_requests',
    uniqueKeyField: 'request_key',
    requiresProject: false,
    fields: [
      { key: 'title', label: 'Title/Summary', dbColumn: 'title', type: 'text', required: true, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'requestor', label: 'Requestor', dbColumn: 'requestor', type: 'text', required: false, isLookup: false },
      { key: 'department', label: 'Department', dbColumn: 'department', type: 'select', required: false, isLookup: true, options: ['IT', 'Finance', 'HR', 'Operations', 'Marketing', 'Legal'] },
      { key: 'business_owner', label: 'Business Owner', dbColumn: 'business_owner', type: 'text', required: false, isLookup: false },
      { key: 'delivery_platform', label: 'Delivery Platform', dbColumn: 'delivery_platform', type: 'select', required: false, isLookup: true, options: ['Innovation Platform', 'Enterprise Platform', 'Digital Platform', 'Core Platform'] },
      { key: 'process_step', label: 'Process Step', dbColumn: 'process_step', type: 'select', required: false, isLookup: true, options: ['new_request', 'analyse', 'approved', 'implement', 'closed', 'rejected', 'on_hold'] },
      { key: 'urgency', label: 'Urgency', dbColumn: 'urgency', type: 'select', required: false, isLookup: true, options: ['low', 'medium', 'high', 'critical'] },
      { key: 'planned_quarter', label: 'Planned Quarter', dbColumn: 'planned_quarter', type: 'select', required: false, isLookup: true, options: ['Q1', 'Q2', 'Q3', 'Q4'] },
      { key: 'start_date', label: 'Start Date', dbColumn: 'start_date', type: 'date', required: false, isLookup: false },
      { key: 'end_date', label: 'End Date', dbColumn: 'end_date', type: 'date', required: false, isLookup: false },
      { key: 'estimated_cost_sar', label: 'Estimated Cost (SAR)', dbColumn: 'estimated_cost_sar', type: 'number', required: false, isLookup: false },
      { key: 'approved_budget_sar', label: 'Approved Budget (SAR)', dbColumn: 'approved_budget_sar', type: 'number', required: false, isLookup: false },
      { key: 'complexity', label: 'Complexity', dbColumn: 'complexity', type: 'select', required: false, isLookup: true, options: ['low', 'medium', 'high'] },
      { key: 'business_justification', label: 'Business Justification', dbColumn: 'business_justification', type: 'text', required: false, isLookup: false },
      { key: 'track', label: 'Track', dbColumn: 'track', type: 'select', required: false, isLookup: true, options: ['track_a', 'track_b', 'track_c'] },
      { key: 'platform', label: 'Platform', dbColumn: 'platform', type: 'select', required: false, isLookup: true, options: ['web', 'mobile', 'desktop', 'api'] },
      { key: 'health', label: 'Health', dbColumn: 'health', type: 'select', required: false, isLookup: true, options: ['green', 'yellow', 'red', 'gray'] },
    ],
  },
  {
    type: 'epics',
    label: 'Epics',
    description: 'Portfolio-level epic work items',
    tableName: 'epics',
    uniqueKeyField: 'epic_key',
    requiresProject: true,
    fields: [
      { key: 'name', label: 'Epic Name', dbColumn: 'name', type: 'text', required: true, isLookup: false },
      { key: 'epic_key', label: 'Epic Key', dbColumn: 'epic_key', type: 'text', required: false, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'state', label: 'State', dbColumn: 'state', type: 'select', required: false, isLookup: true, options: ['funnel', 'analyzing', 'backlog', 'implementing', 'validating', 'deploying', 'done', 'canceled'] },
      { key: 'health', label: 'Health', dbColumn: 'health', type: 'select', required: false, isLookup: true, options: ['green', 'yellow', 'red', 'gray'] },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false, isLookup: false },
      { key: 'business_value', label: 'Business Value', dbColumn: 'business_value', type: 'number', required: false, isLookup: false },
      { key: 'time_value', label: 'Time Value', dbColumn: 'time_value', type: 'number', required: false, isLookup: false },
      { key: 'rroe_value', label: 'RR/OE Value', dbColumn: 'rroe_value', type: 'number', required: false, isLookup: false },
      { key: 'job_size', label: 'Job Size', dbColumn: 'job_size', type: 'number', required: false, isLookup: false },
      { key: 'start_date', label: 'Start Date', dbColumn: 'start_date', type: 'date', required: false, isLookup: false },
      { key: 'target_end_date', label: 'Target End Date', dbColumn: 'target_end_date', type: 'date', required: false, isLookup: false },
      { key: 'hypothesis', label: 'Hypothesis', dbColumn: 'hypothesis', type: 'text', required: false, isLookup: false },
      { key: 'outcome', label: 'Outcome', dbColumn: 'outcome', type: 'text', required: false, isLookup: false },
    ],
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Program-level feature work items',
    tableName: 'features',
    uniqueKeyField: 'display_id',
    requiresProject: true,
    fields: [
      { key: 'name', label: 'Feature Name', dbColumn: 'name', type: 'text', required: true, isLookup: false },
      { key: 'display_id', label: 'Feature ID', dbColumn: 'display_id', type: 'text', required: false, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'state', label: 'State', dbColumn: 'state', type: 'select', required: false, isLookup: true, options: ['funnel', 'analyzing', 'backlog', 'implementing', 'validating', 'deploying', 'done'] },
      { key: 'health', label: 'Health', dbColumn: 'health', type: 'select', required: false, isLookup: true, options: ['green', 'yellow', 'red', 'gray'] },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false, isLookup: false },
      { key: 'business_value', label: 'Business Value', dbColumn: 'business_value', type: 'number', required: false, isLookup: false },
      { key: 'time_criticality', label: 'Time Criticality', dbColumn: 'time_criticality', type: 'number', required: false, isLookup: false },
      { key: 'risk_reduction', label: 'Risk Reduction', dbColumn: 'risk_reduction', type: 'number', required: false, isLookup: false },
      { key: 'job_size', label: 'Job Size', dbColumn: 'job_size', type: 'number', required: false, isLookup: false },
      { key: 'acceptance_criteria', label: 'Acceptance Criteria', dbColumn: 'acceptance_criteria', type: 'text', required: false, isLookup: false },
    ],
  },
  {
    type: 'stories',
    label: 'Stories',
    description: 'Team-level story work items',
    tableName: 'stories',
    uniqueKeyField: 'story_key',
    requiresProject: true,
    fields: [
      { key: 'name', label: 'Story Name', dbColumn: 'name', type: 'text', required: true, isLookup: false },
      { key: 'story_key', label: 'Story Key', dbColumn: 'story_key', type: 'text', required: false, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, isLookup: true, options: ['backlog', 'ready', 'in_progress', 'review', 'done'] },
      { key: 'story_type', label: 'Story Type', dbColumn: 'story_type', type: 'select', required: false, isLookup: true, options: ['user_story', 'enabler', 'spike', 'bug'] },
      { key: 'points', label: 'Story Points', dbColumn: 'points', type: 'number', required: false, isLookup: false },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false, isLookup: false },
      { key: 'acceptance_criteria', label: 'Acceptance Criteria', dbColumn: 'acceptance_criteria', type: 'text', required: false, isLookup: false },
    ],
  },
  {
    type: 'risks',
    label: 'Risks',
    description: 'Risk items across programs',
    tableName: 'risks',
    requiresProject: true,
    fields: [
      { key: 'name', label: 'Risk Name', dbColumn: 'name', type: 'text', required: true, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'category', label: 'Category', dbColumn: 'category', type: 'select', required: false, isLookup: true, options: ['Technical', 'Schedule', 'Resource', 'Budget', 'Scope'] },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, isLookup: true, options: ['Open', 'Closed'] },
      { key: 'impact', label: 'Impact', dbColumn: 'impact', type: 'select', required: false, isLookup: true, options: ['1', '2', '3', '4', '5'] },
      { key: 'probability', label: 'Probability', dbColumn: 'probability', type: 'select', required: false, isLookup: true, options: ['1', '2', '3', '4', '5'] },
      { key: 'resolution_method', label: 'Resolution Method (ROAM)', dbColumn: 'resolution_method', type: 'select', required: false, isLookup: true, options: ['Resolved', 'Owned', 'Accepted', 'Mitigated'] },
      { key: 'mitigation_plan', label: 'Mitigation Plan', dbColumn: 'mitigation_plan', type: 'text', required: false, isLookup: false },
      { key: 'target_resolution_date', label: 'Target Resolution Date', dbColumn: 'target_resolution_date', type: 'date', required: false, isLookup: false },
    ],
  },
  {
    type: 'milestones',
    label: 'Milestones',
    description: 'Project and demand milestones',
    tableName: 'milestones',
    requiresProject: false,
    fields: [
      { key: 'name', label: 'Milestone Name', dbColumn: 'name', type: 'text', required: true, isLookup: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false, isLookup: false },
      { key: 'target_date', label: 'Target Date', dbColumn: 'target_date', type: 'date', required: true, isLookup: false },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, isLookup: true, options: ['pending', 'current', 'complete', 'at_risk', 'missed'] },
      { key: 'category', label: 'Category', dbColumn: 'category', type: 'select', required: false, isLookup: true, options: ['Planning', 'Development', 'Testing', 'Deployment', 'Review'] },
    ],
  },
];

export function getModuleConfig(type: ImportModuleType): ImportModuleConfig | undefined {
  return importModuleConfigs.find(m => m.type === type);
}

// Helper to check if a field supports value mapping
export function isLookupField(field: ImportFieldConfig | undefined): boolean {
  if (!field) return false;
  // Use explicit isLookup flag if set, otherwise fallback to type check
  return field.isLookup === true || field.type === 'select' || field.type === 'relation';
}
