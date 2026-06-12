/**
 * useIssueTypeWorkflow — canonical status hook for all Catalyst surfaces.
 *
 * Wraps useTypeWorkflow + useDefaultProject so callers only need the
 * Jira issue_type string. Returns status groups (ordered by category),
 * the initial status name, and available transitions from the current status.
 *
 * Source of truth: ph_workflow_type_statuses / ph_workflow_statuses /
 * ph_workflow_transitions — same tables the admin/workflows page manages.
 */
import { useMemo } from 'react';
import { useDefaultProject } from './useProjects';
import { useTypeWorkflow, WORK_ITEM_TYPES, type WorkItemType } from './useTypeWorkflow';
import type { StatusCategory } from '@/constants/statusCategoryColors';

// ── Issue type normalizer ────────────────────────────────────────────────────

const ALIASES: Record<string, WorkItemType> = {
  story:                 'Story',
  epic:                  'Epic',
  feature:               'Feature',
  subtask:               'Sub-task',
  'sub-task':            'Sub-task',
  sub_task:              'Sub-task',
  backend:               'Sub-task',
  frontend:              'Sub-task',
  integration:           'Sub-task',
  'api requirement':     'Sub-task',
  'qa bug':              'QA Bug',
  defect:                'QA Bug',
  bug:                   'QA Bug',
  'production incident': 'Production Incident',
  incident:              'Production Incident',
  'business request':    'Business Request',
  'business gap':        'Business Request',
};

function resolveWorkItemType(issueType: string | null | undefined): WorkItemType | null {
  if (!issueType) return null;
  const key = issueType.trim();
  if ((WORK_ITEM_TYPES as readonly string[]).includes(key)) return key as WorkItemType;
  return ALIASES[key.toLowerCase()] ?? null;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface WorkflowStatusGroup {
  groupLabel: string;
  category: StatusCategory;
  statuses: string[];
}

export interface IssueTypeWorkflowResult {
  /** Status groups ordered: todo → in_progress → done */
  statusGroups: WorkflowStatusGroup[];
  /** Name of the status with is_initial=true, or null */
  initialStatus: string | null;
  /**
   * Given the current status name, returns the set of status names the user
   * is allowed to transition to. When no transitions are configured (open
   * model), returns all configured status names.
   */
  getAvailableStatuses: (currentStatus: string | null | undefined) => string[];
  isLoading: boolean;
  /** true when the workflow has at least one status configured */
  hasConfig: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useIssueTypeWorkflow(
  issueType: string | null | undefined,
): IssueTypeWorkflowResult {
  const { data: defaultProject } = useDefaultProject();
  const projectKey = defaultProject?.key ?? '';
  const workItemType = resolveWorkItemType(issueType);

  // useTypeWorkflow has its own `enabled: Boolean(projectKey) && Boolean(workItemType)` guard.
  // Pass an empty projectKey when workItemType is null so the query never fires.
  const { data: workflow, isLoading } = useTypeWorkflow(
    workItemType ? projectKey : '',
    (workItemType ?? 'Story') as WorkItemType,
  );

  const statusGroups = useMemo<WorkflowStatusGroup[]>(() => {
    if (!workflow || !workItemType) return [];

    const byCategory: Record<StatusCategory, string[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const s of workflow.statuses) {
      const cat = s.category as StatusCategory;
      if (cat in byCategory) byCategory[cat].push(s.name);
    }

    const groups: WorkflowStatusGroup[] = [];
    if (byCategory.todo.length)        groups.push({ groupLabel: 'To do',        category: 'todo',        statuses: byCategory.todo });
    if (byCategory.in_progress.length) groups.push({ groupLabel: 'In progress',  category: 'in_progress', statuses: byCategory.in_progress });
    if (byCategory.done.length)        groups.push({ groupLabel: 'Done',          category: 'done',        statuses: byCategory.done });

    return groups;
  }, [workflow, workItemType]);

  const initialStatus = useMemo<string | null>(() => {
    if (!workflow || !workItemType) return null;
    return workflow.statuses.find((s) => s.is_initial)?.name ?? null;
  }, [workflow, workItemType]);

  // Build status-id lookup and transition map once
  const { statusById, transitionMap, allStatusNames } = useMemo(() => {
    if (!workflow) return { statusById: {}, transitionMap: {}, allStatusNames: [] };

    const statusById: Record<string, string> = {}; // id → name
    const nameToId: Record<string, string> = {};
    const allStatusNames: string[] = [];

    for (const s of workflow.statuses) {
      statusById[s.id] = s.name;
      nameToId[s.name] = s.id;
      allStatusNames.push(s.name);
    }

    // Build fromId → Set<toName> map
    const transitionMap: Record<string, Set<string>> = {};
    for (const t of workflow.transitions) {
      const fromKey = t.from_status_id ?? '__any__';
      if (!transitionMap[fromKey]) transitionMap[fromKey] = new Set();
      const toName = statusById[t.to_status_id];
      if (toName) transitionMap[fromKey].add(toName);
    }

    return { statusById, transitionMap, allStatusNames };
  }, [workflow]);

  const getAvailableStatuses = useMemo(() => {
    return (currentStatus: string | null | undefined): string[] => {
      if (allStatusNames.length === 0) return [];

      // No transitions configured → open model: all statuses available
      const hasTransitions = Object.keys(transitionMap).length > 0;
      if (!hasTransitions) return allStatusNames;

      // Find current status id
      const currentId = currentStatus
        ? workflow?.statuses.find((s) => s.name === currentStatus)?.id
        : null;

      // Current status exists but isn't in this workflow (e.g. a Jira status not yet
      // synced to ph_workflow_statuses) → open model: all statuses available.
      // This must come BEFORE wildcard collection — global wildcard transitions would
      // otherwise create a non-empty `available` set and suppress the open-model fallback,
      // causing only their targets to show (regression: only "On Hold" appeared).
      if (currentStatus && currentId === undefined) return allStatusNames;

      // Collect: wildcard transitions (from_status_id IS NULL) + from-current transitions
      const available = new Set<string>();
      const wildcard = transitionMap['__any__'];
      if (wildcard) wildcard.forEach((n) => available.add(n));
      if (currentId && transitionMap[currentId]) {
        transitionMap[currentId].forEach((n) => available.add(n));
      }

      // Always include the current status itself (can't lose your current state)
      if (currentStatus && allStatusNames.includes(currentStatus)) {
        available.add(currentStatus);
      }

      // If nothing resolved (e.g. no transitions from initial status), return all
      if (available.size === 0) return allStatusNames;

      // Return in workflow order
      return allStatusNames.filter((n) => available.has(n));
    };
  }, [allStatusNames, transitionMap, workflow]);

  const hasConfig = statusGroups.length > 0;

  return {
    statusGroups,
    initialStatus,
    getAvailableStatuses,
    isLoading: workItemType ? isLoading : false,
    hasConfig,
  };
}
