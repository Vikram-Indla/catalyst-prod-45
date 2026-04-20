/**
 * WorkflowProvider — React context that exposes workflow definitions
 * with admin overrides merged in from localStorage.
 *
 * Admin edits via /admin/workflows persist to localStorage under the
 * `catalyst.workflow.overrides.v1` key and are merged on top of the
 * hardcoded defaults.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_WORKFLOWS } from './workflowDefinitions';
import type { IssueType, Transition, Workflow, WorkflowOverrides, WorkflowState } from './types';

const STORAGE_KEY = 'catalyst.workflow.overrides.v1';

interface WorkflowContextValue {
  /** All workflows (defaults merged with admin overrides) */
  workflows: Workflow[];
  /** Look up the workflow bound to a given issue type */
  getWorkflowForIssueType: (issueType: IssueType | string) => Workflow | undefined;
  /** Look up a single state inside a workflow */
  getState: (workflowId: string, stateId: string) => WorkflowState | undefined;
  /** Compute the transitions reachable from a given state */
  getAvailableTransitions: (workflowId: string, fromStateId: string) => Transition[];
  /** Admin — upsert a workflow override (persisted to localStorage) */
  saveOverride: (workflowId: string, override: Partial<Workflow>) => void;
  /** Admin — clear all overrides for a workflow (revert to default) */
  clearOverride: (workflowId: string) => void;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

function loadOverrides(): WorkflowOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkflowOverrides) : {};
  } catch {
    return {};
  }
}

function saveOverridesToStorage(overrides: WorkflowOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota / privacy-mode errors
  }
}

function mergeWorkflow(base: Workflow, override?: Partial<Workflow>): Workflow {
  if (!override) return base;
  return {
    ...base,
    ...override,
    states: override.states ?? base.states,
    transitions: override.transitions ?? base.transitions,
    issueTypes: override.issueTypes ?? base.issueTypes,
  };
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<WorkflowOverrides>(() => loadOverrides());

  // Re-sync if another tab updates the overrides
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setOverrides(loadOverrides());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const workflows = useMemo(
    () => DEFAULT_WORKFLOWS.map(wf => mergeWorkflow(wf, overrides[wf.id])),
    [overrides],
  );

  const getWorkflowForIssueType = useCallback(
    (issueType: IssueType | string) => {
      const t = issueType as IssueType;
      return workflows.find(wf => wf.issueTypes.includes(t));
    },
    [workflows],
  );

  const getState = useCallback(
    (workflowId: string, stateId: string) => {
      const wf = workflows.find(w => w.id === workflowId);
      return wf?.states.find(s => s.id === stateId);
    },
    [workflows],
  );

  const getAvailableTransitions = useCallback(
    (workflowId: string, fromStateId: string): Transition[] => {
      const wf = workflows.find(w => w.id === workflowId);
      if (!wf) return [];

      const currentState = wf.states.find(s => s.id === fromStateId);

      // Explicit transitions from this state
      const explicit = wf.transitions.filter(t => t.from === fromStateId);

      // Any-from-this: current state can go to every other state
      // Any-to-this: every other state → this state (inverse — not relevant here)
      const implicit: Transition[] = [];
      if (currentState?.anyFromThis || wf.states.every(s => s.anyToThis)) {
        wf.states.forEach(target => {
          if (target.id === fromStateId) return;
          if (explicit.some(e => e.to === target.id)) return;
          implicit.push({ from: fromStateId, to: target.id, verb: target.name });
        });
      }

      return [...explicit, ...implicit];
    },
    [workflows],
  );

  const saveOverride = useCallback((workflowId: string, override: Partial<Workflow>) => {
    setOverrides(prev => {
      const next = { ...prev, [workflowId]: { ...prev[workflowId], ...override } };
      saveOverridesToStorage(next);
      return next;
    });
  }, []);

  const clearOverride = useCallback((workflowId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[workflowId];
      saveOverridesToStorage(next);
      return next;
    });
  }, []);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      workflows,
      getWorkflowForIssueType,
      getState,
      getAvailableTransitions,
      saveOverride,
      clearOverride,
    }),
    [workflows, getWorkflowForIssueType, getState, getAvailableTransitions, saveOverride, clearOverride],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflows(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    // Graceful fallback — return defaults without localStorage persistence
    const fallbackWorkflows = DEFAULT_WORKFLOWS;
    return {
      workflows: fallbackWorkflows,
      getWorkflowForIssueType: (issueType) => fallbackWorkflows.find(wf => wf.issueTypes.includes(issueType as IssueType)),
      getState: (workflowId, stateId) => fallbackWorkflows.find(w => w.id === workflowId)?.states.find(s => s.id === stateId),
      getAvailableTransitions: (workflowId, fromStateId) => {
        const wf = fallbackWorkflows.find(w => w.id === workflowId);
        if (!wf) return [];
        const currentState = wf.states.find(s => s.id === fromStateId);
        const explicit = wf.transitions.filter(t => t.from === fromStateId);
        const implicit: Transition[] = [];
        if (currentState?.anyFromThis || wf.states.every(s => s.anyToThis)) {
          wf.states.forEach(target => {
            if (target.id === fromStateId) return;
            if (explicit.some(e => e.to === target.id)) return;
            implicit.push({ from: fromStateId, to: target.id, verb: target.name });
          });
        }
        return [...explicit, ...implicit];
      },
      saveOverride: () => {},
      clearOverride: () => {},
    };
  }
  return ctx;
}

export function useWorkflow(issueType: IssueType | string | undefined) {
  const { getWorkflowForIssueType } = useWorkflows();
  return issueType ? getWorkflowForIssueType(issueType) : undefined;
}
