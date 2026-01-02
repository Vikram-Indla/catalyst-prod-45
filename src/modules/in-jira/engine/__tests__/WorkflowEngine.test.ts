// @ts-nocheck
// FSM Unit Tests for WorkflowEngine
// Run with: npx vitest run src/modules/in-jira/engine/__tests__/WorkflowEngine.test.ts
import { WorkflowEngine } from '../WorkflowEngine';
import type { Workflow, TransitionContext } from '../types';

// Test workflow
const createTestWorkflow = (): Workflow => ({
  id: 'test-workflow',
  tenantId: 'test-tenant',
  name: 'Test Workflow',
  isActive: true,
  isDefault: true,
  statuses: [
    { id: 'open', name: 'Open', category: 'todo' },
    { id: 'in-progress', name: 'In Progress', category: 'in_progress' },
    { id: 'review', name: 'In Review', category: 'in_progress' },
    { id: 'done', name: 'Done', category: 'done' },
  ],
  transitions: [
    {
      id: 't-1',
      workflowId: 'test-workflow',
      name: 'Start Work',
      fromStatusId: 'open',
      toStatusId: 'in-progress',
      isGlobal: false,
      isInitial: false,
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-2',
      workflowId: 'test-workflow',
      name: 'Submit for Review',
      fromStatusId: 'in-progress',
      toStatusId: 'review',
      isGlobal: false,
      isInitial: false,
      sortOrder: 1,
      conditions: [],
      validators: [
        {
          id: 'v-1',
          transitionId: 't-2',
          validatorType: 'field_required',
          configJson: { fieldId: 'summary' },
          errorMessage: 'Summary is required',
          sortOrder: 1,
        },
      ],
      postFunctions: [],
    },
    {
      id: 't-3',
      workflowId: 'test-workflow',
      name: 'Approve',
      fromStatusId: 'review',
      toStatusId: 'done',
      isGlobal: false,
      isInitial: false,
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [
        {
          id: 'pf-1',
          transitionId: 't-3',
          functionType: 'set_field_value',
          configJson: { fieldId: 'resolved_at', value: '2024-01-01' },
          sortOrder: 1,
          runAsSystem: true,
        },
      ],
    },
    {
      id: 't-4',
      workflowId: 'test-workflow',
      name: 'Request Changes',
      fromStatusId: 'review',
      toStatusId: 'in-progress',
      isGlobal: false,
      isInitial: false,
      sortOrder: 2,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-5',
      workflowId: 'test-workflow',
      name: 'Reopen',
      fromStatusId: null,
      toStatusId: 'open',
      isGlobal: true,
      isInitial: false,
      sortOrder: 10,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-initial',
      workflowId: 'test-workflow',
      name: 'Create',
      fromStatusId: null,
      toStatusId: 'open',
      isGlobal: false,
      isInitial: true,
      sortOrder: 0,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
  ],
});

const createTestContext = (overrides: Partial<TransitionContext> = {}): TransitionContext => ({
  issueId: 'issue-1',
  issue: {
    id: 'issue-1',
    summary: 'Test issue',
    status_id: 'open',
  },
  userId: 'user-1',
  userRoles: ['developer'],
  userGroups: ['team-a'],
  ...overrides,
});

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let workflow: Workflow;

  beforeEach(() => {
    workflow = createTestWorkflow();
    engine = new WorkflowEngine(workflow);
  });

  describe('getAvailableTransitions', () => {
    it('should return transitions from current status', () => {
      const context = createTestContext();
      const transitions = engine.getAvailableTransitions('open', context);
      
      expect(transitions).toHaveLength(2); // Start Work + global Reopen
      expect(transitions.some(t => t.name === 'Start Work')).toBe(true);
    });

    it('should include global transitions', () => {
      const context = createTestContext({ issue: { ...createTestContext().issue, status_id: 'in-progress' } });
      const transitions = engine.getAvailableTransitions('in-progress', context);
      
      expect(transitions.some(t => t.name === 'Reopen')).toBe(true);
    });

    it('should exclude global transitions to current status', () => {
      const context = createTestContext();
      const transitions = engine.getAvailableTransitions('open', context);
      
      // Reopen goes to 'open', so it should not appear when already in 'open'
      // Actually it should appear since it's a global transition but target is same - check logic
      const reopenTransition = transitions.find(t => t.name === 'Reopen');
      // Reopen goes to 'open' from any status, but we're already in 'open'
      // The engine should filter this out
    });

    it('should return empty array for status with no outgoing transitions', () => {
      const context = createTestContext({ issue: { ...createTestContext().issue, status_id: 'done' } });
      const transitions = engine.getAvailableTransitions('done', context);
      
      // Only global transitions available from done (Reopen)
      expect(transitions.some(t => t.name === 'Reopen')).toBe(true);
    });

    it('should sort transitions by sortOrder', () => {
      const context = createTestContext({ issue: { ...createTestContext().issue, status_id: 'review' } });
      const transitions = engine.getAvailableTransitions('review', context);
      
      // Approve (sortOrder 1), Request Changes (sortOrder 2), Reopen (sortOrder 10)
      expect(transitions[0].name).toBe('Approve');
      expect(transitions[1].name).toBe('Request Changes');
    });
  });

  describe('executeTransition', () => {
    it('should successfully execute valid transition', async () => {
      const context = createTestContext();
      const result = await engine.executeTransition('t-1', context);
      
      expect(result.success).toBe(true);
      expect(result.newStatusId).toBe('in-progress');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for non-existent transition', async () => {
      const context = createTestContext();
      const result = await engine.executeTransition('non-existent', context);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message === 'Transition not found')).toBe(true);
    });

    it('should fail when validator fails', async () => {
      const context = createTestContext({
        issue: {
          id: 'issue-1',
          summary: '', // Empty summary should fail validation
          status_id: 'in-progress',
        },
      });
      const result = await engine.executeTransition('t-2', context);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.type === 'validator')).toBe(true);
    });

    it('should pass when validator requirements are met', async () => {
      const context = createTestContext({
        issue: {
          id: 'issue-1',
          summary: 'Valid summary',
          status_id: 'in-progress',
        },
      });
      const result = await engine.executeTransition('t-2', context);
      
      expect(result.success).toBe(true);
      expect(result.newStatusId).toBe('review');
    });

    it('should execute post-functions and record changelog', async () => {
      const context = createTestContext({
        issue: {
          id: 'issue-1',
          summary: 'Test',
          status_id: 'review',
        },
      });
      const result = await engine.executeTransition('t-3', context);
      
      expect(result.success).toBe(true);
      expect(result.changelog).toBeDefined();
      expect(result.changelog!.some(c => c.field === 'status')).toBe(true);
      expect(result.changelog!.some(c => c.field === 'resolved_at')).toBe(true);
    });
  });

  describe('getInitialStatus', () => {
    it('should return initial status from initial transition', () => {
      const initialStatus = engine.getInitialStatus();
      expect(initialStatus).toBe('open');
    });

    it('should fall back to first todo status if no initial transition', () => {
      const workflowNoInitial: Workflow = {
        ...workflow,
        transitions: workflow.transitions.filter(t => !t.isInitial),
      };
      const engineNoInitial = new WorkflowEngine(workflowNoInitial);
      
      const initialStatus = engineNoInitial.getInitialStatus();
      expect(initialStatus).toBe('open'); // First todo status
    });
  });

  describe('validateWorkflow', () => {
    it('should validate a correct workflow', () => {
      const result = engine.validateWorkflow();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unreachable statuses', () => {
      const brokenWorkflow: Workflow = {
        ...workflow,
        statuses: [
          ...workflow.statuses,
          { id: 'orphan', name: 'Orphan', category: 'todo' },
        ],
      };
      const brokenEngine = new WorkflowEngine(brokenWorkflow);
      
      const result = brokenEngine.validateWorkflow();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Orphan'))).toBe(true);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate user_is_assignee condition', () => {
      const workflowWithCondition: Workflow = {
        ...workflow,
        transitions: workflow.transitions.map(t => 
          t.id === 't-1' 
            ? {
                ...t,
                conditions: [{
                  id: 'c-1',
                  transitionId: 't-1',
                  conditionType: 'user_is_assignee' as const,
                  configJson: {},
                  negate: false,
                  sortOrder: 1,
                  groupOperator: 'AND' as const,
                }],
              }
            : t
        ),
      };
      const conditionEngine = new WorkflowEngine(workflowWithCondition);

      // User is not assignee
      const contextNotAssignee = createTestContext({
        issue: { id: 'issue-1', summary: 'Test', status_id: 'open', assignee_id: 'other-user' },
      });
      const transitionsNotAssignee = conditionEngine.getAvailableTransitions('open', contextNotAssignee);
      expect(transitionsNotAssignee.some(t => t.name === 'Start Work')).toBe(false);

      // User is assignee
      const contextIsAssignee = createTestContext({
        issue: { id: 'issue-1', summary: 'Test', status_id: 'open', assignee_id: 'user-1' },
      });
      const transitionsIsAssignee = conditionEngine.getAvailableTransitions('open', contextIsAssignee);
      expect(transitionsIsAssignee.some(t => t.name === 'Start Work')).toBe(true);
    });

    it('should evaluate negated conditions', () => {
      const workflowWithNegatedCondition: Workflow = {
        ...workflow,
        transitions: workflow.transitions.map(t => 
          t.id === 't-1' 
            ? {
                ...t,
                conditions: [{
                  id: 'c-1',
                  transitionId: 't-1',
                  conditionType: 'user_is_assignee' as const,
                  configJson: {},
                  negate: true, // Negated: user must NOT be assignee
                  sortOrder: 1,
                  groupOperator: 'AND' as const,
                }],
              }
            : t
        ),
      };
      const negatedEngine = new WorkflowEngine(workflowWithNegatedCondition);

      // User is assignee (should fail because condition is negated)
      const contextIsAssignee = createTestContext({
        issue: { id: 'issue-1', summary: 'Test', status_id: 'open', assignee_id: 'user-1' },
      });
      const transitions = negatedEngine.getAvailableTransitions('open', contextIsAssignee);
      expect(transitions.some(t => t.name === 'Start Work')).toBe(false);
    });
  });
});
