/**
 * TasksWorkCanonical — /tasks/work
 *
 * 2026-06-17: mounts the canonical ProjectAllWorkView with `tasksItems`
 * pre-fetched from the `tasks` table + `entityKind='task'` so the detail
 * panel routes to TaskCatalystView. Same UI shell as
 * /project-hub/:key/allwork, /product-hub/:key/allwork, /incident-hub/work
 * (per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT").
 */
import ProjectAllWorkView from '@/pages/project-hub/jira-list/ProjectAllWorkView';
import { useTasksAllWorkItems } from '@/modules/tasks/hooks/useTasksAllWorkItems';

const TASKS_SENTINEL_KEY = 'TASKS';

export default function TasksWorkCanonical() {
  const { data: items, isLoading } = useTasksAllWorkItems();

  return (
    <div
      data-testid="tasks-work-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <ProjectAllWorkView
        projectKey={TASKS_SENTINEL_KEY}
        tasksItems={isLoading ? [] : (items ?? [])}
        entityKind="task"
      />
    </div>
  );
}
