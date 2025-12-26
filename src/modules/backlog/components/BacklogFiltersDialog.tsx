/**
 * =====================================================
 * BacklogFiltersDialog - Epic Backlog Filters
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * Filters: Status, Theme, Target Quarter
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

  // Fetch strategic themes for filter
  const { data: themes } = useQuery({
    queryKey: ['strategic-themes-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
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

  const statusOptions = [
    { value: 'proposed', label: 'Proposed' },
    { value: 'analyzing', label: 'Analyzing' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  // Generate quarters for next 2 years
  const generateQuarters = () => {
    const quarters = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let q = 1; q <= 4; q++) {
        quarters.push({ value: `Q${q} ${year}`, label: `Q${q} ${year}` });
      }
    }
    return quarters;
  };

  const quarterOptions = generateQuarters();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Backlog Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Status Filter */}
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
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Filter */}
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
                {themes?.filter((theme) => theme.id).map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Quarter */}
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
                {quarterOptions.map((quarter) => (
                  <SelectItem key={quarter.value} value={quarter.value}>
                    {quarter.label}
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
