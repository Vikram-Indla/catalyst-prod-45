// ============================================================
// TASK LIST PAGE - V3 with Ring-fenced Design System
// Features: Inline editing, column resizing, real-time subscriptions
// Uses ring-fenced CSS tokens (--pln-tl-*) that don't affect other screens
// ============================================================

import { useCallback, useState } from 'react';
import { TaskListPageV3 } from '../components/TaskList';
import { PlannerCreateModal } from '../components/PlannerCreateModal';
import { useCreatePlannerTask } from '../hooks/useCreatePlannerTask';
import type { TaskListTask } from '../hooks/useTaskList';
import { toast } from 'sonner';

export default function TaskListPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const createTask = useCreatePlannerTask();

  const handleTaskClick = useCallback((task: TaskListTask) => {
    // Opens task detail drawer/modal
    toast.info(`Opening ${task.task_key}`);
  }, []);

  const handleCreateTask = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCreate = useCallback((data: any) => {
    createTask.mutate(data, {
      onSuccess: () => {
        setCreateModalOpen(false);
        toast.success('Task created');
      },
      onError: () => {
        toast.error('Failed to create task');
      },
    });
  }, [createTask]);

  return (
    <>
      <TaskListPageV3
        onTaskClick={handleTaskClick}
        onCreateTask={handleCreateTask}
      />
      <PlannerCreateModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
