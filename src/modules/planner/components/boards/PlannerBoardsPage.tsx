// ============================================================
// PLANNER V9 BOARDS PAGE
// Main entry point for Kanban board with filters
// ============================================================

import { useState, useCallback } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { BoardKanban } from './BoardKanban';
import { BoardFiltersBar } from './BoardFiltersBar';
import { Button } from '@/components/ui/button';
import type { BoardFilters, BoardTask } from '../../types/planner-boards';
import { CreateTaskModal } from '../kanban';

export function PlannerBoardsPage() {
  const [filters, setFilters] = useState<BoardFilters>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();

  const handleTaskClick = useCallback((task: BoardTask) => {
    // Navigate to task detail or open drawer - for now just log
    console.log('Task clicked:', task.key);
  }, []);

  const handleAddTask = useCallback((statusId?: string) => {
    setCreateStatusId(statusId);
    setIsCreateOpen(true);
  }, []);

  return (
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <LayoutGrid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Kanban Board
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drag and drop tasks between columns
            </p>
          </div>
        </div>
        
        <Button onClick={() => handleAddTask()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Filters Bar */}
      <BoardFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <BoardKanban
          filters={filters}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultStatusId={createStatusId}
      />
    </div>
  );
}
