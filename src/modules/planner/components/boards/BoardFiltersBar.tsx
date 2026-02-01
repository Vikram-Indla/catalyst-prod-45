// ============================================================
// BOARD FILTERS BAR - V9
// Filter bar for workstream, assignee, priority, search
// ============================================================

import { Search, X, Users, Layers, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BoardFilters } from '../../types/planner-boards';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface BoardFiltersBarProps {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
}

export function BoardFiltersBar({ filters, onFiltersChange }: BoardFiltersBarProps) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isProgramManager, isLoading: roleLoading } = useUserRole();
  const canAccessAll = isAdmin || isSuperAdmin || isProgramManager;

  // Fetch workstreams based on user role
  const { data: workstreams = [] } = useQuery({
    queryKey: ['board-workstreams', user?.id, canAccessAll],
    queryFn: async (): Promise<{ id: string; name: string; slug: string; color: string }[]> => {
      if (!user) return [];

      if (canAccessAll) {
        // Admin/super_admin/manager: fetch ALL workstreams
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name, slug, color')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return (data || []) as { id: string; name: string; slug: string; color: string }[];
      }

      // Regular user: fetch only workstreams they are members of
      const { data: memberships, error } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, slug, color, is_active)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;

      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as { id: string; name: string; slug: string; color: string });
    },
    enabled: !!user && !roleLoading,
  });

  // Fetch assignees (profiles with tasks)
  const { data: assignees = [] } = useQuery({
    queryKey: ['planner', 'assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const hasActiveFilters = Boolean(
    filters.search || 
    filters.workstream_id || 
    filters.assignee_id || 
    filters.priority ||
    filters.due_status
  );

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9 h-9"
        />
      </div>

      {/* Workstream Filter */}
      <Select
        value={filters.workstream_id || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          workstream_id: value === 'all' ? undefined : value 
        })}
      >
        <SelectTrigger className="w-40 h-9">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <SelectValue placeholder="Workstream" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Workstreams</SelectItem>
          {workstreams.map((ws) => (
            <SelectItem key={ws.id} value={ws.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ws.color }}
                />
                {ws.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee Filter */}
      <Select
        value={filters.assignee_id || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          assignee_id: value === 'all' ? undefined : value 
        })}
      >
        <SelectTrigger className="w-40 h-9">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <SelectValue placeholder="Assignee" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {assignees.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name || 'Unknown'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          priority: value === 'all' ? undefined : value 
        })}
      >
        <SelectTrigger className="w-32 h-9">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-slate-400" />
            <SelectValue placeholder="Priority" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="critical">
            <span className="text-red-600">Critical</span>
          </SelectItem>
          <SelectItem value="high">
            <span className="text-orange-600">High</span>
          </SelectItem>
          <SelectItem value="medium">
            <span className="text-blue-600">Medium</span>
          </SelectItem>
          <SelectItem value="low">
            <span className="text-slate-600">Low</span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Due Status Filter */}
      <Select
        value={filters.due_status || 'all'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          due_status: value === 'all' ? undefined : value 
        })}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="Due Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Due Dates</SelectItem>
          <SelectItem value="overdue">
            <span className="text-red-600">Overdue</span>
          </SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="tomorrow">Tomorrow</SelectItem>
          <SelectItem value="upcoming">This Week</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-slate-500 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
