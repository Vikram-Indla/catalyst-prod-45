/**
 * Cycle Templates Type Definitions
 * Catalyst V5 Design System
 */

// Template types
export type TemplateType = 'regression' | 'smoke' | 'uat' | 'custom';

// Assignment method options
export type AssignmentMethod = 'smart' | 'round_robin' | 'manual';

// Test criteria for template
export interface TestCriteria {
  modules?: string[];
  types?: string[];
  priorities?: string[];
  tags?: string[];
  automationStatus?: ('automated' | 'manual')[];
}

// Assignment rules configuration
export interface AssignmentRules {
  method: AssignmentMethod;
  balanceWorkload: boolean;
  respectSkills: boolean;
  excludedMembers?: string[];
  defaultAssignee?: string;
  weights?: {
    workload: number;
    skill: number;
    history: number;
    availability: number;
  };
}

// Milestone definition
export interface TemplateMilestone {
  id: string;
  name: string;
  day: number;
  type: 'checkpoint' | 'review' | 'deadline';
}

// Full template configuration (stored in config JSON)
export interface TemplateConfig {
  testCriteria: TestCriteria;
  assignmentRules: AssignmentRules;
  defaultDurationDays: number;
  includeWeekends: boolean;
  milestones: TemplateMilestone[];
}

// Database template row
export interface CycleTemplate {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  config: TemplateConfig;
  is_global: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Computed/joined fields
  created_by_name?: string;
  usage_count?: number;
  last_used_at?: string | null;
  matching_tests_count?: number;
}

// Template type metadata
export interface TemplateTypeInfo {
  type: TemplateType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  defaultMilestones: TemplateMilestone[];
}

// Template preview data
export interface TemplatePreview {
  totalTests: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalDurationMinutes: number;
  modules: string[];
  types: string[];
}

// Create template input
export interface CreateTemplateInput {
  project_id: string;
  name: string;
  description?: string;
  config: TemplateConfig;
  is_global?: boolean;
}

// Update template input
export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  config?: Partial<TemplateConfig>;
}

// Apply template input
export interface ApplyTemplateInput {
  templateId: string;
  cycleName: string;
  startDate: Date;
  endDate?: Date;
  options?: {
    runSmartAssignment?: boolean;
    notifyTeam?: boolean;
    overrideAssignees?: string[];
  };
}

// Template usage record
export interface TemplateUsage {
  id: string;
  template_id: string;
  cycle_id: string;
  applied_by: string | null;
  applied_at: string;
  modifications?: Record<string, unknown>;
}

// Filter options for template list
export interface TemplateFilters {
  type?: TemplateType;
  search?: string;
  showSystemOnly?: boolean;
}

// Wizard step definitions
export type WizardStep = 'basic' | 'tests' | 'assignment' | 'schedule' | 'review';

export interface WizardState {
  currentStep: WizardStep;
  basicInfo: {
    name: string;
    description: string;
    type: TemplateType;
  };
  testCriteria: TestCriteria;
  assignmentRules: AssignmentRules;
  schedule: {
    durationDays: number;
    includeWeekends: boolean;
    milestones: TemplateMilestone[];
  };
}

// Template type configurations
export const TEMPLATE_TYPES: Record<TemplateType, TemplateTypeInfo> = {
  regression: {
    type: 'regression',
    label: 'Regression',
    icon: 'RefreshCw',
    color: '#2563eb',
    bgColor: '#dbeafe',
    description: 'Full regression testing for release validation',
    defaultMilestones: [
      { id: '1', name: 'Midpoint Review', day: 3, type: 'review' },
      { id: '2', name: 'Final Review', day: 6, type: 'review' },
    ],
  },
  smoke: {
    type: 'smoke',
    label: 'Smoke Test',
    icon: 'Zap',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    description: 'Quick validation of critical paths',
    defaultMilestones: [
      { id: '1', name: 'Complete', day: 1, type: 'deadline' },
    ],
  },
  uat: {
    type: 'uat',
    label: 'UAT',
    icon: 'UserCheck',
    color: '#d97706',
    bgColor: '#fef3c7',
    description: 'User acceptance testing with stakeholders',
    defaultMilestones: [
      { id: '1', name: 'Initial Feedback', day: 2, type: 'checkpoint' },
      { id: '2', name: 'Sign-off', day: 4, type: 'deadline' },
    ],
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    icon: 'Settings',
    color: '#475569',
    bgColor: '#f1f5f9',
    description: 'Custom template configuration',
    defaultMilestones: [],
  },
};

// Default assignment rules
export const DEFAULT_ASSIGNMENT_RULES: AssignmentRules = {
  method: 'smart',
  balanceWorkload: true,
  respectSkills: true,
  weights: {
    workload: 30,
    skill: 40,
    history: 15,
    availability: 15,
  },
};

// Default test criteria
export const DEFAULT_TEST_CRITERIA: TestCriteria = {
  modules: [],
  types: [],
  priorities: [],
  tags: [],
  automationStatus: ['automated', 'manual'],
};

// Default template config
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  testCriteria: DEFAULT_TEST_CRITERIA,
  assignmentRules: DEFAULT_ASSIGNMENT_RULES,
  defaultDurationDays: 7,
  includeWeekends: false,
  milestones: [],
};

// Initial wizard state
export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'basic',
  basicInfo: {
    name: '',
    description: '',
    type: 'custom',
  },
  testCriteria: DEFAULT_TEST_CRITERIA,
  assignmentRules: DEFAULT_ASSIGNMENT_RULES,
  schedule: {
    durationDays: 7,
    includeWeekends: false,
    milestones: [],
  },
};
