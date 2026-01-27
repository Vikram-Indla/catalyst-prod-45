// ============================================================
// PLANNER MODULE - MAIN PAGE
// Enterprise work planning with 7 views
// ============================================================

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Download, FileText } from 'lucide-react';
import type { PlannerView, PlannerTask, TaskStatus, AIInsight, GroupByOption } from './types';
import type { KanbanTask } from './types/kanban';
import { PlannerSidebar } from './components/PlannerSidebar';
import { KanbanBoard, TaskDetailDrawer } from './components/kanban';
import { PlannerTaskList } from './components/PlannerTaskList';
import { PlannerTimeline } from './components/PlannerTimeline';
import { PlannerCalendar } from './components/PlannerCalendar';
import { WeeklySummaryView, DailyScorecardView, MonthlyChronicleView } from './components/insights';
import { PlannerSettings } from './components/PlannerSettings';
import { PlannerDashboard } from './components/dashboard';
import { PlannerBoardsPage } from './components/boards';
import { WorkstreamsPage } from './components/workstreams';

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
import { exportPlannerToPDF, exportPlannerToExcel } from './utils/plannerExport';

// View titles for breadcrumb header
const VIEW_TITLES: Record<PlannerView, string> = {
  'dashboard': 'Dashboard',
  'boards': 'Boards',
  'task-list': 'Task List',
  'timeline': 'Timeline',
  'calendar': 'Calendar',
  'weekly-report': 'Weekly Summary',
  'workstream-performance': 'Daily Scorecard',
  'ai-insights': 'Monthly Chronicle',
  'workstreams': 'Workstreams',
  'resources': 'Resources',
  'settings': 'Settings',
};

// Check if view is an insight view
const isInsightView = (view: PlannerView) => 
  view === 'weekly-report' || view === 'workstream-performance' || view === 'ai-insights';

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
  
  // Column visibility state for task list
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('planner-visible-columns');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set(['key', 'title', 'status', 'priority', 'teamName', 'assigneeName', 'startDate', 'dueDate', 'progress']);
  });
  
  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        if (next.size > 1 || columnId !== 'title') {
          next.delete(columnId);
        }
      } else {
        next.add(columnId);
      }
      localStorage.setItem('planner-visible-columns', JSON.stringify([...next]));
      return next;
    });
  }, []);
  
  // Drawer/Modal state
  const [selectedKanbanTask, setSelectedKanbanTask] = useState<KanbanTask | null>(null);
  const [isKanbanDrawerOpen, setIsKanbanDrawerOpen] = useState(false);
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
    setAssigneeFilter,
    setBlockedFilter,
    setOverdueFilter,
    clearFilters,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = usePlannerSearch(tasks);



  // Task navigation for keyboard shortcuts
  const taskIndex = useMemo(() => {
    if (!selectedKanbanTask) return -1;
    return filteredTasks.findIndex(t => t.id === selectedKanbanTask.id);
  }, [selectedKanbanTask, filteredTasks]);

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
      const kanbanTask = convertToKanbanTask(nextTask);
      setSelectedKanbanTask(kanbanTask);
      setIsKanbanDrawerOpen(true);
    },
    onNavigatePrev: () => {
      if (filteredTasks.length === 0) return;
      const prevIndex = taskIndex < 0 ? 0 : Math.max(taskIndex - 1, 0);
      const prevTask = filteredTasks[prevIndex];
      const kanbanTask = convertToKanbanTask(prevTask);
      setSelectedKanbanTask(kanbanTask);
      setIsKanbanDrawerOpen(true);
    },
    onEscape: () => {
      if (isKanbanDrawerOpen) {
        setIsKanbanDrawerOpen(false);
        setSelectedKanbanTask(null);
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

  // Convert PlannerTask to KanbanTask for unified drawer
  const convertToKanbanTask = useCallback((task: PlannerTask): KanbanTask => {
    // Map status slug to status_id (need to find the status ID)
    const statusSlugMap: Record<string, string> = {
      'backlog': '27c811be-5405-4934-a2aa-8a58ea0530bc',
      'planned': '86d97ec0-70f7-400f-8a70-ae176046c1c3',
      'in-progress': '564fb550-b156-419f-beed-453b1b44e0ff',
      'review': 'f449cabf-17a2-4dbe-9321-16fb81097adb',
      'done': 'fb0f917c-10f5-401f-a66a-9b77db3fbaed',
    };
    
    return {
      id: task.id,
      key: task.key,
      title: task.title,
      description: task.description || null,
      status_id: statusSlugMap[task.status] || statusSlugMap['backlog'],
      priority: task.priority,
      workstream_id: task.teamId || null,
      assignee_id: task.assigneeId || null,
      due_date: task.dueDate || null,
      start_date: task.startDate || null,
      position: 0,
      blocked: task.blocked || false,
      blocked_reason: task.blockedReason || null,
      progress: task.progress || 0,
      is_starred: false,
      created_by: null,
      created_at: task.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      cover_url: null,
      // Include joined data
      assignee: task.assigneeId ? {
        id: task.assigneeId,
        full_name: task.assigneeName || null,
        email: null,
        avatar_url: null,
      } : undefined,
      workstream: task.teamId ? {
        id: task.teamId,
        name: task.teamName || '',
      } : undefined,
    };
  }, []);

  const handleTaskClick = useCallback((task: PlannerTask) => {
    // Use unified TaskDetailDrawer for all views
    const kanbanTask = convertToKanbanTask(task);
    setSelectedKanbanTask(kanbanTask);
    setIsKanbanDrawerOpen(true);
  }, [convertToKanbanTask]);

  // Handler for Kanban board task clicks (KanbanTask type)
  const handleKanbanTaskClick = useCallback((task: KanbanTask) => {
    setSelectedKanbanTask(task);
    setIsKanbanDrawerOpen(true);
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
        },
      }
    );
  }, [updateTask]);

  const handleUnblock = useCallback((taskId: string) => {
    updateTask.mutate(
      { id: taskId, updates: { blocked: false, blockedReason: undefined } },
      {
        onSuccess: () => {
          catalystToast.success('Task Unblocked', 'The blocker has been removed.');
        },
      }
    );
  }, [updateTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        catalystToast.success('Task Deleted', 'The task has been removed.');
        setIsKanbanDrawerOpen(false);
        setSelectedKanbanTask(null);
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
      case 'dashboard':
        return <PlannerDashboard />;
      case 'boards':
        return (
          <PlannerBoardsPage
            externalSearch={filters.search}
            externalWorkstreamId={selectedTeamId}
            externalStatusSlug={filters.status}
            externalPriority={filters.priority}
            externalAssigneeId={filters.assigneeId}
            externalBlocked={filters.blocked}
            externalOverdue={filters.overdue}
          />
        );
      case 'task-list':
        return <PlannerTaskList tasks={viewTasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} selectedTaskIds={selectedTaskIds} onSelectionChange={setSelectedTaskIds} visibleColumns={visibleColumns} />;
      case 'timeline':
        return <PlannerTimeline tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'calendar':
        return <PlannerCalendar tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'weekly-report':
        return <WeeklySummaryView />;
      case 'workstream-performance':
        return <DailyScorecardView />;
      case 'ai-insights':
        return <MonthlyChronicleView />;
      case 'workstreams':
        return <WorkstreamsPage />;
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
        {/* Header with breadcrumb - hidden on dashboard, boards, task-list, timeline, calendar (all have their own V9 headers) */}
        {activeView !== 'dashboard' && activeView !== 'boards' && activeView !== 'task-list' && activeView !== 'timeline' && activeView !== 'calendar' && activeView !== 'workstreams' && (
          <div className="shrink-0" style={{ backgroundColor: 'var(--bg)', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
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

              {/* Right: Export + Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Export Buttons - Show on all views except workstreams/settings */}
                {activeView !== 'settings' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          catalystToast.success('Generating PDF...', 'Please wait');
                          await exportPlannerToPDF({
                            title: pageTitle,
                            viewType: pageTitle,
                            tasks: filteredTasks,
                            filters: {
                              Status: filters.status || '',
                              Priority: filters.priority || '',
                              Search: filters.search || '',
                            },
                          });
                          catalystToast.success('PDF Exported', 'Report downloaded successfully');
                        } catch (err) {
                          console.error('PDF export error:', err);
                          catalystToast.error('Export Failed', 'Could not generate PDF');
                        }
                      }}
                      className="h-8 gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          exportPlannerToExcel({
                            title: pageTitle,
                            viewType: pageTitle,
                            tasks: filteredTasks,
                          });
                          catalystToast.success('Excel Exported', 'Report downloaded successfully');
                        } catch (err) {
                          console.error('Excel export error:', err);
                          catalystToast.error('Export Failed', 'Could not generate Excel');
                        }
                      }}
                      className="h-8 gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Excel</span>
                    </Button>
                  </>
                )}

                {/* Create Task Button - hidden on teams/settings/insight views */}
                {activeView !== 'settings' && !isInsightView(activeView) && (
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar - hidden on views that have their own integrated filter bars */}
        {activeView !== 'dashboard' && activeView !== 'boards' && activeView !== 'task-list' && activeView !== 'timeline' && activeView !== 'calendar' && activeView !== 'workstreams' && activeView !== 'settings' && !isInsightView(activeView) && (
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
            onCreateTeam={() => setIsCreateTeamModalOpen(true)}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            showColumnsButton={false}
          />
        )}

        {/* View content - z-index lower than search bar */}
        <div className="relative z-0 flex flex-1 min-h-0 bg-surface-0">
          <main className="flex-1 overflow-hidden">
            {(isLoading && tasks.length === 0) ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              renderView()
            )}
          </main>
        </div>

        {/* Task Detail Drawer (unified for all views) */}
        <TaskDetailDrawer
          task={selectedKanbanTask}
          open={isKanbanDrawerOpen}
          onOpenChange={(open) => {
            setIsKanbanDrawerOpen(open);
            if (!open) setSelectedKanbanTask(null);
          }}
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
