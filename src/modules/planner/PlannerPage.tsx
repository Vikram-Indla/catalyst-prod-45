// ============================================================
// PLANNER MODULE - MAIN PAGE
// Enterprise work planning with 7 views
// ============================================================

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Lightbulb } from 'lucide-react';
import type { PlannerView, PlannerTask, TaskStatus, AIInsight } from './types';
import { PlannerSidebar } from './components/PlannerSidebar';
import { PlannerKanban } from './components/PlannerKanban';
import { PlannerTaskList } from './components/PlannerTaskList';
import { PlannerTimeline } from './components/PlannerTimeline';
import { PlannerCalendar } from './components/PlannerCalendar';
import { PlannerWeeklyReport } from './components/PlannerWeeklyReport';
import { PlannerTeamPerformance } from './components/PlannerTeamPerformance';
import { PlannerAIInsights } from './components/PlannerAIInsights';
import { PlannerTaskDrawer } from './components/PlannerTaskDrawer';
import { PlannerCreateModal } from './components/PlannerCreateModal';

import { PlannerAIPanel } from './components/PlannerAIPanel';
import { PlannerSearchBar } from './components/PlannerSearchBar';
import { usePlannerTasks, useUpdatePlannerTask, useDeletePlannerTask } from './hooks/usePlannerTasks';
import { usePlannerTeams } from './hooks/usePlannerTeams';
import { usePlannerUsers } from './hooks/usePlannerUsers';
import { useCreatePlannerTask } from './hooks/useCreatePlannerTask';
import { usePlannerSearch } from './hooks/usePlannerSearch';
import { usePlannerKeyboard } from './hooks/usePlannerKeyboard';
import { usePlannerAIInsights } from './hooks/usePlannerAIInsights';
import { usePlannerRealtime } from './hooks/usePlannerRealtime';
import { getOnlineUsers } from './data/seedData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

// View titles for breadcrumb header
const VIEW_TITLES: Record<PlannerView, string> = {
  'boards': 'Boards',
  'task-list': 'Task List',
  'timeline': 'Timeline',
  'calendar': 'Calendar',
  'weekly-report': 'Weekly Report',
  'team-performance': 'Team Performance',
  'ai-insights': 'AI Insights',
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  
  // Drawer/Modal state
  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>('backlog');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // Sync activeView with URL
  useEffect(() => {
    if (view && view !== activeView) {
      setActiveView(view as PlannerView);
    }
  }, [view]);

  // Online users for sidebar
  const onlineUsers = useMemo(() => getOnlineUsers(), []);
  // Data hooks
  const { data: tasks = [], isLoading } = usePlannerTasks(selectedTeamId);
  const { data: teams = [] } = usePlannerTeams();
  const { data: users = [] } = usePlannerUsers();
  const updateTask = useUpdatePlannerTask();
  const deleteTask = useDeletePlannerTask();
  const createTask = useCreatePlannerTask();
  
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

  // AI Insights
  const insights = usePlannerAIInsights(tasks);


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
    onToggleAIPanel: () => {
      setIsAIPanelOpen(prev => !prev);
    },
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
      } else if (isAIPanelOpen) {
        setIsAIPanelOpen(false);
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
    updateTask.mutate(
      { id: taskId, updates: { status: newStatus } },
      {
        onSuccess: () => {
          catalystToast.success('Task Moved', `Moved to ${newStatus.replace('-', ' ')}`);
        },
      }
    );
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
    dueDate?: string;
  }) => {
    // Find assignee name for the toast
    const assignee = users.find(u => u.id === data.assigneeId);
    
    createTask.mutate({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority as any,
      assigneeId: data.assigneeId,
      assigneeName: assignee?.name,
      dueDate: data.dueDate,
      teamId: selectedTeamId || undefined,
    });
    // Toast is handled in the hook - no duplicate here
  }, [createTask, users, selectedTeamId]);

  const handleInsightAction = useCallback((insight: AIInsight) => {
    if (insight.taskId) {
      const task = tasks.find(t => t.key === insight.taskId || t.id === insight.taskId);
      if (task) {
        setSelectedTask(task);
        setIsDrawerOpen(true);
        setIsAIPanelOpen(false);
      }
    }
  }, [tasks]);

  const renderView = () => {
    const viewTasks = filteredTasks;
    
    switch (activeView) {
      case 'boards':
        return <PlannerKanban tasks={viewTasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />;
      case 'task-list':
        return <PlannerTaskList tasks={viewTasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} selectedTaskIds={selectedTaskIds} onSelectionChange={setSelectedTaskIds} />;
      case 'timeline':
        return <PlannerTimeline tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'calendar':
        return <PlannerCalendar tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'weekly-report':
        return <PlannerWeeklyReport tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'team-performance':
        return <PlannerTeamPerformance tasks={viewTasks} onTaskClick={handleTaskClick} />;
      case 'ai-insights':
        return <PlannerAIInsights tasks={viewTasks} onTaskClick={handleTaskClick} />;
      default:
        return <PlannerKanban tasks={viewTasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />;
    }
  };

  const pageTitle = VIEW_TITLES[activeView] || 'Boards';
  const blockedCount = tasks.filter(t => t.blocked).length;
  const criticalInsightsCount = insights.filter(i => i.type === 'critical').length;

  return (
    <div className="flex h-full min-h-0" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar (must start at top of module area, like other modules) */}
      <PlannerSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        onlineUsers={onlineUsers}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        insightsBadge={blockedCount}
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

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* AI Insights Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAIPanelOpen((prev) => !prev)}
                className={cn("h-8 gap-2", isAIPanelOpen && "bg-blue-50 text-blue-600")}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm">AI</span>
                {criticalInsightsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                    {criticalInsightsCount}
                  </span>
                )}
              </Button>

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
          </div>
        </div>

        {/* Search Bar */}
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
        />

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
          users={users}
        />

        {/* AI Panel */}
        <PlannerAIPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          insights={insights}
          onViewAll={() => handleViewChange('ai-insights')}
          onInsightAction={handleInsightAction}
        />
      </div>
    </div>
  );
}

export default PlannerPage;
