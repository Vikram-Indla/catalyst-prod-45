// ============================================================
// PLANNER V9 BOARDS PAGE
// Main entry point for Kanban board with filters
// ============================================================

import { useState, useCallback } from 'react';
import { BoardKanban } from './BoardKanban';
import { BoardFiltersBar } from './BoardFiltersBar';
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
