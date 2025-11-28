import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface ThemeFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: ThemeFilters) => void;
  currentFilters: ThemeFilters;
}

export interface ThemeFilters {
  majorTheme?: boolean;
  processStep?: string;
  title?: string;
  strategicInitiative?: string;
  state?: string;
}

export function ThemeFiltersDialog({
  open,
  onOpenChange,
  onApply,
  currentFilters,
}: ThemeFiltersDialogProps) {
  const [filters, setFilters] = useState<ThemeFilters>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const emptyFilters: ThemeFilters = {};
    setFilters(emptyFilters);
    onApply(emptyFilters);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Filters</DialogTitle>
          <DialogDescription>
            Filter themes by various criteria
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="majorTheme">Major Theme</Label>
            <Select
              value={filters.majorTheme?.toString() || ''}
              onValueChange={(value) => 
                setFilters({ ...filters, majorTheme: value === 'true' ? true : value === 'false' ? false : undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="processStep">Process Step</Label>
            <Select
              value={filters.processStep || ''}
              onValueChange={(value) => 
                setFilters({ ...filters, processStep: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Search by title..."
              value={filters.title || ''}
              onChange={(e) => setFilters({ ...filters, title: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategicInitiative">Strategic Initiative</Label>
            <Select
              value={filters.strategicInitiative || ''}
              onValueChange={(value) => 
                setFilters({ ...filters, strategicInitiative: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="technical-debt">Technical Debt</SelectItem>
                <SelectItem value="innovation">Innovation</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select
              value={filters.state || ''}
              onValueChange={(value) => 
                setFilters({ ...filters, state: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
