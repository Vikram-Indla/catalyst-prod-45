/**
 * useTasksTimeline — composes useTaskItems + useTaskWorkstreams and
 * returns a memoized TimelineIssue[] tree ready for `TimelineView`.
 *
 * Phase 3 of the Tasks Hub canonical alignment plan (2026-06-16).
 */
import { useMemo } from 'react';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';
import { useTaskWorkstreams } from '@/modules/tasks/hooks/useTaskWorkstreams';
import { buildTasksTimelineTree } from './buildTasksTimelineTree';
import type { TimelineIssue } from '@/components/shared/Timeline/types';

export interface UseTasksTimelineResult {
  tree: TimelineIssue[];
  isLoading: boolean;
  error: unknown | null;
}

export function useTasksTimeline(): UseTasksTimelineResult {
  const tasksQ = useTaskItems();
  const wsQ = useTaskWorkstreams();

  const tree = useMemo(() => {
    if (!tasksQ.data || !wsQ.data) return [];
    return buildTasksTimelineTree(tasksQ.data, wsQ.data);
  }, [tasksQ.data, wsQ.data]);

  return {
    tree,
    isLoading: tasksQ.isLoading || wsQ.isLoading,
    error: tasksQ.error ?? wsQ.error ?? null,
  };
}
