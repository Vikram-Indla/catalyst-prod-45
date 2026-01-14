// ============================================================
// PLANNER MODULE - MAIN PAGE
// Enterprise work planning with 7 views
// ============================================================

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { PlannerView, PlannerTask, TaskStatus, AIInsight, GroupByOption } from './types';
import { PlannerSidebar } from './components/PlannerSidebar';
import { KanbanBoard } from './components/kanban';
import { PlannerTaskList } from './components/PlannerTaskList';
import { PlannerTimeline } from './components/PlannerTimeline';
import { PlannerCalendar } from './components/PlannerCalendar';
import { PlannerWeeklyReport } from './components/PlannerWeeklyReport';
import { PlannerWorkstreamPerformance } from './components/PlannerWorkstreamPerformance';
import { PlannerAIInsights } from './components/PlannerAIInsights';
import { PlannerSettings } from './components/PlannerSettings';
import { PlannerTaskDrawer } from './components/PlannerTaskDrawer';
import { PlannerCreateModal } from './components/PlannerCreateModal';
import { PlannerCreateTeamModal } from './components/PlannerCreateTeamModal';
import { PlannerBulkActionBar } from './components/PlannerBulkActionBar';
import { PlannerBulkDeleteModal } from './components/PlannerBulkDeleteModal';


import { PlannerSearchBar } from './components/PlannerSearchBar';
import { usePlannerTasks, useUpdatePlannerTask, useDeletePlannerTask, useBulkDeletePlannerTasks } from './hooks/usePlannerTasks';
import { usePlannerWorkstreams } from './hooks/usePlannerWorkstreams';
import { usePlannerUsers } from './hooks/usePlannerUsers';
import { useCreatePlannerTask } from './hooks/useCreatePlannerTask';
import { usePlannerSearch } from './hooks/usePlannerSearch';
import { usePlannerKeyboard } from './hooks/usePlannerKeyboard';

import { usePlannerRealtime } from './hooks/usePlannerRealtime';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';
import { useCreateTeam } from '@/hooks/useTeams';

// View titles for breadcrumb header
const VIEW_TITLES: Record<PlannerView, string> = {
  'boards': 'Boards',
  'task-list': 'Task List',
  'timeline': 'Timeline',
  'calendar': 'Calendar',
  'weekly-report': 'Weekly Report',
  'workstream-performance': 'Workstream Performance',
  'ai-insights': 'AI Insights',
  'workstreams': 'Workstreams',
  'resources': 'Resources',
  'settings': 'Settings',
};

export function PlannerPage() {
  const navigate = useNavigate();
  const { view } = useParams<{ view?: string }>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Core state
  const [activeView, setActiveView] = useState<PlannerView>((view as PlannerView) || 'boards');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption | 'none'>('none');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  
  // Drawer/Modal state
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>('backlog');
  
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);

  // Sync activeView with URL
  useEffect(() => {
    if (view && view !== activeView) {
      setActiveView(view as PlannerView);
    }
  }, [view]);

  // Data hooks
  const { data: tasks = [], isLoading } = usePlannerTasks(selectedTeamId);
  const { data: teams = [] } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();
  
  // Online users from real users data (add color for avatar)
  const avatarColors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0d9488'];
  const onlineUsers = useMemo(() => 
    users.filter(u => u.online).map((u, i) => ({
      id: u.id,
      initials: u.initials,
      color: avatarColors[i % avatarColors.length],
    })),
  [users]);
  const updateTask = useUpdatePlannerTask();
  const deleteTask = useDeletePlannerTask();
  const bulkDeleteTasks = useBulkDeletePlannerTasks();
  const createTask = useCreatePlannerTask();
  const createTeam = useCreateTeam();
  
  // Realtime subscription for live updates
  usePlannerRealtime(selectedTeamId);
  
  // Search and filter
  const {
    filters,
    filteredTasks,
    setSearch,
    setStatusFilter,
    setPriorityFilter,
    setBlockedFilter,
    setOverdueFilter,
    clearFilters,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = usePlannerSearch(tasks);



  // Task navigation for keyboard shortcuts
  const taskIndex = useMemo(() => {
    if (!selectedTask) return -1;
    return filteredTasks.findIndex(t => t.id === selectedTask.id);
  }, [selectedTask, filteredTasks]);

  // Keyboard shortcuts
  usePlannerKeyboard({
    onCreateTask: () => {
      setCreateDefaultStatus('backlog');
      setIsCreateModalOpen(true);
    },
    onOpenSearch: () => {
      searchInputRef.current?.focus();
    },
    onToggleAIPanel: () => {},
    onNavigateNext: () => {
      if (filteredTasks.length === 0) return;
      const nextIndex = taskIndex < 0 ? 0 : Math.min(taskIndex + 1, filteredTasks.length - 1);
      const nextTask = filteredTasks[nextIndex];
      setSelectedTask(nextTask);
      setIsDrawerOpen(true);
    },
    onNavigatePrev: () => {
      if (filteredTasks.length === 0) return;
      const prevIndex = taskIndex < 0 ? 0 : Math.max(taskIndex - 1, 0);
      const prevTask = filteredTasks[prevIndex];
      setSelectedTask(prevTask);
      setIsDrawerOpen(true);
    },
    onEscape: () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedTask(null);
      } else if (isCreateModalOpen) {
        setIsCreateModalOpen(false);
      }
    },
  });

  // Handlers
  const handleViewChange = useCallback((view: PlannerView) => {
    setActiveView(view);
    navigate(`/planner/${view}`);
  }, [navigate]);

  const handleTaskClick = useCallback((task: PlannerTask) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  }, []);

  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, updates: { status: newStatus } });
  }, [updateTask]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<PlannerTask>) => {
    updateTask.mutate(
      { id: taskId, updates },
      {
        onSuccess: () => {
          catalystToast.success('Task Updated', 'Changes saved successfully.');
          // Update selected task if it's the one being edited
          if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
          }
        },
      }
    );
  }, [updateTask, selectedTask]);

  const handleUnblock = useCallback((taskId: string) => {
    updateTask.mutate(
      { id: taskId, updates: { blocked: false, blockedReason: undefined } },
      {
        onSuccess: () => {
          catalystToast.success('Task Unblocked', 'The blocker has been removed.');
          if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, blocked: false, blockedReason: undefined } : null);
          }
        },
      }
    );
  }, [updateTask, selectedTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        catalystToast.success('Task Deleted', 'The task has been removed.');
        setIsDrawerOpen(false);
        setSelectedTask(null);
      },
      onError: () => {
        catalystToast.error('Delete Failed', 'Could not delete the task.');
      },
    });
  }, [deleteTask]);

  const handleCreateTask = useCallback((data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: string;
    assigneeId?: string;
    teamId?: string;
    linkedWorkItemId?: string;
    linkedWorkItemType?: string;
    startDate?: string;
    dueDate?: string;
  }) => {
    // Find assignee name for the toast
    const assignee = users.find(u => u.id === data.assigneeId);
    
    // For now, we need a feature_id (NOT NULL in DB)
    // Use the linked work item if it's a feature, otherwise we need a default
    let featureId = data.linkedWorkItemId;
    
    // If no work item linked, we can't create (DB constraint)
    if (!featureId) {
      catalystToast.error('Feature required', 'Please link a work item to create a task.');
      return;
    }
    
    createTask.mutate({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority as any,
      assigneeId: data.assigneeId,
      assigneeName: assignee?.name,
      dueDate: data.dueDate,
      featureId: featureId,
      teamId: data.teamId || selectedTeamId || undefined,
    });
    // Toast is handled in the hook - no duplicate here
  }, [createTask, users, selectedTeamId]);


  const handleBulkDelete = useCallback(() => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkDeleting(true);

    bulkDeleteTasks.mutate([...selectedTaskIds], {
      onSuccess: (result: any) => {
        // Backward/forward compatible: handle older array return + newer object return
        const deletedIds: string[] = Array.isArray(result)
          ? result
          : (result?.deletedIds as string[]) || [];

        const seedCount: number | undefined = !Array.isArray(result) ? result?.seedCount : undefined;
        const realCount: number | undefined = !Array.isArray(result) ? result?.realCount : undefined;

        const count = deletedIds.length;
        const message = typeof seedCount === 'number' && typeof realCount === 'number' && seedCount > 0 && realCount === 0
          ? `${count} demo task${count > 1 ? 's' : ''} removed from view.`
          : `${count} task${count > 1 ? 's have' : ' has'} been deleted.`;

        catalystToast.success('Tasks Deleted', message);
        setSelectedTaskIds(new Set());
        setIsBulkDeleteModalOpen(false);
        setIsBulkDeleting(false);
      },
      onError: (err: any) => {
        console.error('Bulk delete failed:', err);
        catalystToast.error('Delete Failed', err?.message || 'Could not delete the selected tasks.');
        setIsBulkDeleting(false);
      },
    });
  }, [selectedTaskIds, bulkDeleteTasks]);

  const handleCreateTeam = useCallback((data: {
    name: string;
    emoji: string;
    color: string;
    memberIds: string[];
  }) => {
    createTeam.mutate({
      name: data.name,
      short_name: data.name.slice(0, 10).toUpperCase().replace(/\s+/g, ''),
      team_type: 'AGILE',
      is_active: true,
    }, {
      onSuccess: () => {
        setIsCreateTeamModalOpen(false);
        catalystToast.success('Team Created', `"${data.name}" has been created.`);
      },
    });
  }, [createTeam]);

  const renderView = () => {
    const viewTasks = filteredTasks;
    
    switch (activeView) {
      case 'boards':
        return <KanbanBoard onTaskClick={handleTaskClick} onTaskEdit={handleTaskClick} onTaskDelete={(id) => handleDeleteTask(id)} onAddTask={() => setIsCreateModalOpen(true)} />;
      case 'task-list':
        return <PlannerTaskList tasks={viewTasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} selectedTaskIds={selectedTaskIds} onSelectionChange={setSelectedTaskIds} />;
      case 'timeline':
        return <PlannerTimeline tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'calendar':
        return <PlannerCalendar tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'weekly-report':
        return <PlannerWeeklyReport tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'workstream-performance':
        return <PlannerWorkstreamPerformance tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'ai-insights':
        return <PlannerAIInsights tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'workstreams':
        return <PlannerSettings />;
      case 'settings':
        return <PlannerSettings />;
      default:
        return <KanbanBoard onTaskClick={handleTaskClick} onTaskEdit={handleTaskClick} onTaskDelete={(id) => handleDeleteTask(id)} onAddTask={() => setIsCreateModalOpen(true)} />;
    }
  };

  const pageTitle = VIEW_TITLES[activeView] || 'Boards';
  const blockedCount = tasks.filter(t => t.blocked).length;
  

  return (
    <div className="flex h-full min-h-0" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar (must start at top of module area, like other modules) */}
      <PlannerSidebar
        expanded={!sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Right column: header + search + view content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Header with breadcrumb */}
        <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
          <div
            className="flex items-center justify-between px-6"
            style={{
              height: '52px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            {/* Left: Breadcrumb + Title */}
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-3)' }}
              >
                PLANNER
              </span>
              <span className="text-[14px]" style={{ color: 'var(--text-4)' }}>
                /
              </span>
              <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {pageTitle}
              </h1>
            </div>

            {/* Right: Action Buttons - hidden on teams/settings views */}
            {activeView !== 'workstreams' && activeView !== 'settings' && (
              <div className="flex items-center gap-2">

                {/* Create Task Button */}
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateDefaultStatus('backlog');
                    setIsCreateModalOpen(true);
                  }}
                  className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Create Task</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar - hidden on teams/settings/boards views */}
        {activeView !== 'workstreams' && activeView !== 'settings' && activeView !== 'boards' && (
          <PlannerSearchBar
            filters={filters}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
            onBlockedChange={setBlockedFilter}
            onOverdueChange={setOverdueFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredCount}
            totalCount={totalCount}
            inputRef={searchInputRef}
            teams={teams}
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onCreateTeam={() => setIsCreateTeamModalOpen(true)}
          />
        )}

        {/* View content */}
        <div className="flex flex-1 min-h-0 bg-surface-0">
          <main className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              renderView()
            )}
          </main>
        </div>

        {/* Task Drawer */}
        <PlannerTaskDrawer
          task={selectedTask}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={handleTaskUpdate}
          onUnblock={handleUnblock}
          onDelete={handleDeleteTask}
          users={users}
        />

        {/* Create Modal */}
        <PlannerCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTask}
          defaultStatus={createDefaultStatus}
          defaultTeamId={selectedTeamId || undefined}
          users={users}
          teams={teams}
        />


        {/* Bulk Action Bar */}
        <PlannerBulkActionBar
          selectedCount={selectedTaskIds.size}
          onClearSelection={() => setSelectedTaskIds(new Set())}
          onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
        />

        {/* Bulk Delete Modal */}
        <PlannerBulkDeleteModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDelete}
          selectedCount={selectedTaskIds.size}
          isDeleting={isBulkDeleting}
        />

        {/* Create Team Modal */}
        <PlannerCreateTeamModal
          isOpen={isCreateTeamModalOpen}
          onClose={() => setIsCreateTeamModalOpen(false)}
          onCreate={handleCreateTeam}
          users={users}
        />
      </div>
    </div>
  );
}

export default PlannerPage;
