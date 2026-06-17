/**
 * TasksTaskListCanonical — /tasks/list mounted on the canonical
 * BacklogPage with the tasks adapter.
 *
 * 2026-06-17: per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same toolbar, table, column picker, inline create,
 * bulk select, Ask Caty bar, save-filter integration as
 * /project-hub/:key/backlog and /product-hub/:key/backlog — only the
 * data source differs.
 *
 * The Tasks Hub doesn't have a project/product key, so a 'TASKS'
 * sentinel is passed for projectId + projectKey. The canonical Backlog
 * ignores the key when an adapter is provided (BIZ_SOURCE routes every
 * mutation through the adapter).
 *
 * `allowedColumnIds` mirrors the product hub's slim column whitelist —
 * tasks have no parent / sprint / labels, so we expose only key, status,
 * assignee, priority, due_date.
 */
import { Suspense, lazy, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { useTasksBacklogSource } from '@/modules/tasks/adapters/tasksBacklogSource';

const BacklogPage = lazy(() =>
  import('@/modules/project-work-hub/pages/BacklogPage.atlaskit').then((m) => ({
    default: m.BacklogPage,
  })),
);

export default function TasksTaskListCanonical() {
  const adapter = useTasksBacklogSource();
  /* 2026-06-17: TaskCatalystView's "Open in full page" button routes
     here with ?openTask=<task-id>. Forward the id to BacklogPage so the
     panel opens on landing (otherwise the user sees an empty list). */
  const [searchParams] = useSearchParams();
  const initialOpenItemId = useMemo(
    () => searchParams.get('openTask') ?? undefined,
    [searchParams],
  );

  if (!adapter) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TasksPageHeader routeWord="Task List" />
      </div>
    );
  }

  const adapterWithCols = {
    ...adapter,
    ChromeHeader: () => <TasksPageHeader routeWord="Task List" />,
    allowedColumnIds: [
      'key',
      'status',
      'assignee',
      'priority',
      'due_date',
    ] as const,
  };

  return (
    <Suspense fallback={null}>
      <BacklogPage
        projectId="TASKS"
        projectKey="TASKS"
        displayName="Tasks"
        baseUrl="/tasks"
        dataSource={adapterWithCols}
        initialOpenItemId={initialOpenItemId}
      />
    </Suspense>
  );
}
