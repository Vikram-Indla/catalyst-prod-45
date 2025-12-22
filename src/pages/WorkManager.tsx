// src/pages/Planner.tsx
// Main Planner Page with Tab Navigation

import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  List, 
  BarChart3, 
  Users, 
  Settings, 
  Plus,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkManagerBoards } from '@/components/work-manager/WorkManagerBoards';
import { WorkManagerTasks } from '@/components/work-manager/WorkManagerTasks';
import { WorkManagerInsights } from '@/components/work-manager/WorkManagerInsights';
import { WorkManagerTeams } from '@/components/work-manager/WorkManagerTeams';
import { WorkManagerSettings } from '@/components/work-manager/WorkManagerSettings';
import { TaskDrawer } from '@/components/work-manager/TaskDrawer';
import { NewTaskDialog } from '@/components/work-manager/NewTaskDialog';
import { teams as initialTeams, users, tasks, computeTaskExtended } from '@/lib/work-manager-data';
import type { TaskStatus, Team } from '@/components/work-manager/types';
import type { TaskFilters, TaskDrawerState, TaskExtended, Task } from '@/components/work-manager/types';

interface WorkManagerProps {
  tab?: 'boards' | 'tasks' | 'insights' | 'teams' | 'settings';
}

const tabs = [
  { id: 'boards', label: 'Boards', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: List },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function WorkManager({ tab: initialTab }: WorkManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from URL or prop
  const activeTab = useMemo(() => {
    const pathTab = location.pathname.split('/').pop();
    if (pathTab && tabs.some(t => t.id === pathTab)) {
      return pathTab as typeof tabs[number]['id'];
    }
    return initialTab || 'boards';
  }, [location.pathname, initialTab]);

  // Filter state
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    teamId: null,
    assigneeId: null,
    status: null,
    priority: null,
    type: null,
    dueBucket: null,
    showBlocked: null,
  });

  // Drawer state
  const [drawer, setDrawer] = useState<TaskDrawerState>({
    isOpen: false,
    taskId: null,
    activeTab: 'overview',
  });

  // New task dialog state
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);

  // Teams state
  const [teamsData, setTeamsData] = useState<Team[]>(initialTeams);

  // Task data with computed fields
  const [taskData, setTaskData] = useState(tasks);
  const extendedTasks: TaskExtended[] = useMemo(
    () => taskData.map(computeTaskExtended),
    [taskData]
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return extendedTasks.filter(task => {
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) 
          && !task.key.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.teamId && task.teamId !== filters.teamId) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.type && task.type !== filters.type) return false;
      if (filters.dueBucket && task.dueBucket !== filters.dueBucket) return false;
      if (filters.showBlocked === true && !task.blocked) return false;
      if (filters.showBlocked === false && task.blocked) return false;
      return true;
    });
  }, [extendedTasks, filters]);

  // Tab navigation handler
  const handleTabChange = (tabId: string) => {
    navigate(`/planner/${tabId}`);
  };

  // Open task drawer
  const handleOpenTask = (taskId: string) => {
    console.log('[WorkManager] Opening task drawer for:', taskId);
    console.log('[WorkManager] Available task IDs:', extendedTasks.map(t => t.id));
    const foundTask = extendedTasks.find(t => t.id === taskId);
    console.log('[WorkManager] Found task:', foundTask?.title);
    setDrawer({ isOpen: true, taskId, activeTab: 'overview' });
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setDrawer({ isOpen: false, taskId: null, activeTab: 'overview' });
  };

  // Update task
  const handleUpdateTask = (taskId: string, updates: Partial<typeof taskData[0]>) => {
    setTaskData(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : t
    ));
  };

  // Create new task
  const handleCreateTask = (taskInput: Omit<Task, 'id' | 'key' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString().split('T')[0];
    const newId = `t${Date.now()}`;
    const newKey = `WM-${String(taskData.length + 1).padStart(4, '0')}`;
    
    const newTask: Task = {
      ...taskInput,
      id: newId,
      key: newKey,
      createdAt: now,
      updatedAt: now,
    };
    
    setTaskData(prev => [...prev, newTask]);
  };

  // Move task handler for drag-and-drop
  const handleMoveTask = (args: { taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; toIndex: number }) => {
    setTaskData(prev => prev.map(t =>
      t.id === args.taskId
        ? { ...t, status: args.toStatus, columnPosition: args.toIndex, updatedAt: new Date().toISOString().split('T')[0] }
        : t
    ));
  };

  // Create new team handler
  const handleCreateTeam = (teamInput: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...teamInput,
      id: `team-${Date.now()}`,
    };
    setTeamsData(prev => [...prev, newTeam]);
  };

  // Get selected task for drawer
  const selectedTask = drawer.taskId 
    ? extendedTasks.find(t => t.id === drawer.taskId) 
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-card">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Planner</h1>
          <p className="text-[13px] text-text-muted mt-1">Personal task management and team coordination</p>
        </div>
        <Button 
          onClick={() => setIsNewTaskDialogOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-default bg-surface-card">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors
                ${isActive 
                  ? 'bg-brand-primary text-white' 
                  : 'text-text-secondary hover:bg-surface-muted'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar - Show for boards and tasks views */}
      {(activeTab === 'boards' || activeTab === 'tasks') && (
        <div className="flex items-center justify-between px-6 py-3 bg-surface-bg border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {/* Team Selector */}
            <Select
              value={filters.teamId || 'all'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, teamId: v === 'all' ? null : v }))}
            >
              <SelectTrigger className="w-[180px] h-9 text-[13px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamsData.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 w-[240px] h-9 text-[13px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Button variant="outline" size="sm" className="gap-2 text-[13px]">
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6 bg-surface-bg">
        {activeTab === 'boards' && (
          <WorkManagerBoards 
            tasks={filteredTasks} 
            onOpenTask={handleOpenTask}
            onMoveTask={handleMoveTask}
          />
        )}
        {activeTab === 'tasks' && (
          <WorkManagerTasks 
            tasks={filteredTasks} 
            onOpenTask={handleOpenTask}
          />
        )}
        {activeTab === 'insights' && (
          <WorkManagerInsights tasks={extendedTasks} />
        )}
        {activeTab === 'teams' && (
          <WorkManagerTeams 
            tasks={extendedTasks}
            teams={teamsData}
            users={users}
            onCreateTeam={handleCreateTeam}
          />
        )}
        {activeTab === 'settings' && (
          <WorkManagerSettings />
        )}
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={drawer.isOpen}
        task={selectedTask}
        activeTab={drawer.activeTab}
        onClose={handleCloseDrawer}
        onTabChange={(tab) => setDrawer(prev => ({ ...prev, activeTab: tab }))}
        onUpdate={(updates) => {
          if (drawer.taskId) {
            handleUpdateTask(drawer.taskId, updates);
          }
        }}
      />

      {/* New Task Dialog */}
      <NewTaskDialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
        teams={teamsData}
        users={users}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}

export default WorkManager;