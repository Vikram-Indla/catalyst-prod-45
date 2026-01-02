// Workflow Engine Types

export type ConditionType =
  | 'user_in_group'
  | 'user_in_role'
  | 'user_is_assignee'
  | 'user_is_reporter'
  | 'field_required'
  | 'field_value_equals'
  | 'field_value_not_empty'
  | 'previous_status'
  | 'sub_tasks_resolved'
  | 'parent_status'
  | 'permission_check'
  | 'custom_script';

export type ValidatorType =
  | 'field_required'
  | 'field_has_value'
  | 'field_regex'
  | 'field_min_length'
  | 'field_max_length'
  | 'field_number_range'
  | 'date_compare'
  | 'user_permission'
  | 'custom_script';

export type PostFunctionType =
  | 'set_field_value'
  | 'copy_field_value'
  | 'clear_field_value'
  | 'assign_to_user'
  | 'assign_to_reporter'
  | 'assign_to_lead'
  | 'add_comment'
  | 'add_label'
  | 'remove_label'
  | 'update_parent'
  | 'fire_event'
  | 'send_notification'
  | 'trigger_webhook'
  | 'custom_script';

export interface WorkflowStatus {
  id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'done';
  color?: string;
}

export interface WorkflowTransition {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  fromStatusId: string | null;
  toStatusId: string;
  isGlobal: boolean;
  isInitial: boolean;
  buttonText?: string;
  icon?: string;
  sortOrder: number;
  screenId?: string;
  conditions: TransitionCondition[];
  validators: TransitionValidator[];
  postFunctions: TransitionPostFunction[];
}

export interface TransitionCondition {
  id: string;
  transitionId: string;
  conditionType: ConditionType;
  configJson: Record<string, unknown>;
  negate: boolean;
  sortOrder: number;
  groupId?: string;
  groupOperator: 'AND' | 'OR';
}

export interface TransitionValidator {
  id: string;
  transitionId: string;
  validatorType: ValidatorType;
  configJson: Record<string, unknown>;
  errorMessage?: string;
  sortOrder: number;
}

export interface TransitionPostFunction {
  id: string;
  transitionId: string;
  functionType: PostFunctionType;
  configJson: Record<string, unknown>;
  sortOrder: number;
  runAsSystem: boolean;
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  initialStatusId?: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
}

export interface TransitionContext {
  issueId: string;
  issue: Record<string, unknown>;
  userId: string;
  userRoles: string[];
  userGroups: string[];
  formData?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  errors: TransitionError[];
  warnings: string[];
  newStatusId?: string;
  changelog?: ChangelogEntry[];
}

export interface TransitionError {
  type: 'condition' | 'validator' | 'permission' | 'system';
  field?: string;
  message: string;
  code?: string;
}

export interface ChangelogEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AvailableTransition {
  id: string;
  name: string;
  buttonText: string;
  toStatus: WorkflowStatus;
  hasScreen: boolean;
  icon?: string;
}
