import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeaturesFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    status?: string;
    health?: string;
    epicId?: string;
    programId?: string;
    piId?: string;
    iterationId?: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function FeaturesFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: FeaturesFiltersDialogProps) {
  // Fetch filter options
  const { data: epics } = useQuery({
    queryKey: ['epics-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('epics')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('iterations')
        .select('id, name')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleApplyFilters = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Features</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="funnel">Funnel</SelectItem>
                <SelectItem value="analyzing">Analyzing</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="implementing">Implementing</SelectItem>
                <SelectItem value="validating">Validating</SelectItem>
                <SelectItem value="deploying">Deploying</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Health</Label>
            <Select
              value={filters.health || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, health: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All health levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All health levels</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="off_track">Off Track</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Epic</Label>
            <Select
              value={filters.epicId || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, epicId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All epics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All epics</SelectItem>
                {epics?.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Program</Label>
            <Select
              value={filters.programId || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, programId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All programs</SelectItem>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Program Increment</Label>
            <Select
              value={filters.piId || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, piId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All PIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All PIs</SelectItem>
                {programIncrements?.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Iteration</Label>
            <Select
              value={filters.iterationId || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, iterationId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All iterations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All iterations</SelectItem>
                {iterations?.map((iteration) => (
                  <SelectItem key={iteration.id} value={iteration.id}>
                    {iteration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">
              Clear All
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
