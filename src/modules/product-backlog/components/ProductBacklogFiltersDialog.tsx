/**
 * ProductBacklogFiltersDialog - Filters for Product Backlog (Business Requests)
 * Mirrors the epic backlog filters structure
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
import { useDepartments, useBusinessOwners } from '@/hooks/useDepartmentsAndOwners';

export interface ProductBacklogFilters {
  status?: string;
  priority?: string;
  department?: string;
  businessOwner?: string;
  quarter?: string;
  scored?: 'all' | 'scored' | 'unscored';
  scoreMin?: number;
  scoreMax?: number;
}

interface ProductBacklogFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProductBacklogFilters;
  onFiltersChange: (filters: ProductBacklogFilters) => void;
}

const STATUS_OPTIONS = [
  { value: 'new_request', label: 'New Request' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'implement', label: 'Implement' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On-Hold' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'unscored', label: 'Unscored' },
];

const QUARTER_OPTIONS = [
  { value: 'q1_2024', label: 'Q1 2024' },
  { value: 'q2_2024', label: 'Q2 2024' },
  { value: 'q3_2024', label: 'Q3 2024' },
  { value: 'q4_2024', label: 'Q4 2024' },
  { value: 'q1_2025', label: 'Q1 2025' },
  { value: 'q2_2025', label: 'Q2 2025' },
  { value: 'q3_2025', label: 'Q3 2025' },
  { value: 'q4_2025', label: 'Q4 2025' },
];

export function ProductBacklogFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ProductBacklogFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<ProductBacklogFilters>(filters);
  const { data: departments = [] } = useDepartments();
  const { data: businessOwners = [] } = useBusinessOwners();

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(localFilters).filter(v => v !== undefined && v !== 'all').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Backlog</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={localFilters.status || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, status: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={localFilters.priority || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, priority: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={localFilters.department || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, department: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Business Owner Filter */}
          <div className="space-y-2">
            <Label>Business Owner</Label>
            <Select
              value={localFilters.businessOwner || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, businessOwner: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Business Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Owners</SelectItem>
                {businessOwners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quarter Filter */}
          <div className="space-y-2">
            <Label>Quarter</Label>
            <Select
              value={localFilters.quarter || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, quarter: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {QUARTER_OPTIONS.map((quarter) => (
                  <SelectItem key={quarter.value} value={quarter.value}>
                    {quarter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scoring Filter */}
          <div className="space-y-2">
            <Label>Scoring</Label>
            <Select
              value={localFilters.scored || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, scored: value as 'all' | 'scored' | 'unscored' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="scored">Scored Only</SelectItem>
                <SelectItem value="unscored">Unscored Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score Range */}
          <div className="space-y-2">
            <Label>Score Range</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.scoreMin ?? ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, scoreMin: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.scoreMax ?? ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, scoreMax: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
