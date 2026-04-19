/**
 * PlanHub Kanban Page — /taskhub-kanban
 *
 * Migrated onto the canonical KanbanBoardShell (Phase 8 of the Catalyst
 * Kanban consolidation). This page used to render a bespoke `KanbanBoard`
 * component with @dnd-kit, custom columns, custom card surfaces, and no
 * Jira-parity toolbar. After migration:
 *
 *   - Rendering flows through <KanbanBoardShell adapter={...}/>, so the
 *     board inherits the Jira-parity toolbar, card surface, density /
 *     view-settings controls, filter popovers, group-by, and the
 *     Pragmatic drag-drop stack for free.
 *
 *   - Columns derive dynamically from `planner_statuses` — users who
 *     have added custom statuses (e.g. "Review", "Blocked") see them as
 *     columns without any config change.
 *
 *   - Drag between columns persists a status_id + position change via
 *     useMoveKanbanTask, which handles both within-column reorder (RPC
 *     reorder_planner_tasks_up/down) and cross-column moves.
 *
 *   - Clicking a card still opens the TaskDetailDrawer (full edit
 *     surface), preserved verbatim from the legacy implementation.
 *
 *   - Create flow: "+ New task" is wired via the adapter's onCreate into
 *     the canonical CreateTaskModal.
 */
import { useCallback, useMemo, useState } from 'react';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildPlannerBoardAdapter } from '@/components/kanban/adapters/plannerBoardAdapter';
import {
  useKanbanTasks,
  useKanbanTasksRealtime,
  useMoveKanbanTask,
  useUpdateKanbanTask,
} from './hooks/useKanbanTasks';
import {
  useKanbanStatuses,
  useKanbanStatusesRealtime,
} from './hooks/useKanbanStatuses';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import type { KanbanTask } from './types/kanban';
import { TaskDetailDrawer, CreateTaskModal } from './components/kanban';

export function KanbanPage() {
  const avatarsByName = useProfileAvatarsByName();

  // Subscribe to realtime so drag/drop from other clients stays in sync.
  useKanbanTasksRealtime();
  useKanbanStatusesRealtime();

  const { data: tasks = [], isLoading: tasksLoading } = useKanbanTasks();
  const { data: statuses = [], isLoading: statusesLoading } = useKanbanStatuses();
  const moveTask = useMoveKanbanTask();
  const updateTask = useUpdateKanbanTask();

  /* ═════ Page-owned filter + group-by state. ═════ */
  const [search, setSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [filterSelected, setFilterSelected] = useState<Record<string, string[]>>({});
  const [groupBy, setGroupBy] = useState<string>('none');

  const onFilterChange = useCallback((categoryId: string, values: string[]) => {
    setFilterSelected(prev => ({ ...prev, [categoryId]: values }));
  }, []);
  const onClearFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
    setSearch('');
  }, []);

  /* ═════ Drawer + create modal. ═════ */
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const taskById = useMemo(() => {
    const m = new Map<string, KanbanTask>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const onCardClick = useCallback((taskId: string) => {
    const task = taskById.get(taskId);
    if (task) {
      setSelectedTask(task);
      setIsDetailOpen(true);
    }
  }, [taskById]);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setIsDetailOpen(open);
    if (!open) setSelectedTask(null);
  }, []);

  /* ═════ Persistence wiring. ═════ */
  const onMove = useCallback(
    (taskId: string, newStatusId: string, newPosition: number) => {
      moveTask.mutate({ taskId, newStatusId, newPosition });
    },
    [moveTask],
  );

  const onToggleFlag = useCallback(
    (taskId: string, next: boolean) => {
      updateTask.mutate({ id: taskId, is_starred: next });
    },
    [updateTask],
  );

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildPlannerBoardAdapter({
    tasks,
    statuses,
    avatarsByName,
    search,
    onSearchChange: setSearch,
    selAssignees,
    onSelAssigneesChange: setSelAssignees,
    filterSelected,
    onFilterChange,
    onClearFilters,
    groupBy,
    onGroupByChange: setGroupBy,
    onMove,
    onToggleFlag,
    onCardClick,
    onCreate: () => setIsCreateOpen(true),
  }), [
    tasks, statuses, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters,
    onMove, onToggleFlag, onCardClick,
  ]);

  if (tasksLoading || statusesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #2563EB', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <>
      <KanbanBoardShell adapter={adapter} title="Kanban Board" />

      <TaskDetailDrawer
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={handleDrawerOpenChange}
      />

      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}
