// ============================================================
// PLANNER V9 BOARDS PAGE
// Main entry point for Kanban board with filters
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardKanban } from './BoardKanban';
import type { BoardFilters, BoardTask } from '../../types/planner-boards';
import { CreateTaskModal } from '../kanban';
import { TaskDetailModal } from '../TaskDetailModal';
import { PlannerViewHeader } from '../shared/PlannerViewHeader';
import { PlannerSearchBar } from '../PlannerSearchBar';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { usePlannerTasks } from '../../hooks/usePlannerTasks';
import { usePlannerSearch } from '../../hooks/usePlannerSearch';
import type { GroupByOption } from '../../types';

export interface PlannerBoardsPageProps {
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
  const [searchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Task detail modal state
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const teams: { id: string; name: string; color?: string; memberCount?: number }[] = [];
  const { data: users = [] } = usePlannerUsers();

  const urlWorkstream = searchParams.get('workstream');
  const resolvedWorkstreamId = useMemo(() => {
    if (externalWorkstreamId) return externalWorkstreamId;
    if (!urlWorkstream) return null;
    const match = teams.find(t => t.id === urlWorkstream);
    return match?.id || null;
  }, [externalWorkstreamId, urlWorkstream, teams]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(resolvedWorkstreamId);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');

  useEffect(() => {
    if (resolvedWorkstreamId !== null) {
      setSelectedTeamId(resolvedWorkstreamId);
    }
  }, [resolvedWorkstreamId]);

  const { data: tasks = [] } = usePlannerTasks(selectedTeamId);

  const {
    filters,
    filteredTasks,
    setSearch,
    setStatusFilter,
    setPriorityFilter,
    setAssigneeFilter,
    setBlockedFilter,
    setOverdueFilter,
    clearFilters,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = usePlannerSearch(tasks);

  const boardFilters = useMemo<BoardFilters>(() => {
    const mapped: BoardFilters = {};
    if (filters.search) mapped.search = filters.search;
    if (selectedTeamId) mapped.workstream_id = selectedTeamId;
    if (filters.assigneeId) mapped.assignee_id = filters.assigneeId;
    if (filters.priority) mapped.priority = filters.priority;
    if (filters.blocked) mapped.blocked = true;
    if (filters.status) mapped.status = filters.status;
    if (filters.overdue) mapped.due_status = 'overdue';
    return mapped;
  }, [filters, selectedTeamId]);

  const handleTaskClick = useCallback((task: BoardTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleAddTask = useCallback((statusId?: string) => {
    setCreateStatusId(statusId);
    setIsCreateOpen(true);
  }, []);

  return (
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <PlannerViewHeader
        title="Boards"
        subtitle="Drag and drop tasks across status columns"
        onAddTask={() => setIsCreateOpen(true)}
      />

      <PlannerSearchBar
        filters={filters}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onBlockedChange={setBlockedFilter}
        onOverdueChange={setOverdueFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredCount}
        totalCount={totalCount}
        inputRef={searchInputRef}
        teams={teams}
        users={users}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        showColumnsButton={false}
      />

      <div className="flex-1 min-h-0 overflow-auto">
        <BoardKanban
          filters={boardFilters}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      </div>

      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultStatusId={createStatusId}
      />

      {selectedTask && (
        <TaskDetailModal
          task={{
            id: selectedTask.id,
            taskId: selectedTask.key,
            title: selectedTask.title,
            description: selectedTask.description || '',
            status: selectedTask.status_name || 'Backlog',
            priority: selectedTask.priority?.charAt(0).toUpperCase() + selectedTask.priority?.slice(1) || 'Medium',
            workstream: selectedTask.workstream_name || 'Unassigned',
            assignee: selectedTask.assignee_name ? {
              name: selectedTask.assignee_name,
              initials: selectedTask.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2),
              color: '#8b5cf6'
            } : undefined,
            dueDate: selectedTask.due_date || undefined,
            createdAt: selectedTask.created_at,
            updatedAt: selectedTask.updated_at
          }}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
