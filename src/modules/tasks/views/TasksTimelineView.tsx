/**
 * TasksTimelineView — Tasks Hub timeline view.
 *
 * Phase 3 of the Tasks Hub canonical alignment plan (2026-06-16). Replaces
 * the custom `PlannerTimeline` with the canonical `TimelineView` already
 * mounted by Project Hub and Product Hub.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - TimelineView for the entire Gantt shell
 *   - buildTasksTimelineTree for data adaptation (PlannerTask -> TimelineIssue)
 *   - useTasksTimeline for the composed data hook
 *   - TasksPageHeader for breadcrumb + H1 (same as TasksTaskListView /
 *     TasksBoardView)
 *   - CatalystDetailPanel via TimelineView's `detailEntityKind='task'`
 *     prop wires the side drawer to TaskCatalystView
 *
 * Mutations:
 *   - onUpdateDates: persists start_date + due_date via useUpdatePlannerTask
 *     (looks up the task UUID from the issueKey via a map keyed on `key`).
 *   - onRemoveDates: clears both date fields the same way.
 *   - All other TimelineMutations are unwired in v1 — TimelineView hides
 *     the corresponding UI surfaces automatically.
 */
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  TimelineView,
  type TimelineMutations,
  DEFAULT_WORK_ITEM_TYPES,
} from '@/components/shared/Timeline';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { useTasksTimeline } from '@/modules/tasks/timeline/useTasksTimeline';
import { useTaskItems, useUpdatePlannerTask } from '@/modules/tasks/hooks/useTaskItems';

export default function TasksTimelineView() {
  const queryClient = useQueryClient();
  const { tree, isLoading, error } = useTasksTimeline();
  const { data: tasks = [] } = useTaskItems();
  const updateMutation = useUpdatePlannerTask();

  // Build a key -> id lookup so date mutations can resolve the task UUID
  // from the TimelineIssue's issueKey (which is the task's `key`).
  const keyToIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) m.set(t.key, t.id);
    return m;
  }, [tasks]);

  const findIdForKey = useCallback(
    (issueKey: string): string | null => keyToIdMap.get(issueKey) ?? null,
    [keyToIdMap],
  );

  const mutations: TimelineMutations = useMemo(() => ({
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const id = findIdForKey(issueKey);
      if (!id) return; // synthetic group rows have keys we don't own
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
  }), [findIdForKey, updateMutation]);

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
      // Tasks Hub doesn't have a per-task deeplink route yet. Returning '#'
      // keeps the breadcrumb back link inert; the side panel handles
      // detail access.
      buildIssueDetailRoute={() => '#'}
      resolveItemType={() => 'task'}
      detailRouteOwnerKey="tasks"
      detailEntityKind="task"
      mutations={mutations}
      menuVariant="jira"
      // Inline create / row menus / epic-color picker / change-parent etc.
      // are project-hub specific surfaces. Disable v1.
      enableInlineCreate={false}
      enableCreateEpicRow={false}
      enableEmptyRowAdd={false}
      queryClient={queryClient}
    />
  );
}
