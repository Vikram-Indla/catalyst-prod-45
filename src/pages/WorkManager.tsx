// src/pages/WorkManager.tsx
// Main Work Manager Page with Tab Navigation

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
  ChevronDown,
  X
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

export function WorkManager({ tab: initialTab }: WorkManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from URL or prop
  const activeTab = useMemo(() => {
    const pathTab = location.pathname.split('/').pop();
    const validTabs = ['boards', 'tasks', 'insights', 'teams', 'settings'];
    if (pathTab && validTabs.includes(pathTab)) {
      return pathTab as 'boards' | 'tasks' | 'insights' | 'teams' | 'settings';
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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.teamId) count++;
    if (filters.assigneeId) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.type) count++;
    if (filters.dueBucket) count++;
    if (filters.showBlocked !== null) count++;
    return count;
  }, [filters]);

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

  // Tabs configuration with task counts
  const tabs = [
    { id: 'boards', label: `Boards (${extendedTasks.length})`, icon: LayoutGrid },
    { id: 'tasks', label: 'Tasks', icon: List },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Work Manager</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Personal task management and team coordination</p>
        </div>
        <Button 
          onClick={() => setIsNewTaskDialogOpen(true)}
          className="bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-[#5c7c5c] text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* Team Selector */}
            <Select
              value={filters.teamId || 'all'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, teamId: v === 'all' ? null : v }))}
            >
              <SelectTrigger className="w-[180px] h-9 text-[13px] bg-white dark:bg-gray-900">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 w-[280px] h-9 text-[13px] border border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#5c7c5c]/20 focus:border-[#5c7c5c] transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-[13px] bg-white dark:bg-gray-900">
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[#5c7c5c] text-white text-[10px] font-semibold rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[14px]">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[12px] text-muted-foreground hover:text-foreground"
                        onClick={() => setFilters({
                          search: filters.search,
                          teamId: null,
                          assigneeId: null,
                          status: null,
                          priority: null,
                          type: null,
                          dueBucket: null,
                          showBlocked: null,
                        })}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear all
                      </Button>
                    )}
                  </div>
                  
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? null : v as TaskStatus }))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Backlog">Backlog</SelectItem>
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Waiting">Waiting</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Priority</Label>
                    <Select
                      value={filters.priority || 'all'}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v === 'all' ? null : v as 'Critical' | 'High' | 'Medium' | 'Low' }))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Type</Label>
                    <Select
                      value={filters.type || 'all'}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, type: v === 'all' ? null : v as 'Project' | 'Task' | 'General' }))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Task">Task</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Assignee Filter */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Assignee</Label>
                    <Select
                      value={filters.assigneeId || 'all'}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, assigneeId: v === 'all' ? null : v }))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="All Assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Due Date Filter */}
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Due Date</Label>
                    <Select
                      value={filters.dueBucket || 'all'}
                      onValueChange={(v) => setFilters(prev => ({ ...prev, dueBucket: v === 'all' ? null : v as any }))}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="All Due Dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Due Dates</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="today">Due Today</SelectItem>
                        <SelectItem value="next7">Next 7 Days</SelectItem>
                        <SelectItem value="future">Future</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Blocked Toggle */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox 
                      id="show-blocked"
                      checked={filters.showBlocked === true}
                      onCheckedChange={(checked) => setFilters(prev => ({ 
                        ...prev, 
                        showBlocked: checked === true ? true : null 
                      }))}
                    />
                    <Label htmlFor="show-blocked" className="text-[13px] cursor-pointer">
                      Show only blocked tasks
                    </Label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-gray-900">
        {activeTab === 'boards' && (
          <WorkManagerBoards 
            tasks={filteredTasks} 
            onOpenTask={handleOpenTask}
            onMoveTask={handleMoveTask}
            onAddTask={() => setIsNewTaskDialogOpen(true)}
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
