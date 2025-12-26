/**
 * =====================================================
 * BacklogFiltersDialog - Epic Backlog Filters
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * Filters: Status, Theme, Target Quarter
 * All values are dynamically fetched from the database
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEpicStatuses } from '@/hooks/useEpicStatuses';

interface BacklogFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
}

export function BacklogFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: BacklogFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  // Fetch epic statuses from admin configuration (dynamic)
  const { data: epicStatuses = [] } = useActiveEpicStatuses();

  // Fetch active strategic themes (dynamic)
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-filter-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch distinct quarters from epics (dynamic)
  const { data: quarters = [] } = useQuery({
    queryKey: ['epic-quarters-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('quarters')
        .not('quarters', 'is', null);

      if (error) throw error;

      // Extract unique quarters from the arrays
      const allQuarters = new Set<string>();
      (data || []).forEach((epic) => {
        if (epic.quarters && Array.isArray(epic.quarters)) {
          epic.quarters.forEach((q: string) => allQuarters.add(q));
        }
      });

      // Sort quarters (Q1 2025, Q2 2025, etc.)
      return Array.from(allQuarters).sort((a, b) => {
        const [qA, yearA] = a.split(' ');
        const [qB, yearB] = b.split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return parseInt(qA.replace('Q', '')) - parseInt(qB.replace('Q', ''));
      });
    },
  });

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Backlog Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Status Filter - Dynamic from epic_statuses table */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={localFilters.status as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, status: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {epicStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Filter - Dynamic from strategic_themes table */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={localFilters.theme_id as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, theme_id: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Themes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {themes.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Quarter - Dynamic from epics.quarters field */}
          <div className="space-y-2">
            <Label>Target Quarter</Label>
            <Select
              value={localFilters.target_quarter as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, target_quarter: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>
                    {quarter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
