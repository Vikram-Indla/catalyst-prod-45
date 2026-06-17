/**
 * TasksFilterDetailPage — /tasks/filters/:filterId
 *
 * 2026-06-17: mounts the canonical FilterDetailPage with mode='tasks'.
 * Links go to /tasks/work and /tasks/board. Results panel queries the
 * `tasks` table via FilterResultsPanel's dataSource='tasks' branch.
 */
import FilterDetailPage from '@/pages/project-hub/filters/FilterDetailPage';

export default function TasksFilterDetailPage() {
  return <FilterDetailPage mode="tasks" />;
}
