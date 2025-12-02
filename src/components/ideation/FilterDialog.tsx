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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch users for owner filter
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

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

          {/* Owner Filter - per spec */}
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select 
              value={localFilters.owner_id || 'all'} 
              onValueChange={(v) => setLocalFilters({ 
                ...localFilters, 
                owner_id: v === 'all' ? undefined : v 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || 'Unknown User'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter - per spec */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={localFilters.date_from || ''}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, date_from: e.target.value || undefined })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={localFilters.date_to || ''}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, date_to: e.target.value || undefined })
                  }
                />
              </div>
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
