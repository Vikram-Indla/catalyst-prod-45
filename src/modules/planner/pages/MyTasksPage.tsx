// ============================================================
// MY TASKS PAGE - V8 Design System (Budget Planner Aligned)
// Uses PageChrome + Budget Planner header styling
// ============================================================

import { useState, useCallback, lazy, Suspense } from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
import { MyTasksContent } from '../components/my-tasks';
import { useMyTasksRealtime } from '../hooks/useMyTasksRealtime';
const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));
import { PlannerCreateModal } from '../components/PlannerCreateModal';
import { useCreatePlannerTask } from '../hooks/useCreatePlannerTask';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileMenuDrawer } from '@/components/layout/MobileMenuDrawer';
import type { FilterConfig } from '../types/my-tasks';
import type { TaskStatus, TaskPriority } from '../types';

export function MyTasksPage() {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({});
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  
  // Hooks
  useMyTasksRealtime();
  const createTask = useCreatePlannerTask();
  const teams: { id: string; name: string; color?: string; memberCount?: number }[] = []; // Workstreams removed
  const { data: users = [] } = usePlannerUsers();

  // Handler for creating task
  const handleCreateTask = useCallback((data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string;
    teamId?: string;
    linkedWorkItemId?: string;
    linkedWorkItemType?: 'story' | 'feature' | 'epic' | 'business_request';
    startDate?: string;
    dueDate?: string;
  }) => {
    const assignee = users.find(u => u.id === data.assigneeId);
    
    createTask.mutate({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      assigneeName: assignee?.name,
      dueDate: data.dueDate,
      startDate: data.startDate,
      linkedWorkItemId: data.linkedWorkItemId,
      linkedWorkItemType: data.linkedWorkItemType,
      teamId: data.teamId,
    });
  }, [createTask, users]);

  // Filter handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterConfig>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Detail panel handlers
  const handleOpenTaskDetail = useCallback((taskId: string) => {
    setDetailTaskId(taskId);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setDetailTaskId(null);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Main Content with PageChrome */}
      <PageChrome hideHeader className="flex-1">
        <div className="flex flex-col h-full bg-[hsl(var(--background))]">
          {/* My Tasks Content - Budget Planner Aligned */}
          <MyTasksContent
            filters={filters}
            onFilterChange={handleFilterChange}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenTaskDetail={handleOpenTaskDetail}
          />
        </div>
      </PageChrome>

      {/* Task Detail Drawer */}
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={!!detailTaskId}
          onClose={handleCloseTaskDetail}
          itemId={detailTaskId || ''}
          itemType="task"
        />
      </Suspense>

      {/* Create Task Modal */}
      <PlannerCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        defaultStatus="backlog"
        users={users}
        teams={teams}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        menuOpen={mobileMenuOpen}
      />

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer 
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

export default MyTasksPage;
