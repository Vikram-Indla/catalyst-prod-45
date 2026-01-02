import { useState, useCallback, useMemo } from 'react';
import { WorkflowEngine } from './WorkflowEngine';
import type { 
  Workflow, 
  TransitionContext, 
  TransitionResult, 
  AvailableTransition 
} from './types';

// Mock workflow for development
const mockWorkflow: Workflow = {
  id: 'default-workflow',
  tenantId: 'default',
  name: 'Default Workflow',
  description: 'Standard software development workflow',
  isActive: true,
  isDefault: true,
  statuses: [
    { id: 'backlog', name: 'Backlog', category: 'todo', color: '#DFE1E6' },
    { id: 'todo', name: 'To Do', category: 'todo', color: '#DFE1E6' },
    { id: 'in-progress', name: 'In Progress', category: 'in_progress', color: '#0052CC' },
    { id: 'in-review', name: 'In Review', category: 'in_progress', color: '#FF991F' },
    { id: 'done', name: 'Done', category: 'done', color: '#36B37E' },
  ],
  transitions: [
    {
      id: 't-1',
      workflowId: 'default-workflow',
      name: 'Start Progress',
      fromStatusId: 'backlog',
      toStatusId: 'in-progress',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Start Progress',
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-2',
      workflowId: 'default-workflow',
      name: 'Start Progress',
      fromStatusId: 'todo',
      toStatusId: 'in-progress',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Start Progress',
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-3',
      workflowId: 'default-workflow',
      name: 'Submit for Review',
      fromStatusId: 'in-progress',
      toStatusId: 'in-review',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Submit for Review',
      sortOrder: 2,
      conditions: [],
      validators: [
        {
          id: 'v-1',
          transitionId: 't-3',
          validatorType: 'field_required',
          configJson: { fieldId: 'summary' },
          errorMessage: 'Summary is required before submitting for review',
          sortOrder: 1,
        },
      ],
      postFunctions: [],
    },
    {
      id: 't-4',
      workflowId: 'default-workflow',
      name: 'Request Changes',
      fromStatusId: 'in-review',
      toStatusId: 'in-progress',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Request Changes',
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [
        {
          id: 'pf-1',
          transitionId: 't-4',
          functionType: 'add_comment',
          configJson: { comment: 'Returned for changes' },
          sortOrder: 1,
          runAsSystem: true,
        },
      ],
    },
    {
      id: 't-5',
      workflowId: 'default-workflow',
      name: 'Approve',
      fromStatusId: 'in-review',
      toStatusId: 'done',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Approve',
      sortOrder: 2,
      conditions: [],
      validators: [],
      postFunctions: [
        {
          id: 'pf-2',
          transitionId: 't-5',
          functionType: 'set_field_value',
          configJson: { fieldId: 'resolved_at', value: new Date().toISOString() },
          sortOrder: 1,
          runAsSystem: true,
        },
      ],
    },
    {
      id: 't-6',
      workflowId: 'default-workflow',
      name: 'Move to Backlog',
      fromStatusId: null,
      toStatusId: 'backlog',
      isGlobal: true,
      isInitial: false,
      buttonText: 'Move to Backlog',
      sortOrder: 10,
      conditions: [],
      validators: [],
      postFunctions: [],
    },
    {
      id: 't-7',
      workflowId: 'default-workflow',
      name: 'Reopen',
      fromStatusId: 'done',
      toStatusId: 'todo',
      isGlobal: false,
      isInitial: false,
      buttonText: 'Reopen',
      sortOrder: 1,
      conditions: [],
      validators: [],
      postFunctions: [
        {
          id: 'pf-3',
          transitionId: 't-7',
          functionType: 'clear_field_value',
          configJson: { fieldId: 'resolved_at' },
          sortOrder: 1,
          runAsSystem: true,
        },
      ],
    },
  ],
};

interface UseWorkflowEngineOptions {
  workflowId?: string;
  tenantId?: string;
}

interface UseWorkflowEngineReturn {
  workflow: Workflow;
  engine: WorkflowEngine;
  getAvailableTransitions: (currentStatusId: string, issue: Record<string, unknown>) => AvailableTransition[];
  executeTransition: (transitionId: string, issue: Record<string, unknown>, formData?: Record<string, unknown>) => Promise<TransitionResult>;
  getStatusById: (statusId: string) => { name: string; category: string; color: string } | undefined;
  isLoading: boolean;
}

export function useWorkflowEngine(options: UseWorkflowEngineOptions = {}): UseWorkflowEngineReturn {
  const [isLoading] = useState(false);

  // In production, would fetch workflow from database based on options
  const workflow = useMemo(() => mockWorkflow, []);

  const engine = useMemo(() => new WorkflowEngine(workflow), [workflow]);

  const getAvailableTransitions = useCallback(
    (currentStatusId: string, issue: Record<string, unknown>): AvailableTransition[] => {
      const context: TransitionContext = {
        issueId: issue.id as string,
        issue,
        userId: 'current-user', // Would come from auth context
        userRoles: ['developer'], // Would come from user profile
        userGroups: ['team-a'], // Would come from user profile
      };

      return engine.getAvailableTransitions(currentStatusId, context);
    },
    [engine]
  );

  const executeTransition = useCallback(
    async (
      transitionId: string,
      issue: Record<string, unknown>,
      formData?: Record<string, unknown>
    ): Promise<TransitionResult> => {
      const context: TransitionContext = {
        issueId: issue.id as string,
        issue,
        userId: 'current-user',
        userRoles: ['developer'],
        userGroups: ['team-a'],
        formData,
      };

      return engine.executeTransition(transitionId, context);
    },
    [engine]
  );

  const getStatusById = useCallback(
    (statusId: string) => {
      const status = workflow.statuses.find(s => s.id === statusId);
      if (!status) return undefined;
      return {
        name: status.name,
        category: status.category,
        color: status.color || '#DFE1E6',
      };
    },
    [workflow]
  );

  return {
    workflow,
    engine,
    getAvailableTransitions,
    executeTransition,
    getStatusById,
    isLoading,
  };
}
