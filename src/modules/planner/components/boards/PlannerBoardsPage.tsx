// ============================================================
// PLANNER V9 BOARDS PAGE
// Main entry point for Kanban board with filters
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { BoardKanban } from './BoardKanban';
import type { BoardFilters, BoardTask } from '../../types/planner-boards';
import { CreateTaskModal } from '../kanban';
import { TaskDetailDrawer } from '../TaskDetailDrawer/TaskDetailDrawer';

export interface PlannerBoardsPageProps {
  // Parent filters from PlannerPage
  externalSearch?: string;
  externalWorkstreamId?: string | null;
  externalStatusSlug?: string | null;
  externalPriority?: string | null;
  externalAssigneeId?: string | null;
  externalBlocked?: boolean | null;
  externalOverdue?: boolean | null;
}

export function PlannerBoardsPage({
  externalSearch,
  externalWorkstreamId,
  externalStatusSlug,
  externalPriority,
  externalAssigneeId,
  externalBlocked,
  externalOverdue,
}: PlannerBoardsPageProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  
  // Task detail drawer state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Map parent filters to V9 BoardFilters
  const filters = useMemo<BoardFilters>(() => {
    const mapped: BoardFilters = {};
    
    if (externalSearch) mapped.search = externalSearch;
    if (externalWorkstreamId) mapped.workstream_id = externalWorkstreamId;
    if (externalAssigneeId) mapped.assignee_id = externalAssigneeId;
    if (externalPriority) mapped.priority = externalPriority;
    if (externalBlocked) mapped.blocked = true;
    
    // Map overdue to due_status filter
    if (externalOverdue) mapped.due_status = 'overdue';
    
    return mapped;
  }, [externalSearch, externalWorkstreamId, externalAssigneeId, externalPriority, externalBlocked, externalOverdue]);

  const handleTaskClick = useCallback((task: BoardTask) => {
    setSelectedTaskId(task.id);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedTaskId(null);
  }, []);

  const handleAddTask = useCallback((statusId?: string) => {
    setCreateStatusId(statusId);
    setIsCreateOpen(true);
  }, []);

  return (
    <div className="planner-v9 flex flex-col h-full">
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

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
