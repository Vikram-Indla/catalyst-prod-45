// ============================================================
// KANBAN PAGE - STANDALONE ENTRY POINT
// New Kanban board using planner_statuses and planner_tasks
// ============================================================

import { useState, useCallback, lazy, Suspense } from 'react';
import { Plus } from 'lucide-react';
import { KanbanBoard, CreateTaskModal } from './components/kanban';
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));
import type { KanbanTask } from './types/kanban';
import { useDeleteKanbanTask } from './hooks/useKanbanTasks';
import { Button } from '@/components/ui/button';

export function KanbanPage() {
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  
  const deleteTask = useDeleteKanbanTask();

  const handleTaskClick = useCallback((task: KanbanTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  }, []);

  const handleTaskEdit = useCallback((task: KanbanTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    deleteTask.mutate(taskId);
  }, [deleteTask]);

  const handleAddTask = useCallback((statusId: string) => {
    setCreateStatusId(statusId);
    setIsCreateOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedTask(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-sm text-muted-foreground">
            Drag and drop tasks between columns to update their status
          </p>
        </div>
        <Button onClick={() => { setCreateStatusId(undefined); setIsCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          onTaskClick={handleTaskClick}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
          onAddTask={handleAddTask}
        />
      </div>

      {/* Task Detail Drawer - CatalystDetailRouter */}
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={isDetailOpen}
          onClose={handleDrawerClose}
          itemId={selectedTask?.id || ''}
          itemType="task"
        />
      </Suspense>

      {/* Create Task Modal - V10 */}
      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
