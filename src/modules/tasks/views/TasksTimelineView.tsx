/**
 * TasksTimelineView — Tasks Hub timeline view.
 *
 * Phase 3 of the Tasks Hub canonical alignment plan (2026-06-16).
 *
 * 2026-06-16 Bug 3 fix (Vikram): aligned timeline structure + create
 * affordances with Project Hub timeline.
 *  - Removed workstream-as-Epic synthetic grouper (Project Hub timeline has
 *    NO synthetic groupers — it's a flat list of root issues with children
 *    nested by parent_key. The Epics-first sort is the only structure.).
 *  - Tasks now render as a flat list of root tasks (parentTaskId === null)
 *    with subtasks nested as children.
 *  - Enabled inline create + bottom "Create task" row by wiring
 *    `onCreateEpic` (root task create) and `onCreateChild` (subtask create).
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - TimelineView for the entire Gantt shell
 *   - useTaskItems for the source data (already in cache for board + list views)
 *   - TasksPageHeader for breadcrumb + H1
 *   - CatalystDetailPanel via TimelineView's `detailEntityKind='task'` prop
 *
 * Mutations:
 *   - onUpdateDates / onRemoveDates / onRemoveStartDate / onRemoveDueDate:
 *     persist via useUpdatePlannerTask.
 *   - onCreateEpic: create a root task (no parent_task_id).
 *   - onCreateChild: create a subtask with parent_task_id = parent row's id.
 */
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
  DEFAULT_WORK_ITEM_TYPES,
} from '@/components/shared/Timeline';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { useTaskItems, useUpdatePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerTask, TaskStatus } from '@/modules/tasks/types';

/* ────────────────────────────── helpers ──────────────────────────────── */

function statusCategoryFromSlug(slug: TaskStatus | null | undefined): string | null {
  if (!slug) return null;
  switch (slug) {
    case 'done': return 'done';
    case 'in-progress':
    case 'review': return 'progress';
    case 'backlog':
    case 'planned': return 'default';
    default: return null;
  }
}

function statusLabelFromSlug(slug: TaskStatus | null | undefined): string {
  switch (slug) {
    case 'backlog': return 'Backlog';
    case 'planned': return 'Planned';
    case 'in-progress': return 'In Progress';
    case 'review': return 'Review';
    case 'done': return 'Done';
    default: return '';
  }
}

function priorityLabel(p: PlannerTask['priority'] | null | undefined): string | null {
  if (!p) return null;
  switch (p) {
    case 'critical': return 'Highest';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return null;
  }
}

function toTimelineLeaf(t: PlannerTask): TimelineIssue {
  return {
    id: t.id,
    issueKey: t.key,
    projectKey: 'TASKS',
    issueType: 'Task',
    summary: t.title,
    status: statusLabelFromSlug(t.status),
    statusCategory: statusCategoryFromSlug(t.status),
    priority: priorityLabel(t.priority),
    assigneeDisplayName: t.assigneeName ?? null,
    assigneeAvatarUrl: null,
    parentKey: null,
    startDate: t.startDate ?? null,
    dueDate: t.dueDate ?? null,
    epicColor: null,
    fixVersions: [],
    children: [],
  };
}

/**
 * Build a flat tree of root tasks with subtasks nested via parent_task_id.
 * Mirrors Project Hub timeline (useProjectHubTimeline.buildTree): no synthetic
 * groupers. Orphan subtasks (parent_task_id points to a task NOT in the
 * input) are promoted to root rather than silently dropped.
 */
function buildFlatTimelineTree(tasks: PlannerTask[]): TimelineIssue[] {
  const idSet = new Set(tasks.map((t) => t.id));
  const leafById = new Map<string, TimelineIssue>();
  for (const t of tasks) leafById.set(t.id, toTimelineLeaf(t));

  const roots: TimelineIssue[] = [];
  for (const t of tasks) {
    const leaf = leafById.get(t.id)!;
    const parentId = t.parentTaskId ?? null;
    if (parentId && idSet.has(parentId)) {
      const parentLeaf = leafById.get(parentId);
      if (parentLeaf) {
        parentLeaf.children.push(leaf);
        leaf.parentKey = parentLeaf.issueKey;
        continue;
      }
    }
    roots.push(leaf);
  }
  return roots;
}

/* ────────────────────────────── view ─────────────────────────────────── */

export default function TasksTimelineView() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading, error } = useTaskItems();
  const updateMutation = useUpdatePlannerTask();

  const tree = useMemo(() => buildFlatTimelineTree(tasks), [tasks]);

  // key -> id lookup for date mutations
  const keyToIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) m.set(t.key, t.id);
    return m;
  }, [tasks]);

  const findIdForKey = useCallback(
    (issueKey: string): string | null => keyToIdMap.get(issueKey) ?? null,
    [keyToIdMap],
  );

  // Resolve a backlog status_id so newly-created tasks have a valid status.
  const resolveBacklogStatusId = useCallback(async (): Promise<string | null> => {
    const { data, error: e } = await supabase
      .from('task_statuses')
      .select('id')
      .eq('slug', 'backlog')
      .maybeSingle();
    if (e) {
      console.error('resolveBacklogStatusId error:', e);
      return null;
    }
    return data?.id ?? null;
  }, []);

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
  }, [queryClient]);

  const mutations: TimelineMutations = useMemo(() => ({
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const id = findIdForKey(issueKey);
      if (!id) return;
      await updateMutation.mutateAsync({
        id,
        updates: { startDate: startDate ?? undefined, dueDate: dueDate ?? undefined },
      });
    },
    onRemoveDates: async (issueKey) => {
      const id = findIdForKey(issueKey);
      if (!id) return;
      await updateMutation.mutateAsync({
        id,
        updates: { startDate: undefined, dueDate: undefined },
      });
    },
    onRemoveStartDate: async (issueKey) => {
      const id = findIdForKey(issueKey);
      if (!id) return;
      await updateMutation.mutateAsync({ id, updates: { startDate: undefined } });
    },
    onRemoveDueDate: async (issueKey) => {
      const id = findIdForKey(issueKey);
      if (!id) return;
      await updateMutation.mutateAsync({ id, updates: { dueDate: undefined } });
    },
    /**
     * Create a root task (no parent). Wired to the bottom "Create task" row
     * of the timeline sidebar. Returns the inserted TimelineIssue so the
     * shell can append it optimistically.
     */
    onCreateEpic: async (summary) => {
      const statusId = await resolveBacklogStatusId();
      if (!statusId) {
        console.error('Cannot create task: backlog status not found in task_statuses');
        return null;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insErr } = await supabase
        .from('tasks')
        .insert({
          title: summary,
          status_id: statusId,
          priority: 'medium',
          created_by: user?.id ?? null,
        } as any)
        .select('id, key, task_key, title')
        .single();
      if (insErr || !data) {
        console.error('onCreateEpic insert error:', insErr);
        invalidateTasks();
        return null;
      }
      const row: any = data;
      invalidateTasks();
      return {
        id: row.id,
        issueKey: row.task_key || row.key || row.id,
        projectKey: 'TASKS',
        issueType: 'Task',
        summary: row.title || summary,
        status: 'Backlog',
        statusCategory: 'default',
        priority: null,
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
        parentKey: null,
        startDate: null,
        dueDate: null,
        epicColor: null,
        fixVersions: [],
        children: [],
      };
    },
    /**
     * Create a subtask. `parentKey` is the parent row's issueKey (the task's
     * `key` column). Resolve to id, then insert with parent_task_id set.
     */
    onCreateChild: async (parentKey, _parentType, _type, summary) => {
      const parentId = findIdForKey(parentKey);
      if (!parentId) return null;
      const statusId = await resolveBacklogStatusId();
      if (!statusId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insErr } = await supabase
        .from('tasks')
        .insert({
          title: summary,
          status_id: statusId,
          priority: 'medium',
          parent_task_id: parentId,
          created_by: user?.id ?? null,
        } as any)
        .select('id, key, task_key, title')
        .single();
      if (insErr || !data) {
        console.error('onCreateChild insert error:', insErr);
        invalidateTasks();
        return null;
      }
      const row: any = data;
      invalidateTasks();
      return {
        id: row.id,
        issueKey: row.task_key || row.key || row.id,
        projectKey: 'TASKS',
        issueType: 'Task',
        summary: row.title || summary,
        status: 'Backlog',
        statusCategory: 'default',
        priority: null,
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
        parentKey,
        startDate: null,
        dueDate: null,
        epicColor: null,
        fixVersions: [],
        children: [],
      };
    },
  }), [findIdForKey, updateMutation, resolveBacklogStatusId, invalidateTasks]);

  return (
    <TimelineView
      items={tree}
      isLoading={isLoading}
      error={error}
      chromeBand={<TasksPageHeader routeWord="Timeline" />}
      hubLabel="Tasks"
      hubKey="tasks"
      filterOptions={{
        workItemTypes: DEFAULT_WORK_ITEM_TYPES,
        enableSavedFilters: false,
      }}
      buildIssueDetailRoute={() => '#'}
      resolveItemType={() => 'task'}
      detailRouteOwnerKey="tasks"
      detailEntityKind="task"
      mutations={mutations}
      menuVariant="jira"
      createTopLevelConfig={{ label: 'Create task', iconType: 'Task' }}
      childTypesOverride={['Task']}
      queryClient={queryClient}
    />
  );
}
