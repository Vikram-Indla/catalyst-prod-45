// ============================================================
// KANBAN FILTERS COMPONENT
// Filter bar with search, priority, assignee, workstream + view switcher
// Workstreams are filtered based on user access (RLS)
// ============================================================

import { Search, X, LayoutGrid, Rows3 } from 'lucide-react';
import type { KanbanTaskFilters, KanbanTaskPriority } from '../../types/kanban';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

export type SwimlaneGrouping = 'none' | 'assignee' | 'priority' | 'workstream';
export type KanbanViewMode = 'board' | 'swimlane';

interface KanbanFiltersProps {
  filters: KanbanTaskFilters;
  onFilterChange: (filters: Partial<KanbanTaskFilters>) => void;
  taskCount: number;
  swimlane: SwimlaneGrouping;
  onSwimlaneChange: (swimlane: SwimlaneGrouping) => void;
  viewMode: KanbanViewMode;
  onViewModeChange: (mode: KanbanViewMode) => void;
}

const PRIORITY_OPTIONS: { value: KanbanTaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SWIMLANE_OPTIONS: { value: SwimlaneGrouping; label: string }[] = [
  { value: 'workstream', label: 'By Workstream' },
  { value: 'assignee', label: 'By Assignee' },
  { value: 'priority', label: 'By Priority' },
];

// Fetch profiles for assignee filter with stable caching
function useProfiles() {
  return useQuery({
    queryKey: ['kanban-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    // GUARDRAIL: Stable caching to prevent flickering
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Fetch accessible workstreams based on user role
function useWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const canAccessAll = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['kanban-workstreams', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];

      if (canAccessAll) {
        // Admin/super_admin: fetch all workstreams
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data;
      }

      // Regular user: fetch only workstreams they are members of
      const { data: memberships, error } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, is_active)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;

      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as { id: string; name: string });
    },
    enabled: !!user && !roleLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function KanbanFilters({ 
  filters, 
  onFilterChange, 
  taskCount,
  swimlane,
  onSwimlaneChange,
  viewMode,
  onViewModeChange,
}: KanbanFiltersProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: workstreams = [] } = useWorkstreams();

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.priority !== 'all' ||
    filters.assignee_id !== 'all' ||
    filters.workstream_id !== 'all';

  const clearFilters = () => {
    onFilterChange({
      search: '',
      priority: 'all',
      assignee_id: 'all',
      workstream_id: 'all',
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* View Mode Switcher */}
      <div className="flex items-center bg-muted/50 border border-border rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('board')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
            viewMode === 'board'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Board
        </button>
        <button
          onClick={() => onViewModeChange('swimlane')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
            viewMode === 'swimlane'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Rows3 className="w-4 h-4" />
          Swimlane
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border" />

      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="pl-9 h-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-border"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Priority Filter */}
      <Select
        value={filters.priority}
        onValueChange={(value) => onFilterChange({ priority: value as KanbanTaskPriority | 'all' })}
      >
        <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-border">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee Filter */}
      <Select
        value={filters.assignee_id}
        onValueChange={(value) => onFilterChange({ assignee_id: value })}
      >
        <SelectTrigger className="w-[150px] h-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-border">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.full_name || 'Unnamed'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Workstream Filter */}
      <Select
        value={filters.workstream_id}
        onValueChange={(value) => onFilterChange({ workstream_id: value })}
      >
        <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-border">
          <SelectValue placeholder="Workstream" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Workstreams</SelectItem>
          {workstreams.map((ws) => (
            <SelectItem key={ws.id} value={ws.id}>
              {ws.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Swimlane Grouping - only show in swimlane mode */}
      {viewMode === 'swimlane' && (
        <Select value={swimlane} onValueChange={(value) => onSwimlaneChange(value as SwimlaneGrouping)}>
          <SelectTrigger className="w-[150px] h-9 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border-border">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            {SWIMLANE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Task count & Clear filters */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-muted-foreground">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </span>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
