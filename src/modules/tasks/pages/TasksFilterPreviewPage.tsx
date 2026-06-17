/**
 * TasksFilterPreviewPage — /tasks/filters/create
 *
 * 2026-06-17: mounts the canonical FilterPreviewPage with mode='tasks'.
 * Data source: the `tasks` table joined with task_statuses + assignees
 * + workstreams. Saves use the 'TASKS' projectKey sentinel.
 */
import { FilterPreviewPage } from '@/pages/project-hub/filters/FilterPreviewPage';

export default function TasksFilterPreviewPage() {
  return <FilterPreviewPage mode="tasks" />;
}
