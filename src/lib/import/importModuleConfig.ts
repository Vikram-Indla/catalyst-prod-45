// Import Module Configuration - Dynamic field mappings per module type

export type ImportModuleType = 'demands' | 'epics' | 'features' | 'stories' | 'risks' | 'milestones';

export interface ImportFieldConfig {
  key: string;
  label: string;
  dbColumn: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'relation';
  required: boolean;
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
      { key: 'title', label: 'Title/Summary', dbColumn: 'title', type: 'text', required: true },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'requestor', label: 'Requestor', dbColumn: 'requestor', type: 'text', required: false },
      { key: 'department', label: 'Department', dbColumn: 'department', type: 'text', required: false },
      { key: 'business_owner', label: 'Business Owner', dbColumn: 'business_owner', type: 'text', required: false },
      { key: 'delivery_platform', label: 'Delivery Platform', dbColumn: 'delivery_platform', type: 'text', required: false },
      { key: 'process_step', label: 'Process Step', dbColumn: 'process_step', type: 'select', required: false, options: ['new_request', 'analyse', 'approved', 'implement', 'closed', 'rejected', 'on_hold'] },
      { key: 'urgency', label: 'Urgency', dbColumn: 'urgency', type: 'select', required: false, options: ['low', 'medium', 'high', 'critical'] },
      { key: 'planned_quarter', label: 'Planned Quarter', dbColumn: 'planned_quarter', type: 'text', required: false },
      { key: 'start_date', label: 'Start Date', dbColumn: 'start_date', type: 'date', required: false },
      { key: 'end_date', label: 'End Date', dbColumn: 'end_date', type: 'date', required: false },
      { key: 'estimated_cost_sar', label: 'Estimated Cost (SAR)', dbColumn: 'estimated_cost_sar', type: 'number', required: false },
      { key: 'approved_budget_sar', label: 'Approved Budget (SAR)', dbColumn: 'approved_budget_sar', type: 'number', required: false },
      { key: 'complexity', label: 'Complexity', dbColumn: 'complexity', type: 'select', required: false, options: ['low', 'medium', 'high'] },
      { key: 'business_justification', label: 'Business Justification', dbColumn: 'business_justification', type: 'text', required: false },
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
      { key: 'name', label: 'Epic Name', dbColumn: 'name', type: 'text', required: true },
      { key: 'epic_key', label: 'Epic Key', dbColumn: 'epic_key', type: 'text', required: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'state', label: 'State', dbColumn: 'state', type: 'select', required: false, options: ['funnel', 'analyzing', 'backlog', 'implementing', 'validating', 'deploying', 'done', 'canceled'] },
      { key: 'health', label: 'Health', dbColumn: 'health', type: 'select', required: false, options: ['green', 'yellow', 'red', 'gray'] },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false },
      { key: 'business_value', label: 'Business Value', dbColumn: 'business_value', type: 'number', required: false },
      { key: 'time_value', label: 'Time Value', dbColumn: 'time_value', type: 'number', required: false },
      { key: 'rroe_value', label: 'RR/OE Value', dbColumn: 'rroe_value', type: 'number', required: false },
      { key: 'job_size', label: 'Job Size', dbColumn: 'job_size', type: 'number', required: false },
      { key: 'start_date', label: 'Start Date', dbColumn: 'start_date', type: 'date', required: false },
      { key: 'target_end_date', label: 'Target End Date', dbColumn: 'target_end_date', type: 'date', required: false },
      { key: 'hypothesis', label: 'Hypothesis', dbColumn: 'hypothesis', type: 'text', required: false },
      { key: 'outcome', label: 'Outcome', dbColumn: 'outcome', type: 'text', required: false },
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
      { key: 'name', label: 'Feature Name', dbColumn: 'name', type: 'text', required: true },
      { key: 'display_id', label: 'Feature ID', dbColumn: 'display_id', type: 'text', required: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'state', label: 'State', dbColumn: 'state', type: 'select', required: false, options: ['funnel', 'analyzing', 'backlog', 'implementing', 'validating', 'deploying', 'done'] },
      { key: 'health', label: 'Health', dbColumn: 'health', type: 'select', required: false, options: ['green', 'yellow', 'red', 'gray'] },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false },
      { key: 'business_value', label: 'Business Value', dbColumn: 'business_value', type: 'number', required: false },
      { key: 'time_criticality', label: 'Time Criticality', dbColumn: 'time_criticality', type: 'number', required: false },
      { key: 'risk_reduction', label: 'Risk Reduction', dbColumn: 'risk_reduction', type: 'number', required: false },
      { key: 'job_size', label: 'Job Size', dbColumn: 'job_size', type: 'number', required: false },
      { key: 'acceptance_criteria', label: 'Acceptance Criteria', dbColumn: 'acceptance_criteria', type: 'text', required: false },
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
      { key: 'name', label: 'Story Name', dbColumn: 'name', type: 'text', required: true },
      { key: 'story_key', label: 'Story Key', dbColumn: 'story_key', type: 'text', required: false },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, options: ['backlog', 'ready', 'in_progress', 'review', 'done'] },
      { key: 'story_type', label: 'Story Type', dbColumn: 'story_type', type: 'select', required: false, options: ['user_story', 'enabler', 'spike', 'bug'] },
      { key: 'points', label: 'Story Points', dbColumn: 'points', type: 'number', required: false },
      { key: 'priority', label: 'Priority', dbColumn: 'priority', type: 'number', required: false },
      { key: 'acceptance_criteria', label: 'Acceptance Criteria', dbColumn: 'acceptance_criteria', type: 'text', required: false },
    ],
  },
  {
    type: 'risks',
    label: 'Risks',
    description: 'Risk items across programs',
    tableName: 'risks',
    requiresProject: true,
    fields: [
      { key: 'name', label: 'Risk Name', dbColumn: 'name', type: 'text', required: true },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'category', label: 'Category', dbColumn: 'category', type: 'text', required: false },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, options: ['Open', 'Closed'] },
      { key: 'impact', label: 'Impact', dbColumn: 'impact', type: 'number', required: false },
      { key: 'probability', label: 'Probability', dbColumn: 'probability', type: 'number', required: false },
      { key: 'resolution_method', label: 'Resolution Method (ROAM)', dbColumn: 'resolution_method', type: 'select', required: false, options: ['Resolved', 'Owned', 'Accepted', 'Mitigated'] },
      { key: 'mitigation_plan', label: 'Mitigation Plan', dbColumn: 'mitigation_plan', type: 'text', required: false },
      { key: 'target_resolution_date', label: 'Target Resolution Date', dbColumn: 'target_resolution_date', type: 'date', required: false },
    ],
  },
  {
    type: 'milestones',
    label: 'Milestones',
    description: 'Project and demand milestones',
    tableName: 'milestones',
    requiresProject: false,
    fields: [
      { key: 'name', label: 'Milestone Name', dbColumn: 'name', type: 'text', required: true },
      { key: 'description', label: 'Description', dbColumn: 'description', type: 'text', required: false },
      { key: 'target_date', label: 'Target Date', dbColumn: 'target_date', type: 'date', required: true },
      { key: 'status', label: 'Status', dbColumn: 'status', type: 'select', required: false, options: ['pending', 'current', 'complete', 'at_risk', 'missed'] },
      { key: 'category', label: 'Category', dbColumn: 'category', type: 'text', required: false },
    ],
  },
];

export function getModuleConfig(type: ImportModuleType): ImportModuleConfig | undefined {
  return importModuleConfigs.find(m => m.type === type);
}
