// Stories Filters Dialog - comprehensive filtering
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { STORY_STATUS_LABELS } from '@/types/story.types';

interface StoriesFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: any) => void;
}

export function StoriesFiltersDialog({ open, onOpenChange, onApplyFilters }: StoriesFiltersDialogProps) {
  const [filters, setFilters] = useState({
    status: '',
    featureId: '',
    teamId: '',
    sprintId: '',
    programId: '',
    minPoints: '',
    maxPoints: '',
    assigneeId: '',
  });

  const { data: features } = useQuery({
    queryKey: ['features-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('iterations').select('id, name').order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleApply = () => {
    // Only pass non-empty filter values
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value && value !== 'all' && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    onApplyFilters(activeFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters = {
      status: '',
      featureId: '',
      teamId: '',
      sprintId: '',
      programId: '',
      minPoints: '',
      maxPoints: '',
      assigneeId: '',
    };
    setFilters(clearedFilters);
    onApplyFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Stories</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Program */}
          <div className="space-y-2">
            <Label>Program</Label>
            <Select
              value={filters.programId || undefined}
              onValueChange={(value) => setFilters({ ...filters, programId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                {programs?.filter(p => p.id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STORY_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feature */}
          <div className="space-y-2">
            <Label>Feature</Label>
            <Select
              value={filters.featureId || undefined}
              onValueChange={(value) => setFilters({ ...filters, featureId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Features" />
              </SelectTrigger>
              <SelectContent>
                {features?.filter(f => f.id).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team */}
          <div className="space-y-2">
            <Label>Team</Label>
            <Select
              value={filters.teamId || undefined}
              onValueChange={(value) => setFilters({ ...filters, teamId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                {teams?.filter(t => t.id).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sprint */}
          <div className="space-y-2">
            <Label>Sprint</Label>
            <Select
              value={filters.sprintId || undefined}
              onValueChange={(value) => setFilters({ ...filters, sprintId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Sprints" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                {sprints?.filter(s => s.id).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Points */}
          <div className="space-y-2">
            <Label>Min Story Points</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minPoints}
              onChange={(e) => setFilters({ ...filters, minPoints: e.target.value })}
            />
          </div>

          {/* Max Points */}
          <div className="space-y-2">
            <Label>Max Story Points</Label>
            <Input
              type="number"
              placeholder="∞"
              value={filters.maxPoints}
              onChange={(e) => setFilters({ ...filters, maxPoints: e.target.value })}
            />
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
