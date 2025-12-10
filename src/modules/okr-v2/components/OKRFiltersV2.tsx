import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ObjectiveFiltersV2, ObjectiveStatusV2, ObjectiveHealthV2 } from '@/hooks/useObjectivesV2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface OKRFiltersV2Props {
  filters: ObjectiveFiltersV2;
  onFiltersChange: (filters: ObjectiveFiltersV2) => void;
}

export function OKRFiltersV2({ filters, onFiltersChange }: OKRFiltersV2Props) {
  // Fetch themes
  const { data: themes } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for owner filter
  const { data: users } = useQuery({
    queryKey: ['profiles-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const hasActiveFilters = 
    filters.themeId || 
    filters.ownerId || 
    (filters.status && filters.status.length > 0) ||
    (filters.health && filters.health.length > 0) ||
    filters.hasLinkedWork !== undefined;

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const toggleStatus = (status: ObjectiveStatusV2) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const toggleHealth = (health: ObjectiveHealthV2) => {
    const current = filters.health || [];
    const updated = current.includes(health)
      ? current.filter(h => h !== health)
      : [...current, health];
    onFiltersChange({ ...filters, health: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="border-b border-border bg-muted/30 px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Filters</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Theme filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Theme</label>
          <Select
            value={filters.themeId || ''}
            onValueChange={(v) => onFiltersChange({ ...filters, themeId: v || undefined })}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="All themes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All themes</SelectItem>
              {themes?.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Owner</label>
          <Select
            value={filters.ownerId || ''}
            onValueChange={(v) => onFiltersChange({ ...filters, ownerId: v || undefined })}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All owners</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Has linked work filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Linked Work</label>
          <Select
            value={filters.hasLinkedWork === undefined ? '' : filters.hasLinkedWork.toString()}
            onValueChange={(v) => onFiltersChange({ 
              ...filters, 
              hasLinkedWork: v === '' ? undefined : v === 'true' 
            })}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="true">Has linked work</SelectItem>
              <SelectItem value="false">No linked work</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status chips */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <div className="flex flex-wrap gap-2">
          {(['pending', 'in_progress', 'on_track', 'at_risk', 'completed'] as ObjectiveStatusV2[]).map((status) => (
            <Badge
              key={status}
              variant={filters.status?.includes(status) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatus(status)}
            >
              {status.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Health chips */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Health</label>
        <div className="flex flex-wrap gap-2">
          {(['good', 'fair', 'poor', 'at_risk'] as ObjectiveHealthV2[]).map((health) => (
            <Badge
              key={health}
              variant={filters.health?.includes(health) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleHealth(health)}
            >
              {health.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
