// ==============================================
// IDEATION FILTER DIALOG
// Advanced filtering for ideas
// ==============================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { IdeaFilters, IdeaStatus } from '@/types/ideation';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: IdeaFilters;
  onApply: (filters: IdeaFilters) => void;
}

const STATUS_OPTIONS: IdeaStatus[] = ['New', 'Open', 'Planned', 'Completed', 'Shelved'];

export function FilterDialog({
  open,
  onOpenChange,
  filters,
  onApply,
}: FilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<IdeaFilters>(filters);

  const handleStatusToggle = (status: IdeaStatus) => {
    const currentStatuses = localFilters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    setLocalFilters({ ...localFilters, status: newStatuses });
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Ideas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by title or description..."
              value={localFilters.search || ''}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, search: e.target.value })
              }
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={(localFilters.status || []).includes(status)}
                    onCheckedChange={() => handleStatusToggle(status)}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm cursor-pointer"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Has Votes */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-votes"
              checked={localFilters.has_votes || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, has_votes: !!checked })
              }
            />
            <label htmlFor="has-votes" className="text-sm cursor-pointer">
              Has votes
            </label>
          </div>

          {/* Has Comments */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-comments"
              checked={localFilters.has_comments || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, has_comments: !!checked })
              }
            />
            <label htmlFor="has-comments" className="text-sm cursor-pointer">
              Has comments
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
