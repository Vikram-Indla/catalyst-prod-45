// ============================================================
// PLANNER MODULE - MAIN PAGE
// Enterprise work planning with 7 views
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PlannerView, PlannerTask } from './types';
import { PlannerSidebar } from './components/PlannerSidebar';
import { PlannerKanban } from './components/PlannerKanban';
import { PlannerTaskList } from './components/PlannerTaskList';
import { PlannerTimeline } from './components/PlannerTimeline';
import { PlannerCalendar } from './components/PlannerCalendar';
import { PlannerWeeklyReport } from './components/PlannerWeeklyReport';
import { PlannerTeamPerformance } from './components/PlannerTeamPerformance';
import { PlannerAIInsights } from './components/PlannerAIInsights';
import { usePlannerTasks, useUpdatePlannerTask } from './hooks/usePlannerTasks';
import { usePlannerTeams } from './hooks/usePlannerTeams';

export function PlannerPage() {
  const navigate = useNavigate();
  const { view } = useParams<{ view?: string }>();
  
  const [activeView, setActiveView] = useState<PlannerView>((view as PlannerView) || 'boards');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const { data: tasks = [], isLoading } = usePlannerTasks(selectedTeamId);
  const { data: teams = [] } = usePlannerTeams();
  const updateTask = useUpdatePlannerTask();

  const handleViewChange = useCallback((view: PlannerView) => {
    setActiveView(view);
    navigate(`/planner/${view}`);
  }, [navigate]);

  const handleTaskClick = useCallback((task: PlannerTask) => {
    console.log('Task clicked:', task.id);
  }, []);

  const handleTaskMove = useCallback((taskId: string, newStatus: PlannerTask['status']) => {
    updateTask.mutate({ id: taskId, updates: { status: newStatus } });
  }, [updateTask]);

  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<PlannerTask>) => {
    updateTask.mutate({ id: taskId, updates });
  }, [updateTask]);

  const renderView = () => {
    switch (activeView) {
      case 'boards':
        return <PlannerKanban tasks={tasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />;
      case 'task-list':
        return <PlannerTaskList tasks={tasks} onTaskClick={handleTaskClick} onTaskUpdate={handleTaskUpdate} selectedTaskIds={selectedTaskIds} onSelectionChange={setSelectedTaskIds} />;
      case 'timeline':
        return <PlannerTimeline tasks={tasks} onTaskClick={handleTaskClick} />;
      case 'calendar':
        return <PlannerCalendar tasks={tasks} onTaskClick={handleTaskClick} />;
      case 'weekly-report':
        return <PlannerWeeklyReport tasks={tasks} onTaskClick={handleTaskClick} />;
      case 'team-performance':
        return <PlannerTeamPerformance tasks={tasks} onTaskClick={handleTaskClick} />;
      case 'ai-insights':
        return <PlannerAIInsights tasks={tasks} onTaskClick={handleTaskClick} />;
      default:
        return <PlannerKanban tasks={tasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />;
    }
  };

  return (
    <div className="flex h-full bg-surface-0">
      <PlannerSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onTeamChange={setSelectedTeamId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        insightsBadge={tasks.filter(t => t.blocked).length}
      />
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
  );
}

export default PlannerPage;
