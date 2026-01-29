// ============================================================
// PLANNER V9 BOARDS PAGE
// Main entry point for Kanban board with filters
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Kanban } from 'lucide-react';
import { BoardKanban } from './BoardKanban';
import type { BoardFilters, BoardTask } from '../../types/planner-boards';
import { CreateTaskModal } from '../kanban';
import { TaskDetailDrawer } from '../TaskDetailDrawer/TaskDetailDrawer';
import { PlannerViewHeader } from '../shared/PlannerViewHeader';
import { PlannerSearchBar } from '../PlannerSearchBar';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { usePlannerTasks } from '../../hooks/usePlannerTasks';
import { usePlannerSearch } from '../../hooks/usePlannerSearch';
import type { GroupByOption } from '../../types';

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
  const [searchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Task detail drawer state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Data hooks
  const teams: { id: string; name: string; slug?: string }[] = []; // Workstreams removed
  const { data: users = [] } = usePlannerUsers();

  // Get workstream ID from URL param (slug/code) or external prop
  const urlWorkstream = searchParams.get('workstream');
  const resolvedWorkstreamId = useMemo(() => {
    if (externalWorkstreamId) return externalWorkstreamId;
    if (!urlWorkstream) return null;
    
    // Match by slug (case-insensitive) or by ID
    const match = teams.find(t => 
      t.slug?.toLowerCase() === urlWorkstream.toLowerCase() ||
      t.id === urlWorkstream
    );
    return match?.id || null;
  }, [externalWorkstreamId, urlWorkstream, teams]);

  // Local state for filters
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(resolvedWorkstreamId);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');

  // Sync selected team when URL changes
  useEffect(() => {
    if (resolvedWorkstreamId !== null) {
      setSelectedTeamId(resolvedWorkstreamId);
    }
  }, [resolvedWorkstreamId]);

  const { data: tasks = [] } = usePlannerTasks(selectedTeamId);

  // Search and filter
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

  // Map parent filters to V9 BoardFilters
  const boardFilters = useMemo<BoardFilters>(() => {
    const mapped: BoardFilters = {};
    
    if (filters.search) mapped.search = filters.search;
    if (selectedTeamId) mapped.workstream_id = selectedTeamId;
    if (filters.assigneeId) mapped.assignee_id = filters.assigneeId;
    if (filters.priority) mapped.priority = filters.priority;
    if (filters.blocked) mapped.blocked = true;
    if (filters.status) mapped.status = filters.status;
    
    // Map overdue to due_status filter
    if (filters.overdue) mapped.due_status = 'overdue';
    
    return mapped;
  }, [filters, selectedTeamId]);

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
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* V9 Header */}
      <PlannerViewHeader
        icon={Kanban}
        title="Boards"
        subtitle="Drag and drop tasks across status columns"
        onAddTask={() => setIsCreateOpen(true)}
      />

      {/* Filter Bar - positioned below header */}
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

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 overflow-auto">
        <BoardKanban
          filters={boardFilters}
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
