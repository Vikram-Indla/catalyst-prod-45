// ============================================================
// TASK LIST PAGE - V3 with Ring-fenced Design System
// Features: Inline editing, column resizing, real-time subscriptions
// Uses ring-fenced CSS tokens (--pln-tl-*) that don't affect other screens
// ============================================================

import { useCallback, useState } from 'react';
import { TaskListPageV3 } from '../components/TaskList';
import { PlannerCreateModal } from '../components/PlannerCreateModal';
import type { TaskListTask } from '../hooks/useTaskList';
import { toast } from 'sonner';

export default function TaskListPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleTaskClick = useCallback((task: TaskListTask) => {
    // Opens task detail drawer/modal
    toast.info(`Opening ${task.task_key}`);
  }, []);

  const handleCreateTask = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  return (
    <>
      <TaskListPageV3
        onTaskClick={handleTaskClick}
        onCreateTask={handleCreateTask}
      />
      <PlannerCreateModal 
        isOpen={createModalOpen} 
        onClose={handleCloseModal}
        onCreate={() => {}} // Modal handles its own mutation
      />
    </>
  );
}
