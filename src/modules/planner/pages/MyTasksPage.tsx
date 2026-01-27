// ============================================================
// MY TASKS PAGE
// Planner V9: Personal task management - full page integration
// ============================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  MyTasksLayout, 
  MyTasksSidebar, 
  MyTasksContent,
  MyTasksRightPanelWrapper,
} from '../components/my-tasks';
import { useMyTasksRealtime } from '../hooks/useMyTasksRealtime';
import { useMyTasksKeyboard } from '../hooks/useMyTasksKeyboard';
import { useCompleteMyTask } from '../hooks/useMyTasks';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer/TaskDetailDrawer';
import { CreateTaskModal } from '../components/kanban';
import type { FilterConfig, TimeSection } from '../types/my-tasks';

type ViewMode = 'list' | 'board' | 'calendar';

export function MyTasksPage() {
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
    // Handled by BulkActionToolbar
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

  // Keyboard shortcuts
  useMyTasksKeyboard({
    onQuickAdd: () => setIsCreateModalOpen(true),
    onCommandPalette: () => {
      // TODO: Open command palette
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
    <MyTasksLayout>
      {/* Left Sidebar */}
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
      />

      {/* Right Panel - Task Detail */}
      <MyTasksRightPanelWrapper isVisible={!!detailTaskId}>
        <TaskDetailDrawer
          taskId={detailTaskId}
          open={!!detailTaskId}
          onClose={handleCloseTaskDetail}
          onOpenChange={(open) => !open && handleCloseTaskDetail()}
        />
      </MyTasksRightPanelWrapper>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </MyTasksLayout>
  );
}

export default MyTasksPage;
