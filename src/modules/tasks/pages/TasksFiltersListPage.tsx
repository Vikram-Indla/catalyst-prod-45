/**
 * TasksFiltersListPage — /tasks/filters
 *
 * 2026-06-17: mounts the canonical FiltersListPage with hubType='tasks'.
 * Same UI shell as /project-hub/:key/filters, /product-hub/:key/filters,
 * and /incident-hub/filters per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO
 * NOT REIMPLEMENT". Save scope uses the 'TASKS' projectKey sentinel.
 */
import FiltersListPage from '@/pages/project-hub/filters/FiltersListPage';

export default function TasksFiltersListPage() {
  return <FiltersListPage hubType="tasks" />;
}
