/**
 * =====================================================
 * BacklogFiltersDialog - Enhanced filters for Epic Backlog
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * Filters: Status, Health, Technical Score range, Business Score range,
 * Progress %, Target timeframe (date/quarter)
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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

  // Fetch programs for filter (renamed from portfolios in vNext)
  const { data: programs } = useQuery({
    queryKey: ['programs-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
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

  const states = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'accepted', label: 'Accepted' },
  ];

  const healthOptions = [
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'red', label: 'Red' },
    { value: 'gray', label: 'Gray' },
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

        <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto">
          {/* Program Filter */}
          <div className="space-y-2">
            <Label>Program</Label>
            <Select
              value={localFilters.program_id as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, program_id: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs?.filter((program) => program.id).map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State Filter */}
          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={localFilters.state as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, state: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Health Filter */}
          <div className="space-y-2">
            <Label>Health</Label>
            <Select
              value={localFilters.health as string || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, health: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Health Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health Statuses</SelectItem>
                {healthOptions.map((health) => (
                  <SelectItem key={health.value} value={health.value}>
                    {health.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Technical Score Range */}
          <div className="space-y-2">
            <Label>Technical Score Range</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.tech_score_min as string || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, tech_score_min: e.target.value || undefined })
                }
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.tech_score_max as string || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, tech_score_max: e.target.value || undefined })
                }
                className="w-24"
              />
            </div>
          </div>

          {/* Business Score Range */}
          <div className="space-y-2">
            <Label>Business Score Range</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.business_score_min as string || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, business_score_min: e.target.value || undefined })
                }
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.business_score_max as string || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, business_score_max: e.target.value || undefined })
                }
                className="w-24"
              />
            </div>
          </div>

          {/* Progress % Filter */}
          <div className="space-y-3">
            <Label>Progress % (Min: {localFilters.progress_min as number || 0}%)</Label>
            <Slider
              value={[localFilters.progress_min as number || 0]}
              onValueChange={([value]) =>
                setLocalFilters({ ...localFilters, progress_min: value || undefined })
              }
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Target Timeframe */}
          <div className="space-y-2">
            <Label>Target Timeframe</Label>
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

          {/* Show Filter */}
          <div className="space-y-2">
            <Label>Show</Label>
            <Select
              value={localFilters.show as string || 'active'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, show: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Items</SelectItem>
                <SelectItem value="mvp">MVP Items Only</SelectItem>
                <SelectItem value="blocked">Blocked Items Only</SelectItem>
                <SelectItem value="all">All Items</SelectItem>
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
