// ============================================================
// PLANNER TASK LIST VIEW - V9
// Wrapper that uses the new TaskListPage component
// ============================================================

import { TaskListPageV3 } from './TaskList';
import type { TaskListTask } from '../hooks/useTaskList';
import type { PlannerTask } from '../types';

interface PlannerTaskListProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<PlannerTask>) => void;
  selectedTaskIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  visibleColumns: Set<string>;
  onOpenCreateModal?: () => void;
}

// Adapter to convert TaskListTask to PlannerTask
function adaptTaskListTask(task: TaskListTask): PlannerTask {
  return {
    id: task.id,
    key: task.task_key,
    title: task.title,
    description: task.description || '',
    status: (task.status_slug as any) || 'backlog',
    type: 'task',
    priority: task.priority,
    assigneeId: task.assignee_id || undefined,
    assigneeName: task.assignee_name || undefined,
    assigneeInitials: task.assignee_name?.split(' ').map(n => n[0]).join('').slice(0, 2),
    teamId: task.workstream_id || undefined,
    teamName: task.workstream_name || undefined,
    teamColor: task.workstream_color || undefined,
    startDate: task.start_date || undefined,
    dueDate: task.due_date || undefined,
    blocked: task.blocked,
    blockedReason: task.blocked_reason || undefined,
    progress: task.progress,
    comments: 0,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export function PlannerTaskList({
  onTaskClick,
  onOpenCreateModal,
}: PlannerTaskListProps) {
  const handleTaskClick = (task: TaskListTask) => {
    onTaskClick(adaptTaskListTask(task));
  };

  const handleCreateTask = () => {
    onOpenCreateModal?.();
  };

  return (
    <TaskListPageV3
      onTaskClick={handleTaskClick}
      onCreateTask={handleCreateTask}
    />
  );
}
