/**
 * TasksTaskListView — thin shell that mounts the canonical JiraTable for the
 * /tasks/list surface.
 *
 * Wires useTasksTableData (rows + columns + state) → JiraTable. No bespoke
 * markup, no parallel table; matches the REUSE-FIRST + CANONICAL-TABLE rules.
 *
 * Detail route note: at the time of writing there is no `/tasks/list/:key`
 * route registered (only `/tasks/:view`). `onOpen` is a no-op and `getHref`
 * returns '#' until a Tasks detail surface is built. Both can be re-wired
 * without touching this file's structure.
 */
import { JiraTable } from '@/components/shared/JiraTable';
import { useTasksTableData } from '@/modules/tasks/hooks/useTasksTableData';
import type { PlannerTask } from '@/modules/tasks/types';

export default function TasksTaskListView() {
  const { rows, columns, isLoading, error } = useTasksTableData({
    onOpen: () => {
      // No Tasks detail route yet — intentional no-op.
    },
    getHref: () => '#',
  });

  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--ds-text-danger, #AE2A19)' }}>
        Error loading tasks.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <JiraTable<PlannerTask>
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading={isLoading}
      />
    </div>
  );
}
