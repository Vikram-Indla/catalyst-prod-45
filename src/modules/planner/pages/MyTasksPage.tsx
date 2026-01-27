// ============================================================
// MY TASKS PAGE
// Planner V9: Enterprise personal task management - 3-column layout
// ============================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PlannerSidebar } from '../components/PlannerSidebar';
import { 
  MyTasksLayout, 
  MyTasksSidebar, 
  MyTasksContent,
  MyTasksRightPanel,
} from '../components/my-tasks';
import { useMyTasksRealtime } from '../hooks/useMyTasksRealtime';
import { useMyTasksKeyboard } from '../hooks/useMyTasksKeyboard';
import { useCompleteMyTask } from '../hooks/useMyTasks';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer/TaskDetailDrawer';
import { CreateTaskModal } from '../components/kanban';
import type { FilterConfig, TimeSection } from '../types/my-tasks';

type ViewMode = 'list' | 'board' | 'calendar';

export function MyTasksPage() {
  // Sidebar state (Planner module sidebar)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({});
  const [activeSection, setActiveSection] = useState<TimeSection | null>(null);
  
  // Selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  
  // Focus mode state
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  
  // Hooks
  useMyTasksRealtime(); // Subscribe to live updates
  const completeTask = useCompleteMyTask();

  // Filter handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterConfig>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleQuickFilter = useCallback((section: TimeSection | null) => {
    setActiveSection(section);
    setFilters(prev => ({ ...prev, timeSection: section || undefined }));
  }, []);

  const handleApplySavedFilter = useCallback((filterConfig: FilterConfig) => {
    setFilters(filterConfig);
    setActiveSection(filterConfig.timeSection || null);
    toast.success('Filter applied');
  }, []);

  // Selection handlers
  const handleTaskSelect = useCallback((taskId: string, isMultiSelect: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
      } else {
        newSet.clear();
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
    setDetailTaskId(null);
  }, []);

  const handleBulkComplete = useCallback(() => {
    toast.success(`${selectedTasks.size} tasks marked complete`);
    setSelectedTasks(new Set());
  }, [selectedTasks.size]);

  // Detail panel handlers
  const handleOpenTaskDetail = useCallback((taskId: string) => {
    setDetailTaskId(taskId);
    setFocusedTaskId(taskId);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setDetailTaskId(null);
  }, []);

  // Focus mode
  const handleToggleFocusMode = useCallback(() => {
    setIsFocusModeActive(prev => !prev);
    if (!isFocusModeActive) {
      toast.info('Focus Mode activated');
    }
  }, [isFocusModeActive]);

  // Keyboard shortcuts
  useMyTasksKeyboard({
    onQuickAdd: () => setIsCreateModalOpen(true),
    onCommandPalette: () => {
      toast.info('Command Palette: ⌘K (Coming soon)');
    },
    onClearSelection: handleClearSelection,
    onComplete: () => {
      if (focusedTaskId) {
        completeTask.mutate(focusedTaskId);
      }
    },
  });

  return (
    <div className="flex h-full min-h-0 bg-slate-100 dark:bg-slate-900">
      {/* Planner Module Sidebar (Navigation) */}
      <PlannerSidebar
        expanded={!sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* My Tasks Module - 3 Column Layout */}
      <MyTasksLayout>
        {/* Left Sidebar (Time Sections & Filters) */}
        <MyTasksSidebar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeSection={activeSection}
          onQuickFilter={handleQuickFilter}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplySavedFilter={handleApplySavedFilter}
        />

        {/* Main Content */}
        <MyTasksContent
          filters={filters}
          onFilterChange={handleFilterChange}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
          onBulkComplete={handleBulkComplete}
          onClearSelection={handleClearSelection}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenTaskDetail={handleOpenTaskDetail}
          onToggleFocusMode={handleToggleFocusMode}
          isFocusModeActive={isFocusModeActive}
        />

        {/* Right Panel - Productivity Widgets */}
        {!detailTaskId && <MyTasksRightPanel />}

        {/* Right Panel - Task Detail (when viewing a task) */}
        {detailTaskId && (
          <TaskDetailDrawer
            taskId={detailTaskId}
            open={!!detailTaskId}
            onClose={handleCloseTaskDetail}
            onOpenChange={(open) => !open && handleCloseTaskDetail()}
          />
        )}
      </MyTasksLayout>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}

export default MyTasksPage;
