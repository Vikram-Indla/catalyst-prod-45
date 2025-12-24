/**
 * FeatureBacklogFiltersDialog — Server-side filters
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../types';

interface FiltersState {
  status?: string;
  priority?: string;
  projectId?: string;
  epicId?: string;
}

interface FeatureBacklogFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  projects: Array<{ id: string; name: string }>;
  epics: Array<{ id: string; name: string; epic_key?: string }>;
}

export function FeatureBacklogFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  projects,
  epics,
}: FeatureBacklogFiltersDialogProps) {
  const handleClear = () => {
    onFiltersChange({});
    onOpenChange(false);
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Features</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(val) =>
                onFiltersChange({ ...filters, status: val === 'all' ? undefined : val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(val) =>
                onFiltersChange({ ...filters, priority: val === 'all' ? undefined : val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={filters.projectId || 'all'}
              onValueChange={(val) =>
                onFiltersChange({ ...filters, projectId: val === 'all' ? undefined : val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Epic */}
          <div className="space-y-2">
            <Label>Epic</Label>
            <Select
              value={filters.epicId || 'all'}
              onValueChange={(val) =>
                onFiltersChange({ ...filters, epicId: val === 'all' ? undefined : val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All epics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All epics</SelectItem>
                <SelectItem value="none">No epic</SelectItem>
                {epics.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.epic_key ? `${e.epic_key} - ` : ''}{e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
