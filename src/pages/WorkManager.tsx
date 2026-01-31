// src/pages/WorkManager.tsx
// Main Work Manager Page with Tab Navigation

import { useState, useMemo, useEffect } from 'react';
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
  X,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { ExecutiveSummaryStrip } from '@/components/work-manager/ExecutiveSummaryStrip';
import { WorkManagerInsights } from '@/components/work-manager/WorkManagerInsights';
import { WorkManagerTeams } from '@/components/work-manager/WorkManagerTeams';
import { WorkManagerSettings } from '@/components/work-manager/WorkManagerSettings';
import { TaskDrawer } from '@/components/work-manager/TaskDrawer';
import { NewTaskDialog } from '@/components/work-manager/NewTaskDialog';
import {
  teams as initialTeams,
  computeTaskExtended,
  setWorkManagerTeams,
  setWorkManagerUsers,
} from '@/lib/work-manager-data';
import { useWorkManagerTasks, useCreateWorkManagerTask, useUpdateWorkManagerTask, useDeleteWorkManagerTask } from '@/hooks/useWorkManagerTasks';
import { useAllTeamMembers, useTeamMemberIds } from '@/hooks/useAllTeamMembers';
import type { TaskStatus, Team } from '@/components/work-manager/types';
import type { TaskFilters, TaskDrawerState, TaskExtended, Task, GroupByOption } from '@/components/work-manager/types';
import { useAccessibleTeams, useCanViewAllTeams } from '@/hooks/useAccessibleTeams';
import { useCreateTeam } from '@/hooks/useTeams';
import { useAuth } from '@/lib/auth';

interface WorkManagerProps {
  tab?: 'boards' | 'tasks' | 'insights' | 'teams' | 'settings';
}

export function WorkManager({ tab: initialTab }: WorkManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fetch accessible teams based on user role
  const { data: accessibleTeams = [], isLoading: isTeamsLoading } = useAccessibleTeams();
  const { canViewAllTeams, isLoading: isRoleLoading } = useCanViewAllTeams();
  const { user } = useAuth();
  const createTeam = useCreateTeam();
  const { data: teamMembersData = [] } = useAllTeamMembers();
  const { data: teamMemberIdsMap = {} } = useTeamMemberIds();
  
  // Get team ID and task ID from URL query parameters
  const urlTeamId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('team');
  }, [location.search]);

  const urlTaskId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('taskId');
  }, [location.search]);
  
  // Determine active tab from URL or prop
  const activeTab = useMemo(() => {
    const pathTab = location.pathname.split('/').pop()?.split('?')[0];
    const validTabs = ['boards', 'tasks', 'insights', 'teams', 'settings'];
    if (pathTab && validTabs.includes(pathTab)) {
      return pathTab as 'boards' | 'tasks' | 'insights' | 'teams' | 'settings';
    }
    return initialTab || 'boards';
  }, [location.pathname, initialTab]);

  // Filter state - initialized from URL
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

  // Sync team filter from URL and auto-select for restricted users
  useEffect(() => {
    if (!isTeamsLoading && !isRoleLoading) {
      if (urlTeamId) {
        // Use team from URL if user has access to it
        const hasAccess = canViewAllTeams || accessibleTeams.some(t => t.id === urlTeamId);
        if (hasAccess) {
          setFilters(prev => ({ ...prev, teamId: urlTeamId }));
        } else if (accessibleTeams.length > 0) {
          // Fallback to first accessible team
          setFilters(prev => ({ ...prev, teamId: accessibleTeams[0].id }));
        }
      } else if (canViewAllTeams) {
        // Admin/program manager selected "All Teams" - clear team filter
        setFilters(prev => ({ ...prev, teamId: null }));
      } else if (accessibleTeams.length > 0) {
        // Non-admin users without URL param - auto-select first team
        setFilters(prev => ({ ...prev, teamId: accessibleTeams[0].id }));
      }
    }
  }, [accessibleTeams, isTeamsLoading, isRoleLoading, canViewAllTeams, urlTeamId]);

  // Helper function to get team color based on type
  const getTeamColor = (teamType: string): string => {
    const colors: Record<string, string> = {
      'AGILE': 'olive',
      'KANBAN': 'bronze',
      'COP': 'gold',
      'PROGRAM': 'blue',
      'PORTFOLIO': 'indigo',
      'SOLUTION': 'teal',
      'PROCESS_FLOW': 'purple',
    };
    return colors[teamType] || 'olive';
  };

  // Convert accessible teams to the work-manager Team format for compatibility
  const teamsDataFromDb: Team[] = useMemo(() => {
    return accessibleTeams.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      memberIds: teamMemberIdsMap[t.id] || [],
      color: getTeamColor(t.team_type),
    }));
  }, [accessibleTeams, teamMemberIdsMap]);

  // Use mock data as fallback when no db teams exist (for demo purposes)
  const teamsData = teamsDataFromDb.length > 0 ? teamsDataFromDb : initialTeams;

  // Keep the in-memory lookup cache (used by getUserById/getTeamById) synced
  useEffect(() => {
    setWorkManagerUsers(teamMembersData);
    setWorkManagerTeams(teamsData);
  }, [teamMembersData, teamsData]);

  // Drawer state
  const [drawer, setDrawer] = useState<TaskDrawerState>({
    isOpen: false,
    taskId: null,
    activeTab: 'overview',
  });

  // Open drawer when taskId is in URL
  useEffect(() => {
    if (urlTaskId) {
      setDrawer({ isOpen: true, taskId: urlTaskId, activeTab: 'overview' });
    }
  }, [urlTaskId]);

  // New task dialog state
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);

  // Group by state
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');

  // Database hooks for tasks
  const { data: dbTasks = [], isLoading: isTasksLoading } = useWorkManagerTasks(filters.teamId);
  const createTaskMutation = useCreateWorkManagerTask();
  const updateTaskMutation = useUpdateWorkManagerTask();
  const deleteTaskMutation = useDeleteWorkManagerTask();
  
  // Filter tasks to only show those from accessible teams (security enforcement)
  const accessibleTeamIds = useMemo(() => 
    new Set(teamsData.map(t => t.id)), 
    [teamsData]
  );
  
  const extendedTasks: TaskExtended[] = useMemo(() => {
    // Only show tasks from teams the user has access to
    const accessibleTasks = dbTasks.filter(task => 
      accessibleTeamIds.has(task.teamId) || canViewAllTeams
    );
    return accessibleTasks.map(computeTaskExtended);
  }, [dbTasks, accessibleTeamIds, canViewAllTeams]);

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
    navigate(`/taskhub/${tabId}`);
  };

  // Open task drawer
  const handleOpenTask = (taskId: string) => {
    setDrawer({ isOpen: true, taskId, activeTab: 'overview' });
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setDrawer({ isOpen: false, taskId: null, activeTab: 'overview' });
  };

  // Update task - using database
  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  // Delete task - using database
  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
    handleCloseDrawer();
  };

  // Create new task - using database
  const handleCreateTask = (taskInput: Omit<Task, 'id' | 'key' | 'createdAt' | 'updatedAt'>) => {
    createTaskMutation.mutate(taskInput);
  };

  // Move task handler for drag-and-drop
  const handleMoveTask = (args: { taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; toIndex: number }) => {
    updateTaskMutation.mutate({
      id: args.taskId,
      updates: { status: args.toStatus, columnPosition: args.toIndex }
    });
  };

  // Clear column - move all tasks to Backlog
  const handleClearColumn = (status: TaskStatus) => {
    const tasksToMove = dbTasks.filter(t => t.status === status);
    tasksToMove.forEach(task => {
      updateTaskMutation.mutate({
        id: task.id,
        updates: { status: 'Backlog' as TaskStatus, columnPosition: 0 }
      });
    });
  };

  // Create new team handler - now wired to the backend
  const handleCreateTeam = (teamInput: Omit<Team, 'id'>) => {
    if (!user) {
      toast.error('Please sign in to create a team');
      return;
    }

    const shortName = teamInput.name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0]?.toUpperCase())
      .join('')
      .slice(0, 10) || teamInput.name.slice(0, 10).toUpperCase();

    createTeam.mutate({
      name: teamInput.name.trim(),
      short_name: shortName,
      team_type: 'AGILE',
      description: teamInput.description?.trim() || undefined,
      is_active: true,
      created_by: user.id,
    });
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface-0">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Work Manager</h1>
          <p className="text-sm text-text-muted mt-1">Personal task management and team coordination</p>
        </div>
        <Button 
          onClick={() => setIsNewTaskDialogOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-default bg-surface-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-brand-primary text-brand-primary-foreground shadow-sm' 
                  : 'text-text-secondary hover:bg-surface-2'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar - Show for boards and tasks views */}
      {(activeTab === 'boards' || activeTab === 'tasks') && (
        <div className="flex items-center justify-between px-6 py-3 bg-surface-2 border-b border-border-default">
          <div className="flex items-center gap-3">
            {/* Current Team Indicator */}
            {filters.teamId && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-0 border border-border-subtle rounded-md">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">
                  {teamsData.find(t => t.id === filters.teamId)?.name || 'Team'}
                </span>
              </div>
            )}
            {!filters.teamId && canViewAllTeams && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-0 border border-border-subtle rounded-md">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">All Teams</span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 w-[280px] h-9 text-sm border border-border-default shadow-sm bg-surface-0 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group By Dropdown - Only for boards view */}
            {activeTab === 'boards' && (
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                <SelectTrigger className="w-[140px] h-9 text-[13px] bg-card">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <SelectValue placeholder="Group by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="assignee">Assignee</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-[13px] bg-card">
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[#2563eb] text-white text-[10px] font-semibold rounded-full">
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
                        {teamMembersData.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
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
      <div className="flex-1 overflow-auto p-6 bg-surface-1">
        {/* Executive Summary Strip - Show for boards and tasks */}
        {(activeTab === 'boards' || activeTab === 'tasks') && (
          <div className="mb-4">
            <ExecutiveSummaryStrip tasks={extendedTasks} />
          </div>
        )}
        
        {activeTab === 'boards' && (
          <WorkManagerBoards
            tasks={filteredTasks} 
            onOpenTask={handleOpenTask}
            onMoveTask={handleMoveTask}
            onAddTask={() => setIsNewTaskDialogOpen(true)}
            onClearColumn={handleClearColumn}
            groupBy={groupBy}
            teamsData={teamsData}
            usersData={teamMembersData}
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
            users={teamMembersData}
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
        onDelete={handleDeleteTask}
      />

      {/* New Task Dialog */}
      <NewTaskDialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
        teams={teamsData}
        users={teamMembersData}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}

export default WorkManager;
