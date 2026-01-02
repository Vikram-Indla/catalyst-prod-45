import type {
  Workflow,
  WorkflowTransition,
  TransitionCondition,
  TransitionValidator,
  TransitionPostFunction,
  TransitionContext,
  TransitionResult,
  TransitionError,
  ChangelogEntry,
  AvailableTransition,
} from './types';

/**
 * Jira-class Workflow Engine
 * 
 * Implements a finite state machine with:
 * 1. Permission check
 * 2. Condition check  
 * 3. Validator execution
 * 4. Status update
 * 5. Post-functions
 */
export class WorkflowEngine {
  private workflow: Workflow;

  constructor(workflow: Workflow) {
    this.workflow = workflow;
  }

  /**
   * Get available transitions for current issue state
   */
  getAvailableTransitions(
    currentStatusId: string,
    context: TransitionContext
  ): AvailableTransition[] {
    const transitions = this.workflow.transitions.filter(t => {
      // Global transitions are always available
      if (t.isGlobal && t.toStatusId !== currentStatusId) {
        return true;
      }
      // Normal transitions from current status
      return t.fromStatusId === currentStatusId;
    });

    // Filter by conditions (synchronously check what we can)
    const available: AvailableTransition[] = [];

    for (const transition of transitions) {
      // Quick check - skip if target is same as current
      if (transition.toStatusId === currentStatusId) continue;

      // Check conditions synchronously where possible
      const conditionResult = this.checkConditionsSync(transition.conditions, context);
      if (!conditionResult.passed) continue;

      const toStatus = this.workflow.statuses.find(s => s.id === transition.toStatusId);
      if (!toStatus) continue;

      available.push({
        id: transition.id,
        name: transition.name,
        buttonText: transition.buttonText || transition.name,
        toStatus,
        hasScreen: !!transition.screenId,
        icon: transition.icon,
      });
    }

    return available.sort((a, b) => {
      const tA = transitions.find(t => t.id === a.id);
      const tB = transitions.find(t => t.id === b.id);
      return (tA?.sortOrder ?? 0) - (tB?.sortOrder ?? 0);
    });
  }

  /**
   * Execute a transition
   */
  async executeTransition(
    transitionId: string,
    context: TransitionContext
  ): Promise<TransitionResult> {
    const transition = this.workflow.transitions.find(t => t.id === transitionId);
    
    if (!transition) {
      return {
        success: false,
        errors: [{ type: 'system', message: 'Transition not found' }],
        warnings: [],
      };
    }

    const errors: TransitionError[] = [];
    const warnings: string[] = [];
    const changelog: ChangelogEntry[] = [];

    // Step 1: Permission check
    const permissionResult = await this.checkPermissions(transition, context);
    if (!permissionResult.passed) {
      return {
        success: false,
        errors: [{ type: 'permission', message: permissionResult.message || 'Permission denied' }],
        warnings: [],
      };
    }

    // Step 2: Condition check
    const conditionResult = await this.checkConditions(transition.conditions, context);
    if (!conditionResult.passed) {
      errors.push(...conditionResult.errors);
      return { success: false, errors, warnings };
    }
    warnings.push(...conditionResult.warnings);

    // Step 3: Validator execution
    const validatorResult = await this.runValidators(transition.validators, context);
    if (!validatorResult.passed) {
      errors.push(...validatorResult.errors);
      return { success: false, errors, warnings };
    }
    warnings.push(...validatorResult.warnings);

    // Step 4: Status update (recorded in changelog)
    const currentStatus = this.workflow.statuses.find(
      s => s.id === (context.issue.status_id as string)
    );
    const newStatus = this.workflow.statuses.find(s => s.id === transition.toStatusId);

    changelog.push({
      field: 'status',
      oldValue: currentStatus?.name || context.issue.status_id,
      newValue: newStatus?.name || transition.toStatusId,
    });

    // Step 5: Post-functions
    const postFunctionResults = await this.runPostFunctions(
      transition.postFunctions,
      context,
      transition.toStatusId
    );
    changelog.push(...postFunctionResults.changelog);
    warnings.push(...postFunctionResults.warnings);

    return {
      success: true,
      errors: [],
      warnings,
      newStatusId: transition.toStatusId,
      changelog,
    };
  }

  /**
   * Check if user has permission to execute transition
   */
  private async checkPermissions(
    transition: WorkflowTransition,
    context: TransitionContext
  ): Promise<{ passed: boolean; message?: string }> {
    // Check for permission conditions
    const permissionConditions = transition.conditions.filter(
      c => c.conditionType === 'permission_check'
    );

    for (const condition of permissionConditions) {
      const requiredPermission = condition.configJson.permission as string;
      // In a real implementation, check against permission scheme
      // For now, assume all authenticated users have transition permission
      if (!context.userId) {
        return { 
          passed: false, 
          message: `Missing permission: ${requiredPermission}` 
        };
      }
    }

    return { passed: true };
  }

  /**
   * Check conditions synchronously (for filtering available transitions)
   */
  private checkConditionsSync(
    conditions: TransitionCondition[],
    context: TransitionContext
  ): { passed: boolean } {
    // Group conditions by groupId
    const groups = this.groupConditions(conditions);

    for (const [groupId, groupConditions] of Object.entries(groups)) {
      const operator = groupConditions[0]?.groupOperator || 'AND';
      const results = groupConditions.map(c => this.evaluateConditionSync(c, context));

      if (operator === 'AND' && results.some(r => !r)) {
        return { passed: false };
      }
      if (operator === 'OR' && results.every(r => !r)) {
        return { passed: false };
      }
    }

    return { passed: true };
  }

  /**
   * Check conditions asynchronously (for execution)
   */
  private async checkConditions(
    conditions: TransitionCondition[],
    context: TransitionContext
  ): Promise<{ passed: boolean; errors: TransitionError[]; warnings: string[] }> {
    const errors: TransitionError[] = [];
    const warnings: string[] = [];

    // Group conditions by groupId
    const groups = this.groupConditions(conditions);

    for (const [groupId, groupConditions] of Object.entries(groups)) {
      const operator = groupConditions[0]?.groupOperator || 'AND';
      const results = await Promise.all(
        groupConditions.map(c => this.evaluateCondition(c, context))
      );

      if (operator === 'AND') {
        const failed = results.filter(r => !r.passed);
        if (failed.length > 0) {
          errors.push(...failed.map(r => ({
            type: 'condition' as const,
            message: r.message || 'Condition not met',
          })));
        }
      } else if (operator === 'OR') {
        if (results.every(r => !r.passed)) {
          errors.push({
            type: 'condition',
            message: `None of the conditions in group ${groupId} were met`,
          });
        }
      }
    }

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Group conditions by groupId
   */
  private groupConditions(
    conditions: TransitionCondition[]
  ): Record<string, TransitionCondition[]> {
    const groups: Record<string, TransitionCondition[]> = {};
    
    for (const condition of conditions) {
      const groupId = condition.groupId || 'default';
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(condition);
    }

    return groups;
  }

  /**
   * Evaluate a single condition synchronously
   */
  private evaluateConditionSync(
    condition: TransitionCondition,
    context: TransitionContext
  ): boolean {
    let result = false;

    switch (condition.conditionType) {
      case 'user_is_assignee':
        result = context.issue.assignee_id === context.userId;
        break;

      case 'user_is_reporter':
        result = context.issue.reporter_id === context.userId;
        break;

      case 'user_in_role': {
        const role = condition.configJson.role as string;
        result = context.userRoles.includes(role);
        break;
      }

      case 'user_in_group': {
        const group = condition.configJson.group as string;
        result = context.userGroups.includes(group);
        break;
      }

      case 'field_value_not_empty': {
        const fieldId = condition.configJson.fieldId as string;
        const value = context.issue[fieldId];
        result = value !== null && value !== undefined && value !== '';
        break;
      }

      case 'field_value_equals': {
        const fieldId = condition.configJson.fieldId as string;
        const expectedValue = condition.configJson.value;
        result = context.issue[fieldId] === expectedValue;
        break;
      }

      case 'previous_status': {
        const statusId = condition.configJson.statusId as string;
        result = context.issue.status_id === statusId;
        break;
      }

      default:
        // Conditions that require async checks pass by default in sync mode
        result = true;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Evaluate a single condition asynchronously
   */
  private async evaluateCondition(
    condition: TransitionCondition,
    context: TransitionContext
  ): Promise<{ passed: boolean; message?: string }> {
    let passed = this.evaluateConditionSync(condition, context);

    // Handle async conditions
    switch (condition.conditionType) {
      case 'sub_tasks_resolved':
        // Would check database for subtask statuses
        passed = true; // Placeholder
        break;

      case 'parent_status': {
        // Would check parent issue status
        passed = true; // Placeholder
        break;
      }

      case 'custom_script': {
        // Would execute custom script
        passed = true; // Placeholder
        break;
      }
    }

    passed = condition.negate ? !passed : passed;

    return {
      passed,
      message: passed ? undefined : `Condition ${condition.conditionType} not met`,
    };
  }

  /**
   * Run validators
   */
  private async runValidators(
    validators: TransitionValidator[],
    context: TransitionContext
  ): Promise<{ passed: boolean; errors: TransitionError[]; warnings: string[] }> {
    const errors: TransitionError[] = [];
    const warnings: string[] = [];

    // Sort by order
    const sorted = [...validators].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const validator of sorted) {
      const result = await this.runValidator(validator, context);
      if (!result.passed) {
        errors.push({
          type: 'validator',
          field: result.field,
          message: validator.errorMessage || result.message || 'Validation failed',
        });
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Run a single validator
   */
  private async runValidator(
    validator: TransitionValidator,
    context: TransitionContext
  ): Promise<{ passed: boolean; field?: string; message?: string; warning?: string }> {
    const config = validator.configJson;
    const fieldId = config.fieldId as string;
    const value = context.formData?.[fieldId] ?? context.issue[fieldId];

    switch (validator.validatorType) {
      case 'field_required':
        if (value === null || value === undefined || value === '') {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} is required` 
          };
        }
        break;

      case 'field_has_value':
        if (value === null || value === undefined) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} must have a value` 
          };
        }
        break;

      case 'field_regex': {
        const pattern = config.pattern as string;
        const regex = new RegExp(pattern);
        if (!regex.test(String(value || ''))) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} does not match required pattern` 
          };
        }
        break;
      }

      case 'field_min_length': {
        const minLength = config.minLength as number;
        if (String(value || '').length < minLength) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} must be at least ${minLength} characters` 
          };
        }
        break;
      }

      case 'field_max_length': {
        const maxLength = config.maxLength as number;
        if (String(value || '').length > maxLength) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} must be at most ${maxLength} characters` 
          };
        }
        break;
      }

      case 'field_number_range': {
        const min = config.min as number;
        const max = config.max as number;
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < min || numValue > max) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} must be between ${min} and ${max}` 
          };
        }
        break;
      }

      case 'date_compare': {
        const compareField = config.compareField as string;
        const operator = config.operator as string;
        const compareValue = context.formData?.[compareField] ?? context.issue[compareField];
        
        const dateValue = new Date(value as string);
        const compareDateValue = new Date(compareValue as string);
        
        let passed = true;
        if (operator === 'before' && dateValue >= compareDateValue) passed = false;
        if (operator === 'after' && dateValue <= compareDateValue) passed = false;
        if (operator === 'equals' && dateValue.getTime() !== compareDateValue.getTime()) passed = false;
        
        if (!passed) {
          return { 
            passed: false, 
            field: fieldId, 
            message: `${fieldId} must be ${operator} ${compareField}` 
          };
        }
        break;
      }

      case 'user_permission': {
        const permission = config.permission as string;
        // Would check actual permission
        break;
      }

      case 'custom_script':
        // Would execute custom script
        break;
    }

    return { passed: true };
  }

  /**
   * Run post-functions
   */
  private async runPostFunctions(
    postFunctions: TransitionPostFunction[],
    context: TransitionContext,
    newStatusId: string
  ): Promise<{ changelog: ChangelogEntry[]; warnings: string[] }> {
    const changelog: ChangelogEntry[] = [];
    const warnings: string[] = [];

    // Sort by order
    const sorted = [...postFunctions].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const pf of sorted) {
      try {
        const result = await this.runPostFunction(pf, context, newStatusId);
        if (result.change) {
          changelog.push(result.change);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
      } catch (error) {
        warnings.push(`Post-function ${pf.functionType} failed: ${error}`);
      }
    }

    return { changelog, warnings };
  }

  /**
   * Run a single post-function
   */
  private async runPostFunction(
    postFunction: TransitionPostFunction,
    context: TransitionContext,
    newStatusId: string
  ): Promise<{ change?: ChangelogEntry; warning?: string }> {
    const config = postFunction.configJson;

    switch (postFunction.functionType) {
      case 'set_field_value': {
        const fieldId = config.fieldId as string;
        const value = config.value;
        const oldValue = context.issue[fieldId];
        return {
          change: { field: fieldId, oldValue, newValue: value },
        };
      }

      case 'copy_field_value': {
        const sourceField = config.sourceField as string;
        const targetField = config.targetField as string;
        const oldValue = context.issue[targetField];
        const newValue = context.issue[sourceField];
        return {
          change: { field: targetField, oldValue, newValue },
        };
      }

      case 'clear_field_value': {
        const fieldId = config.fieldId as string;
        const oldValue = context.issue[fieldId];
        return {
          change: { field: fieldId, oldValue, newValue: null },
        };
      }

      case 'assign_to_user': {
        const userId = config.userId as string;
        const oldValue = context.issue.assignee_id;
        return {
          change: { field: 'assignee_id', oldValue, newValue: userId },
        };
      }

      case 'assign_to_reporter': {
        const oldValue = context.issue.assignee_id;
        const newValue = context.issue.reporter_id;
        return {
          change: { field: 'assignee_id', oldValue, newValue },
        };
      }

      case 'add_label': {
        const label = config.label as string;
        const currentLabels = (context.issue.labels as string[]) || [];
        if (!currentLabels.includes(label)) {
          return {
            change: { 
              field: 'labels', 
              oldValue: currentLabels, 
              newValue: [...currentLabels, label] 
            },
          };
        }
        break;
      }

      case 'remove_label': {
        const label = config.label as string;
        const currentLabels = (context.issue.labels as string[]) || [];
        if (currentLabels.includes(label)) {
          return {
            change: { 
              field: 'labels', 
              oldValue: currentLabels, 
              newValue: currentLabels.filter(l => l !== label) 
            },
          };
        }
        break;
      }

      case 'fire_event': {
        // Would fire event to event bus
        console.log(`[WorkflowEngine] Fire event: ${config.eventName}`);
        break;
      }

      case 'send_notification': {
        // Would send notification
        console.log(`[WorkflowEngine] Send notification to: ${config.recipients}`);
        break;
      }

      case 'trigger_webhook': {
        // Would trigger webhook
        console.log(`[WorkflowEngine] Trigger webhook: ${config.webhookUrl}`);
        break;
      }

      case 'custom_script':
        // Would execute custom script
        break;
    }

    return {};
  }

  /**
   * Get initial status for new issues
   */
  getInitialStatus(): string | undefined {
    // First check for explicit initial status
    if (this.workflow.initialStatusId) {
      return this.workflow.initialStatusId;
    }

    // Then check for initial transition
    const initialTransition = this.workflow.transitions.find(t => t.isInitial);
    if (initialTransition) {
      return initialTransition.toStatusId;
    }

    // Fall back to first 'todo' status
    const todoStatus = this.workflow.statuses.find(s => s.category === 'todo');
    return todoStatus?.id;
  }

  /**
   * Validate workflow graph
   */
  validateWorkflow(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for initial status
    if (!this.getInitialStatus()) {
      errors.push('Workflow has no initial status');
    }

    // Check all statuses are reachable
    const reachableStatuses = new Set<string>();
    const initialStatus = this.getInitialStatus();
    if (initialStatus) {
      this.findReachableStatuses(initialStatus, reachableStatuses);
    }

    for (const status of this.workflow.statuses) {
      if (!reachableStatuses.has(status.id)) {
        errors.push(`Status "${status.name}" is not reachable from initial status`);
      }
    }

    // Check for dead ends (non-done statuses with no outgoing transitions)
    for (const status of this.workflow.statuses) {
      if (status.category !== 'done') {
        const hasOutgoing = this.workflow.transitions.some(
          t => t.fromStatusId === status.id || t.isGlobal
        );
        if (!hasOutgoing) {
          errors.push(`Status "${status.name}" has no outgoing transitions`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find all reachable statuses from a given status
   */
  private findReachableStatuses(statusId: string, visited: Set<string>): void {
    if (visited.has(statusId)) return;
    visited.add(statusId);

    const outgoingTransitions = this.workflow.transitions.filter(
      t => t.fromStatusId === statusId || t.isGlobal
    );

    for (const transition of outgoingTransitions) {
      this.findReachableStatuses(transition.toStatusId, visited);
    }
  }
}
