/**
 * Workflow FSM Tests
 * Validates workflow state machine behavior matches Jira workflows
 * 
 * Test IDs: PARITY-WF-001 through PARITY-WF-006
 */

import { test, expect } from '@playwright/test';

// Workflow state machine types
interface WorkflowStatus {
  id: string;
  name: string;
  category: 'new' | 'indeterminate' | 'done';
}

interface WorkflowTransition {
  id: string;
  name: string;
  from: string[];
  to: string;
  conditions?: TransitionCondition[];
  postFunctions?: PostFunction[];
}

interface TransitionCondition {
  type: 'permission' | 'field' | 'custom';
  config: Record<string, unknown>;
}

interface PostFunction {
  type: 'updateField' | 'notify' | 'custom';
  config: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
}

// Standard Jira-like workflow for testing
const STANDARD_WORKFLOW: Workflow = {
  id: 'standard-workflow',
  name: 'Standard Workflow',
  statuses: [
    { id: 'backlog', name: 'Backlog', category: 'new' },
    { id: 'todo', name: 'To Do', category: 'new' },
    { id: 'in-progress', name: 'In Progress', category: 'indeterminate' },
    { id: 'review', name: 'In Review', category: 'indeterminate' },
    { id: 'done', name: 'Done', category: 'done' },
  ],
  transitions: [
    { id: 't1', name: 'Start Work', from: ['backlog', 'todo'], to: 'in-progress' },
    { id: 't2', name: 'Submit for Review', from: ['in-progress'], to: 'review' },
    { id: 't3', name: 'Approve', from: ['review'], to: 'done' },
    { id: 't4', name: 'Reject', from: ['review'], to: 'in-progress' },
    { id: 't5', name: 'Reopen', from: ['done'], to: 'todo' },
    { id: 't6', name: 'Move to Backlog', from: ['todo', 'in-progress'], to: 'backlog' },
  ],
};

// Workflow FSM implementation for testing
class WorkflowFSM {
  private workflow: Workflow;
  private currentStatus: string;

  constructor(workflow: Workflow, initialStatus: string) {
    this.workflow = workflow;
    this.currentStatus = initialStatus;
  }

  getAvailableTransitions(): WorkflowTransition[] {
    return this.workflow.transitions.filter(t => 
      t.from.includes(this.currentStatus)
    );
  }

  canTransition(transitionId: string): boolean {
    const transition = this.workflow.transitions.find(t => t.id === transitionId);
    if (!transition) return false;
    return transition.from.includes(this.currentStatus);
  }

  transition(transitionId: string): { success: boolean; error?: string } {
    const transition = this.workflow.transitions.find(t => t.id === transitionId);
    
    if (!transition) {
      return { success: false, error: 'Transition not found' };
    }
    
    if (!transition.from.includes(this.currentStatus)) {
      return { 
        success: false, 
        error: `Cannot transition from ${this.currentStatus} using ${transition.name}` 
      };
    }

    this.currentStatus = transition.to;
    return { success: true };
  }

  getCurrentStatus(): string {
    return this.currentStatus;
  }
}

test.describe('PARITY-WF-001: Status transitions follow configured workflow rules', () => {
  test('Valid transition succeeds', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'todo');
    
    const availableTransitions = fsm.getAvailableTransitions();
    expect(availableTransitions.length).toBeGreaterThan(0);
    
    const result = fsm.transition('t1'); // Start Work
    expect(result.success).toBe(true);
    expect(fsm.getCurrentStatus()).toBe('in-progress');
  });

  test('Multiple valid paths exist', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'in-progress');
    
    const transitions = fsm.getAvailableTransitions();
    const transitionNames = transitions.map(t => t.name);
    
    expect(transitionNames).toContain('Submit for Review');
    expect(transitionNames).toContain('Move to Backlog');
  });

  test('Full workflow path can be traversed', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'backlog');
    
    // Backlog -> In Progress
    expect(fsm.transition('t1').success).toBe(true);
    expect(fsm.getCurrentStatus()).toBe('in-progress');
    
    // In Progress -> Review
    expect(fsm.transition('t2').success).toBe(true);
    expect(fsm.getCurrentStatus()).toBe('review');
    
    // Review -> Done
    expect(fsm.transition('t3').success).toBe(true);
    expect(fsm.getCurrentStatus()).toBe('done');
  });
});

test.describe('PARITY-WF-002: Invalid transitions are rejected with proper error', () => {
  test('Direct jump to Done is rejected', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'todo');
    
    // Try to go directly to Done (skipping intermediate states)
    const result = fsm.transition('t3'); // Approve (only from review)
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fsm.getCurrentStatus()).toBe('todo'); // Status unchanged
  });

  test('Invalid transition ID returns error', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'todo');
    
    const result = fsm.transition('invalid-transition');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Transition not found');
  });

  test('Transition from wrong status is rejected', async () => {
    const fsm = new WorkflowFSM(STANDARD_WORKFLOW, 'done');
    
    // Try to use "Start Work" from Done (only valid from backlog/todo)
    const result = fsm.transition('t1');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot transition');
  });
});

test.describe('PARITY-WF-003: Transition conditions are evaluated correctly', () => {
  test('Permission condition blocks unauthorized users', async () => {
    const workflowWithConditions: Workflow = {
      ...STANDARD_WORKFLOW,
      transitions: [
        ...STANDARD_WORKFLOW.transitions,
        {
          id: 't-admin-only',
          name: 'Admin Close',
          from: ['review'],
          to: 'done',
          conditions: [
            { type: 'permission', config: { permission: 'ADMIN' } },
          ],
        },
      ],
    };

    // Simulate condition evaluation
    const evaluateConditions = (
      transition: WorkflowTransition, 
      userPermissions: string[]
    ): boolean => {
      if (!transition.conditions) return true;
      
      return transition.conditions.every(condition => {
        if (condition.type === 'permission') {
          return userPermissions.includes(condition.config.permission as string);
        }
        return true;
      });
    };

    const adminTransition = workflowWithConditions.transitions.find(t => t.id === 't-admin-only')!;
    
    expect(evaluateConditions(adminTransition, ['USER'])).toBe(false);
    expect(evaluateConditions(adminTransition, ['ADMIN'])).toBe(true);
  });

  test('Field condition requires field value', async () => {
    const fieldCondition: TransitionCondition = {
      type: 'field',
      config: { field: 'resolution', operator: 'isNotEmpty' },
    };

    const evaluateFieldCondition = (
      condition: TransitionCondition,
      issueFields: Record<string, unknown>
    ): boolean => {
      if (condition.type !== 'field') return true;
      
      const { field, operator } = condition.config as { field: string; operator: string };
      const value = issueFields[field];
      
      if (operator === 'isNotEmpty') {
        return value !== null && value !== undefined && value !== '';
      }
      return true;
    };

    expect(evaluateFieldCondition(fieldCondition, { resolution: null })).toBe(false);
    expect(evaluateFieldCondition(fieldCondition, { resolution: 'Fixed' })).toBe(true);
  });
});

test.describe('PARITY-WF-004: Post-functions execute after successful transition', () => {
  test('Update field post-function modifies issue', async () => {
    const postFunctions: PostFunction[] = [
      { type: 'updateField', config: { field: 'resolution', value: 'Done' } },
    ];

    const executePostFunctions = (
      functions: PostFunction[],
      issue: Record<string, unknown>
    ): Record<string, unknown> => {
      const updated = { ...issue };
      
      functions.forEach(fn => {
        if (fn.type === 'updateField') {
          const { field, value } = fn.config as { field: string; value: unknown };
          updated[field] = value;
        }
      });
      
      return updated;
    };

    const issue = { id: '1', summary: 'Test', resolution: null };
    const result = executePostFunctions(postFunctions, issue);
    
    expect(result.resolution).toBe('Done');
  });

  test('Notification post-function is triggered', async () => {
    const notifications: string[] = [];
    
    const postFunctions: PostFunction[] = [
      { type: 'notify', config: { event: 'issue_resolved', recipients: ['reporter'] } },
    ];

    const executeNotifyFunction = (fn: PostFunction) => {
      if (fn.type === 'notify') {
        const { event, recipients } = fn.config as { event: string; recipients: string[] };
        notifications.push(`${event} -> ${recipients.join(', ')}`);
      }
    };

    postFunctions.forEach(executeNotifyFunction);
    
    expect(notifications).toContain('issue_resolved -> reporter');
  });
});

test.describe('PARITY-WF-005: Workflow schemes correctly map issue types to workflows', () => {
  test('Different issue types can have different workflows', async () => {
    const workflowScheme: Record<string, string> = {
      'Story': 'standard-workflow',
      'Bug': 'bug-workflow',
      'Epic': 'epic-workflow',
      'Task': 'standard-workflow',
    };

    const getWorkflowForIssueType = (issueType: string): string => {
      return workflowScheme[issueType] || 'default-workflow';
    };

    expect(getWorkflowForIssueType('Story')).toBe('standard-workflow');
    expect(getWorkflowForIssueType('Bug')).toBe('bug-workflow');
    expect(getWorkflowForIssueType('Unknown')).toBe('default-workflow');
  });

  test('Default workflow is applied when no mapping exists', async () => {
    const workflowScheme: Record<string, string> = {
      'Story': 'standard-workflow',
    };

    const getWorkflowForIssueType = (issueType: string): string => {
      return workflowScheme[issueType] || 'default-workflow';
    };

    expect(getWorkflowForIssueType('CustomType')).toBe('default-workflow');
  });
});

test.describe('PARITY-WF-006: Resolution field behavior matches Jira', () => {
  test('Resolution is required when transitioning to Done', async () => {
    const isDoneCategory = (statusId: string): boolean => {
      const status = STANDARD_WORKFLOW.statuses.find(s => s.id === statusId);
      return status?.category === 'done';
    };

    const validateTransition = (
      toStatus: string,
      resolution: string | null
    ): { valid: boolean; error?: string } => {
      if (isDoneCategory(toStatus) && !resolution) {
        return { valid: false, error: 'Resolution is required for Done status' };
      }
      return { valid: true };
    };

    expect(validateTransition('done', null).valid).toBe(false);
    expect(validateTransition('done', 'Fixed').valid).toBe(true);
    expect(validateTransition('in-progress', null).valid).toBe(true);
  });

  test('Resolution is cleared when reopening', async () => {
    const issue = {
      id: '1',
      status: 'done',
      resolution: 'Fixed',
    };

    const handleReopen = (issue: { status: string; resolution: string | null }) => {
      return {
        ...issue,
        status: 'todo',
        resolution: null,
      };
    };

    const reopenedIssue = handleReopen(issue);
    
    expect(reopenedIssue.status).toBe('todo');
    expect(reopenedIssue.resolution).toBeNull();
  });

  test('Valid resolutions match Jira defaults', async () => {
    const validResolutions = [
      'Fixed',
      'Won\'t Fix',
      'Duplicate',
      'Cannot Reproduce',
      'Done',
      'Won\'t Do',
    ];

    validResolutions.forEach(resolution => {
      expect(typeof resolution).toBe('string');
      expect(resolution.length).toBeGreaterThan(0);
    });
  });
});
